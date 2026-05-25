import { createServerFn } from "@tanstack/react-start";
import { getEvent } from "vinxi/http";

function getEnv() {
  const event = getEvent();
  if (!event || !event.context || !event.context.cloudflare || !event.context.cloudflare.env) {
    throw new Error("Cloudflare bindings not available in current context.");
  }
  return event.context.cloudflare.env;
}

// Custom CSV Parser that handles commas, quotes, and escaped quotes properly.
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // Skip the next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal);
      currentVal = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal);
      if (row.length > 1 || row[0] !== "") {
        lines.push(row);
      }
      row = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }
  if (row.length > 0 || currentVal !== "") {
    row.push(currentVal);
    lines.push(row);
  }
  return lines;
}

/**
 * Uploads a base64 encoded bank statement file to R2 bucket.
 * Records the log in bank_statement_import_log.
 */
export const uploadStatementToR2 = createServerFn({ method: "POST" })
  .inputValidator(
    (params: {
      bankAccountId: string;
      fileName: string;
      fileBase64: string;
      contentType: string;
    }) => params
  )
  .handler(async ({ data }) => {
    const env = getEnv();

    // 1. Get bank account metadata to fetch company ID
    const account = await env.DB.prepare("SELECT company_id FROM bank_account WHERE id = ?")
      .bind(data.bankAccountId)
      .first() as any;
    
    if (!account) {
      throw new Error(`Bank Account ${data.bankAccountId} not found.`);
    }

    const companyId = account.company_id;
    const timestamp = Date.now();
    const r2Key = `statements/${data.bankAccountId}/${timestamp}-${data.fileName}`;

    // 2. Decode base64 to buffer
    const buffer = Buffer.from(data.fileBase64, "base64");

    // 3. Upload to R2 BUCKET
    await env.BUCKET.put(r2Key, buffer, {
      httpMetadata: { contentType: data.contentType },
    });

    // 4. Create import log in D1
    const logId = `log-${crypto.randomUUID()}`;
    const importDate = new Date().toISOString();
    
    await env.DB.prepare(
      "INSERT INTO bank_statement_import_log (id, company_id, bank_account_id, import_date, file_name, file_url, status, records_imported) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        logId,
        companyId,
        data.bankAccountId,
        importDate,
        data.fileName,
        r2Key,
        "Uploaded",
        0
      )
      .run();

    return { logId, r2Key };
  });

/**
 * Parses a bank statement from R2 and imports new transactions into D1.
 * Deduplicates transactions to prevent double importing.
 */
export const parseAndImportStatement = createServerFn({ method: "POST" })
  .inputValidator(
    (params: {
      bankAccountId: string;
      r2Key: string;
      fileType: "csv" | "json";
      logId: string;
    }) => params
  )
  .handler(async ({ data }) => {
    const env = getEnv();

    // 1. Get Bank Account currency
    const account = await env.DB.prepare("SELECT currency FROM bank_account WHERE id = ?")
      .bind(data.bankAccountId)
      .first() as any;
    
    const currency = account ? account.currency : "USD";

    // 2. Fetch file content from R2
    const obj = await env.BUCKET.get(data.r2Key);
    if (!obj) {
      // Update log to status "Failed"
      await env.DB.prepare("UPDATE bank_statement_import_log SET status = 'Failed' WHERE id = ?")
        .bind(data.logId)
        .run();
      throw new Error(`File not found in R2: ${data.r2Key}`);
    }

    const textContent = await obj.text();
    let parsedRecords: Array<{
      date: string;
      description: string;
      deposit: number;
      withdrawal: number;
      amount: number;
      reference_number?: string;
    }> = [];

    // 3. Parse based on file type
    try {
      if (data.fileType === "json") {
        const json = JSON.parse(textContent);
        if (!Array.isArray(json)) {
          throw new Error("JSON statement must be an array of transactions.");
        }
        for (const item of json) {
          const date = item.date || new Date().toISOString().split("T")[0];
          const description = item.description || "";
          const dep = parseFloat(item.deposit) || 0;
          const wd = parseFloat(item.withdrawal) || 0;
          const amt = item.amount !== undefined ? parseFloat(item.amount) : dep - wd;
          const ref = item.reference_number || item.reference || "";

          parsedRecords.push({
            date,
            description,
            deposit: dep,
            withdrawal: wd,
            amount: amt,
            reference_number: ref,
          });
        }
      } else {
        // CSV Parsing
        const lines = parseCSV(textContent);
        if (lines.length < 2) {
          throw new Error("CSV statement must contain at least a header row and one data row.");
        }

        const headers = lines[0].map(h => h.trim().toLowerCase());
        
        // Find indexes
        let dateIdx = headers.findIndex(h => h.includes("date"));
        let descIdx = headers.findIndex(h => h.includes("desc") || h.includes("memo") || h.includes("particular") || h.includes("payee") || h.includes("narrative"));
        let amtIdx = headers.findIndex(h => h === "amount" || h === "value");
        let depIdx = headers.findIndex(h => h.includes("deposit") || h.includes("credit") || h.includes("in"));
        let wdIdx = headers.findIndex(h => h.includes("withdraw") ||  h.includes("debit") || h.includes("out"));
        let refIdx = headers.findIndex(h => h.includes("ref") || h.includes("check") || h.includes("cheque"));

        // Fallbacks if not found
        if (dateIdx === -1) dateIdx = 0;
        if (descIdx === -1) descIdx = 1;
        if (amtIdx === -1 && depIdx === -1) {
          // If no amount or deposit column is identified by name, try fallback indexes
          depIdx = 2;
          wdIdx = 3;
          refIdx = 4;
        } else if (refIdx === -1) {
          refIdx = amtIdx !== -1 ? 3 : 4;
        }

        // Loop through data rows (skip header)
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          if (row.length === 0 || (row.length === 1 && row[0] === "")) continue;

          const dateStr = row[dateIdx] ? row[dateIdx].trim() : new Date().toISOString().split("T")[0];
          const descStr = row[descIdx] ? row[descIdx].trim() : "";
          const refStr = refIdx !== -1 && row[refIdx] ? row[refIdx].trim() : "";

          let depositVal = 0;
          let withdrawalVal = 0;
          let amountVal = 0;

          if (amtIdx !== -1 && row[amtIdx]) {
            amountVal = parseFloat(row[amtIdx].replace(/[^0-9.-]/g, "")) || 0;
            if (amountVal >= 0) {
              depositVal = amountVal;
            } else {
              withdrawalVal = Math.abs(amountVal);
            }
          } else {
            const depStr = depIdx !== -1 && row[depIdx] ? row[depIdx].trim() : "0";
            const wdStr = wdIdx !== -1 && row[wdIdx] ? row[wdIdx].trim() : "0";
            depositVal = parseFloat(depStr.replace(/[^0-9.-]/g, "")) || 0;
            withdrawalVal = parseFloat(wdStr.replace(/[^0-9.-]/g, "")) || 0;
            amountVal = depositVal - withdrawalVal;
          }

          parsedRecords.push({
            date: dateStr,
            description: descStr,
            deposit: depositVal,
            withdrawal: withdrawalVal,
            amount: amountVal,
            reference_number: refStr,
          });
        }
      }

      // 4. Import & Deduplicate records in D1
      let importedCount = 0;
      for (const record of parsedRecords) {
        // Standardize date format if possible (YYYY-MM-DD)
        let formattedDate = record.date;
        if (record.date.includes("/")) {
          // simple M/D/Y or D/M/Y support or ISO conversion
          try {
            const d = new Date(record.date);
            if (!isNaN(d.getTime())) {
              formattedDate = d.toISOString().split("T")[0];
            }
          } catch {
            // Keep original
          }
        }

        // Deduplication Check: Same bank account, date, amount, description and reference number
        const existing = await env.DB.prepare(
          "SELECT id FROM bank_transaction WHERE bank_account_id = ? AND date = ? AND amount = ? AND (reference_number = ? OR description = ?)"
        )
          .bind(
            data.bankAccountId,
            formattedDate,
            record.amount,
            record.reference_number || null,
            record.description || null
          )
          .first() as any;

        if (existing) {
          // Duplicate transaction, skip it!
          continue;
        }

        // Generate Transaction ID
        const txId = `tx-${crypto.randomUUID()}`;

        // Insert into D1
        await env.DB.prepare(
          "INSERT INTO bank_transaction (id, bank_account_id, date, deposit, withdrawal, amount, currency, description, reference_number, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Unreconciled')"
        )
          .bind(
            txId,
            data.bankAccountId,
            formattedDate,
            record.deposit,
            record.withdrawal,
            record.amount,
            currency,
            record.description,
            record.reference_number || null
          )
          .run();

        importedCount++;
      }

      // 5. Update Statement Log with success status and count
      await env.DB.prepare(
        "UPDATE bank_statement_import_log SET status = 'Success', records_imported = ? WHERE id = ?"
      )
        .bind(importedCount, data.logId)
        .run();

      return { success: true, recordsImported: importedCount };
    } catch (error: any) {
      // 6. Update Statement Log with failure status
      await env.DB.prepare(
        "UPDATE bank_statement_import_log SET status = 'Failed' WHERE id = ?"
      )
        .bind(data.logId)
        .run();
      
      throw new Error(`Statement import failed: ${error.message}`);
    }
  });
