const API_BASE = '/api'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

function mapPatientFromDb(dbPatient: any): Patient {
  return {
    id: dbPatient.id,
    name: dbPatient.name,
    gender: dbPatient.gender,
    age: dbPatient.age,
    idCard: dbPatient.id_card,
    inpatientId: dbPatient.inpatient_id,
    admissionDate: dbPatient.admission_date,
    dischargeDate: dbPatient.discharge_date,
    diagnosis: dbPatient.diagnosis,
    allergy: dbPatient.allergy,
    department: dbPatient.department,
    bedNumber: dbPatient.bed_number,
    doctor: dbPatient.doctor,
    created_at: dbPatient.created_at,
    updated_at: dbPatient.updated_at
  }
}

function mapDocumentFromDb(dbDoc: any): Document {
  return {
    id: dbDoc.id,
    patientId: dbDoc.patient_id,
    name: dbDoc.name,
    category: dbDoc.category,
    docType: dbDoc.doc_type,
    content: dbDoc.content,
    status: dbDoc.status,
    created_at: dbDoc.created_at,
    updated_at: dbDoc.updated_at
  }
}

function mapDocumentToDb(doc: Partial<Document>): any {
  return {
    patientId: doc.patientId,
    name: doc.name,
    category: doc.category,
    docType: doc.docType,
    content: doc.content,
    status: doc.status
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  })

  const result: ApiResponse<T> = await response.json()

  if (result.code !== 10000) {
    throw new Error(result.message || '请求失败')
  }

  return result.data
}

export interface Patient {
  id: string
  name: string
  gender: string
  age: number
  idCard?: string
  inpatientId: string
  admissionDate?: string
  dischargeDate?: string
  diagnosis?: string
  allergy?: string
  department?: string
  bedNumber?: string
  doctor?: string
  created_at?: string
  updated_at?: string
}

export interface Document {
  id: string
  patientId: string
  name: string
  category?: string
  docType?: string
  content?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export const patientApi = {
  getAll: async () => {
    const data = await request<any[]>('/patients')
    return data.map(mapPatientFromDb)
  },

  getRecent: async (limit = 10) => {
    const data = await request<any[]>(`/patients/recent?limit=${limit}`)
    return data.map(mapPatientFromDb)
  },

  search: async (keyword: string) => {
    const data = await request<any[]>(`/patients/search?keyword=${encodeURIComponent(keyword)}`)
    return data.map(mapPatientFromDb)
  },

  getById: async (id: string) => {
    const data = await request<any>(`/patients/${id}`)
    return mapPatientFromDb(data)
  },

  create: async (patient: Omit<Patient, 'id'>) => {
    const data = await request<any>('/patients', {
      method: 'POST',
      body: JSON.stringify(patient)
    })
    return mapPatientFromDb(data)
  },

  update: async (id: string, patient: Patient) => {
    const data = await request<any>(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patient)
    })
    return mapPatientFromDb(data)
  },

  delete: (id: string) => request<void>(`/patients/${id}`, {
    method: 'DELETE'
  })
}

export const documentApi = {
  getByPatientId: async (patientId: string) => {
    const data = await request<any[]>(`/documents?patientId=${patientId}`)
    return data.map(mapDocumentFromDb)
  },

  getById: async (id: string) => {
    const data = await request<any>(`/documents/${id}`)
    return mapDocumentFromDb(data)
  },

  create: async (document: Omit<Document, 'id'>) => {
    const data = await request<any>('/documents', {
      method: 'POST',
      body: JSON.stringify(mapDocumentToDb(document))
    })
    return mapDocumentFromDb(data)
  },

  update: async (id: string, document: Partial<Document>) => {
    const data = await request<any>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(mapDocumentToDb(document))
    })
    return mapDocumentFromDb(data)
  },

  delete: (id: string) => request<void>(`/documents/${id}`, {
    method: 'DELETE'
  })
}

export const configApi = {
  get: (key: string) => request<string | null>(`/config/${key}`),
  
  set: (key: string, value: string) => request<void>(`/config/${key}`, {
    method: 'POST',
    body: JSON.stringify({ value })
  }),
  
  delete: (key: string) => request<void>(`/config/${key}`, {
    method: 'DELETE'
  })
}
