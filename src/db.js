const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
  console.log('[DB] 创建数据目录:', dbDir)
}

const dbPath = path.join(dbDir, 'emr.db')
console.log('[DB] 数据库路径:', dbPath)

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

const initTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT,
      age INTEGER,
      id_card TEXT,
      inpatient_id TEXT,
      admission_date TEXT,
      discharge_date TEXT,
      diagnosis TEXT,
      allergy TEXT,
      department TEXT,
      bed_number TEXT,
      doctor TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      doc_type TEXT,
      content TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_patients_inpatient_id ON patients(inpatient_id);
    CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
    CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON documents(patient_id);
  `)

  console.log('[DB] 数据表初始化完成')
}

initTables()

module.exports = db
