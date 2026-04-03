export interface MedicalRecordResult {
  [key: string]: string
}

export interface PatientInfo {
  name?: string
  gender?: string
  age?: number | string
  idCard?: string
  admissionNumber?: string
  bedNumber?: string
  department?: string
  admissionDate?: string
  diagnosis?: string
}

export interface LLMConfig {
  apiKey: string
  apiUrl: string
  model: string
  temperature: number
  useBackendProxy: boolean
}

const DEFAULT_CONFIG: LLMConfig = {
  apiKey: '',
  apiUrl: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-chat',
  temperature: 0.3,
  useBackendProxy: true
}

const DOC_PROMPT_CONFIG: Record<string, {
  name: string
  keys: string[]
  guidelines: string
}> = {
  first_progress: {
    name: '首次病程记录',
    keys: ['一般情况', '主诉', '既往史', '体格检查', '辅助检查', '初步诊断', '病历分型', '诊疗计划'],
    guidelines: `
【书写规范要求】
- 一般情况：简述患者性别、年龄、主要起病诱因及时间。
- 主诉：提炼核心症状及持续时间。
- 既往史：简述既往重要病史，无则写"既往体健"。
- 体格检查：先写生命体征 (T,P,R,BP)，再写专科查体。若无提供，请根据诊断合理推理常规阴性/阳性体征。
- 辅助检查：记录核心阳性指标，无则写"缺"。
- 初步诊断：明确给出诊断名称及简要依据。
- 病历分型：默认为"A 型"（除非病情极其危重）。
- 诊疗计划：分点列出（1.护理级别 2.完善检查 3.治疗方案）。`
  },
  daily_progress: {
    name: '日常病程记录',
    keys: ['病程正文'],
    guidelines: `
【书写规范要求】
你需要将所有内容融合成一段极其连贯、专业的医学正文，无需拆分多字段。
包含：1.患者今日自觉症状变化；2.重点生命体征及查体变化；3.辅助检查结果分析；4.临时处理及诊疗计划调整。
语气必须客观、严谨，首行无需缩进。`
  },
  chief_rounds: {
    name: '上级医师首次查房记录',
    keys: ['病程正文'],
    guidelines: `
【书写规范要求】
融合成一段完整的查房记录正文。
包含：1.上级医师（主任/副主任）对病史的补充；2.核心体征确认；3.对辅助检查的深度分析；4.明确诊断及鉴别诊断；5.下一步详细诊疗指示。
开头惯用语示例："今日由 XXX 主任医师查房，患者神志清，精神可..."`
  },
  attending_rounds: {
    name: '主治医师查房记录',
    keys: ['病程正文'],
    guidelines: `
【书写规范要求】
融合成一段完整的查房记录正文。
侧重：1.症状改善/加重情况；2.动态体征变化；3.治疗方案的反馈与调整理由。
开头惯用语示例："今日由 XXX 主治医师查房..."`
  },
  admission: {
    name: '入院记录',
    keys: [
      '主诉', '现病史', '既往史', '个人史', '月经史',
      '婚育史', '家族史', '生命体征', '一般体查', '专科体查',
      '辅助检查', '入院诊断'
    ],
    guidelines: `
【入院记录核心书写规范】
你需要基于医生提供的极简碎片化输入，扩写出极其详尽、符合三甲医院质控标准的《入院记录》。

各字段生成强制要求如下：
1. 主诉：必须极其精炼，严格控制在20字以内（主要症状 + 持续时间）。
2. 现病史：详细展开！必须按时间顺序包含：起病时间与诱因、主要症状特点、伴随症状、院外诊治经过，以及食欲、睡眠、大小便、体重变化等一般情况。
3. 既往史：若医生未提及，必须默认输出："既往体健。否认冠心病、高血压、糖尿病等慢性病，无肝炎、结核等传染病史，无外伤、手术及输血史，无食物及药物过敏史，预防接种史不详。"
4. 个人史：若未提及，默认输出："出生生长于原籍，无长期外地居住史，无放射性物质及毒物接触史，无吸烟、饮酒等不良嗜好。"
5. 月经史：若是女性且未提及，根据年龄合理推演（如：14岁初潮，周期28天，经期5天...）；若是男性，固定输出"无"。
6. 婚育史：若未提及，默认输出："适龄结婚，配偶及子女体健。"
7. 家族史：若未提及，默认输出："家族中无类似病史，无传染病史，无与遗传相关疾病史。"
8. 生命体征：必须严格输出此格式："T: 36.5℃  P: 80次/分  R: 20次/分  BP: 120/80mmHg"（若无具体数据，请依据病情合理虚构正常值）。
9. 一般体查：【重点】即使医生未提及，你也必须凭空推演并输出一段不少于100字的完整常规阴性查体记录！包含：发育营养、神志体位、皮肤黏膜、浅表淋巴结、头颅五官、颈部、胸部及心肺听诊（如：双肺呼吸音清，未闻及干湿啰音）、腹部（平软，无压痛反跳痛）、脊柱四肢、神经系统病理征阴性。
10. 专科体查：结合主诉和诊断，重点描述阳性体征和核心阴性体征。
11. 辅助检查：整理阳性指标，若无则输出"缺"。
12. 入院诊断：按主次顺序排列，格式为"1. XXX"。

【语气与排版要求】
所有内容语气必须是绝对客观、严谨的医学术语，禁止口语化。输出的纯文本中不要随意加换行，段落保持连贯。`
  },
  admission_24h: {
    name: '24小时内入出院记录',
    keys: [
      '主诉', '现病史', '既往史', '个人史', '月经史',
      '婚育史', '家族史', '生命体征', '一般体查', '专科体查',
      '辅助检查', '入院诊断', '诊疗经过', '出院诊断', '出院医嘱'
    ],
    guidelines: `
【24小时内入出院记录核心书写规范】
你需要基于医生提供的极简碎片化输入，扩写出极其详尽、符合三甲医院质控标准的《24小时内入出院记录》。

各字段生成强制要求如下：
1. 主诉：必须极其精炼，严格控制在20字以内（主要症状 + 持续时间）。
2. 现病史：详细展开！必须按时间顺序包含：起病时间与诱因、主要症状特点、伴随症状、院外诊治经过，以及食欲、睡眠、大小便、体重变化等一般情况。
3. 既往史：若医生未提及，必须默认输出："既往体健。否认冠心病、高血压、糖尿病等慢性病，无肝炎、结核等传染病史，无外伤、手术及输血史，无食物及药物过敏史，预防接种史不详。"
4. 个人史：若未提及，默认输出："出生生长于原籍，无长期外地居住史，无放射性物质及毒物接触史，无吸烟、饮酒等不良嗜好。"
5. 月经史：若是女性且未提及，根据年龄合理推演；若是男性，固定输出"无"。
6. 婚育史：若未提及，默认输出："适龄结婚，配偶及子女体健。"
7. 家族史：若未提及，默认输出："家族中无类似病史，无传染病史，无与遗传相关疾病史。"
8. 生命体征：必须严格输出此格式："T: 36.5℃  P: 80次/分  R: 20次/分  BP: 120/80mmHg"。
9. 一般体查：【重点】即使医生未提及，你也必须凭空推演并输出一段不少于100字的完整常规阴性查体记录！
10. 专科体查：结合主诉和诊断，重点描述阳性体征和核心阴性体征。
11. 辅助检查：整理阳性指标，若无则输出"缺"。
12. 入院诊断：按主次顺序排列，格式为"1. XXX"。
13. 诊疗经过：简述入院后的诊疗过程，说明住院不足24小时出院的原因（如病情好转、患者要求出院等）。
14. 出院诊断：与入院诊断可相同或有更新。
15. 出院医嘱：出院后的注意事项、用药及随诊要求。

【语气与排版要求】
所有内容语气必须是绝对客观、严谨的医学术语，禁止口语化。`
  },
  admission_24h_death: {
    name: '24小时内死亡记录',
    keys: [
      '主诉', '现病史', '既往史', '个人史', '月经史',
      '婚育史', '家族史', '生命体征', '一般体查', '专科体查',
      '辅助检查', '入院诊断', '诊疗经过', '抢救经过', '死亡原因', '死亡诊断'
    ],
    guidelines: `
【24小时内死亡记录核心书写规范】
你需要基于医生提供的极简碎片化输入，扩写出极其详尽、符合三甲医院质控标准的《24小时内死亡记录》。

各字段生成强制要求如下：
1. 主诉：必须极其精炼，严格控制在20字以内（主要症状 + 持续时间）。
2. 现病史：详细展开！必须按时间顺序包含：起病时间与诱因、主要症状特点、伴随症状、院外诊治经过，以及食欲、睡眠、大小便、体重变化等一般情况。
3. 既往史：若医生未提及，必须默认输出："既往体健。否认冠心病、高血压、糖尿病等慢性病，无肝炎、结核等传染病史，无外伤、手术及输血史，无食物及药物过敏史，预防接种史不详。"
4. 个人史：若未提及，默认输出："出生生长于原籍，无长期外地居住史，无放射性物质及毒物接触史，无吸烟、饮酒等不良嗜好。"
5. 月经史：若是女性且未提及，根据年龄合理推演；若是男性，固定输出"无"。
6. 婚育史：若未提及，默认输出："适龄结婚，配偶及子女体健。"
7. 家族史：若未提及，默认输出："家族中无类似病史，无传染病史，无与遗传相关疾病史。"
8. 生命体征：必须严格输出此格式："T: 36.5℃  P: 80次/分  R: 20次/分  BP: 120/80mmHg"。
9. 一般体查：【重点】即使医生未提及，你也必须凭空推演并输出一段不少于100字的完整常规阴性查体记录！
10. 专科体查：结合主诉和诊断，重点描述阳性体征和核心阴性体征。
11. 辅助检查：整理阳性指标，若无则输出"缺"。
12. 入院诊断：按主次顺序排列，格式为"1. XXX"。
13. 诊疗经过：简述入院后的诊疗过程，说明病情危重情况。
14. 抢救经过：【重点】详细描述抢救过程，包括：心跳呼吸骤停时间、心肺复苏措施、气管插管、呼吸机应用、抢救药物（如肾上腺素、阿托品等）使用情况、抢救持续时间、宣布死亡时间。
15. 死亡原因：明确写出导致死亡的直接原因（如：心跳呼吸骤停、多器官功能衰竭等）。
16. 死亡诊断：按主次顺序排列，格式为"1. XXX"。

【语气与排版要求】
所有内容语气必须是绝对客观、严谨的医学术语，禁止口语化。死亡记录必须庄重、严肃。`
  },
  discharge: {
    name: '出院记录',
    keys: ['入院诊断', '出院诊断', '诊疗经过', '出院医嘱'],
    guidelines: `
【书写规范要求】
- 入院诊断：入院时的诊断。
- 出院诊断：出院时的最终诊断。
- 诊疗经过：住院期间的诊疗过程，必须使用患者真实姓名。
- 出院医嘱：出院后的注意事项和用药。`
  },
  death: {
    name: '死亡记录',
    keys: ['入院诊断', '入院情况', '诊疗经过', '抢救经过', '死亡原因', '死亡诊断'],
    guidelines: `
【死亡记录核心书写规范】
你需要基于医生提供的极简碎片化输入，扩写出极其详尽、符合三甲医院质控标准的《死亡记录》。

各字段生成强制要求如下：
1. 入院诊断：按主次顺序排列，格式为"1. XXX"。
2. 入院情况：简述患者因何症状入院，入院时的核心生命体征及危重专科体征。必须包含患者姓名。
3. 诊疗经过：记录入院后病情演变情况，重要的辅助检查结果，以及采取的针对性治疗措施。必须使用患者真实姓名。
4. 抢救经过：【重点】详细记录：
   - 突发恶化的时间、具体生命体征丧失情况（如心率下降、呼吸停止、血压测不出）
   - 实施的心肺复苏、气管插管、呼吸机辅助呼吸、电除颤等抢救措施
   - 抢救药物（如肾上腺素）的使用时间及剂量
   - 宣布临床死亡的具体时间及特征（如心电图呈一直线，双侧瞳孔散大固定，对光反射消失，自主呼吸消失）
5. 死亡原因：直接导致死亡的病理生理原因（如：呼吸循环衰竭、多器官功能衰竭、失血性休克等）。
6. 死亡诊断：按主次顺序排列，格式为"1. XXX"。

【语气与排版要求】
所有内容语气必须是庄重、严谨的医学术语，禁止口语化。必须使用患者真实姓名。`
  },
  death_discussion: {
    name: '死亡病例讨论记录',
    keys: ['姓名', '讨论日期', '讨论地点', '主持人', '死亡时间', '参加人员', '病情简介', '讨论意见', '主持人总结', '死亡原因', '死亡诊断', '主持人签名', '记录者签名'],
    guidelines: `
【死亡病例讨论记录核心书写规范】
你需要基于医生提供的口语化碎片信息，扩写出符合三甲医院质控标准的《死亡病例讨论记录》，必须体现多级医师参与讨论的层次感。

各字段生成强制要求如下：
1. 病情简介：由管床医师简述患者入院时的情况、确诊依据、住院期间病情演变及最终抢救无效死亡的经过。必须使用患者真实姓名。
2. 讨论意见：【重点】记录各级医师对该病例的分析：
   - 主治医师：从诊断思路、治疗方案角度分析
   - 副主任医师：从病情演变、抢救时机角度分析
   - 主任医师：从诊疗规范、经验教训角度总结
   必须使用真实医师职称称呼（如"张主任"、"李副主任医师"）。
3. 主持人总结：对讨论进行归纳，明确最终死亡原因及诊断，对今后类似危重症患者的诊疗提出指导性意见。
4. 死亡原因：经讨论后确认的直接导致死亡的病理生理原因。
5. 死亡诊断：按主次顺序排列，格式为"1. XXX"。

【语气与排版要求】
- 必须体现"多级医师参与"的专业讨论感
- 语气庄重严谨，使用标准医学术语
- 禁止口语化，禁止杜撰具体药物剂量或抢救细节（除非医生明确提供）
- 必须使用患者真实姓名`
  },
  surgery: {
    name: '手术记录',
    keys: ['姓名', '科室名称', '床位号', '住院号', '手术日期', '手术用时', '术前诊断', '术后诊断', '手术名称', '麻醉方式', '手术指导者', '手术者', '一助', '二助', '麻醉医师', '手术护士', '巡回护士', '术中出血量', '术中输血量', '术中输液量', '手术经过', '手术者签名', '记录者签名'],
    guidelines: `
【手术记录核心书写规范】
你需要基于医生提供的口语化碎片信息，扩写出符合三甲医院质控标准的《手术记录》。

各字段生成强制要求如下：
1. 手术经过：【重点】详细记录手术过程，包括：
   - 患者体位、手术部位消毒及铺巾方法
   - 手术切口（部位、长度、方向）、显露方法及解剖层次
   - 探查过程及发现，术中所见病灶的解剖部位、外观形态、大小
   - 切除病变组织或脏器的名称及范围
   - 吻合口大小及缝合方法、缝线种类及规格
   - 植入物或补片的名称、型号、规格
   - 引流材料的名称、数量及放置位置
   - 麻醉效果、术中出血量及输血量
2. 术前诊断：手术前的诊断
3. 术后诊断：手术后的诊断
4. 手术名称：实际实施的手术名称
5. 麻醉方式：采用的麻醉方法
6. 术中出血量/输血量/输液量：具体数值

【语气与排版要求】
- 必须使用医学术语，禁止口语化
- 必须使用患者真实姓名
- 手术步骤描述应清晰、准确，符合手术实际过程`
  },
  preoperative: {
    name: '术前小结',
    keys: ['姓名', '科室名称', '床位号', '住院号', '记录时间', '责任医师', '简要病情', '术前诊断', '手术指征', '拟行手术名称', '拟行麻醉方式', '术前准备', '手术要点', '注意事项', '医师签名'],
    guidelines: `
【术前小结核心书写规范】
你需要基于医生提供的口语化碎片信息，扩写出符合三甲医院质控标准的《术前小结》。

各字段生成强制要求如下：
1. 简要病情：简述患者因何症状入院，入院后的主要检查阳性发现及目前病情。
2. 术前诊断：按主次顺序排列。
3. 手术指征：说明为什么要进行手术治疗的依据。
4. 拟行手术名称：计划实施的手术名称。
5. 拟行麻醉方式：计划采用的麻醉方法。
6. 术前准备：记录术前的各项准备工作，如禁食、备皮、配血、药物过敏试验等。
7. 手术要点：记录手术的关键步骤和预计难点。
8. 注意事项：记录术后需要特别关注的事项，如生命体征监护、引流管管理、抗生素使用等。

【语气与排版要求】
- 必须使用医学术语，禁止口语化
- 必须使用患者真实姓名`
  },
  postoperative: {
    name: '术后首次病程',
    keys: ['记录时间', '病程正文', '医师签名'],
    guidelines: `
【术后首次病程记录核心书写规范】
你需要基于医生提供的口语化碎片信息，扩写出符合三甲医院质控标准的《术后首次病程记录》。

各字段生成强制要求如下：
1. 记录时间：手术结束后的时间
2. 病程正文：【重点】详细记录：
   - 手术名称及手术方式
   - 麻醉效果
   - 术中情况（如出血量、是否输血、发现异常等）
   - 手术是否顺利
   - 术后诊断
   - 回病房后的一般状态、生命体征
   - 术后医嘱（如禁食、吸氧、心电监护、引流管、药物治疗等）
3. 医师签名

【语气与排版要求】
- 必须使用医学术语，禁止口语化
- 必须使用患者真实姓名`
  },
  stage_summary: {
    name: '阶段小结',
    keys: ['记录时间', '入院诊断', '目前诊断', '诊疗经过', '目前情况', '下一步诊疗计划', '医师签名'],
    guidelines: `
【阶段小结核心书写规范】
你需要基于医生提供的口语化碎片信息，扩写出符合三甲医院质控标准的《阶段小结》。

各字段生成强制要求如下：
1. 记录时间：小结的记录时间
2. 入院诊断：患者入院时的诊断
3. 目前诊断：截至目前已明确的诊断
4. 诊疗经过：阶段内的主要诊疗经过、病情变化、辅助检查结果
5. 目前情况：患者当前的主要症状、体征、辅助检查阳性结果
6. 下一步诊疗计划：后续需要进行的检查和治疗

【语气与排版要求】
- 必须使用医学术语，禁止口语化
- 必须使用患者真实姓名`
  },
  handover: {
    name: '交接班记录',
    keys: ['记录时间', '交班内容', '接班医师', '交班医师', '医师签名'],
    guidelines: `
【交接班记录核心书写规范】
你需要基于医生提供的口语化碎片信息，扩写出符合三甲医院质控标准的《交接班记录》。

各字段生成强制要求如下：
1. 记录时间：交接班的时间
2. 交班内容：【重点】包括：
   - 患者简要情况
   - 诊断
   - 病情变化
   - 当班特殊情况
   - 需要下一班注意的事项
3. 接班医师：接班医师姓名
4. 交班医师：交班医师姓名
5. 医师签名

【语气与排版要求】
- 必须使用医学术语，禁止口语化
- 必须使用患者真实姓名`
  },
  consultation: {
    name: '会诊记录',
    keys: ['会诊目的', '会诊意见', '会诊医师签名', '会诊日期'],
    guidelines: `
【会诊记录核心书写规范】
你需要基于医生提供的口语化碎片信息，扩写出符合三甲医院质控标准的《会诊记录》。

各字段生成强制要求如下：
1. 会诊目的：说明本次会诊的原因和目的
2. 会诊意见：【重点】记录会诊医师的详细意见，包括：
   - 对病史和病情的分析
   - 诊断意见
   - 治疗建议
3. 会诊医师签名：会诊医师亲笔签名
4. 会诊日期：会诊的日期

【语气与排版要求】
- 必须使用医学术语，禁止口语化
- 必须使用患者真实姓名`
  }
}

const getSystemPrompt = (docType: string, patientInfo?: PatientInfo): string => {
  const config = DOC_PROMPT_CONFIG[docType]
  if (!config) throw new Error(`未知的文书类型：${docType}`)

  const patientContext = patientInfo ? `
【患者基本信息】
姓名：${patientInfo.name || '未知'} | 性别：${patientInfo.gender || '未知'} | 年龄：${patientInfo.age || '未知'}岁
${patientInfo.diagnosis ? `入院诊断：${patientInfo.diagnosis}` : ''}
` : ''

  return `你是一位拥有 20 年临床经验的三甲医院资深医师。你的任务是根据医生提供的口语化、碎片化描述，扩写为严谨的《${config.name}》。

${patientContext}

${config.guidelines}

【强制输出协议】
1. 你必须、且只能输出一个合法的 JSON 对象。绝对不能包含 Markdown 标记 (如 \`\`\`json)、前言或后语。
2. JSON 的键名必须严格为以下列表，不可多加，不可遗漏：
   ${JSON.stringify(config.keys)}
3. 内容语气必须极其严谨、客观，符合医疗法律文书规范，禁止使用任何网络用语或模糊词汇。
4. 若医生的输入缺乏某些体征或检查数据，请基于你深厚的医学知识，根据诊断合理推演常规的阴性或阳性医学体征以完善文书，切勿留白。`
}

export const generateMedicalRecord = async (
  clinicalInput: string,
  docType: string = 'admission',
  patientInfo?: PatientInfo,
  config: Partial<LLMConfig> = {}
): Promise<MedicalRecordResult> => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const useBackendProxy = finalConfig.useBackendProxy !== false
  
  console.log('[LLM] 配置检查:')
  console.log('[LLM] - apiKey:', finalConfig.apiKey ? `已配置 (${finalConfig.apiKey.substring(0, 8)}...)` : '未配置')
  console.log('[LLM] - apiUrl:', finalConfig.apiUrl)
  console.log('[LLM] - model:', finalConfig.model)
  console.log('[LLM] - docType:', docType)
  console.log('[LLM] - patientInfo:', patientInfo)
  console.log('[LLM] - useBackendProxy:', useBackendProxy)
  
  if (!finalConfig.apiKey && !useBackendProxy) {
    console.warn('[LLM] API Key 未配置，使用模拟数据')
    return generateMockResult(clinicalInput, docType, patientInfo)
  }

  const systemPrompt = getSystemPrompt(docType, patientInfo)

  console.log('[LLM] 开始调用真实 API')
  console.log('[LLM] System Prompt 长度:', systemPrompt.length)
  console.log('[LLM] User Input:', clinicalInput)

  let response: Response
  
  if (useBackendProxy) {
    console.log('[LLM] 使用后端代理 API')
    response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: finalConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `临床描述：${clinicalInput}` }
        ]
      })
    })
  } else {
    response = await fetch(finalConfig.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalConfig.apiKey}`
      },
      body: JSON.stringify({
        model: finalConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `临床描述：${clinicalInput}` }
        ],
        temperature: finalConfig.temperature
      })
    })
  }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[LLM] API 响应错误:', response.status, errorText)
      throw new Error(`API 请求失败：${response.status}`)
    }

    const data = await response.json()
    
    let aiResponse: any = data
    
    if (data.code && data.code !== 10000) {
      throw new Error(data.message || 'API 返回错误')
    }
    
    if (data.data) {
      aiResponse = data.data
    }
    
    if (!aiResponse.choices || aiResponse.choices.length === 0) {
      throw new Error('API 无效响应')
    }

    let resultText = aiResponse.choices[0].message.content.trim()
    console.log('[LLM] 原始响应:', resultText.substring(0, 500))
    
    resultText = resultText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()

    const result = JSON.parse(resultText)
    console.log('[LLM] 解析结果:', JSON.stringify(result, null, 2))
    
    return result
  } catch (error) {
    console.error('[LLM] API 调用失败:', error)
    throw error
  }
}

const generateMockResult = (clinicalInput: string, docType: string, patientInfo?: PatientInfo): MedicalRecordResult => {
  console.log('[LLM] 使用模拟数据，docType:', docType)
  console.log('[LLM] 患者信息:', patientInfo)
  
  const name = patientInfo?.name || '患者'
  const gender = patientInfo?.gender || '未知'
  const age = patientInfo?.age || '未知'
  
  const mockResults: Record<string, MedicalRecordResult> = {
    first_progress: {
      '一般情况': `${name}，${gender}，${age}岁，急性起病，病程 3 天。`,
      '主诉': '咳嗽、咳痰 3 天，加重伴发热 1 天。',
      '既往史': '既往体健，否认高血压、糖尿病、冠心病病史，否认手术史、过敏史。',
      '体格检查': 'T: 38.2℃ P: 92 次/分 R: 20 次/分 BP: 125/80mmHg。神志清楚，精神可。双肺呼吸音粗，右下肺可闻及湿性啰音。心率齐，各瓣膜听诊区未闻及病理性杂音。腹平软，无压痛。',
      '辅助检查': '血常规：WBC 12.5×10^9/L，N 85%。胸片：右下肺斑片状阴影。',
      '初步诊断': '社区获得性肺炎。依据：1.咳嗽、咳痰、发热症状；2.双肺可闻及湿性啰音；3.血常规示白细胞升高；4.胸片示右下肺斑片状阴影。',
      '病历分型': 'A 型',
      '诊疗计划': '（1）内科护理常规，二级护理，普食。（2）完善痰培养、血培养、生化全套等检查。（3）抗感染治疗：经验性使用抗生素，止咳化痰对症支持治疗。'
    },
    daily_progress: {
      '病程正文': `${name}今日病情稳定，诉咳嗽较前减轻，咳痰量减少，无发热、胸痛、咯血等不适。查体：T 36.8℃，P 80 次/分，R 18 次/分，BP 120/80mmHg。神志清楚，精神可。双肺呼吸音粗，右下肺湿性啰音较前减少。心率齐，腹平软，无压痛。辅助检查回报：血常规 WBC 9.8×10^9/L，较前下降。目前抗感染治疗有效，继续当前治疗方案，密切观察病情变化。`
    },
    chief_rounds: {
      '病程正文': `今日由张主任医师查房，${name}神志清，精神可，诉咳嗽、咳痰症状较前好转，无发热。查体：T 36.5℃，P 78 次/分，R 18 次/分，BP 118/76mmHg。双肺呼吸音粗，右下肺可闻及少量湿性啰音，较前明显减少。辅助检查：血常规 WBC 已降至正常范围，胸片示病灶较前吸收。张主任分析：患者诊断明确，社区获得性肺炎，目前抗感染治疗有效，病情稳定。鉴别诊断方面，已排除肺结核、肺部肿瘤。指示：1.继续当前抗感染方案；2.明日复查胸片；3.关注体温变化，若病情稳定可考虑出院。`
    },
    attending_rounds: {
      '病程正文': `今日由李主治医师查房，${name}病情稳定，咳嗽、咳痰症状明显好转，无发热、呼吸困难等不适。查体：T 36.6℃，P 76 次/分，R 18 次/分，BP 120/80mmHg。双肺呼吸音清，右下肺未闻及明显湿性啰音。李主治医师分析：患者经抗感染治疗后症状明显改善，体征好转，治疗有效。继续当前治疗方案，预计 2-3 天后可出院。`
    },
    admission: {
      '主诉': '咳嗽、咳痰 3 天，加重伴发热 1 天。',
      '现病史': `${name}于 3 天前无明显诱因出现咳嗽，咳白色黏痰，量中等，不易咳出。1 天前症状加重，伴发热，体温最高 38.5℃，伴咽痛、乏力，无胸痛、咯血、呼吸困难等不适。遂来我院就诊，门诊查血常规示白细胞升高，胸片示双肺纹理增多，拟"社区获得性肺炎"收入院。患者自发病以来，精神、食欲尚可，睡眠一般，大小便正常，体重无明显变化。`,
      '既往史': '既往体健，否认高血压、糖尿病、冠心病病史，否认肝炎、结核等传染病史，否认手术、外伤史，否认药物、食物过敏史。',
      '个人史': '生于原籍，无外地久居史，无疫区接触史，无吸烟史，偶有饮酒。',
      '月经史': '无',
      '婚育史': '适龄结婚，配偶及子女体健。',
      '家族史': '家族中无遗传性疾病史。',
      '生命体征': 'T: 38.2℃  P: 92 次/分  R: 20 次/分  BP: 125/80mmHg',
      '一般体查': '发育正常，营养中等，神志清楚，精神可。全身皮肤黏膜无黄染，浅表淋巴结未触及肿大。头颅五官无畸形，结膜无充血，巩膜无黄染。颈软，无抵抗。胸廓对称，双肺叩诊清音，双肺呼吸音粗，可闻及散在湿性啰音。心界不大，心率齐，各瓣膜听诊区未闻及病理性杂音。腹平软，无压痛、反跳痛，肝脾肋下未触及。脊柱四肢无畸形，活动自如。神经系统生理反射存在，病理反射未引出。',
      '专科体查': '双肺呼吸音粗，右下肺可闻及湿性啰音。',
      '辅助检查': '血常规：WBC 12.5×10^9/L，N 85%，Hb 135g/L，PLT 210×10^9/L。胸片：双肺纹理增多，右下肺可见斑片状阴影。',
      '入院诊断': '社区获得性肺炎'
    },
    discharge: {
      '入院诊断': '社区获得性肺炎',
      '出院诊断': '社区获得性肺炎',
      '诊疗经过': `${name}因咳嗽、咳痰、发热入院，入院后完善相关检查，给予抗感染、止咳化痰等治疗，症状明显好转，复查血常规正常，胸片示病灶明显吸收，准予出院。`,
      '出院医嘱': '1.注意休息，避免劳累。2.继续口服抗生素 3 天。3.门诊随诊。'
    },
    admission_24h: {
      '主诉': '腹痛 6 小时。',
      '现病史': `${name}于 6 小时前无明显诱因出现腹痛，以脐周为主，呈阵发性绞痛，伴恶心、呕吐，呕吐物为胃内容物，无腹泻、发热等不适。遂来我院就诊，门诊查腹部 B 超示阑尾增粗，拟"急性阑尾炎"收入院。患者自发病以来，精神、食欲欠佳，睡眠一般，小便正常，未解大便。`,
      '既往史': '既往体健。否认冠心病、高血压、糖尿病等慢性病，无肝炎、结核等传染病史，无外伤、手术及输血史，无食物及药物过敏史，预防接种史不详。',
      '个人史': '出生生长于原籍，无长期外地居住史，无放射性物质及毒物接触史，无吸烟、饮酒等不良嗜好。',
      '月经史': '无',
      '婚育史': '适龄结婚，配偶及子女体健。',
      '家族史': '家族中无类似病史，无传染病史，无与遗传相关疾病史。',
      '生命体征': 'T: 36.8℃  P: 78 次/分  R: 18 次/分  BP: 120/80mmHg',
      '一般体查': '发育正常，营养中等，神志清楚，精神可，查体合作。全身皮肤黏膜无黄染，浅表淋巴结未触及肿大。头颅五官无畸形，结膜无充血，巩膜无黄染。颈软，无抵抗。胸廓对称，双肺叩诊清音，双肺呼吸音清，未闻及干湿啰音。心界不大，心率齐，各瓣膜听诊区未闻及病理性杂音。脊柱四肢无畸形，活动自如。神经系统生理反射存在，病理反射未引出。',
      '专科体查': '腹平软，右下腹麦氏点压痛明显，伴反跳痛，未触及包块，肝脾肋下未触及，肠鸣音活跃。',
      '辅助检查': '血常规：WBC 11.2×10^9/L，N 82%。腹部 B 超：阑尾增粗，周围少量渗出。',
      '入院诊断': '1. 急性阑尾炎',
      '诊疗经过': `${name}入院后完善相关检查，诊断明确，建议手术治疗。患者及家属要求保守治疗，经抗感染、解痉止痛等治疗后，腹痛症状明显缓解，患者要求出院，予以办理。`,
      '出院诊断': '1. 急性阑尾炎',
      '出院医嘱': '1.清淡饮食，避免剧烈运动。2.口服抗生素 3 天。3.门诊随诊，如有不适及时就诊。'
    },
    admission_24h_death: {
      '主诉': '突发胸痛 2 小时。',
      '现病史': `${name}于 2 小时前突发胸痛，位于胸骨后，呈压榨样疼痛，向左肩背部放射，伴大汗、恶心，无呕吐、呼吸困难等不适。家属急送我院，门诊查心电图示急性前壁心肌梗死，拟"急性心肌梗死"收入院。患者自发病以来，精神差，未进食。`,
      '既往史': '既往有高血压病史 10 年，最高血压 180/100mmHg，不规律服药。否认糖尿病、冠心病病史，无肝炎、结核等传染病史，无外伤、手术及输血史，无食物及药物过敏史。',
      '个人史': '出生生长于原籍，无长期外地居住史，无放射性物质及毒物接触史，有吸烟史 30 年，每日 20 支，偶有饮酒。',
      '月经史': '无',
      '婚育史': '适龄结婚，配偶及子女体健。',
      '家族史': '家族中无类似病史，无传染病史，无与遗传相关疾病史。',
      '生命体征': 'T: 36.5℃  P: 110 次/分  R: 24 次/分  BP: 90/60mmHg',
      '一般体查': '发育正常，营养中等，神志清楚，精神差，面色苍白，大汗淋漓，查体合作。全身皮肤黏膜无黄染，浅表淋巴结未触及肿大。头颅五官无畸形，结膜无充血，巩膜无黄染。颈软，无抵抗。胸廓对称，双肺叩诊清音，双肺呼吸音清，未闻及干湿啰音。心界不大，心率 110 次/分，律不齐，可闻及早搏。腹平软，无压痛、反跳痛，肝脾肋下未触及。脊柱四肢无畸形，活动自如。神经系统生理反射存在，病理反射未引出。',
      '专科体查': '心率 110 次/分，律不齐，可闻及早搏，心音低钝。双肺呼吸音清。',
      '辅助检查': '心电图：急性前壁心肌梗死。心肌酶：CK-MB 120U/L，肌钙蛋白 I 5.2ng/ml。血常规：WBC 10.5×10^9/L。',
      '入院诊断': '1. 急性前壁心肌梗死 2. 心源性休克 3. 高血压病 3 级',
      '诊疗经过': `${name}入院后立即给予吸氧、心电监护、抗血小板、抗凝、扩冠等治疗，准备急诊 PCI 术。`,
      '抢救经过': '患者入院后 30 分钟突发心跳呼吸骤停，意识丧失，大动脉搏动消失，心电监护示室颤。立即给予心肺复苏，电除颤 3 次，气管插管接呼吸机辅助呼吸，反复静脉注射肾上腺素、阿托品等抢救药物。经积极抢救 45 分钟，患者心跳、呼吸仍未恢复，瞳孔散大固定，对光反射消失，心电图呈直线，于 XX 时 XX 分宣布临床死亡。',
      '死亡原因': '心跳呼吸骤停',
      '死亡诊断': '1. 急性前壁心肌梗死 2. 心源性休克 3. 心跳呼吸骤停 4. 高血压病 3 级'
    },
    death: {
      '入院诊断': '1. 急性前壁心肌梗死 2. 心源性审克',
      '入院情况': `\${name}，\${gender}，\${age}岁，因"突发胸痛 2 小时"于 XX 年 XX 月 XX 日 XX 时急诊入院。入院时查体：T 36.5，P 110 次/分，R 24 次/分，BP 90/60mmHg。急性病容，面色苍白，大汗淋漓。神志清楚，精神差。心率 110 次/分，律不齐，可闻及早搏，心音低钝，双肺呼吸音清。腹平软。`,
      '诊疗经过': `\${name}入院后立即给予心电监护、吸氧、建立静脉通道。给予阿司匹林 300mg、氯吡格雷 300mg 口服抗血小板，肝素 4000U 静脉注射抗凝，吗啡 3mg 静脉注射镇痛，多巴胺升压治疗。完善心肌酶、肌钙蛋白检查。结果回报：CK-MB 120U/L，肌钙蛋白 I 5.2ng/ml，确诊为急性前壁心肌梗死。准备行急诊 PCI 术。`,
      '抢救经过': `\${name}于入院后 30 分钟（即 XX:XX）突然出现意识丧失，心电监护示心室颤动。立即予以胸外心脏按压，非同步直流电除颤 200J 一次，未转复。继续心脏按压，气管插管成功后接呼吸机辅助呼吸（SIMV 模式）。反复静脉注射肾上腺素 1mg，每 3-5 分钟一次，共计 5 次。阿托品 1mg 静脉注射 2 次。多巴胺持续泵入升压。经积极抢救 45 分钟，患者心跳、呼吸始终未恢复，心电图呈一直线，双侧瞳孔散大固定，对光反射消失，自主呼吸消失。宣告临床死亡。死亡时间：XX 年 XX 月 XX 日 XX 时 XX 分。`,
      '死亡原因': '心室颤动、心跳呼吸骤停',
      '死亡诊断': '1. 急性前壁心肌梗死 2. 心源性休克 3. 心室颤动 4. 心跳呼吸骤停'
    },
    death_discussion: {
      '病情简介': `${name}，${gender}，${age}岁，因"突发胸痛 2 小时"于 XX 年 XX 月 XX 日 XX 时急诊入院。入院诊断：急性前壁心肌梗死、心源性休克。住院期间患者突发心跳呼吸骤停，经心肺复苏、气管插管、电除颤等积极抢救无效，于 XX 时 XX 分宣布临床死亡。死亡原因：心室颤动、心跳呼吸骤停。`,
      '讨论意见': `张主治医师：该患者入院时已出现心源性休克表现，诊断急性前壁心肌梗死明确，及时给予抗血小板、抗凝、升压等治疗，准备行急诊PCI术。但患者病情进展迅速，入院30分钟后即出现室颤，抢救时机较为紧迫。\n\n李副主任医师：患者室颤发生后立即进行了电除颤、心肺复苏及气管插管，抢救措施及时到位。但患者基础心脏功能差，梗死面积大，最终抢救失败。建议今后对于类似高危患者，应尽早启动介入治疗流程。\n\n王主任医师：该病例的诊疗过程符合规范，死亡原因明确。通过此病例，我们的经验教训是：对于急性心肌梗死合并心源性休克的患者，应争分夺秒尽快行血运重建，同时做好抢救准备，加强病情监护。`,
      '主持人总结': `经各位医师深入讨论，该患者死亡原因明确为急性前壁心肌梗死合并心室颤动、心跳呼吸骤停。诊疗过程符合规范，抢救及时到位。望全体医师以此病例为契机，进一步提高对急危重症患者的识别和救治能力，规范诊疗流程，减少类似情况发生。`,
      '死亡原因': '心室颤动、心跳呼吸骤停',
      '死亡诊断': '1. 急性前壁心肌梗死 2. 心源性休克 3. 心室颤动 4. 心跳呼吸骤停'
    },
    surgery: {
      '术前诊断': '1. 胆囊结石伴慢性胆囊炎急性发作',
      '术后诊断': '1. 胆囊结石伴慢性胆囊炎急性发作 2. 胆囊息肉',
      '手术名称': '腹腔镜下胆囊切除术',
      '麻醉方式': '全身麻醉',
      '手术经过': `${name}取仰卧位，常规消毒铺巾。麻醉成功后，取脐上切口，建立气腹，腹压12mmHg。探查见胆囊增大，胆囊壁增厚，胆囊内可触及多发结石。分离胆囊三角，游离胆囊动脉及胆囊管，分别用Hem-o-lok夹闭后切断。胆囊床用电凝钩彻底止血。检查无活动性出血及胆漏后，放置腹腔引流管一根，退出器械，缝合切口。手术顺利，术中出血约50ml，未输血。麻醉满意，患者清醒后安返病房。`,
      '术中出血量': '50',
      '术中输血量': '0',
      '术中输液量': '1500'
    },
    preoperative: {
      '简要病情': `${name}，${gender}，${age}岁，因"反复右上腹痛3年，加重1周"入院。入院查体：神志清，精神可，心肺未见异常，腹平软，右上腹压痛，无反跳痛，Murphy征阳性。腹部B超示：胆囊增大，胆囊壁增厚，胆囊内多发强回声。入院后积极术前准备，明确手术指征。`,
      '术前诊断': '1. 胆囊结石伴慢性胆囊炎急性发作',
      '手术指征': '胆囊结石反复发作，影响日常生活，保守治疗效果不佳，有手术指征',
      '拟行手术名称': '腹腔镜下胆囊切除术',
      '拟行麻醉方式': '全身麻醉',
      '术前准备': '1. 禁食水8小时 2. 备皮 3. 配血 4. 术前30分钟预防性使用抗生素',
      '手术要点': '1. 建立气腹时注意避免损伤内脏 2. 分离胆囊三角时注意保护胆管 3. 胆囊床彻底止血 4. 必要时中转开腹',
      '注意事项': '1. 术后密切监测生命体征 2. 术后6小时可少量饮水 3. 腹腔引流管观察引流量及性质 4. 适当补液抗感染治疗 5. 定期换药，术后7天拆线'
    },
    postoperative: {
      '病程正文': `${name}今日在全麻下行腹腔镜下胆囊切除术，手术顺利，麻醉满意，术中出血约30ml，未输血。术中探查见胆囊增大，胆囊壁充血水肿，胆囊内可见多发结石，最大约2cm。手术切除胆囊后，检查胆囊床无活动性出血，胆管通畅。手术历时45分钟，术毕安返病房。术后患者清醒，生命体征平稳。术后医嘱：一级护理、禁食6小时、持续吸氧、心电监护、抗感染、补液治疗。`
    },
    stage_summary: {
      '入院诊断': '1. 胆囊结石伴慢性胆囊炎',
      '目前诊断': '1. 胆囊结石伴慢性胆囊炎 2. 胆囊息肉',
      '诊疗经过': `${name}入院后完善相关检查，血常规示白细胞升高，腹部B超及CT提示胆囊结石、胆囊炎。诊断明确后行腹腔镜下胆囊切除术，手术顺利，术后恢复良好。`,
      '目前情况': '患者一般情况可，生命体征平稳，切口愈合良好，无发热、腹痛等不适。',
      '下一步诊疗计划': '1. 继续抗感染治疗 2. 定期换药 3. 术后7天拆线 4. 门诊随诊'
    },
    handover: {
      '交班内容': `患者${name}，男，55岁，胆囊结石伴慢性胆囊炎今日行腹腔镜下胆囊切除术，手术顺利，术中出血约30ml，未输血。术后安返病房，患者一般情况可，生命体征平稳，禁食中，持续吸氧、心电监护。腹腔引流管通畅，引流出淡血性液体约20ml。交班重点：1. 继续心电监护、吸氧 2. 观察引流管引流情况 3. 禁食6小时后改为流质饮食 4. 预防性抗感染治疗 5. 适当补液维持水电解质平衡`
    },
    consultation: {
      '会诊目的': '患者胆囊结石伴慢性胆囊炎，行腹腔镜下胆囊切除术后第2天，诉右上腹疼痛，请外科会诊协助诊治。',
      '会诊意见': '查阅病史及辅助检查结果，查看患者：患者神志清，精神可，生命体征平稳，心肺听诊无异常。腹平软，右上腹切口愈合良好，无明显压痛，未触及包块，肠鸣音正常。辅助检查：血常规示白细胞8.5×10^9/L。考虑患者术后恢复可，腹痛为术后正常反应，建议：1. 继续抗感染治疗 2. 适当活动促进肠功能恢复 3. 定期换药观察切口情况 4. 如有发热、腹痛加重等不适，及时复查'
    }
  }

  return mockResults[docType] || mockResults['first_progress']
}

export const setApiKey = (apiKey: string): void => {
  DEFAULT_CONFIG.apiKey = apiKey
  console.log('[LLM] API Key 已设置:', apiKey ? `${apiKey.substring(0, 8)}...` : '空')
}

export const getApiKey = (): string => {
  return DEFAULT_CONFIG.apiKey
}

export const getDocPromptConfig = (docType: string) => {
  return DOC_PROMPT_CONFIG[docType]
}

export const testLocalStorage = (): { success: boolean; message: string; savedKey?: string } => {
  try {
    const testKey = 'llm_api_key_test'
    const testValue = 'test_value_' + Date.now()
    
    localStorage.setItem(testKey, testValue)
    const retrieved = localStorage.getItem(testKey)
    localStorage.removeItem(testKey)
    
    if (retrieved === testValue) {
      const savedApiKey = localStorage.getItem('llm_api_key')
      return {
        success: true,
        message: '本地存储功能正常',
        savedKey: savedApiKey ? `${savedApiKey.substring(0, 8)}...` : '未保存'
      }
    } else {
      return {
        success: false,
        message: '本地存储读写不一致'
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `本地存储错误：${error instanceof Error ? error.message : '未知错误'}`
    }
  }
}

export interface AuditProblem {
  type: 'consistency' | 'quality' | 'standard' | 'completeness'
  severity: 'high' | 'medium' | 'low'
  field?: string
  description: string
}

export interface AuditSuggestion {
  field?: string
  suggestion: string
}

export interface AuditResult {
  score: number
  problems: AuditProblem[]
  suggestions: AuditSuggestion[]
  summary: string
}

const AUDIT_PROMPT_CONFIG: Record<string, string> = {
  first_progress: `【首次病程记录质控要点】
1. 主诉与初步诊断的一致性
2. 病历分型是否准确（A/B/C型）
3. 诊疗计划是否完整
4. 是否包含必要的阴性体征`,

  daily_progress: `【日常病程记录质控要点】
1. 病情变化描述是否清晰
2. 治疗措施是否有记录
3. 辅助检查结果是否分析
4. 医师签名是否规范`,

  surgery: `【手术记录质控要点】
1. 手术名称与术前诊断是否匹配
2. 手术经过描述是否详细
3. 术中出血量、输血情况是否记录
4. 标本处理是否说明`,

  discharge: `【出院记录质控要点】
1. 入院诊断与出院诊断是否一致
2. 诊疗经过是否完整
3. 出院医嘱是否详细
4. 随诊要求是否明确`,

  default: `【通用病历质控要点】
1. 各项内容是否完整
2. 时间逻辑是否正确
3. 医学术语是否规范`
}

const getAuditSystemPrompt = (docType: string): string => {
  const specificRules = AUDIT_PROMPT_CONFIG[docType] || AUDIT_PROMPT_CONFIG.default
  
  return `你是一位资深病历质控专家，拥有三甲医院病案室20年工作经验。你的职责是严格审核病历质量，确保符合《病历书写基本规范》和三级医院质控标准。

${specificRules}

【核心质控要求】

一、一致性检查
- 主诉与诊断是否匹配（如主诉"腹痛"而诊断"肺炎"则为不一致）
- 现病史与主诉是否呼应
- 诊断与诊疗计划是否对应
- 时间线是否逻辑正确（入院时间、手术时间、出院时间等）

二、内涵质量检查
- 是否缺失必要的阴性体征（注意：严禁编造数据，只指出缺失项）
- 体格检查是否系统完整
- 辅助检查是否及时分析
- 诊疗措施是否有依据

三、规范性检查
- 是否存在口语化描述（如"肚子疼"应为"腹痛"）
- 医学术语是否规范
- 格式是否符合要求
- 签名是否完整

四、完整性检查
- 必填项是否完整
- 关键信息是否缺失

【输出要求】
你必须严格返回以下JSON格式，不要添加任何其他内容：
{
  "score": <0-100的质控评分>,
  "problems": [
    {
      "type": "<consistency|quality|standard|completeness>",
      "severity": "<high|medium|low>",
      "field": "<涉及字段名>",
      "description": "<具体问题描述>"
    }
  ],
  "suggestions": [
    {
      "field": "<涉及字段名>",
      "suggestion": "<具体改进建议>"
    }
  ],
  "summary": "<整体评价摘要>"
}

【重要提醒】
1. 必须严格返回JSON格式
2. problems数组列出所有发现的问题
3. suggestions数组给出针对性改进建议
4. 评分标准：90分以上优秀，80-89分良好，70-79分合格，70分以下不合格
5. 发现严重问题（如诊断错误、关键信息缺失）必须标注severity为high`
}

export const auditMedicalRecord = async (
  content: string,
  docType: string = 'daily_progress',
  config: Partial<LLMConfig> = {}
): Promise<AuditResult> => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const useBackendProxy = finalConfig.useBackendProxy !== false
  
  console.log('[AUDIT] 开始质控，docType:', docType)
  console.log('[AUDIT] 内容长度:', content.length)
  
  const systemPrompt = getAuditSystemPrompt(docType)
  
  let response: Response
  
  if (useBackendProxy) {
    console.log('[AUDIT] 使用后端代理 API')
    response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: 'deepseek',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请对以下病历内容进行质控审核：\n\n${content}` }
        ]
      })
    })
  } else {
    response = await fetch(finalConfig.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalConfig.apiKey}`
      },
      body: JSON.stringify({
        model: finalConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请对以下病历内容进行质控审核：\n\n${content}` }
        ],
        temperature: 0.1
      })
    })
  }
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[AUDIT] API 响应错误:', response.status, errorText)
    throw new Error(`质控请求失败：${response.status}`)
  }
  
  const data = await response.json()
  
  let aiResponse: any = data
  
  if (data.code && data.code !== 10000) {
    throw new Error(data.message || 'API 返回错误')
  }
  
  if (data.data) {
    aiResponse = data.data
  }
  
  if (!aiResponse.choices || aiResponse.choices.length === 0) {
    throw new Error('API 无效响应')
  }
  
  let resultText = aiResponse.choices[0].message.content.trim()
  console.log('[AUDIT] 原始响应:', resultText.substring(0, 500))
  
  resultText = resultText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()
  
  try {
    const result: AuditResult = JSON.parse(resultText)
    console.log('[AUDIT] 质控结果:', JSON.stringify(result, null, 2))
    
    if (typeof result.score !== 'number' || !Array.isArray(result.problems)) {
      throw new Error('质控结果格式不正确')
    }
    
    return result
  } catch (parseError) {
    console.error('[AUDIT] JSON 解析失败:', parseError)
    return {
      score: 0,
      problems: [{
        type: 'standard',
        severity: 'high',
        description: '质控结果解析失败，请重试'
      }],
      suggestions: [],
      summary: '质控服务返回格式异常，请稍后重试'
    }
  }
}

export const getAuditPromptConfig = () => {
  return AUDIT_PROMPT_CONFIG
}
