<template>
  <div class="patient-list-page">
    <header class="page-header">
      <div class="header-left">
        <el-tabs v-model="activeTab" class="patient-tabs" @tab-change="handleTabChange">
          <el-tab-pane label="在院病人" name="inpatient">
            <template #label>
              <span class="tab-label">
                <i class="fa fa-hospital-o"></i>
                <span>在院病人</span>
                <el-badge :value="inpatientCount" class="tab-badge" />
              </span>
            </template>
          </el-tab-pane>
          <el-tab-pane label="出院病人" name="discharged">
            <template #label>
              <span class="tab-label">
                <i class="fa fa-sign-out"></i>
                <span>出院病人</span>
                <el-badge :value="dischargedCount" class="tab-badge" />
              </span>
            </template>
          </el-tab-pane>
        </el-tabs>
      </div>
      
      <div class="header-right">
        <div class="view-toggle">
          <el-tooltip content="卡片视图" placement="top">
            <el-button 
              :type="viewMode === 'card' ? 'primary' : 'default'"
              :icon="Grid"
              @click="viewMode = 'card'"
            />
          </el-tooltip>
          <el-tooltip content="列表视图" placement="top">
            <el-button 
              :type="viewMode === 'list' ? 'primary' : 'default'"
              :icon="List"
              @click="viewMode = 'list'"
            />
          </el-tooltip>
        </div>
        
        <el-button type="primary" @click="addNewPatient">
          <i class="fa fa-plus"></i>
          新增患者
        </el-button>
        
        <el-button @click="goToTemplateManager">
          <i class="fa fa-file-text"></i>
          模板管理
        </el-button>
        
        <el-input
          v-model="searchKeyword"
          placeholder="搜索床号/姓名"
          :prefix-icon="Search"
          clearable
          class="search-input"
          @input="handleSearch"
        />
        
        <el-button 
          v-if="activeTab === 'discharged'" 
          type="success" 
          @click="showFilterDialog"
        >
          <i class="fa fa-filter"></i>
          筛选
        </el-button>
      </div>
    </header>
    
    <main class="page-content">
      <template v-if="viewMode === 'card'">
        <div class="card-grid">
          <el-card
            v-for="patient in filteredPatients"
            :key="patient.id"
            class="patient-card"
            :class="{ 'inpatient-card': activeTab === 'inpatient' }"
            shadow="hover"
            @click="goToPatientDetail(patient)"
          >
            <template #header>
              <div class="card-header">
                <span class="bed-number" :class="{ 'bed-active': activeTab === 'inpatient' }">
                  {{ patient.bedNumber }}床
                </span>
                <span class="patient-name">{{ patient.name }}</span>
                <el-tag 
                  :type="patient.gender === '男' ? 'primary' : 'danger'" 
                  size="small"
                  class="gender-tag"
                >
                  {{ patient.gender }}
                </el-tag>
              </div>
            </template>
            
            <div class="card-body">
              <div class="info-row">
                <span class="info-label">年龄</span>
                <span class="info-value">{{ patient.age }}岁</span>
              </div>
              <div class="info-row">
                <span class="info-label">住院号</span>
                <span class="info-value">{{ patient.inpatientId }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">入院日期</span>
                <span class="info-value">{{ patient.admissionDate }}</span>
              </div>
              <div v-if="patient.diagnosis" class="info-row diagnosis-row">
                <span class="info-label">诊断</span>
                <span class="info-value diagnosis-text">{{ patient.diagnosis }}</span>
              </div>
              <div v-if="patient.dischargeDate" class="info-row">
                <span class="info-label">出院日期</span>
                <span class="info-value">{{ patient.dischargeDate }}</span>
              </div>
            </div>
            
            <div class="card-footer">
              <el-button type="primary" text size="small" @click.stop="goToPatientDetail(patient)">
                <i class="fa fa-file-text-o"></i>
                查看病历
              </el-button>
              <el-button type="default" text size="small" @click.stop="editPatient(patient)">
                <i class="fa fa-edit"></i>
                编辑
              </el-button>
              <el-button 
                v-if="activeTab === 'inpatient'" 
                type="warning" 
                text 
                size="small" 
                @click.stop="dischargePatient(patient)"
              >
                <i class="fa fa-sign-out"></i>
                出院
              </el-button>
              <el-button 
                v-if="activeTab === 'discharged'" 
                type="success" 
                text 
                size="small" 
                @click.stop="readmitPatient(patient)"
              >
                <i class="fa fa-hospital-o"></i>
                再入院
              </el-button>
              <el-button type="danger" text size="small" @click.stop="deletePatient(patient)">
                <i class="fa fa-trash-o"></i>
                删除
              </el-button>
            </div>
          </el-card>
        </div>
        
        <el-empty v-if="filteredPatients.length === 0" description="暂无患者数据" />
      </template>
      
      <template v-else>
        <el-table
          :data="filteredPatients"
          stripe
          highlight-current-row
          class="patient-table"
          @row-click="goToPatientDetail"
        >
          <el-table-column prop="bedNumber" label="床位号" width="100" align="center">
            <template #default="{ row }">
              <span class="bed-number-cell" :class="{ 'bed-active': activeTab === 'inpatient' }">
                {{ row.bedNumber }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="姓名" width="120">
            <template #default="{ row }">
              <span class="patient-name-cell">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="gender" label="性别" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.gender === '男' ? 'primary' : 'danger'" size="small">
                {{ row.gender }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="age" label="年龄" width="80" align="center">
            <template #default="{ row }">
              {{ row.age }}岁
            </template>
          </el-table-column>
          <el-table-column prop="inpatientId" label="住院号" width="140" />
          <el-table-column prop="admissionDate" label="入院日期" width="120" />
          <el-table-column prop="diagnosis" label="诊断" min-width="200" show-overflow-tooltip />
          <el-table-column v-if="activeTab === 'discharged'" prop="dischargeDate" label="出院日期" width="120" />
          <el-table-column label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click.stop="goToPatientDetail(row)">
                查看病历
              </el-button>
              <el-button type="default" link size="small" @click.stop="editPatient(row)">
                编辑
              </el-button>
              <el-button 
                v-if="activeTab === 'inpatient'" 
                type="warning" 
                link 
                size="small" 
                @click.stop="dischargePatient(row)"
              >
                出院
              </el-button>
              <el-button 
                v-if="activeTab === 'discharged'" 
                type="success" 
                link 
                size="small" 
                @click.stop="readmitPatient(row)"
              >
                再入院
              </el-button>
              <el-button type="danger" link size="small" @click.stop="deletePatient(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="table-footer">
          <span class="total-count">共 {{ filteredPatients.length }} 条记录</span>
        </div>
      </template>
    </main>
    
    <el-dialog
      v-model="dischargeDialogVisible"
      title="办理出院"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="discharge-form">
        <div class="discharge-patient-info">
          <span class="label">患者姓名：</span>
          <span class="value">{{ dischargingPatient?.name }}</span>
        </div>
        <div class="discharge-patient-info">
          <span class="label">床号：</span>
          <span class="value">{{ dischargingPatient?.bedNumber }}</span>
        </div>
        <el-form label-width="80px" class="discharge-time-form">
          <el-form-item label="出院时间" required>
            <el-date-picker
              v-model="dischargeDateTime"
              type="datetime"
              placeholder="选择出院时间"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              :disabled-date="disabledDate"
              style="width: 100%"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="dischargeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDischarge">确定出院</el-button>
      </template>
    </el-dialog>
    
    <el-dialog
      v-model="addPatientDialogVisible"
      title="新增患者"
      width="600px"
      :close-on-click-modal="false"
      @closed="resetAddPatientForm"
    >
      <el-form
        ref="addPatientFormRef"
        :model="newPatientForm"
        :rules="addPatientRules"
        label-width="100px"
        class="add-patient-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="newPatientForm.name" placeholder="请输入患者姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="newPatientForm.gender">
                <el-radio value="男">男</el-radio>
                <el-radio value="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="年龄" prop="age">
              <el-input-number v-model="newPatientForm.age" :min="0" :max="150" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="床位号" prop="bedNumber">
              <el-input v-model="newPatientForm.bedNumber" placeholder="如：A101" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="住院号" prop="inpatientId">
              <el-input v-model="newPatientForm.inpatientId" placeholder="如：ZY2024001" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身份证" prop="idCard">
              <el-input v-model="newPatientForm.idCard" placeholder="请输入身份证号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入院日期" prop="admissionDate">
              <el-date-picker
                v-model="newPatientForm.admissionDate"
                type="date"
                placeholder="选择入院日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
          </el-col>
        </el-row>
        <el-form-item label="科室" prop="department">
          <el-select v-model="newPatientForm.department" placeholder="请选择科室" style="width: 100%">
            <el-option label="呼吸内科" value="呼吸内科" />
            <el-option label="心内科" value="心内科" />
            <el-option label="消化内科" value="消化内科" />
            <el-option label="内分泌科" value="内分泌科" />
            <el-option label="神经内科" value="神经内科" />
            <el-option label="普外科" value="普外科" />
            <el-option label="骨科" value="骨科" />
            <el-option label="泌尿外科" value="泌尿外科" />
            <el-option label="神经外科" value="神经外科" />
            <el-option label="妇产科" value="妇产科" />
            <el-option label="产科" value="产科" />
            <el-option label="儿科" value="儿科" />
            <el-option label="急诊科" value="急诊科" />
            <el-option label="ICU" value="ICU" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="主治医师" prop="doctor">
          <el-input v-model="newPatientForm.doctor" placeholder="请输入主治医师姓名" />
        </el-form-item>
        <el-form-item label="初步诊断" prop="diagnosis">
          <el-input v-model="newPatientForm.diagnosis" type="textarea" :rows="2" placeholder="请输入初步诊断" />
        </el-form-item>
        <el-form-item label="过敏史" prop="allergy">
          <el-input v-model="newPatientForm.allergy" placeholder="如：青霉素过敏（无则留空）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addPatientDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveNewPatient">保存</el-button>
      </template>
    </el-dialog>
    
    <el-dialog
      v-model="filterDialogVisible"
      title="出院病人筛选"
      width="500px"
      :close-on-click-modal="false"
      @closed="resetFilterForm"
    >
      <el-form label-width="100px" class="filter-form">
        <el-form-item label="住院号">
          <el-input v-model="filterForm.inpatientId" placeholder="请输入住院号" clearable />
        </el-form-item>
        <el-form-item label="身份证">
          <el-input v-model="filterForm.idCard" placeholder="请输入身份证号" clearable />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="filterForm.name" placeholder="请输入患者姓名" clearable />
        </el-form-item>
        <el-form-item label="出院时间段">
          <el-date-picker
            v-model="filterForm.dischargeDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetFilterForm">重置</el-button>
        <el-button type="primary" @click="applyFilter">应用筛选</el-button>
      </template>
    </el-dialog>
    
    <el-dialog
      v-model="editPatientDialogVisible"
      title="编辑患者信息"
      width="600px"
      :close-on-click-modal="false"
      @closed="resetEditPatientForm"
    >
      <el-form
        ref="editPatientFormRef"
        :model="editPatientForm"
        :rules="addPatientRules"
        label-width="100px"
        class="add-patient-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="editPatientForm.name" placeholder="请输入患者姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="editPatientForm.gender">
                <el-radio value="男">男</el-radio>
                <el-radio value="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="年龄" prop="age">
              <el-input-number v-model="editPatientForm.age" :min="0" :max="150" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="床位号" prop="bedNumber">
              <el-input v-model="editPatientForm.bedNumber" placeholder="如：A101" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="住院号" prop="inpatientId">
              <el-input v-model="editPatientForm.inpatientId" placeholder="如：ZY2024001" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身份证" prop="idCard">
              <el-input v-model="editPatientForm.idCard" placeholder="请输入身份证号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入院日期" prop="admissionDate">
              <el-date-picker
                v-model="editPatientForm.admissionDate"
                type="date"
                placeholder="选择入院日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
          </el-col>
        </el-row>
        <el-form-item label="科室" prop="department">
          <el-select v-model="editPatientForm.department" placeholder="请选择科室" style="width: 100%">
            <el-option label="呼吸内科" value="呼吸内科" />
            <el-option label="心内科" value="心内科" />
            <el-option label="消化内科" value="消化内科" />
            <el-option label="内分泌科" value="内分泌科" />
            <el-option label="神经内科" value="神经内科" />
            <el-option label="普外科" value="普外科" />
            <el-option label="骨科" value="骨科" />
            <el-option label="泌尿外科" value="泌尿外科" />
            <el-option label="神经外科" value="神经外科" />
            <el-option label="妇产科" value="妇产科" />
            <el-option label="产科" value="产科" />
            <el-option label="儿科" value="儿科" />
            <el-option label="急诊科" value="急诊科" />
            <el-option label="ICU" value="ICU" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="主治医师" prop="doctor">
          <el-input v-model="editPatientForm.doctor" placeholder="请输入主治医师姓名" />
        </el-form-item>
        <el-form-item label="初步诊断" prop="diagnosis">
          <el-input v-model="editPatientForm.diagnosis" type="textarea" :rows="2" placeholder="请输入初步诊断" />
        </el-form-item>
        <el-form-item label="过敏史" prop="allergy">
          <el-input v-model="editPatientForm.allergy" placeholder="如：青霉素过敏（无则留空）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editPatientDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEditPatient">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Grid, List } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePatientStore, type Patient } from '../stores/patient'
import { patientApi } from '../utils/api'

const router = useRouter()
const patientStore = usePatientStore()

const activeTab = ref<'inpatient' | 'discharged'>('inpatient')
const viewMode = ref<'card' | 'list'>('card')
const searchKeyword = ref('')
const isLoading = ref(false)

const dischargeDialogVisible = ref(false)
const dischargingPatient = ref<Patient | null>(null)
const dischargeDateTime = ref('')

const addPatientDialogVisible = ref(false)
const addPatientFormRef = ref()
const newPatientForm = ref({
  name: '',
  gender: '男',
  age: 45,
  bedNumber: '',
  inpatientId: '',
  idCard: '',
  admissionDate: '',
  department: '',
  doctor: '',
  diagnosis: '',
  allergy: ''
})

const filterDialogVisible = ref(false)
const filterForm = ref({
  inpatientId: '',
  idCard: '',
  name: '',
  startDate: '',
  endDate: ''
})

const editPatientDialogVisible = ref(false)
const editPatientFormRef = ref()
const editPatientForm = ref({
  id: '',
  name: '',
  gender: '男',
  age: 45,
  bedNumber: '',
  inpatientId: '',
  idCard: '',
  admissionDate: '',
  department: '',
  doctor: '',
  diagnosis: '',
  allergy: ''
})
const editingPatient = ref<Patient | null>(null)

const addPatientRules = {
  name: [{ required: true, message: '请输入患者姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  age: [{ required: true, message: '请输入年龄', trigger: 'blur' }],
  bedNumber: [{ required: true, message: '请输入床位号', trigger: 'blur' }],
  inpatientId: [{ required: true, message: '请输入住院号', trigger: 'blur' }],
  admissionDate: [{ required: true, message: '请选择入院日期', trigger: 'change' }],
  department: [{ required: true, message: '请选择科室', trigger: 'change' }]
}

const disabledDate = (time: Date): boolean => {
  return time.getTime() > Date.now()
}

const inpatientData = ref<Patient[]>([
  {
    id: 'IP001',
    bedNumber: 'A101',
    name: '张三',
    gender: '男',
    age: 45,
    inpatientId: 'ZY2024001',
    admissionDate: '2024-01-15',
    diagnosis: '社区获得性肺炎',
    allergy: '青霉素过敏',
    department: '呼吸内科',
    doctor: '李医生'
  },
  {
    id: 'IP002',
    bedNumber: 'A102',
    name: '李四',
    gender: '女',
    age: 62,
    inpatientId: 'ZY2024002',
    admissionDate: '2024-01-18',
    diagnosis: '2型糖尿病伴周围神经病变',
    department: '内分泌科',
    doctor: '王医生'
  },
  {
    id: 'IP003',
    bedNumber: 'B201',
    name: '王五',
    gender: '男',
    age: 38,
    inpatientId: 'ZY2024003',
    admissionDate: '2024-01-20',
    diagnosis: '急性阑尾炎',
    department: '普外科',
    doctor: '张医生'
  },
  {
    id: 'IP004',
    bedNumber: 'B202',
    name: '赵六',
    gender: '女',
    age: 55,
    inpatientId: 'ZY2024004',
    admissionDate: '2024-01-22',
    diagnosis: '高血压病3级（极高危）',
    department: '心内科',
    doctor: '刘医生'
  },
  {
    id: 'IP005',
    bedNumber: 'C301',
    name: '钱七',
    gender: '男',
    age: 70,
    inpatientId: 'ZY2024005',
    admissionDate: '2024-01-25',
    diagnosis: '冠状动脉粥样硬化性心脏病',
    department: '心内科',
    doctor: '刘医生'
  },
  {
    id: 'IP006',
    bedNumber: 'C302',
    name: '孙八',
    gender: '女',
    age: 28,
    inpatientId: 'ZY2024006',
    admissionDate: '2024-01-26',
    diagnosis: '妊娠期糖尿病',
    department: '产科',
    doctor: '陈医生'
  },
  {
    id: 'IP007',
    bedNumber: 'D401',
    name: '周九',
    gender: '男',
    age: 48,
    inpatientId: 'ZY2024007',
    admissionDate: '2024-01-28',
    diagnosis: '腰椎间盘突出症',
    department: '骨科',
    doctor: '赵医生'
  },
  {
    id: 'IP008',
    bedNumber: 'D402',
    name: '吴十',
    gender: '女',
    age: 35,
    inpatientId: 'ZY2024008',
    admissionDate: '2024-01-29',
    diagnosis: '甲状腺功能亢进症',
    department: '内分泌科',
    doctor: '王医生'
  }
])

const dischargedData = ref<Patient[]>([
  {
    id: 'DP001',
    bedNumber: 'A103',
    name: '郑十一',
    gender: '男',
    age: 52,
    inpatientId: 'ZY2023098',
    idCard: '110101197205011234',
    admissionDate: '2023-12-01',
    diagnosis: '急性上呼吸道感染',
    dischargeDate: '2024-01-10',
    department: '呼吸内科'
  },
  {
    id: 'DP002',
    bedNumber: 'B203',
    name: '王十二',
    gender: '女',
    age: 67,
    inpatientId: 'ZY2023102',
    idCard: '110101195703055678',
    admissionDate: '2023-12-05',
    diagnosis: '慢性阻塞性肺疾病急性加重期',
    dischargeDate: '2024-01-15',
    department: '呼吸内科'
  },
  {
    id: 'DP003',
    bedNumber: 'C303',
    name: '冯十三',
    gender: '男',
    age: 41,
    inpatientId: 'ZY2023110',
    idCard: '110101198307109012',
    admissionDate: '2023-12-10',
    diagnosis: '胃溃疡',
    dischargeDate: '2024-01-20',
    department: '消化内科'
  }
])

const loadPatientsFromServer = async () => {
  isLoading.value = true
  try {
    const patients = await patientApi.getAll()
    console.log('[PatientList] 从服务器加载患者数据:', patients.length)
    
    const inpatient = patients.filter(p => !p.dischargeDate)
    const discharged = patients.filter(p => p.dischargeDate)
    
    inpatientData.value = inpatient
    dischargedData.value = discharged
    
    patientStore.setPatientList(patients)
    ElMessage.success(`已加载 ${patients.length} 条患者数据`)
  } catch (error) {
    console.error('[PatientList] 加载患者数据失败:', error)
    ElMessage.error('加载患者数据失败，将使用本地数据')
    
    const allPatients = [...inpatientData.value, ...dischargedData.value]
    patientStore.setPatientList(allPatients)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadPatientsFromServer()
})

const inpatientCount = computed(() => inpatientData.value.length)
const dischargedCount = computed(() => dischargedData.value.length)

const currentPatients = computed(() => {
  return activeTab.value === 'inpatient' ? inpatientData.value : dischargedData.value
})

const filteredPatients = computed(() => {
  let patients = currentPatients.value
  
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase().trim()
    patients = patients.filter(patient => 
      patient.bedNumber.toLowerCase().includes(keyword) ||
      patient.name.toLowerCase().includes(keyword)
    )
  }
  
  if (activeTab.value === 'discharged') {
    if (filterForm.value.inpatientId.trim()) {
      patients = patients.filter(p => 
        p.inpatientId.toLowerCase().includes(filterForm.value.inpatientId.toLowerCase())
      )
    }
    
    if (filterForm.value.idCard.trim()) {
      patients = patients.filter(p => 
        p.idCard?.toLowerCase().includes(filterForm.value.idCard.toLowerCase())
      )
    }
    
    if (filterForm.value.name.trim()) {
      patients = patients.filter(p => 
        p.name.toLowerCase().includes(filterForm.value.name.toLowerCase())
      )
    }
    
    if (filterForm.value.dischargeDateRange.length === 2) {
      const [startDate, endDate] = filterForm.value.dischargeDateRange
      patients = patients.filter(p => {
        if (!p.dischargeDate) return false
        return p.dischargeDate >= startDate && p.dischargeDate <= endDate
      })
    }
  }
  
  return patients
})

const handleTabChange = (tabName: string): void => {
  console.log('[PatientList] 切换到:', tabName)
  searchKeyword.value = ''
}

const handleSearch = (): void => {
  console.log('[PatientList] 搜索关键词:', searchKeyword.value)
}

const goToPatientDetail = (patient: Patient): void => {
  console.log('[PatientList] 查看患者详情:', {
    id: patient.id,
    name: patient.name,
    bedNumber: patient.bedNumber,
    inpatientId: patient.inpatientId
  })
  
  patientStore.setCurrentPatient(patient)
  
  router.push(`/patient/${patient.id}/emr`)
}

const editPatient = (patient: Patient): void => {
  console.log('[PatientList] 编辑患者:', patient)
  editingPatient.value = patient
  editPatientForm.value = {
    id: patient.id,
    name: patient.name,
    gender: patient.gender,
    age: patient.age,
    bedNumber: patient.bedNumber,
    inpatientId: patient.inpatientId,
    idCard: patient.idCard || '',
    admissionDate: patient.admissionDate,
    department: patient.department || '',
    doctor: patient.doctor || '',
    diagnosis: patient.diagnosis || '',
    allergy: patient.allergy || ''
  }
  editPatientDialogVisible.value = true
}

const deletePatient = (patient: Patient): void => {
  ElMessageBox.confirm(
    `确定要删除患者「${patient.name}」吗？此操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(async () => {
    try {
      await patientApi.delete(patient.id)
      
      if (activeTab.value === 'inpatient') {
        const index = inpatientData.value.findIndex(p => p.id === patient.id)
        if (index > -1) {
          inpatientData.value.splice(index, 1)
        }
      } else {
        const index = dischargedData.value.findIndex(p => p.id === patient.id)
        if (index > -1) {
          dischargedData.value.splice(index, 1)
        }
      }
      
      const allPatients = [...inpatientData.value, ...dischargedData.value]
      patientStore.setPatientList(allPatients)
      
      ElMessage.success(`患者「${patient.name}」已删除`)
      console.log('[PatientList] 删除患者成功:', patient.name)
    } catch (error) {
      console.error('[PatientList] 删除患者失败:', error)
      ElMessage.error('删除患者失败')
    }
  }).catch(() => {})
}

const dischargePatient = (patient: Patient): void => {
  dischargingPatient.value = patient
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  dischargeDateTime.value = `${year}-${month}-${day} ${hours}:${minutes}`
  dischargeDialogVisible.value = true
}

const confirmDischarge = (): void => {
  if (!dischargeDateTime.value) {
    ElMessage.warning('请选择出院时间')
    return
  }
  
  if (!dischargingPatient.value) return
  
  const patient = dischargingPatient.value
  const index = inpatientData.value.findIndex(p => p.id === patient.id)
  
  if (index > -1) {
    inpatientData.value.splice(index, 1)
    
    const dischargedPatient: Patient = {
      ...patient,
      dischargeDate: dischargeDateTime.value
    }
    dischargedData.value.unshift(dischargedPatient)
    
    ElMessage.success(`患者「${patient.name}」已出院`)
    console.log('[PatientList] 患者出院:', patient.name, dischargeDateTime.value)
    
    dischargeDialogVisible.value = false
    dischargingPatient.value = null
  }
}

const readmitPatient = (patient: Patient): void => {
  ElMessageBox.confirm(
    `确定要将患者「${patient.name}」办理再入院吗？`,
    '再入院确认',
    {
      confirmButtonText: '确定入院',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(() => {
    const today = new Date().toISOString().split('T')[0]
    const newId = 'IP' + Date.now().toString().slice(-6)
    
    const index = dischargedData.value.findIndex(p => p.id === patient.id)
    if (index > -1) {
      dischargedData.value.splice(index, 1)
      
      const readmittedPatient: Patient = {
        ...patient,
        id: newId,
        admissionDate: today,
        dischargeDate: undefined
      }
      inpatientData.value.unshift(readmittedPatient)
      
      ElMessage.success(`患者「${patient.name}」已再入院`)
      console.log('[PatientList] 患者再入院:', patient.name)
    }
  }).catch(() => {})
}

const addNewPatient = (): void => {
  const today = new Date().toISOString().split('T')[0]
  newPatientForm.value.admissionDate = today
  addPatientDialogVisible.value = true
}

const resetAddPatientForm = (): void => {
  newPatientForm.value = {
    name: '',
    gender: '男',
    age: 45,
    bedNumber: '',
    inpatientId: '',
    idCard: '',
    admissionDate: '',
    department: '',
    doctor: '',
    diagnosis: '',
    allergy: ''
  }
  addPatientFormRef.value?.resetFields()
}

const showFilterDialog = (): void => {
  filterDialogVisible.value = true
}

const resetFilterForm = (): void => {
  filterForm.value = {
    inpatientId: '',
    idCard: '',
    name: '',
    dischargeDateRange: []
  }
}

const applyFilter = (): void => {
  filterDialogVisible.value = false
  ElMessage.success('筛选已应用')
}

const resetEditPatientForm = (): void => {
  editPatientForm.value = {
    id: '',
    name: '',
    gender: '男',
    age: 45,
    bedNumber: '',
    inpatientId: '',
    idCard: '',
    admissionDate: '',
    department: '',
    doctor: '',
    diagnosis: '',
    allergy: ''
  }
  editingPatient.value = null
  editPatientFormRef.value?.resetFields()
}

const saveEditPatient = async (): Promise<void> => {
  if (!editPatientFormRef.value) return
  
  await editPatientFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      const updatedPatient = {
        id: editPatientForm.value.id,
        name: editPatientForm.value.name,
        gender: editPatientForm.value.gender,
        age: editPatientForm.value.age,
        bedNumber: editPatientForm.value.bedNumber,
        inpatientId: editPatientForm.value.inpatientId,
        idCard: editPatientForm.value.idCard,
        admissionDate: editPatientForm.value.admissionDate,
        department: editPatientForm.value.department,
        doctor: editPatientForm.value.doctor,
        diagnosis: editPatientForm.value.diagnosis,
        allergy: editPatientForm.value.allergy,
        dischargeDate: editingPatient.value?.dischargeDate
      }
      
      try {
        await patientApi.update(updatedPatient.id, updatedPatient)
        
        if (activeTab.value === 'inpatient') {
          const index = inpatientData.value.findIndex(p => p.id === updatedPatient.id)
          if (index > -1) {
            inpatientData.value[index] = updatedPatient
          }
        } else {
          const index = dischargedData.value.findIndex(p => p.id === updatedPatient.id)
          if (index > -1) {
            dischargedData.value[index] = updatedPatient
          }
        }
        
        const allPatients = [...inpatientData.value, ...dischargedData.value]
        patientStore.setPatientList(allPatients)
        
        ElMessage.success(`患者「${updatedPatient.name}」信息已更新`)
        console.log('[PatientList] 编辑患者成功:', updatedPatient)
      } catch (error) {
        console.error('[PatientList] 更新患者失败:', error)
        ElMessage.error('更新患者信息失败')
      }
      
      editPatientDialogVisible.value = false
    }
  })
}

const saveNewPatient = async (): Promise<void> => {
  if (!addPatientFormRef.value) return
  
  await addPatientFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      const newPatient = {
        name: newPatientForm.value.name,
        gender: newPatientForm.value.gender,
        age: newPatientForm.value.age,
        bedNumber: newPatientForm.value.bedNumber,
        inpatientId: newPatientForm.value.inpatientId,
        idCard: newPatientForm.value.idCard,
        admissionDate: newPatientForm.value.admissionDate,
        department: newPatientForm.value.department,
        doctor: newPatientForm.value.doctor,
        diagnosis: newPatientForm.value.diagnosis,
        allergy: newPatientForm.value.allergy
      }
      
      try {
        const created = await patientApi.create(newPatient)
        inpatientData.value.unshift(created)
        
        const allPatients = [...inpatientData.value, ...dischargedData.value]
        patientStore.setPatientList(allPatients)
        
        ElMessage.success(`患者「${newPatient.name}」已添加成功`)
        console.log('[PatientList] 新增患者成功:', created)
      } catch (error) {
        console.error('[PatientList] 创建患者失败:', error)
        ElMessage.error('创建患者信息失败')
      }
      
      addPatientDialogVisible.value = false
    }
  })
}

const goToTemplateManager = (): void => {
  router.push('/template-manager')
}
</script>

<style scoped>
.patient-list-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
}

.patient-tabs {
  --el-tabs-header-height: 40px;
}

.patient-tabs :deep(.el-tabs__header) {
  margin: 0;
  border-bottom: none;
}

.patient-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.patient-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 500;
  padding: 0 24px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-label i {
  font-size: 14px;
}

.tab-badge :deep(.el-badge__content) {
  background-color: #409eff;
  font-size: 11px;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.view-toggle {
  display: flex;
  gap: 0;
}

.view-toggle .el-button {
  border-radius: 0;
}

.view-toggle .el-button:first-child {
  border-radius: 4px 0 0 4px;
}

.view-toggle .el-button:last-child {
  border-radius: 0 4px 4px 0;
  margin-left: -1px;
}

.search-input {
  width: 220px;
}

.page-content {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.patient-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
  overflow: hidden;
}

.patient-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.inpatient-card {
  border-left: 4px solid #409eff;
}

.patient-card :deep(.el-card__header) {
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bed-number {
  font-size: 18px;
  font-weight: 700;
  color: #606266;
}

.bed-number.bed-active {
  color: #409eff;
}

.patient-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  flex: 1;
}

.gender-tag {
  font-size: 12px;
}

.card-body {
  padding: 8px 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed #ebeef5;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: #909399;
}

.info-value {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
}

.diagnosis-row {
  flex-direction: column;
  gap: 4px;
}

.diagnosis-text {
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
  margin-top: 8px;
}

.patient-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.bed-number-cell {
  font-weight: 600;
  color: #606266;
}

.bed-number-cell.bed-active {
  color: #409eff;
}

.patient-name-cell {
  font-weight: 500;
  color: #303133;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #ebeef5;
  border-radius: 0 0 8px 8px;
}

.total-count {
  font-size: 13px;
  color: #909399;
}

.discharge-form {
  padding: 10px 0;
}

.discharge-patient-info {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
}

.discharge-patient-info .label {
  color: #909399;
  width: 80px;
}

.discharge-patient-info .value {
  color: #303133;
  font-weight: 500;
}

.discharge-time-form {
  margin-top: 16px;
}

.add-patient-form {
  padding: 10px 20px;
}

.add-patient-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.add-patient-form :deep(.el-input-number) {
  width: 100%;
}

.add-patient-form :deep(.el-radio-group) {
  width: 100%;
}

.add-patient-form :deep(.el-radio) {
  margin-right: 30px;
}

.filter-form {
  padding: 10px 20px;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 18px;
}
</style>
