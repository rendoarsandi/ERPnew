-- Create company table
CREATE TABLE IF NOT EXISTS company (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    default_currency TEXT NOT NULL
);

-- Create bank_account table
CREATE TABLE IF NOT EXISTS bank_account (
    id TEXT PRIMARY KEY,
    account_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_type TEXT,
    company_id TEXT NOT NULL,
    currency TEXT NOT NULL,
    balance REAL DEFAULT 0.0,
    FOREIGN KEY(company_id) REFERENCES company(id)
);

-- Create payment_entry table
CREATE TABLE IF NOT EXISTS payment_entry (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    bank_account_id TEXT NOT NULL,
    payment_type TEXT NOT NULL, -- 'Receive', 'Pay', 'Internal Transfer'
    party_type TEXT, -- 'Customer', 'Supplier', 'Employee'
    party TEXT,
    paid_amount REAL NOT NULL,
    received_amount REAL NOT NULL,
    reference_no TEXT,
    reference_date TEXT,
    posting_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Submitted', 'Cancelled'
    FOREIGN KEY(company_id) REFERENCES company(id),
    FOREIGN KEY(bank_account_id) REFERENCES bank_account(id)
);

-- Create journal_entry table
CREATE TABLE IF NOT EXISTS journal_entry (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    posting_date TEXT NOT NULL,
    reference_no TEXT,
    reference_date TEXT,
    user_remark TEXT,
    status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Submitted', 'Cancelled'
    FOREIGN KEY(company_id) REFERENCES company(id)
);

-- Create bank_transaction table
CREATE TABLE IF NOT EXISTS bank_transaction (
    id TEXT PRIMARY KEY,
    bank_account_id TEXT NOT NULL,
    date TEXT NOT NULL,
    deposit REAL DEFAULT 0.0,
    withdrawal REAL DEFAULT 0.0,
    amount REAL NOT NULL, -- deposit - withdrawal
    currency TEXT NOT NULL,
    description TEXT,
    reference_number TEXT,
    reference_date TEXT,
    party_type TEXT,
    party TEXT,
    status TEXT NOT NULL DEFAULT 'Unreconciled', -- 'Unreconciled', 'Reconciled', 'Partially Reconciled'
    payment_entry_id TEXT,
    journal_entry_id TEXT,
    FOREIGN KEY(bank_account_id) REFERENCES bank_account(id),
    FOREIGN KEY(payment_entry_id) REFERENCES payment_entry(id),
    FOREIGN KEY(journal_entry_id) REFERENCES journal_entry(id)
);

-- Create bank_transaction_rule table
CREATE TABLE IF NOT EXISTS bank_transaction_rule (
    id TEXT PRIMARY KEY,
    rule_name TEXT NOT NULL,
    company_id TEXT NOT NULL,
    bank_account_id TEXT,
    description_pattern TEXT,
    amount_condition TEXT, -- e.g. '>0', '<0'
    party_type TEXT,
    party TEXT,
    FOREIGN KEY(company_id) REFERENCES company(id),
    FOREIGN KEY(bank_account_id) REFERENCES bank_account(id)
);

-- Create bank_statement_import_log table
CREATE TABLE IF NOT EXISTS bank_statement_import_log (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    bank_account_id TEXT NOT NULL,
    import_date TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    status TEXT NOT NULL,
    records_imported INTEGER NOT NULL,
    FOREIGN KEY(company_id) REFERENCES company(id),
    FOREIGN KEY(bank_account_id) REFERENCES bank_account(id)
);

-- Seed company
INSERT INTO company (id, company_name, default_currency) 
VALUES ('company-1', 'ERPNext Corp', 'USD');

-- Seed bank_account
INSERT INTO bank_account (id, account_name, bank_name, account_number, account_type, company_id, currency, balance)
VALUES 
('account-1', 'ERPNext Corp Main Checking', 'Chase Bank', '123456789', 'Checking', 'company-1', 'USD', 10000.0),
('account-2', 'ERPNext Corp Savings', 'Wells Fargo', '987654321', 'Savings', 'company-1', 'USD', 50000.0);

-- Seed bank_transaction_rule
INSERT INTO bank_transaction_rule (id, rule_name, company_id, bank_account_id, description_pattern, amount_condition, party_type, party)
VALUES 
('rule-1', 'Chase Interest Payment', 'company-1', 'account-1', '%INTEREST%', '>0', 'Supplier', 'Chase Bank'),
('rule-2', 'AWS Bill Match', 'company-1', 'account-1', '%AWS%', '<0', 'Supplier', 'Amazon Web Services'),
('rule-3', 'Acme Invoice Payment', 'company-1', 'account-1', '%Acme%', '>0', 'Customer', 'Acme Corp');

-- Seed payment_entry
INSERT INTO payment_entry (id, company_id, bank_account_id, payment_type, party_type, party, paid_amount, received_amount, reference_no, reference_date, posting_date, status)
VALUES 
('payment-1', 'company-1', 'account-1', 'Pay', 'Supplier', 'Amazon Web Services', 150.00, 150.00, 'AWS-MAY-2026', '2026-05-10', '2026-05-12', 'Submitted'),
('payment-2', 'company-1', 'account-1', 'Receive', 'Customer', 'Acme Corp', 1200.00, 1200.00, 'INV-1002', '2026-05-15', '2026-05-16', 'Submitted'),
('payment-3', 'company-1', 'account-1', 'Pay', 'Supplier', 'Office Depot', 45.00, 45.00, 'REF-OFFICE-1', '2026-05-20', '2026-05-21', 'Draft');
