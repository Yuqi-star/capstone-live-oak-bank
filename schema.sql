-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    metric TEXT NOT NULL,
    condition TEXT NOT NULL,
    threshold REAL NOT NULL,
    notify_email BOOLEAN NOT NULL DEFAULT 0,
    notify_sms BOOLEAN NOT NULL DEFAULT 0,
    notify_dashboard BOOLEAN NOT NULL DEFAULT 0,
    email TEXT,
    phone TEXT,
    created_at TEXT NOT NULL,
    last_checked_at TEXT,
    last_triggered_at TEXT
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    report_id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    sections TEXT NOT NULL,  -- JSON array of selected sections
    schedule TEXT,  -- null for one-time, 'daily', 'weekly', or 'monthly' for recurring
    delivery_email BOOLEAN NOT NULL DEFAULT 0,
    delivery_download BOOLEAN NOT NULL DEFAULT 0,
    email TEXT,
    status TEXT NOT NULL,  -- 'pending', 'completed', 'failed'
    created_at TEXT NOT NULL,
    last_generated_at TEXT
);

-- Report History table
CREATE TABLE IF NOT EXISTS report_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    file_path TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    FOREIGN KEY (report_id) REFERENCES reports (report_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (alert_id) REFERENCES alerts (id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_alert_id ON notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Credit Risk table
CREATE TABLE IF NOT EXISTS credit_risk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Company TEXT NOT NULL,
    Industry TEXT,
    "Sub-Industry" TEXT,
    "Credit Rating" TEXT,
    "Probability of Default" REAL,
    "Loss Given Default" REAL,
    "Expected Loss" REAL,
    "Current Ratio" REAL,
    "ROA" REAL,
    "ROE" REAL,
    "Leverage Ratio" REAL,
    "Credit VaR" REAL,
    "Loan Amount" REAL,
    "Financial Coverage Ratio" REAL,
    "Probability of Credit Rating Change" REAL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_risk_company ON credit_risk(Company);
CREATE INDEX IF NOT EXISTS idx_credit_risk_industry ON credit_risk(Industry); 