import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Patient {
  id: string
  bedNumber: string
  name: string
  gender: string
  age: number
  idCard?: string
  inpatientId: string
  admissionDate: string
  diagnosis?: string
  dischargeDate?: string
  allergy?: string
  department?: string
  doctor?: string
}

export const usePatientStore = defineStore('patient', () => {
  const currentPatient = ref<Patient | null>(null)
  const patientList = ref<Patient[]>([])
  const recentPatients = ref<Patient[]>([])

  const setCurrentPatient = (patient: Patient): void => {
    currentPatient.value = patient
    addToRecentPatients(patient)
    console.log('[PatientStore] 设置当前患者:', patient.name, patient.id)
  }

  const clearCurrentPatient = (): void => {
    currentPatient.value = null
    console.log('[PatientStore] 清除当前患者')
  }

  const setPatientList = (patients: Patient[]): void => {
    patientList.value = patients
    console.log('[PatientStore] 设置患者列表:', patients.length, '人')
  }

  const addToRecentPatients = (patient: Patient): void => {
    const index = recentPatients.value.findIndex(p => p.id === patient.id)
    if (index > -1) {
      recentPatients.value.splice(index, 1)
    }
    recentPatients.value.unshift(patient)
    if (recentPatients.value.length > 10) {
      recentPatients.value = recentPatients.value.slice(0, 10)
    }
  }

  const getPatientById = (id: string): Patient | undefined => {
    return patientList.value.find(p => p.id === id) ||
           recentPatients.value.find(p => p.id === id)
  }

  const isCurrentPatient = computed(() => {
    return currentPatient.value !== null
  })

  const patientDisplayName = computed(() => {
    return currentPatient.value?.name || '未选择患者'
  })

  return {
    currentPatient,
    patientList,
    recentPatients,
    setCurrentPatient,
    clearCurrentPatient,
    setPatientList,
    getPatientById,
    isCurrentPatient,
    patientDisplayName
  }
})
