import { createServerFn } from "@tanstack/react-start";
import { getEvent } from "vinxi/http";
import CustomerSchema from "../doctypes/Customer.json";
import ItemSchema from "../doctypes/Item.json";
import SalesInvoiceSchema from "../doctypes/Sales_Invoice.json";
import PaymentEntrySchema from "../doctypes/Payment_Entry.json";
import BankTransactionSchema from "../doctypes/Bank_Transaction.json";

const SCHEMAS: Record<string, any> = {
  "Customer": CustomerSchema,
  "Item": ItemSchema,
  "Sales Invoice": SalesInvoiceSchema,
  "Payment Entry": PaymentEntrySchema,
  "Bank Transaction": BankTransactionSchema
};

const SEARCH_COLUMNS: Record<string, string[]> = {
  "Customer": ["id", "customer_name", "customer_group", "territory"],
  "Item": ["id", "item_name", "item_code", "description"],
  "Sales Invoice": ["id", "customer", "contact_display"],
  "Payment Entry": ["id", "party", "payment_type", "status"],
  "Bank Transaction": ["id", "description", "party", "status"]
};

function getEnv() {
  const event = getEvent();
  if (!event || !event.context || !event.context.cloudflare || !event.context.cloudflare.env) {
    throw new Error("Cloudflare bindings not available in current context.");
  }
  return event.context.cloudflare.env;
}

export function getTableName(doctype: string): string {
  return doctype.toLowerCase().replace(/ /g, "_");
}

const initializedTables = new Set<string>();

async function ensureTableExists(env: any, doctype: string) {
  const tableName = getTableName(doctype);
  if (initializedTables.has(tableName)) return;

  // Check if table already exists in DB
  const tableCheck = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
  )
    .bind(tableName)
    .first();

  if (tableCheck) {
    initializedTables.add(tableName);
    return;
  }

  const schema = SCHEMAS[doctype];
  if (!schema) {
    throw new Error(`DocType schema for ${doctype} not found.`);
  }

  // Generate CREATE TABLE statement dynamically from the schema
  const columns: string[] = ["id TEXT PRIMARY KEY"];
  for (const field of schema.fields || []) {
    const fieldname = field.fieldname;
    const fieldtype = field.fieldtype;
    if (
      !fieldname ||
      ["Section Break", "Column Break", "Tab Break", "HTML", "Button", "Heading"].includes(fieldtype)
    ) {
      continue;
    }
    // Map fieldtype to SQLite type
    let sqlType = "TEXT";
    if (fieldtype === "Check") {
      sqlType = "INTEGER";
    } else if (fieldtype === "Int") {
      sqlType = "INTEGER";
    } else if (["Float", "Currency", "Percent"].includes(fieldtype)) {
      sqlType = "REAL";
    }
    columns.push(`${fieldname} ${sqlType}`);
  }

  const createTableSql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns.join(", ")});`;
  await env.DB.prepare(createTableSql).run();
  initializedTables.add(tableName);
}

export const getList = createServerFn({ method: "GET" })
  .inputValidator((data: { doctype: string; search?: string; limit?: number; offset?: number }) => data)
  .handler(async ({ data }) => {
    const env = getEnv();
    const { doctype, search, limit = 10, offset = 0 } = data;
    await ensureTableExists(env, doctype);

    const tableName = getTableName(doctype);
    const searchCols = SEARCH_COLUMNS[doctype] || ["id"];

    // Count query
    let countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
    const countParams: any[] = [];
    if (search) {
      const searchConditions = searchCols.map((col) => `${col} LIKE ?`).join(" OR ");
      countQuery += ` WHERE ${searchConditions}`;
      for (let i = 0; i < searchCols.length; i++) {
        countParams.push(`%${search}%`);
      }
    }

    const countResult = (await env.DB.prepare(countQuery).bind(...countParams).first()) as { count: number } | null;
    const total = countResult?.count || 0;

    // Data query
    let dataQuery = `SELECT * FROM ${tableName}`;
    const dataParams: any[] = [];
    if (search) {
      const searchConditions = searchCols.map((col) => `${col} LIKE ?`).join(" OR ");
      dataQuery += ` WHERE ${searchConditions}`;
      for (let i = 0; i < searchCols.length; i++) {
        dataParams.push(`%${search}%`);
      }
    }

    const schema = SCHEMAS[doctype];
    const fieldnames = (schema?.fields || []).map((f: any) => f.fieldname);
    if (fieldnames.includes("posting_date")) {
      dataQuery += ` ORDER BY posting_date DESC`;
    } else if (fieldnames.includes("date")) {
      dataQuery += ` ORDER BY date DESC`;
    } else {
      dataQuery += ` ORDER BY id DESC`;
    }

    dataQuery += ` LIMIT ? OFFSET ?`;
    dataParams.push(limit, offset);

    const { results } = await env.DB.prepare(dataQuery).bind(...dataParams).all();

    // Map table/json columns back to arrays
    const itemsCols = (schema?.fields || [])
      .filter((f: any) => f.fieldtype === "Table")
      .map((f: any) => f.fieldname);

    const processedResults = results.map((row: any) => {
      const newRow = { ...row };
      for (const col of itemsCols) {
        if (typeof newRow[col] === "string") {
          try {
            newRow[col] = JSON.parse(newRow[col]);
          } catch {
            newRow[col] = [];
          }
        } else if (!newRow[col]) {
          newRow[col] = [];
        }
      }
      return newRow;
    });

    return {
      data: processedResults,
      total
    };
  });

export const getDoc = createServerFn({ method: "GET" })
  .inputValidator((data: { doctype: string; name: string }) => data)
  .handler(async ({ data }) => {
    const env = getEnv();
    const { doctype, name } = data;
    await ensureTableExists(env, doctype);
    const tableName = getTableName(doctype);

    const row = await env.DB.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).bind(name).first();
    if (!row) {
      throw new Error(`${doctype} ${name} not found`);
    }

    // Process table fields
    const schema = SCHEMAS[doctype];
    const itemsCols = (schema?.fields || [])
      .filter((f: any) => f.fieldtype === "Table")
      .map((f: any) => f.fieldname);

    const newRow = { ...row };
    for (const col of itemsCols) {
      if (typeof newRow[col] === "string") {
        try {
          newRow[col] = JSON.parse(newRow[col]);
        } catch {
          newRow[col] = [];
        }
      } else if (!newRow[col]) {
        newRow[col] = [];
      }
    }

    return newRow;
  });

export const saveDoc = createServerFn({ method: "POST" })
  .inputValidator((data: { doctype: string; name?: string; doc: any }) => data)
  .handler(async ({ data }) => {
    const env = getEnv();
    const { doctype, name, doc } = data;
    await ensureTableExists(env, doctype);
    const tableName = getTableName(doctype);
    const schema = SCHEMAS[doctype];

    const isNew = !name || name === "new";
    const id = isNew ? (doc.id || `${doctype.toLowerCase().replace(/ /g, "-")}-${Date.now()}`) : name;

    const fields = schema.fields || [];
    const validCols = fields
      .filter(
        (f: any) =>
          f.fieldname &&
          !["Section Break", "Column Break", "Tab Break", "HTML", "Button", "Heading"].includes(f.fieldtype)
      )
      .map((f: any) => ({ fieldname: f.fieldname, fieldtype: f.fieldtype }));

    // Prepare fields to write
    const writeData: Record<string, any> = { id };
    for (const col of validCols) {
      let val = doc[col.fieldname];
      if (col.fieldtype === "Table") {
        writeData[col.fieldname] = JSON.stringify(Array.isArray(val) ? val : []);
      } else if (col.fieldtype === "Check") {
        writeData[col.fieldname] = val ? 1 : 0;
      } else if (col.fieldtype === "Int") {
        writeData[col.fieldname] = val !== undefined && val !== null ? parseInt(val) : null;
      } else if (["Float", "Currency", "Percent"].includes(col.fieldtype)) {
        writeData[col.fieldname] = val !== undefined && val !== null ? parseFloat(val) : null;
      } else {
        writeData[col.fieldname] = val !== undefined && val !== null ? String(val) : null;
      }
    }

    if (isNew) {
      const existing = await env.DB.prepare(`SELECT id FROM ${tableName} WHERE id = ?`).bind(id).first();
      if (existing) {
        const keys = Object.keys(writeData).filter((k) => k !== "id");
        const setClause = keys.map((k) => `${k} = ?`).join(", ");
        const values = keys.map((k) => writeData[k]);
        values.push(id);
        await env.DB.prepare(`UPDATE ${tableName} SET ${setClause} WHERE id = ?`).bind(...values).run();
      } else {
        const keys = Object.keys(writeData);
        const placeholders = keys.map(() => "?").join(", ");
        const values = keys.map((k) => writeData[k]);
        await env.DB.prepare(`INSERT INTO ${tableName} (${keys.join(", ")}) VALUES (${placeholders})`)
          .bind(...values)
          .run();
      }
    } else {
      const keys = Object.keys(writeData).filter((k) => k !== "id");
      const setClause = keys.map((k) => `${k} = ?`).join(", ");
      const values = keys.map((k) => writeData[k]);
      values.push(id);
      await env.DB.prepare(`UPDATE ${tableName} SET ${setClause} WHERE id = ?`).bind(...values).run();
    }

    return { success: true, id };
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const env = getEnv();

    await ensureTableExists(env, "Sales Invoice");
    await ensureTableExists(env, "Payment Entry");
    await ensureTableExists(env, "Bank Transaction");

    let totalSales = 0;
    try {
      const salesResult = (await env.DB.prepare(`SELECT SUM(grand_total) as total FROM sales_invoice`).first()) as { total: number } | null;
      totalSales = salesResult?.total || 0;
    } catch (e) {
      console.error("Error fetching sales total:", e);
    }

    let totalPayments = 0;
    try {
      const paymentsResult = (await env.DB.prepare(`SELECT SUM(received_amount) as total FROM payment_entry WHERE payment_type = 'Receive'`).first()) as { total: number } | null;
      totalPayments = paymentsResult?.total || 0;
    } catch (e) {
      console.error("Error fetching payments total:", e);
    }

    let unreconciledCount = 0;
    try {
      const countResult = (await env.DB.prepare(`SELECT COUNT(*) as count FROM bank_transaction WHERE status = 'Unreconciled'`).first()) as { count: number } | null;
      unreconciledCount = countResult?.count || 0;
    } catch (e) {
      console.error("Error fetching unreconciled count:", e);
    }

    const activity: any[] = [];
    try {
      const { results: recentSales } = await env.DB.prepare(`SELECT id, customer, grand_total, posting_date FROM sales_invoice ORDER BY id DESC LIMIT 5`).all();
      for (const row of recentSales) {
        activity.push({
          type: "sales_invoice",
          title: `Sales Invoice Created`,
          description: `Invoice ${row.id} for Customer "${row.customer}"`,
          amount: row.grand_total,
          date: row.posting_date,
          id: row.id,
        });
      }
    } catch (e) {
      console.error("Error fetching recent sales:", e);
    }

    try {
      const { results: recentPayments } = await env.DB.prepare(`SELECT id, party, received_amount, posting_date FROM payment_entry ORDER BY id DESC LIMIT 5`).all();
      for (const row of recentPayments) {
        activity.push({
          type: "payment_entry",
          title: `Payment Received`,
          description: `Payment from "${row.party}"`,
          amount: row.received_amount,
          date: row.posting_date,
          id: row.id,
        });
      }
    } catch (e) {
      console.error("Error fetching recent payments:", e);
    }

    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      totalSales,
      totalPayments,
      unreconciledCount,
      recentActivity: activity.slice(0, 10)
    };
  });
