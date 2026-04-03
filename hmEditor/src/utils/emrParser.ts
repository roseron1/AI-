export const parsePhysicalExam = (rawText: string): Record<string, string> => {
  if (!rawText) return {}
  
  const result: Record<string, string> = {}
  
  const tempMatch = rawText.match(/体温[：:\s]*([\d\.]+)/)
  if (tempMatch) result['体温'] = tempMatch[1]

  const pulseMatch = rawText.match(/脉搏[：:\s]*(\d+)/)
  if (pulseMatch) result['脉搏'] = pulseMatch[1]

  const breathMatch = rawText.match(/呼吸[：:\s]*(\d+)/)
  if (breathMatch) result['呼吸'] = breathMatch[1]

  const bpMatch = rawText.match(/血压[：:\s]*(\d+)[\/|](\d+)/)
  if (bpMatch) {
    result['收缩压'] = bpMatch[1]
    result['舒张压'] = bpMatch[2]
  }

  const allKeywords = [
    '一般情况', '皮肤黏膜', '全身浅表淋巴结', '头颅五官', 
    '颈部', '胸部', '腹部', '脊柱四肢', '神经系统', '专科情况'
  ]

  allKeywords.forEach((keyword, index) => {
    const nextKeywords = allKeywords.slice(index + 1)
    if (nextKeywords.length === 0) {
      nextKeywords.push('辅助检查', '初步诊断')
    }
    const nextKeysPattern = nextKeywords.join('|')
    const regex = new RegExp(`${keyword}[：:\\s]+([\\s\\S]*?)(?=(?:${nextKeysPattern})[：:]|$)`)
    const match = rawText.match(regex)
    if (match) {
      result[keyword] = match[1].replace(/[。；;\s]+$/, '').trim()
    }
  })

  return result
}

export const COMPLEX_FIELD_NAMES = [
  '体格检查', '查体', '生命体征', 'physicalExam', 
  '入院查体', '专科查体', '一般检查'
]

export const isComplexField = (title: string): boolean => {
  return COMPLEX_FIELD_NAMES.some(name => 
    title === name || title.includes(name)
  )
}

export const parseVitalSigns = (rawText: string): Record<string, string> => {
  if (!rawText) return {}
  
  const result: Record<string, string> = {}

  const tempMatch = rawText.match(/体温[：:\s]*([\d\.]+)/)
  if (tempMatch) result['体温'] = tempMatch[1]

  const pulseMatch = rawText.match(/脉搏[：:\s]*(\d+)/)
  if (pulseMatch) result['脉搏'] = pulseMatch[1]

  const breathMatch = rawText.match(/呼吸[：:\s]*(\d+)/)
  if (breathMatch) result['呼吸'] = breathMatch[1]

  const bpMatch = rawText.match(/血压[：:\s]*(\d+)[\/|](\d+)/)
  if (bpMatch) {
    result['收缩压'] = bpMatch[1]
    result['舒张压'] = bpMatch[2]
  }

  return result
}

export const parseSpecialistExam = (rawText: string): Record<string, string> => {
  if (!rawText) return {}
  
  const result: Record<string, string> = {}
  
  const keywords = ['神志', '精神', '语言', '瞳孔', '颈强', '肌力', '肌张力', '病理征']
  
  keywords.forEach(keyword => {
    const regex = new RegExp(`${keyword}[：:\s]*([^，。；\n]+)`)
    const match = rawText.match(regex)
    if (match) {
      result[keyword] = match[1].trim()
    }
  })

  return result
}

export const parseCaseCharacteristics = (rawText: string): Record<string, string> => {
  if (!rawText) return {}
  
  const result: Record<string, string> = {}

  const historyMatch = rawText.match(/病史特征[：:\s]*([^。]+)/)
  if (historyMatch) result['病史特征'] = historyMatch[1].trim()

  const presentMatch = rawText.match(/现病史[：:\s]*([^。]+)/)
  if (presentMatch) result['现病史'] = presentMatch[1].trim()

  const pastMatch = rawText.match(/既往史[：:\s]*([^。]+)/)
  if (pastMatch) result['既往史'] = pastMatch[1].trim()

  return result
}
