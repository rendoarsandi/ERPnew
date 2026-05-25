import { createServerFn } from "@tanstack/react-start";
import { getEvent } from "vinxi/http";

// Helper to get bindings
function getEnv() {
  const event = getEvent();
  if (!event || !event.context || !event.context.cloudflare || !event.context.cloudflare.env) {
    throw new Error("Cloudflare bindings not available in current context.");
  }
  return event.context.cloudflare.env;
}

// ==========================================
// COMPANY CRUD
// ==========================================

export const getCompanies = createServerFn({ method: "GET" })
  .handler(async () => {
    const env = getEnv();
    const { results } = await env.DB.prepare("SELECT * FROM company").all();
    return results;
  });

export const getCompany = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const env = getEnv();
    return await env.DB.prepare("SELECT * FROM company WHERE id = ?").bind(id).first();
  });

export const createCompany = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; company_name: string; default_currency: string }) => data)
  .handler(async ({ data }) => {
    const env = getEnv();
    await env.DB.prepare(
      "INSERT INTO company (id, company_name, default_currency) VALUES (?, ?, ?)"
    )
      .bind(data.id, data.company_name, data.default_currency)
      .run();
    return { success: true };
  });

export const updateCompany = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; company_name: string; default_currency: string }) => data)
  .handler(async ({ data }) => {
    const env = getEnv();
    await env.DB.prepare(
      "UPDATE company SET company_name = ?, default_currency = ? WHERE id = ?"
    )
      .bind(data.company_name, data.default_currency, data.id)
      .run();
    return { success: true };
  });

export const deleteCompany = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const env = getEnv();
    await env.DB.prepare("DELETE FROM company WHERE id = ?").bind(id).run();
    return { success: true };
  });

// ==========================================
// BANK ACCOUNT CRUD
// ==========================================

export const getBankAccounts = createServerFn({ method: "GET" })
  .inputValidator((companyId?: string) => companyId)
  .handler(async ({ data: companyId }) => {
    const env = getEnv();
    if (companyId) {
      const { results } = await env.DB.prepare("SELECT * FROM bank_account WHERE company_id = ?").bind(companyId).all();
      return results;
    }
    const { results } = await env.DB.prepare("SELECT * FROM bank_account").all();
    return results;
  });

export const getBankAccount = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const env = getEnv();
    return await env.DB.prepare("SELECT * FROM bank_account WHERE id = ?").bind(id).first();
  });

export const createBankAccount = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      account_name: string;
      bank_name: string;
      account_number: string;
      account_type?: string;
      company_id: string;
      currency: string;
      balance?: number;
    }) => data
  )
  .handler(async ({ data }) => {
    const env = getEnv();
    await env.DB.prepare(
      "INSERT INTO bank_account (id, account_name, bank_name, account_number, account_type, company_id, currency, balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        data.id,
        data.account_name,
        data.bank_name,
        data.account_number,
        data.account_type || null,
        data.company_id,
        data.currency,
        data.balance ?? 0.0
      )
      .run();
    return { success: true };
  });

export const updateBankAccount = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      account_name: string;
      bank_name: string;
      account_number: string;
      account_type?: string;
      company_id: string;
      currency: string;
      balance?: number;
    }) => data
  )
  .handler(async ({ data }) => {
    const env = getEnv();
    await env.DB.prepare(
      "UPDATE bank_account SET account_name = ?, bank_name = ?, account_number = ?, account_type = ?, company_id = ?, currency = ?, balance = ? WHERE id = ?"
    )
      .bind(
        data.account_name,
        data.bank_name,
        data.account_number,
        data.account_type || null,
        data.company_id,
        data.currency,
        data.balance ?? 0.0,
        data.id
      )
      .run();
    return { success: true };
  });

export const deleteBankAccount = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const env = getEnv();
    await env.DB.prepare("DELETE FROM bank_account WHERE id = ?").bind(id).run();
    return { success: true };
  });

// ==========================================
// BANK TRANSACTION CRUD
// ==========================================

export const getBankTransactions = createServerFn({ method: "GET" })
  .inputValidator((params: { bankAccountId: string; status?: string }) => params)
  .handler(async ({ data: params }) => {
    const env = getEnv();
    if (params.status) {
      const { results } = await env.DB.prepare(
        "SELECT * FROM bank_transaction WHERE bank_account_id = ? AND status = ? ORDER BY date DESC"
      )
        .bind(params.bankAccountId, params.status)
        .all();
      return results;
    }
    const { results } = await env.DB.prepare(
      "SELECT * FROM bank_transaction WHERE bank_account_id = ? ORDER BY date DESC"
    )
      .bind(params.bankAccountId)
      .all();
    return results;
  });

export const getBankTransaction = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const env = getEnv();
    return await env.DB.prepare("SELECT * FROM bank_transaction WHERE id = ?").bind(id).first();
  });

export const createBankTransaction = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      bank_account_id: string;
      date: string;
      deposit?: number;
      withdrawal?: number;
      amount: number;
      currency: string;
      description?: string;
      reference_number?: string;
      reference_date?: string;
      party_type?: string;
      party?: string;
      status?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const env = getEnv();
    await env.DB.prepare(
      "INSERT INTO bank_transaction (id, bank_account_id, date, deposit, withdrawal, amount, currency, description, reference_number, reference_date, party_type, party, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        data.id,
        data.bank_account_id,
        data.date,
        data.deposit ?? 0.0,
        data.withdrawal ?? 0.0,
        data.amount,
        data.currency,
        data.description || null,
        data.reference_number || null,
        data.reference_date || null,
        data.party_type || null,
        data.party || null,
        data.status || "Unreconciled"
      )
      .run();
    return { success: true };
  });

export const updateBankTransaction = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      bank_account_id: string;
      date: string;
      deposit?: number;
      withdrawal?: number;
      amount: number;
      currency: string;
      description?: string;
      reference_number?: string;
      reference_date?: string;
      party_type?: string;
      party?: string;
      status?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const env = getEnv();
    await env.DB.prepare(
      "UPDATE bank_transaction SET bank_account_id = ?, date = ?, deposit = ?, withdrawal = ?, amount = ?, currency = ?, description = ?, reference_number = ?, reference_date = ?, party_type = ?, party = ?, status = ? WHERE id = ?"
    )
      .bind(
        data.bank_account_id,
        data.date,
        data.deposit ?? 0.0,
        data.withdrawal ?? 0.0,
        data.amount,
        data.currency,
        data.description || null,
        data.reference_number || null,
        data.reference_date || null,
        data.party_type || null,
        data.party || null,
        data.status || "Unreconciled",
        data.id
      )
      .run();
    return { success: true };
  });

export const deleteBankTransaction = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const env = getEnv();
    await env.DB.prepare("DELETE FROM bank_transaction WHERE id = ?").bind(id).run();
    return { success: true };
  });

// ==========================================
// BANK TRANSACTION RULE CRUD
// ==========================================

export const getBankTransactionRules = createServerFn({ method: "GET" })
  .inputValidator((companyId: string) => companyId)
  .handler(async ({ data: companyId }) => {
    const env = getEnv();
    const { results } = await env.DB.prepare("SELECT * FROM bank_transaction_rule WHERE company_id = ?").bind(companyId).all();
    return results;
  });

export const createBankTransactionRule = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      rule_name: string;
      company_id: string;
      bank_account_id?: string;
      description_pattern?: string;
      amount_condition?: string;
      party_type?: string;
      party?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const env = getEnv();
    await env.DB.prepare(
      "INSERT INTO bank_transaction_rule (id, rule_name, company_id, bank_account_id, description_pattern, amount_condition, party_type, party) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        data.id,
        data.rule_name,
        data.company_id,
        data.bank_account_id || null,
        data.description_pattern || null,
        data.amount_condition || null,
        data.party_type || null,
        data.party || null
      )
      .run();
    return { success: true };
  });

export const updateBankTransactionRule = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      rule_name: string;
      company_id: string;
      bank_account_id?: string;
      description_pattern?: string;
      amount_condition?: string;
      party_type?: string;
      party?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const env = getEnv();
    await env.DB.prepare(
      "UPDATE bank_transaction_rule SET rule_name = ?, company_id = ?, bank_account_id = ?, description_pattern = ?, amount_condition = ?, party_type = ?, party = ? WHERE id = ?"
    )
      .bind(
        data.rule_name,
        data.company_id,
        data.bank_account_id || null,
        data.description_pattern || null,
        data.amount_condition || null,
        data.party_type || null,
        data.party || null,
        data.id
      )
      .run();
    return { success: true };
  });

export const deleteBankTransactionRule = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const env = getEnv();
    await env.DB.prepare("DELETE FROM bank_transaction_rule WHERE id = ?").bind(id).run();
    return { success: true };
  });

// ==========================================
// PAYMENT ENTRY CRUD
// ==========================================

export const getPaymentEntries = createServerFn({ method: "GET" })
  .inputValidator((bankAccountId: string) => bankAccountId)
  .handler(async ({ data: bankAccountId }) => {
    const env = getEnv();
    const { results } = await env.DB.prepare(
      "SELECT * FROM payment_entry WHERE bank_account_id = ? ORDER BY posting_date DESC"
    )
      .bind(bankAccountId)
      .all();
    return results;
  });

export const createPaymentEntry = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      company_id: string;
      bank_account_id: string;
      payment_type: string;
      party_type?: string;
      party?: string;
      paid_amount: number;
      received_amount: number;
      reference_no?: string;
      reference_date?: string;
      posting_date: string;
      status?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const env = getEnv();
    await env.DB.prepare(
      "INSERT INTO payment_entry (id, company_id, bank_account_id, payment_type, party_type, party, paid_amount, received_amount, reference_no, reference_date, posting_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        data.id,
        data.company_id,
        data.bank_account_id,
        data.payment_type,
        data.party_type || null,
        data.party || null,
        data.paid_amount,
        data.received_amount,
        data.reference_no || null,
        data.reference_date || null,
        data.posting_date,
        data.status || "Draft"
      )
      .run();
    return { success: true };
  });

export const updatePaymentEntry = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      company_id: string;
      bank_account_id: string;
      payment_type: string;
      party_type?: string;
      party?: string;
      paid_amount: number;
      received_amount: number;
      reference_no?: string;
      reference_date?: string;
      posting_date: string;
      status?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const env = getEnv();
    await env.DB.prepare(
      "UPDATE payment_entry SET company_id = ?, bank_account_id = ?, payment_type = ?, party_type = ?, party = ?, paid_amount = ?, received_amount = ?, reference_no = ?, reference_date = ?, posting_date = ?, status = ? WHERE id = ?"
    )
      .bind(
        data.company_id,
        data.bank_account_id,
        data.payment_type,
        data.party_type || null,
        data.party || null,
        data.paid_amount,
        data.received_amount,
        data.reference_no || null,
        data.reference_date || null,
        data.posting_date,
        data.status || "Draft",
        data.id
      )
      .run();
    return { success: true };
  });

export const deletePaymentEntry = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const env = getEnv();
    await env.DB.prepare("DELETE FROM payment_entry WHERE id = ?").bind(id).run();
    return { success: true };
  });

// ==========================================
// JOURNAL ENTRY CRUD
// ==========================================

export const getJournalEntries = createServerFn({ method: "GET" })
  .inputValidator((companyId: string) => companyId)
  .handler(async ({ data: companyId }) => {
    const env = getEnv();
    const { results } = await env.DB.prepare(
      "SELECT * FROM journal_entry WHERE company_id = ? ORDER BY posting_date DESC"
    )
      .bind(companyId)
      .all();
    return results;
  });

export const createJournalEntry = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      company_id: string;
      posting_date: string;
      reference_no?: string;
      reference_date?: string;
      user_remark?: string;
      status?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const env = getEnv();
    await env.DB.prepare(
      "INSERT INTO journal_entry (id, company_id, posting_date, reference_no, reference_date, user_remark, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        data.id,
        data.company_id,
        data.posting_date,
        data.reference_no || null,
        data.reference_date || null,
        data.user_remark || null,
        data.status || "Draft"
      )
      .run();
    return { success: true };
  });

export const updateJournalEntry = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      company_id: string;
      posting_date: string;
      reference_no?: string;
      reference_date?: string;
      user_remark?: string;
      status?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const env = getEnv();
    await env.DB.prepare(
      "UPDATE journal_entry SET company_id = ?, posting_date = ?, reference_no = ?, reference_date = ?, user_remark = ?, status = ? WHERE id = ?"
    )
      .bind(
        data.company_id,
        data.posting_date,
        data.reference_no || null,
        data.reference_date || null,
        data.user_remark || null,
        data.status || "Draft",
        data.id
      )
      .run();
    return { success: true };
  });

export const deleteJournalEntry = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const env = getEnv();
    await env.DB.prepare("DELETE FROM journal_entry WHERE id = ?").bind(id).run();
    return { success: true };
  });

// ==========================================
// IMPORT LOG
// ==========================================

export const getImportLogs = createServerFn({ method: "GET" })
  .inputValidator((bankAccountId: string) => bankAccountId)
  .handler(async ({ data: bankAccountId }) => {
    const env = getEnv();
    const { results } = await env.DB.prepare(
      "SELECT * FROM bank_statement_import_log WHERE bank_account_id = ? ORDER BY import_date DESC"
    )
      .bind(bankAccountId)
      .all();
    return results;
  });

// ==========================================
// RECONCILIATION MATCHING LOGIC
// ==========================================

/**
 * Proposes matching payment_entry or journal_entry records for a given transaction.
 */
export const findProposalsForTransaction = createServerFn({ method: "GET" })
  .inputValidator((transactionId: string) => transactionId)
  .handler(async ({ data: transactionId }) => {
    const env = getEnv();
    
    // 1. Get the transaction details
    const tx = await env.DB.prepare("SELECT * FROM bank_transaction WHERE id = ?").bind(transactionId).first();
    if (!tx) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const proposals: Array<{
      matchType: "payment" | "journal";
      id: string;
      amount: number;
      reference_no: string | null;
      posting_date: string;
      party: string | null;
      party_type: string | null;
      score: number;
      reasons: string[];
    }> = [];

    // Let's check matching payments first
    // Payment entries are related to the same bank_account_id
    // and are NOT already linked to another reconciled bank_transaction
    const payments = await env.DB.prepare(`
      SELECT pe.* 
      FROM payment_entry pe
      LEFT JOIN bank_transaction bt ON bt.payment_entry_id = pe.id
      WHERE pe.bank_account_id = ? AND bt.id IS NULL
    `)
      .bind(tx.bank_account_id)
      .all();

    for (const pe of payments.results as any[]) {
      let score = 0;
      const reasons: string[] = [];

      // Reason 1: Amount matches
      // Signed amount matches (incoming -> received_amount, outgoing -> paid_amount)
      const isDeposit = tx.amount > 0;
      const peAmount = isDeposit ? pe.received_amount : pe.paid_amount;
      
      if (Math.abs(tx.amount) === peAmount) {
        score += 50;
        reasons.push(`Amount matches exactly (${peAmount} USD)`);
      }

      // Reason 2: Reference number matches
      if (tx.reference_number && pe.reference_no && 
          tx.reference_number.toLowerCase().trim() === pe.reference_no.toLowerCase().trim()) {
        score += 40;
        reasons.push(`Reference number matches exactly (${pe.reference_no})`);
      } else if (tx.reference_number && pe.reference_no && 
                 (tx.reference_number.toLowerCase().includes(pe.reference_no.toLowerCase()) || 
                  pe.reference_no.toLowerCase().includes(tx.reference_number.toLowerCase()))) {
        score += 20;
        reasons.push(`Reference number matches partially`);
      }

      // Reason 3: Party matches
      if (tx.party && pe.party && tx.party.toLowerCase().trim() === pe.party.toLowerCase().trim()) {
        score += 20;
        reasons.push(`Party matches (${pe.party})`);
      }

      // Reason 4: Date closeness
      const txDate = new Date(tx.date);
      const peDate = new Date(pe.posting_date);
      const diffTime = Math.abs(txDate.getTime() - peDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 3) {
        score += 10;
        reasons.push(`Dates are close (${diffDays} days difference)`);
      }

      if (score > 0) {
        proposals.push({
          matchType: "payment",
          id: pe.id,
          amount: isDeposit ? pe.received_amount : -pe.paid_amount,
          reference_no: pe.reference_no,
          posting_date: pe.posting_date,
          party: pe.party,
          party_type: pe.party_type,
          score,
          reasons,
        });
      }
    }

    // Now check matching journal entries
    // Journal entries are not linked to a specific bank account directly in our schema, 
    // but belong to the same company.
    // Let's get the company_id for the bank account first
    const bankAcc = await env.DB.prepare("SELECT company_id FROM bank_account WHERE id = ?").bind(tx.bank_account_id).first();
    if (bankAcc) {
      const companyId = bankAcc.company_id;
      const journals = await env.DB.prepare(`
        SELECT je.* 
        FROM journal_entry je
        LEFT JOIN bank_transaction bt ON bt.journal_entry_id = je.id
        WHERE je.company_id = ? AND bt.id IS NULL
      `)
        .bind(companyId)
        .all();

      for (const je of journals.results as any[]) {
        let score = 0;
        const reasons: string[] = [];

        // In a journal entry, we'll check reference number
        if (tx.reference_number && je.reference_no && 
            tx.reference_number.toLowerCase().trim() === je.reference_no.toLowerCase().trim()) {
          score += 50;
          reasons.push(`Reference number matches exactly (${je.reference_no})`);
        } else if (tx.reference_number && je.reference_no && 
                   (tx.reference_number.toLowerCase().includes(je.reference_no.toLowerCase()) || 
                    je.reference_no.toLowerCase().includes(tx.reference_number.toLowerCase()))) {
          score += 25;
          reasons.push(`Reference number matches partially`);
        }

        // Check description pattern
        if (tx.description && je.user_remark && 
            (tx.description.toLowerCase().includes(je.user_remark.toLowerCase()) || 
             je.user_remark.toLowerCase().includes(tx.description.toLowerCase()))) {
          score += 20;
          reasons.push(`Description matches user remark partially`);
        }

        // Date closeness
        const txDate = new Date(tx.date);
        const jeDate = new Date(je.posting_date);
        const diffTime = Math.abs(txDate.getTime() - jeDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 5) {
          score += 10;
          reasons.push(`Dates are close (${diffDays} days difference)`);
        }

        if (score > 0) {
          proposals.push({
            matchType: "journal",
            id: je.id,
            amount: tx.amount, // Assume amount matches for proposal display
            reference_no: je.reference_no,
            posting_date: je.posting_date,
            party: null,
            party_type: null,
            score,
            reasons,
          });
        }
      }
    }

    // Sort proposals by score descending
    proposals.sort((a, b) => b.score - a.score);
    return proposals;
  });

/**
 * Reconciles a bank transaction with a payment entry or a journal entry.
 * Adjusts the bank account balance.
 */
export const reconcileTransaction = createServerFn({ method: "POST" })
  .inputValidator((params: { transactionId: string; matchType: "payment" | "journal"; matchId: string }) => params)
  .handler(async ({ data }) => {
    const env = getEnv();

    // 1. Fetch transaction
    const tx = await env.DB.prepare("SELECT * FROM bank_transaction WHERE id = ?").bind(data.transactionId).first();
    if (!tx) {
      throw new Error(`Transaction ${data.transactionId} not found`);
    }

    if (tx.status === "Reconciled") {
      throw new Error(`Transaction ${data.transactionId} is already reconciled`);
    }

    // 2. Perform reconciliation update
    if (data.matchType === "payment") {
      await env.DB.prepare("UPDATE bank_transaction SET status = 'Reconciled', payment_entry_id = ? WHERE id = ?")
        .bind(data.matchId, data.transactionId)
        .run();
      // Update payment entry status to Submitted if it is Draft
      await env.DB.prepare("UPDATE payment_entry SET status = 'Submitted' WHERE id = ? AND status = 'Draft'")
        .bind(data.matchId)
        .run();
    } else {
      await env.DB.prepare("UPDATE bank_transaction SET status = 'Reconciled', journal_entry_id = ? WHERE id = ?")
        .bind(data.matchId, data.transactionId)
        .run();
      // Update journal entry status to Submitted if it is Draft
      await env.DB.prepare("UPDATE journal_entry SET status = 'Submitted' WHERE id = ? AND status = 'Draft'")
        .bind(data.matchId)
        .run();
    }

    // 3. Update Bank Account balance
    await env.DB.prepare("UPDATE bank_account SET balance = balance + ? WHERE id = ?")
      .bind(tx.amount, tx.bank_account_id)
      .run();

    return { success: true };
  });

/**
 * Unreconciles a bank transaction.
 * Reverts the bank account balance.
 */
export const unreconcileTransaction = createServerFn({ method: "POST" })
  .inputValidator((transactionId: string) => transactionId)
  .handler(async ({ data: transactionId }) => {
    const env = getEnv();

    // 1. Fetch transaction
    const tx = await env.DB.prepare("SELECT * FROM bank_transaction WHERE id = ?").bind(transactionId).first();
    if (!tx) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (tx.status !== "Reconciled") {
      throw new Error(`Transaction ${transactionId} is not reconciled`);
    }

    // 2. Clear link
    await env.DB.prepare("UPDATE bank_transaction SET status = 'Unreconciled', payment_entry_id = NULL, journal_entry_id = NULL WHERE id = ?")
      .bind(transactionId)
      .run();

    // 3. Revert Bank Account balance
    await env.DB.prepare("UPDATE bank_account SET balance = balance - ? WHERE id = ?")
      .bind(tx.amount, tx.bank_account_id)
      .run();

    return { success: true };
  });

/**
 * Automatically applies transaction rules to unmatched transactions, updating their proposed party details.
 */
export const autoMatchTransactionsWithRules = createServerFn({ method: "POST" })
  .inputValidator((bankAccountId: string) => bankAccountId)
  .handler(async ({ data: bankAccountId }) => {
    const env = getEnv();

    // Get company_id
    const account = await env.DB.prepare("SELECT company_id FROM bank_account WHERE id = ?").bind(bankAccountId).first();
    if (!account) {
      throw new Error(`Bank Account ${bankAccountId} not found`);
    }
    const companyId = account.company_id;

    // Get rules
    const { results: rules } = await env.DB.prepare("SELECT * FROM bank_transaction_rule WHERE company_id = ?").bind(companyId).all();

    // Get unreconciled transactions
    const { results: txs } = await env.DB.prepare(
      "SELECT * FROM bank_transaction WHERE bank_account_id = ? AND status = 'Unreconciled'"
    )
      .bind(bankAccountId)
      .all();

    let matchedCount = 0;

    for (const tx of txs as any[]) {
      for (const rule of rules as any[]) {
        let isMatch = true;

        // Check description pattern (using simple LIKE simulation or includes)
        if (rule.description_pattern && tx.description) {
          const regexStr = rule.description_pattern.replace(/%/g, ".*");
          const regex = new RegExp(regexStr, "i");
          if (!regex.test(tx.description)) {
            isMatch = false;
          }
        } else if (rule.description_pattern && !tx.description) {
          isMatch = false;
        }

        // Check amount condition
        if (rule.amount_condition) {
          const condition = rule.amount_condition.trim();
          if (condition === ">0" && tx.amount <= 0) {
            isMatch = false;
          } else if (condition === "<0" && tx.amount >= 0) {
            isMatch = false;
          }
        }

        // If matched, apply party info
        if (isMatch) {
          await env.DB.prepare("UPDATE bank_transaction SET party_type = ?, party = ? WHERE id = ?")
            .bind(rule.party_type, rule.party, tx.id)
            .run();
          matchedCount++;
          break; // Stop running other rules for this transaction
        }
      }
    }

    return { success: true, matchedCount };
  });

// ==========================================
// DURABLE OBJECT CO-ORDINATION CALLS
// ==========================================

function getSessionStub(bankAccountId: string) {
  const env = getEnv();
  const id = env.RECONCILIATION_SESSION.idFromName(bankAccountId);
  return env.RECONCILIATION_SESSION.get(id);
}

export const startReconciliationSession = createServerFn({ method: "POST" })
  .inputValidator((params: { bankAccountId: string; companyId: string }) => params)
  .handler(async ({ data }) => {
    const stub = getSessionStub(data.bankAccountId);
    const res = await stub.fetch("http://do/start", {
      method: "POST",
      body: JSON.stringify({
        bankAccountId: data.bankAccountId,
        companyId: data.companyId,
      }),
      headers: { "Content-Type": "application/json" }
    });
    return await res.json();
  });

export const getReconciliationSessionState = createServerFn({ method: "GET" })
  .inputValidator((bankAccountId: string) => bankAccountId)
  .handler(async ({ data: bankAccountId }) => {
    const stub = getSessionStub(bankAccountId);
    const res = await stub.fetch("http://do/state");
    return await res.json();
  });

export const lockTransactionInSession = createServerFn({ method: "POST" })
  .inputValidator((params: { bankAccountId: string; transactionId: string }) => params)
  .handler(async ({ data }) => {
    const stub = getSessionStub(data.bankAccountId);
    const res = await stub.fetch("http://do/lock", {
      method: "POST",
      body: JSON.stringify({ transactionId: data.transactionId }),
      headers: { "Content-Type": "application/json" }
    });
    if (res.status === 409) {
      return { success: false, reason: "Already locked" };
    }
    return await res.json();
  });

export const unlockTransactionInSession = createServerFn({ method: "POST" })
  .inputValidator((params: { bankAccountId: string; transactionId: string }) => params)
  .handler(async ({ data }) => {
    const stub = getSessionStub(data.bankAccountId);
    const res = await stub.fetch("http://do/unlock", {
      method: "POST",
      body: JSON.stringify({ transactionId: data.transactionId }),
      headers: { "Content-Type": "application/json" }
    });
    return await res.json();
  });

export const endReconciliationSession = createServerFn({ method: "POST" })
  .inputValidator((bankAccountId: string) => bankAccountId)
  .handler(async ({ data: bankAccountId }) => {
    const stub = getSessionStub(bankAccountId);
    const res = await stub.fetch("http://do/end", {
      method: "POST"
    });
    return await res.json();
  });
