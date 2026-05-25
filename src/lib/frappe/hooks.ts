export type HookFn = (doc: any, env: any) => Promise<void> | void;

export interface DocTypeHooks {
  before_insert?: HookFn[];
  after_insert?: HookFn[];
  before_save?: HookFn[];
  after_save?: HookFn[];
  before_submit?: HookFn[];
  on_submit?: HookFn[];
  before_cancel?: HookFn[];
  on_cancel?: HookFn[];
  before_delete?: HookFn[];
  after_delete?: HookFn[];
}

const hookRegistry: Record<string, DocTypeHooks> = {};

/**
 * Registers one or more lifecycle hooks for a DocType.
 */
export function registerHooks(doctype: string, hooks: DocTypeHooks) {
  if (!hookRegistry[doctype]) {
    hookRegistry[doctype] = {};
  }
  const registered = hookRegistry[doctype];
  for (const [event, fns] of Object.entries(hooks)) {
    const ev = event as keyof DocTypeHooks;
    if (fns) {
      registered[ev] = [...(registered[ev] || []), ...fns];
    }
  }
}

/**
 * Runs the registered hooks for a given DocType and event.
 */
export async function runHooks(doctype: string, event: keyof DocTypeHooks, doc: any, env: any): Promise<void> {
  const registered = hookRegistry[doctype];
  if (!registered || !registered[event]) {
    return;
  }
  for (const fn of registered[event]!) {
    await fn(doc, env);
  }
}

// ==========================================
// PRE-REGISTERED BANKING HOOKS
// ==========================================

// Hooks for Journal Entry
registerHooks('Journal Entry', {
  before_save: [
    async (doc) => {
      let totalDebit = 0;
      let totalCredit = 0;
      if (doc.accounts && Array.isArray(doc.accounts)) {
        for (const acc of doc.accounts) {
          totalDebit += Number(acc.debit || 0);
          totalCredit += Number(acc.credit || 0);
        }
      }
      doc.total_debit = totalDebit;
      doc.total_credit = totalCredit;

      // Validate debit equals credit
      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        throw new Error(`Total Debit (${totalDebit}) and Total Credit (${totalCredit}) must be equal in Journal Entry.`);
      }
    }
  ],
  on_submit: [
    async (doc) => {
      // Logic for ledger postings could be added here (e.g. updating general ledger tables)
      console.log(`Journal Entry ${doc.name} submitted. Processing general ledger postings...`);
    }
  ]
});

// Hooks for Payment Entry
registerHooks('Payment Entry', {
  before_save: [
    async (doc) => {
      let totalAllocated = 0;
      if (doc.references && Array.isArray(doc.references)) {
        for (const ref of doc.references) {
          totalAllocated += Number(ref.allocated_amount || 0);
        }
      }
      doc.total_allocated_amount = totalAllocated;

      let totalDeductions = 0;
      if (doc.deductions && Array.isArray(doc.deductions)) {
        for (const ded of doc.deductions) {
          totalDeductions += Number(ded.amount || 0);
        }
      }
      doc.total_deductions = totalDeductions;
      
      // Calculate final paid amount
      if (!doc.paid_amount && totalAllocated) {
        doc.paid_amount = totalAllocated - totalDeductions;
      }
    }
  ],
  on_submit: [
    async (doc) => {
      console.log(`Payment Entry ${doc.name} submitted. Posting ledger entries...`);
    }
  ]
});

// Hooks for Bank Transaction
registerHooks('Bank Transaction', {
  before_save: [
    async (doc) => {
      const deposit = Number(doc.deposit || 0);
      const withdrawal = Number(doc.withdrawal || 0);
      doc.net_amount = deposit - withdrawal;
    }
  ],
  on_submit: [
    async (doc, env) => {
      // When a bank transaction is submitted/reconciled, update corresponding bank account balance
      if (doc.bank_account) {
        const amount = Number(doc.net_amount || 0);
        // Let's run a query to update Bank Account table if it exists
        try {
          const tableName = 'tabBank Account';
          const tableExists = await env.DB.prepare(
            "SELECT name FROM sqlite_schema WHERE type='table' AND name = ?"
          ).bind(tableName).first();
          
          if (tableExists) {
            await env.DB.prepare(
              `UPDATE \`tabBank Account\` SET balance = IFNULL(balance, 0) + ? WHERE name = ?`
            ).bind(amount, doc.bank_account).run();
            console.log(`Updated balance for Bank Account ${doc.bank_account} by ${amount}`);
          }
        } catch (err) {
          console.error(`Failed to update bank account balance on submit:`, err);
        }
      }
    }
  ]
});
