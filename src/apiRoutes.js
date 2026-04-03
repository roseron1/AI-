const express = require('express')
const router = express.Router()
const { PatientDAO, DocumentDAO, ConfigDAO } = require('./dao')

router.get('/patients', (req, res) => {
  try {
    const patients = PatientDAO.getAllPatients()
    res.json({ code: 10000, message: 'success', data: patients })
  } catch (error) {
    console.error('[API] 获取患者列表失败:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

router.get('/patients/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const patients = PatientDAO.getRecentPatients(limit)
    res.json({ code: 10000, message: 'success', data: patients })
  } catch (error) {
    console.error('[API] 获取最近患者失败:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

router.get('/patients/search', (req, res) => {
  try {
    const keyword = req.query.keyword || ''
    const patients = PatientDAO.searchPatients(keyword)
    res.json({ code: 10000, message: 'success', data: patients })
  } catch (error) {
    console.error('[API] 搜索患者失败:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

router.get('/patients/:id', (req, res) => {
  try {
    const patient = PatientDAO.getPatientById(req.params.id)
    if (!patient) {
      return res.status(404).json({ code: 40400, message: '患者不存在' })
    }
    res.json({ code: 10000, message: 'success', data: patient })
  } catch (error) {
    console.error('[API] 获取患者详情失败:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

router.post('/patients', (req, res) => {
  try {
    const patient = req.body
    if (!patient.name || !patient.inpatientId) {
      return res.status(400).json({ code: 40000, message: '姓名和住院号不能为空' })
    }
    const created = PatientDAO.createPatient(patient)
    res.json({ code: 10000, message: 'success', data: created })
  } catch (error) {
    console.error('[API] 创建患者失败:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

router.put('/patients/:id', (req, res) => {
  try {
    const patient = req.body
    const updated = PatientDAO.updatePatient(req.params.id, patient)
    if (!updated) {
      return res.status(404).json({ code: 40400, message: '患者不存在' })
    }
    res.json({ code: 10000, message: 'success', data: updated })
  } catch (error) {
    console.error('[API] 更新患者失败:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

router.delete('/patients/:id', (req, res) => {
  try {
    const success = PatientDAO.deletePatient(req.params.id)
    if (!success) {
      return res.status(404).json({ code: 40400, message: '患者不存在' })
    }
    res.json({ code: 10000, message: 'success' })
  } catch (error) {
    console.error('[API] 删除患者失败:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

router.get('/documents', (req, res) => {
  try {
    const patientId = req.query.patientId
    if (!patientId) {
      return res.status(400).json({ code: 40000, message: 'patientId 不能为空' })
    }
    const documents = DocumentDAO.getDocumentsByPatientId(patientId)
    res.json({ code: 10000, message: 'success', data: documents })
  } catch (error) {
    console.error('[API] 获取文档列表失败:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

router.get('/documents/:id', (req, res) => {
  try {
    const document = DocumentDAO.getDocumentById(req.params.id)
    if (!document) {
      return res.status(404).json({ code: 40400, message: '文档不存在' })
    }
    res.json({ code: 10000, message: 'success', data: document })
  } catch (error) {
    console.error('[API] 获取文档详情失败:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

router.post('/documents', (req, res) => {
  try {
    const document = req.body
    if (!document.patientId || !document.name) {
      return res.status(400).json({ code: 40000, message: 'patientId 和 name 不能为空' })
    }
    const created = DocumentDAO.createDocument(document)
    res.json({ code: 10000, message: 'success', data: created })
  } catch (error) {
    console.error('[API] 创建文档失败:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

router.put('/documents/:id', (req, res) => {
  try {
    const document = req.body
    const updated = DocumentDAO.updateDocument(req.params.id, document)
    if (!updated) {
      return res.status(404).json({ code: 40400, message: '文档不存在' })
    }
    res.json({ code: 10000, message: 'success', data: updated })
  } catch (error) {
    console.error('[API] 更新文档失败:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

router.delete('/documents/:id', (req, res) => {
  try {
    const success = DocumentDAO.deleteDocument(req.params.id)
    if (!success) {
      return res.status(404).json({ code: 40400, message: '文档不存在' })
    }
    res.json({ code: 10000, message: 'success' })
  } catch (error) {
    console.error('[API] 删除文档失败:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

router.get('/config/:key', (req, res) => {
  try {
    const value = ConfigDAO.get(req.params.key)
    res.json({ code: 10000, message: 'success', data: value })
  } catch (error) {
    console.error('[API] 获取配置失败:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

router.post('/config/:key', (req, res) => {
  try {
    const { value } = req.body
    if (value === undefined) {
      return res.status(400).json({ code: 40000, message: 'value 不能为空' })
    }
    ConfigDAO.set(req.params.key, value)
    res.json({ code: 10000, message: 'success' })
  } catch (error) {
    console.error('[API] 设置配置失败:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

router.delete('/config/:key', (req, res) => {
  try {
    ConfigDAO.delete(req.params.key)
    res.json({ code: 10000, message: 'success' })
  } catch (error) {
    console.error('[API] 删除配置失败:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

router.post('/ai/chat', async (req, res) => {
  try {
    const { messages, provider = 'deepseek', model, temperature = 0.7 } = req.body
    
    let apiKey, apiUrl, actualModel
    
    if (provider === 'openai') {
      apiKey = process.env.OPENAI_API_KEY
      apiUrl = 'https://api.openai.com/v1/chat/completions'
      actualModel = model || 'gpt-3.5-turbo'
    } else {
      apiKey = process.env.DEEPSEEK_API_KEY
      apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions'
      actualModel = model || process.env.DEEPSEEK_MODEL || 'deepseek-chat'
    }
    
    if (!apiKey) {
      return res.status(500).json({ code: 50001, message: `AI API Key 未配置 (${provider})` })
    }
    
    console.log(`[AI] 调用 ${provider} API, model: ${actualModel}`)
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: actualModel,
        messages,
        temperature
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('[API] AI 请求失败:', response.status, error)
      return res.status(500).json({ code: 50002, message: 'AI 请求失败' })
    }
    
    const data = await response.json()
    res.json({ code: 10000, message: 'success', data: data })
  } catch (error) {
    console.error('[API] AI 接口异常:', error)
    res.status(500).json({ code: 50000, message: error.message })
  }
})

module.exports = router
