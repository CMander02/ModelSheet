// 翻译文件
const translations = {
  zh: {
    // 导航
    nav: {
      title: "开源模型参数对比",
      compareModels: "对比模型",
      version: "v1.0",
    },
    // 首页
    home: {
      clickTip: "点击表格中的任意行查看模型详情",
    },
    // 对比页
    compare: {
      title: "模型对比",
      selectModels: "选择要对比的模型",
      selectColumns: "选择显示的列",
      noModelsSelected: "请至少选择两个模型进行对比",
      removeModel: "移除模型",
    },
    // 通用
    common: {
      search: "搜索",
      name: "模型名称",
      provider: "提供商",
      parameters: "参数量",
      releaseDate: "发布日期",
      baseModel: "基座",
      inferenceModel: "推理模型",
      moeArchitecture: "MoE 架构",
      complexity: "复杂度",
      simple: "简单",
      enthusiast: "爱好者",
      developer: "开发者",
      custom: "自定义",
      back: "返回",
      noResults: "没有找到匹配的模型",
      footer: "开源模型参数对比平台 © 2025",
      language: "语言",
    },
  },
  en: {
    // Navigation
    nav: {
      title: "Open Source Model Parameter Comparison",
      compareModels: "Compare Models",
      version: "v1.0",
    },
    // Home
    home: {
      clickTip: "Click any row in the table to view model details",
    },
    // Compare
    compare: {
      title: "Model Comparison",
      selectModels: "Select models to compare",
      selectColumns: "Select columns to display",
      noModelsSelected: "Please select at least two models to compare",
      removeModel: "Remove model",
    },
    // Common
    common: {
      search: "Search",
      name: "Model Name",
      provider: "Provider",
      parameters: "Parameters",
      releaseDate: "Release Date",
      baseModel: "Base Model",
      inferenceModel: "Inference Model",
      moeArchitecture: "MoE Architecture",
      complexity: "Complexity",
      simple: "Simple",
      enthusiast: "Enthusiast",
      developer: "Developer",
      custom: "Custom",
      back: "Back",
      noResults: "No matching models found",
      footer: "Open Source Model Parameter Comparison Platform © 2025",
      language: "Language",
    },
  },
}

export type Language = "zh" | "en"

export function getTranslations(lang: Language) {
  return translations[lang] || translations.zh
}

export function useI18n(lang: Language) {
  return getTranslations(lang)
}
