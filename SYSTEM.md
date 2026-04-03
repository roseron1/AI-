# 惠每智能电子病历编辑器 - 系统说明文档

## 一、系统概述

惠每智能电子病历编辑器（hmEditor）是一个基于 Vue 3 + Node.js 的医疗病历管理系统，支持 AI 辅助病历书写、模板管理、结构化数据解析等功能。

### 1.1 技术架构

| 层级 | 技术栈 |
|-----|-------|
| 前端框架 | Vue 3 + TypeScript |
| 状态管理 | Pinia |
| 构建工具 | Vite |
| 后端服务 | Node.js + Express |
| 编辑器内核 | CKEditor 5 定制 |
| 数据库 | SQLite (better-sqlite3) |
| AI 集成 | OpenAI API |

### 1.2 目录结构

```
hm_editor_dev/
├── core/                    # CKEditor 核心库
├── hmEditor/               # Vue 3 前端项目
│   ├── demo/
│   │   └── file/          # 病历模板 (65个)
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   │   ├── PatientList.vue       # 患者列表
│   │   │   ├── PatientEmrDetail.vue  # 病历详情/编辑器
│   │   │   └── MedicalWorkspace.vue  # 医疗工作台
│   │   ├── stores/       # Pinia 状态管理
│   │   │   └── patient.ts # 患者数据存储
│   │   └── utils/        # 工具函数
│   │       ├── llmService.ts     # AI 服务
│   │       ├── emrParser.ts      # 病历解析
│   │       └── api.ts            # API 调用
│   └── package.json
├── src/                    # Node.js 后端
│   ├── apiRoutes.js       # REST API 路由
│   ├── db.js             # 数据库操作
│   ├── dao.js            # 数据访问对象
│   ├── mock.js           # Mock 数据
│   └── seed.js           # 数据初始化
└── index.js              # 后端入口
```

---

## 二、功能模块

### 2.1 病历模板管理

系统支持 **15+ 种**病历文书类型，分为以下几类：

#### 入院记录类
| 模板文件名 | 文书类型 | 说明 |
|-----------|---------|------|
| admission_record.html | 入院记录 | 患者入院基本信息 |
| admission_24h.html | 24小时内入出院记录 | 短期入院记录 |
| admission_24h_death.html | 24小时内死亡记录 | 入院后24小时内死亡 |
| inpatient_record.html | 住院病历 | 完整住院病历 |

#### 病程记录类
| 模板文件名 | 文书类型 | 说明 |
|-----------|---------|------|
| first_progress.html | 首次病程记录 | 入院后首次病程 |
| daily_progress_record.html | 日常病程记录 | 普通日常记录 |
| daily_progress_1~7.html | 日常病程记录(系列) | 不同科室模板 |

#### 手术相关类
| 模板文件名 | 文书类型 | 说明 |
|-----------|---------|------|
| surgery_record.html | 手术记录 | 手术过程记录 |
| surgery_record_1.html | 术前小结 | 术前小结 |
| postoperative_record.html | 术后首次病程 | 手术后首次记录 |

#### 查房记录类
| 模板文件名 | 文书类型 | 说明 |
|-----------|---------|------|
| first_ward_round_record.html | 上级医师首次查房 | 主任/副主任查房 |
| attending_physician_round_record.html | 主治医师查房 | 主治医师日常查房 |

#### 出院/死亡类
| 模板文件名 | 文书类型 | 说明 |
|-----------|---------|------|
| discharge_record.html | 出院记录 | 患者出院小结 |
| discharge_record_1.html | 死亡记录 | 患者死亡记录 |
| discharge_record_2.html | 死亡病例讨论 | 死亡病例讨论记录 |

#### 护理表单类
| 模板文件名 | 文书类型 | 说明 |
|-----------|---------|------|
| nursing_form_1.html | 护理表单 | 护理记录 |

### 2.2 AI 辅助书写

AI 服务通过 `llmService.ts` 提供病历内容生成能力。

#### 支持的文书类型 AI 配置

```typescript
// llmService.ts 中的 DOC_PROMPT_CONFIG
const DOC_PROMPT_CONFIG = {
  first_progress: { name: '首次病程记录', keys: [...] },
  daily_progress: { name: '日常病程记录', keys: [...] },
  surgery: { name: '手术记录', keys: [...] },
  preoperative: { name: '术前小结', keys: [...] },
  postoperative: { name: '术后首次病程', keys: [...] },
  stage_summary: { name: '阶段小结', keys: [...] },
  handover: { name: '交接班记录', keys: [...] },
  consultation: { name: '会诊记录', keys: [...] },
  death: { name: '死亡记录', keys: [...] },
  discharge: { name: '出院记录', keys: [...] },
  // ... 更多
}
```

#### 模板字段映射

每个模板通过 `data-hm-name` 属性定义可编辑字段：

```html
<span class="new-textbox" data-hm-name="患者姓名">
  <span class="new-textbox-content" contenteditable="true"></span>
</span>
```

AI 生成的内容会根据 `data-hm-name` 自动填充到对应位置。

---

## 三、核心组件说明

### 3.1 PatientEmrDetail.vue

病历详情页面核心组件，负责：
- 病历文档加载与渲染
- 文书类型选择与切换
- AI 内容生成触发
- 模板字段解析与填充

#### 关键方法

```typescript
// 加载模板
loadTemplate(docType: string): Promise<void>

// 恢复草稿
restoreDraft(docType: string): Promise<boolean>

// AI 生成病历内容
generateContent(input: string, docType: string): Promise<string>

// 解析模板字段
parseFields(templateHtml: string): string[]
```

### 3.2 llmService.ts

AI 服务模块，提供：

```typescript
// 生成病历内容
generateDocument(input: string, docType: string, patientInfo?): Promise<string>

// 解析 AI 响应并填充字段
parseAndFillFields(aiResponse: string, fields: string[]): Record<string, string>

// 获取 Mock 测试数据
getMockData(docType: string, patientName: string): Record<string, string>
```

### 3.3 emrParser.ts

病历解析工具，提供：

```typescript
// 解析 contenteditable 区域的文本
parseContentFields(html: string): Record<string, string>

// 提取 data-hm-name 字段
extractHmFields(element: HTMLElement): string[]
```

---

## 四、API 接口

### 4.1 患者管理

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | /api/patients | 获取患者列表 |
| GET | /api/patients/:id | 获取患者详情 |
| POST | /api/patients | 创建患者 |
| PUT | /api/patients/:id | 更新患者 |

### 4.2 病历文档

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | /api/documents | 获取文档列表 |
| GET | /api/documents/:id | 获取文档详情 |
| POST | /api/documents | 创建文档 |
| PUT | /api/documents/:id | 保存文档 |
| DELETE | /api/documents/:id | 删除文档 |

### 4.3 模板

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | /demo/file/:name | 获取模板内容 |

---

## 五、数据库结构

### 5.1 patients 表

```sql
CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT,
  age INTEGER,
  admissionDate TEXT,
  dischargeDate TEXT,
  diagnosis TEXT,
  department TEXT,
  bedNumber TEXT,
  medicalNumber TEXT,
  chiefComplaint TEXT,
  createdAt TEXT,
  updatedAt TEXT
);
```

### 5.2 documents 表

```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  patientId TEXT,
  docType TEXT NOT NULL,
  title TEXT,
  content TEXT,
  status TEXT DEFAULT 'draft',
  createdAt TEXT,
  updatedAt TEXT,
  FOREIGN KEY (patientId) REFERENCES patients(id)
);
```

---

## 六、样式规范

### 6.1 模板样式

所有病历模板统一使用流式无边框样式：

```css
.emr-content-block {
  font-family: SimSun, 'Songti SC', serif;
  font-size: 16px;
  line-height: 1.8;
  color: #000;
}
```

### 6.2 输入框样式

```css
.new-textbox {
  display: inline-block;
  min-width: 100px;
  border-bottom: 1px solid #000;
}

.new-textbox-content {
  contenteditable: true;
}
```

---

## 七、部署指南

### 7.1 开发环境

```bash
# 1. 克隆项目
git clone <repository-url>
cd hm_editor_dev

# 2. 安装后端依赖
npm install

# 3. 安装前端依赖
cd hmEditor
npm install

# 4. 启动后端服务
cd ..
npm run dev  # 端口 3071

# 5. 启动前端 (新终端)
cd hmEditor
npm run dev  # 端口 5173
```

### 7.2 生产构建

```bash
# 前端构建
cd hmEditor
npm run build

# 输出目录: dist/
```

### 7.3 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0

---

## 八、常见问题

### 8.1 模板加载失败

**问题**: 访问病历时模板显示 404

**解决**: 
1. 确认后端服务运行在端口 3071
2. 检查模板文件是否存在于 `hmEditor/demo/file/` 目录

### 8.2 AI 生成无响应

**问题**: 点击 AI 生成按钮无反应

**解决**:
1. 检查 llmService.ts 中是否有对应文书类型的配置
2. 确认 API Key 已正确设置
3. 查看浏览器控制台错误信息

### 8.3 字段无法填充

**问题**: AI 生成内容未填充到对应位置

**解决**:
1. 检查模板中 `data-hm-name` 属性是否与 AI 配置 keys 数组匹配
2. 确认 PatientEmrDetail.vue 中有对应的 case 分支处理

---

## 九、版本历史

| 版本 | 日期 | 更新内容 |
|-----|------|---------|
| 1.0.0 | 2026-04-03 | 初始版本，包含15+种病历模板 |

---

## 十、许可证

MIT License
