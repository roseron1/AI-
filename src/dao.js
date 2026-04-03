const db = require('./db')
const { v4: uuidv4 } = require('uuid')

class PatientDAO {
  getAllPatients() {
    const stmt = db.prepare('SELECT * FROM patients ORDER BY created_at DESC')
    return stmt.all()
  }

  getPatientById(id) {
    const stmt = db.prepare('SELECT * FROM patients WHERE id = ?')
    return stmt.get(id)
  }

  getPatientByInpatientId(inpatientId) {
    const stmt = db.prepare('SELECT * FROM patients WHERE inpatient_id = ?')
    return stmt.get(inpatientId)
  }

  searchPatients(keyword) {
    const stmt = db.prepare(`
      SELECT * FROM patients 
      WHERE name LIKE ? OR inpatient_id LIKE ? OR id_card LIKE ?
      ORDER BY created_at DESC
      LIMIT 50
    `)
    const pattern = `%${keyword}%`
    return stmt.all(pattern, pattern, pattern)
  }

  getRecentPatients(limit = 10) {
    const stmt = db.prepare('SELECT * FROM patients ORDER BY updated_at DESC LIMIT ?')
    return stmt.all(limit)
  }

  createPatient(patient) {
    const id = patient.id || uuidv4()
    const stmt = db.prepare(`
      INSERT INTO patients (
        id, name, gender, age, id_card, inpatient_id, 
        admission_date, discharge_date, diagnosis, allergy, 
        department, bed_number, doctor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id,
      patient.name,
      patient.gender,
      patient.age,
      patient.idCard || null,
      patient.inpatientId,
      patient.admissionDate || null,
      patient.dischargeDate || null,
      patient.diagnosis || null,
      patient.allergy || null,
      patient.department || null,
      patient.bedNumber || null,
      patient.doctor || null
    )
    
    console.log('[PatientDAO] 创建患者:', id, patient.name)
    return this.getPatientById(id)
  }

  updatePatient(id, patient) {
    const stmt = db.prepare(`
      UPDATE patients SET 
        name = ?, gender = ?, age = ?, id_card = ?, inpatient_id = ?,
        admission_date = ?, discharge_date = ?, diagnosis = ?, allergy = ?,
        department = ?, bed_number = ?, doctor = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `)
    
    const result = stmt.run(
      patient.name,
      patient.gender,
      patient.age,
      patient.idCard || null,
      patient.inpatientId,
      patient.admissionDate || null,
      patient.dischargeDate || null,
      patient.diagnosis || null,
      patient.allergy || null,
      patient.department || null,
      patient.bedNumber || null,
      patient.doctor || null,
      id
    )
    
    console.log('[PatientDAO] 更新患者:', id, 'changes:', result.changes)
    return this.getPatientById(id)
  }

  deletePatient(id) {
    const stmt = db.prepare('DELETE FROM patients WHERE id = ?')
    const result = stmt.run(id)
    console.log('[PatientDAO] 删除患者:', id, 'changes:', result.changes)
    return result.changes > 0
  }
}

class DocumentDAO {
  getDocumentsByPatientId(patientId) {
    const stmt = db.prepare('SELECT * FROM documents WHERE patient_id = ? ORDER BY created_at DESC')
    return stmt.all(patientId)
  }

  getDocumentById(id) {
    const stmt = db.prepare('SELECT * FROM documents WHERE id = ?')
    return stmt.get(id)
  }

  createDocument(document) {
    const id = document.id || uuidv4()
    const stmt = db.prepare(`
      INSERT INTO documents (id, patient_id, name, category, doc_type, content, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id,
      document.patientId,
      document.name,
      document.category || null,
      document.docType || null,
      document.content || null,
      document.status || 'draft'
    )
    
    console.log('[DocumentDAO] 创建文档:', id, document.name)
    return this.getDocumentById(id)
  }

  updateDocument(id, document) {
    const stmt = db.prepare(`
      UPDATE documents SET 
        name = ?, category = ?, doc_type = ?, content = ?, status = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `)
    
    const result = stmt.run(
      document.name,
      document.category || null,
      document.docType || null,
      document.content || null,
      document.status || 'draft',
      id
    )
    
    console.log('[DocumentDAO] 更新文档:', id, 'changes:', result.changes)
    return this.getDocumentById(id)
  }

  deleteDocument(id) {
    const stmt = db.prepare('DELETE FROM documents WHERE id = ?')
    const result = stmt.run(id)
    console.log('[DocumentDAO] 删除文档:', id, 'changes:', result.changes)
    return result.changes > 0
  }
}

class ConfigDAO {
  get(key) {
    const stmt = db.prepare('SELECT value FROM system_config WHERE key = ?')
    const row = stmt.get(key)
    return row ? row.value : null
  }

  set(key, value) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO system_config (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `)
    stmt.run(key, value)
    console.log('[ConfigDAO] 设置配置:', key)
  }

  delete(key) {
    const stmt = db.prepare('DELETE FROM system_config WHERE key = ?')
    stmt.run(key)
  }
}

module.exports = {
  PatientDAO: new PatientDAO(),
  DocumentDAO: new DocumentDAO(),
  ConfigDAO: new ConfigDAO()
}
