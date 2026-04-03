const db = require('./db')

const MOCK_PATIENTS = [
  {
    id: 'IP001',
    name: '张三',
    gender: '男',
    age: 45,
    inpatientId: 'ZY2024001',
    admissionDate: '2024-01-15',
    diagnosis: '社区获得性肺炎',
    allergy: '青霉素过敏',
    department: '呼吸内科',
    bedNumber: 'A101',
    doctor: '李医生'
  },
  {
    id: 'IP002',
    name: '李四',
    gender: '女',
    age: 62,
    inpatientId: 'ZY2024002',
    admissionDate: '2024-01-18',
    diagnosis: '2型糖尿病伴周围神经病变',
    department: '内分泌科',
    bedNumber: 'A102',
    doctor: '王医生'
  },
  {
    id: 'IP003',
    name: '王五',
    gender: '男',
    age: 38,
    inpatientId: 'ZY2024003',
    admissionDate: '2024-01-20',
    diagnosis: '急性阑尾炎',
    department: '普外科',
    bedNumber: 'B201',
    doctor: '张医生'
  },
  {
    id: 'IP004',
    name: '赵六',
    gender: '女',
    age: 55,
    inpatientId: 'ZY2024004',
    admissionDate: '2024-01-22',
    diagnosis: '高血压病3级（极高危）',
    department: '心血管内科',
    bedNumber: 'B202',
    doctor: '刘医生'
  },
  {
    id: 'IP005',
    name: '孙七',
    gender: '男',
    age: 28,
    inpatientId: 'ZY2024005',
    admissionDate: '2024-01-25',
    diagnosis: '急性胃肠炎',
    department: '消化内科',
    bedNumber: 'C301',
    doctor: '陈医生'
  },
  {
    id: 'DC001',
    name: '周八',
    gender: '男',
    age: 67,
    inpatientId: 'ZY2023001',
    admissionDate: '2023-12-01',
    dischargeDate: '2024-01-15',
    diagnosis: '慢性阻塞性肺疾病急性加重',
    department: '呼吸内科',
    bedNumber: 'A105',
    doctor: '李医生'
  },
  {
    id: 'DC002',
    name: '吴九',
    gender: '女',
    age: 42,
    inpatientId: 'ZY2023002',
    admissionDate: '2023-12-10',
    dischargeDate: '2024-01-05',
    diagnosis: '胆囊结石伴急性胆囊炎',
    department: '肝胆外科',
    bedNumber: 'D401',
    doctor: '赵医生'
  },
  {
    id: 'DC003',
    name: '郑十',
    gender: '男',
    age: 73,
    inpatientId: 'ZY2023003',
    admissionDate: '2023-11-20',
    dischargeDate: '2023-12-25',
    diagnosis: '冠心病 不稳定性心绞痛',
    department: '心血管内科',
    bedNumber: 'E501',
    doctor: '刘医生'
  }
]

const seedDatabase = () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM patients').get()
  
  if (count.count === 0) {
    console.log('[Seed] 数据库为空，开始导入 Mock 数据...')
    
    const insert = db.prepare(`
      INSERT INTO patients (
        id, name, gender, age, inpatient_id, admission_date, 
        discharge_date, diagnosis, allergy, department, bed_number, doctor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const insertMany = db.transaction((patients) => {
      for (const p of patients) {
        insert.run(
          p.id,
          p.name,
          p.gender,
          p.age,
          p.inpatientId,
          p.admissionDate || null,
          p.dischargeDate || null,
          p.diagnosis || null,
          p.allergy || null,
          p.department || null,
          p.bedNumber || null,
          p.doctor || null
        )
      }
    })
    
    insertMany(MOCK_PATIENTS)
    console.log(`[Seed] 成功导入 ${MOCK_PATIENTS.length} 条患者数据`)
  } else {
    console.log(`[Seed] 数据库已有 ${count.count} 条患者数据，跳过初始化`)
  }
}

seedDatabase()
