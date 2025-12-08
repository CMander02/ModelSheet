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
      totalParameters: "总参数量",
      activeParameters: "激活参数量",
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
      isMoe: "MoE架构",
      numExperts: "专家数量",
      numExpertsPerToken: "每Token专家数",
      hasChatTemplate: "Chat模板",
      bosToken: "BOS Token",
      eosToken: "EOS Token",
      isAdapter: "Adapter模型",
      baseModel: "基座模型",
      huggingfaceUrl: "HuggingFace链接",
      createdAt: "创建时间",
      updatedAt: "更新时间",
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
      totalParameters: "Total Parameters",
      activeParameters: "Active Parameters",
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
      isMoe: "MoE Architecture",
      numExperts: "Num Experts",
      numExpertsPerToken: "Experts per Token",
      hasChatTemplate: "Chat Template",
      bosToken: "BOS Token",
      eosToken: "EOS Token",
      isAdapter: "Adapter Model",
      baseModel: "Base Model",
      huggingfaceUrl: "HuggingFace URL",
      createdAt: "Created At",
      updatedAt: "Updated At",
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
