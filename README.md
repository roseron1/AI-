# 惠每智能电子病历编辑器 (hmEditor)

基于 Vue 3 + Node.js 的智能电子病历编辑器系统，支持 AI 辅助病历书写。

## 项目结构

```
hm_editor_dev/
├── core/                    # CKEditor 核心库
├── hmEditor/                # Vue 3 前端项目
│   ├── demo/               # 演示页面
│   │   └── file/           # 病历模板
│   ├── extensions/         # 编辑器扩展
│   ├── iframe/             # iframe 集成
│   ├── src/                # 源代码
│   │   ├── pages/          # 页面组件
│   │   ├── stores/         # Pinia 状态管理
│   │   └── utils/          # 工具函数
│   └── package.json
├── src/                     # 后端服务源代码
│   ├── apiRoutes.js        # API 路由
│   ├── db.js               # 数据库
│   └── seed.js             # 数据初始化
├── index.js                 # 后端入口
└── package.json             # 后端依赖
```

## 快速开始

### 安装依赖

```bash
# 后端依赖
cd hm_editor_dev
npm install

# 前端依赖
cd hmEditor
npm install
```

### 启动服务

```bash
# 后端服务 (端口 3071)
npm run dev

# 前端开发服务器 (端口 5173)
cd hmEditor
npm run dev
```

访问 http://localhost:5173

## 功能特性

- 15+ 种病历文书模板
- AI 辅助病历生成
- 结构化数据解析
- 病历模板管理

## 技术栈

- 前端: Vue 3 + TypeScript + Pinia + Vite
- 后端: Node.js + Express
- 编辑器: CKEditor 5 定制
- AI: OpenAI API 集成

## License

MIT
