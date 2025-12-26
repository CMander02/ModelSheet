// Provider data loaded from providers.json
import providersData from "../../../../data/providers.json"

// Build provider translations from providers.json
function buildProviderTranslations(): { en: Record<string, string>; zh: Record<string, string> } {
  const en: Record<string, string> = {}
  const zh: Record<string, string> = {}

  for (const [displayName, config] of Object.entries(providersData.providers)) {
    const i18n = (config as { i18n: { en: string; zh: string } }).i18n
    en[displayName] = i18n.en
    zh[displayName] = i18n.zh
  }

  return { en, zh }
}

const providerTranslations = buildProviderTranslations()

// 翻译文件
const translations = {
  zh: {
    // 导航
    nav: {
      title: "开源模型参数对比",
      compareModels: "对比模型",
      version: "v1.0",
    },
    // Provider 名称翻译
    providers: providerTranslations.zh,
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
      complexityLabel: "复杂度:",
      simple: "简单",
      enthusiast: "爱好者",
      developer: "开发者",
      custom: "自定义",
      back: "返回",
      noResults: "没有找到匹配的模型",
      footer: "开源模型参数对比平台 © 2025",
      language: "语言",
      compareSelected: "比较选中",
      loading: "加载中...",
      searchModels: "搜索模型...",
      modelsTotal: "共 {count} 个模型",
      selectedCount: "已选 {count} 个",
      clearSelection: "清除",
    },
    // 列标题
    columns: {
      name: "模型名称",
      provider: "提供商",
      huggingfaceUrl: "HuggingFace链接",
      arxivUrl: "论文",
      techReport: "技术报告",
      totalParameters: "总参数量",
      activeParameters: "激活参数量",
      embeddingParameters: "Embedding参数量",
      nonEmbeddingParameters: "非Embedding参数量",
      contextLength: "上下文长度",
      embeddingDim: "Embedding维度",
      vocabSize: "词表大小",
      architecture: "架构类型",
      numLayers: "层数",
      numHeads: "注意力头数",
      numKvHeads: "KV头数",
      hiddenSize: "隐藏层大小",
      intermediateSize: "FFN大小",
      positionEncoding: "位置编码",
      activation: "激活函数",
      normType: "归一化类型",
      normEps: "归一化Epsilon",
      attentionDropout: "注意力Dropout",
      mlpFactor: "MLP扩展因子",
      gqaRatio: "GQA比率",
      torchDtype: "数据类型",
      isMoe: "MoE架构",
      numExperts: "路由专家数",
      numSharedExperts: "共享专家数",
      numExpertsPerToken: "每Token激活专家数",
      numActivatedExperts: "总激活专家数",
      moeIntermediateSize: "专家FFN大小",
      inputModalities: "输入模态",
      outputModalities: "输出模态",
      createdAt: "创建时间",
    },
    // Modality names
    modalities: {
      text: "文本",
      image: "图片",
      audio: "音频",
      video: "视频",
    },
  },
  en: {
    // Navigation
    nav: {
      title: "Open Source Model Parameter Comparison",
      compareModels: "Compare Models",
      version: "v1.0",
    },
    // Provider name translations
    providers: providerTranslations.en,
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
      complexityLabel: "Complexity:",
      simple: "Simple",
      enthusiast: "Enthusiast",
      developer: "Developer",
      custom: "Custom",
      back: "Back",
      noResults: "No matching models found",
      footer: "Open Source Model Parameter Comparison Platform © 2025",
      language: "Language",
      compareSelected: "Compare Selected",
      loading: "Loading...",
      searchModels: "Search models...",
      modelsTotal: "{count} models in total",
      selectedCount: "{count} selected",
      clearSelection: "Clear",
    },
    // Column headers
    columns: {
      name: "Model Name",
      provider: "Provider",
      huggingfaceUrl: "HuggingFace URL",
      arxivUrl: "Paper",
      techReport: "Tech Report",
      totalParameters: "Total Parameters",
      activeParameters: "Active Parameters",
      embeddingParameters: "Embedding Parameters",
      nonEmbeddingParameters: "Non-Embedding Parameters",
      contextLength: "Context Length",
      embeddingDim: "Embedding Dim",
      vocabSize: "Vocab Size",
      architecture: "Architecture",
      numLayers: "Layers",
      numHeads: "Attention Heads",
      numKvHeads: "KV Heads",
      hiddenSize: "Hidden Size",
      intermediateSize: "FFN Size",
      positionEncoding: "Position Encoding",
      activation: "Activation",
      normType: "Norm Type",
      normEps: "Norm Epsilon",
      attentionDropout: "Attention Dropout",
      mlpFactor: "MLP Factor",
      gqaRatio: "GQA Ratio",
      torchDtype: "Data Type",
      isMoe: "MoE Architecture",
      numExperts: "Routed Experts",
      numSharedExperts: "Shared Experts",
      numExpertsPerToken: "Experts per Token",
      numActivatedExperts: "Total Activated Experts",
      moeIntermediateSize: "Expert FFN Size",
      inputModalities: "Input Modalities",
      outputModalities: "Output Modalities",
      createdAt: "Created At",
    },
    // Modality names
    modalities: {
      text: "Text",
      image: "Image",
      audio: "Audio",
      video: "Video",
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

/**
 * Translate provider display name to localized version.
 * Falls back to the original name if no translation found.
 *
 * @param provider - Provider display name from models.json (e.g., "Qwen Team")
 * @param lang - Target language
 * @returns Translated provider name (e.g., "通义千问团队" for zh)
 */
export function translateProvider(provider: string, lang: Language): string {
  const t = getTranslations(lang)
  return t.providers[provider] || provider
}
