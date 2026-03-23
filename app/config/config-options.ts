export const configCategories = {
  general: "General Settings",
  ocr: "OCR Settings",
  barcode: "Barcode Settings",
  ai: "AI Settings",
} as const

export type ConfigCategory = (typeof configCategories)[keyof typeof configCategories]

export const configOptionTypes = {
  string: "string",
  number: "number",
  select: "select",
  boolean: "boolean",
  json: "json",
  file: "file",
  password: "password",
} as const

export type ConfigOptionType = (typeof configOptionTypes)[keyof typeof configOptionTypes]

export interface ConfigChoice {
  id: string
  name: string
}

export interface ConfigOption {
  key: string
  title: string
  description?: string
  type: ConfigOptionType
  category: ConfigCategory
  configKey: string
  note?: string
  choices?: ConfigChoice[]
}

function choices(values: Record<string, string>): ConfigChoice[] {
  return Object.values(values).map((value) => ({ id: value, name: value }))
}

const outputTypeChoices = choices({
  PDF: "pdf",
  PDFA: "pdfa",
  PDFA1: "pdfa-1",
  PDFA2: "pdfa-2",
  PDFA3: "pdfa-3",
})

const modeChoices = choices({
  SKIP: "skip",
  REDO: "redo",
  FORCE: "force",
  SKIP_NO_ARCHIVE: "skip_noarchive",
})

const archiveFileChoices = choices({
  NEVER: "never",
  WITH_TEXT: "with_text",
  ALWAYS: "always",
})

const cleanChoices = choices({
  CLEAN: "clean",
  FINAL: "clean-final",
  NONE: "none",
})

const colorConvertChoices = choices({
  UNCHANGED: "LeaveColorUnchanged",
  RGB: "RGB",
  INDEPENDENT: "UseDeviceIndependentColor",
  GRAY: "Gray",
  CMYK: "CMYK",
})

const llmEmbeddingBackendChoices = choices({
  OPENAI: "openai",
  HUGGINGFACE: "huggingface",
})

const llmBackendChoices = choices({
  OPENAI: "openai",
  OLLAMA: "ollama",
})

export const configOptions: ConfigOption[] = [
  {
    key: "app_logo",
    title: "Application Logo",
    type: configOptionTypes.file,
    category: configCategories.general,
    configKey: "PAPERLESS_APP_LOGO",
  },
  {
    key: "app_title",
    title: "Application Title",
    type: configOptionTypes.string,
    category: configCategories.general,
    configKey: "PAPERLESS_APP_TITLE",
  },
  {
    key: "output_type",
    title: "Output Type",
    description: "Sets the output PDF type.",
    type: configOptionTypes.select,
    category: configCategories.ocr,
    configKey: "PAPERLESS_OCR_OUTPUT_TYPE",
    choices: outputTypeChoices,
  },
  {
    key: "language",
    title: "Language",
    description: "Do OCR using these languages.",
    type: configOptionTypes.string,
    category: configCategories.ocr,
    configKey: "PAPERLESS_OCR_LANGUAGE",
  },
  {
    key: "pages",
    title: "Pages",
    description: "Do OCR from page 1 to this value.",
    type: configOptionTypes.number,
    category: configCategories.ocr,
    configKey: "PAPERLESS_OCR_PAGES",
  },
  {
    key: "mode",
    title: "Mode",
    description: "Sets the OCR mode.",
    type: configOptionTypes.select,
    category: configCategories.ocr,
    configKey: "PAPERLESS_OCR_MODE",
    choices: modeChoices,
  },
  {
    key: "skip_archive_file",
    title: "Skip Archive File",
    description: "Controls the generation of an archive file.",
    type: configOptionTypes.select,
    category: configCategories.ocr,
    configKey: "PAPERLESS_OCR_SKIP_ARCHIVE_FILE",
    choices: archiveFileChoices,
  },
  {
    key: "image_dpi",
    title: "Image DPI",
    description: "Sets image DPI fallback value.",
    type: configOptionTypes.number,
    category: configCategories.ocr,
    configKey: "PAPERLESS_OCR_IMAGE_DPI",
  },
  {
    key: "unpaper_clean",
    title: "Clean",
    description: "Controls the unpaper cleaning.",
    type: configOptionTypes.select,
    category: configCategories.ocr,
    configKey: "PAPERLESS_OCR_CLEAN",
    choices: cleanChoices,
  },
  {
    key: "deskew",
    title: "Deskew",
    description: "Enables deskew.",
    type: configOptionTypes.boolean,
    category: configCategories.ocr,
    configKey: "PAPERLESS_OCR_DESKEW",
  },
  {
    key: "rotate_pages",
    title: "Rotate Pages",
    description: "Enables page rotation.",
    type: configOptionTypes.boolean,
    category: configCategories.ocr,
    configKey: "PAPERLESS_OCR_ROTATE_PAGES",
  },
  {
    key: "rotate_pages_threshold",
    title: "Rotate Pages Threshold",
    description: "Sets the threshold for rotation of pages.",
    type: configOptionTypes.number,
    category: configCategories.ocr,
    configKey: "PAPERLESS_OCR_ROTATE_PAGES_THRESHOLD",
  },
  {
    key: "max_image_pixels",
    title: "Max Image Pixels",
    description: "Sets the maximum image size for decompression.",
    type: configOptionTypes.number,
    category: configCategories.ocr,
    configKey: "PAPERLESS_OCR_MAX_IMAGE_PIXELS",
  },
  {
    key: "color_conversion_strategy",
    title: "Color Conversion Strategy",
    description: "Sets the Ghostscript color conversion strategy.",
    type: configOptionTypes.select,
    category: configCategories.ocr,
    configKey: "PAPERLESS_OCR_COLOR_CONVERSION_STRATEGY",
    choices: colorConvertChoices,
  },
  {
    key: "user_args",
    title: "OCR Arguments",
    description: "Adds additional user arguments for OCRMyPDF.",
    type: configOptionTypes.json,
    category: configCategories.ocr,
    configKey: "PAPERLESS_OCR_USER_ARGS",
  },
  {
    key: "barcodes_enabled",
    title: "Enable Barcodes",
    description: "Enables barcode scanning.",
    type: configOptionTypes.boolean,
    category: configCategories.barcode,
    configKey: "PAPERLESS_CONSUMER_ENABLE_BARCODES",
  },
  {
    key: "barcode_enable_tiff_support",
    title: "Enable TIFF Support",
    description: "Enables barcode TIFF support.",
    type: configOptionTypes.boolean,
    category: configCategories.barcode,
    configKey: "PAPERLESS_CONSUMER_BARCODE_TIFF_SUPPORT",
  },
  {
    key: "barcode_string",
    title: "Barcode String",
    description: "Sets the barcode string.",
    type: configOptionTypes.string,
    category: configCategories.barcode,
    configKey: "PAPERLESS_CONSUMER_BARCODE_STRING",
  },
  {
    key: "barcode_retain_split_pages",
    title: "Retain Split Pages",
    description: "Retains split pages.",
    type: configOptionTypes.boolean,
    category: configCategories.barcode,
    configKey: "PAPERLESS_CONSUMER_BARCODE_RETAIN_SPLIT_PAGES",
  },
  {
    key: "barcode_enable_asn",
    title: "Enable ASN",
    description: "Enables ASN barcode.",
    type: configOptionTypes.boolean,
    category: configCategories.barcode,
    configKey: "PAPERLESS_CONSUMER_ENABLE_ASN_BARCODE",
  },
  {
    key: "barcode_asn_prefix",
    title: "ASN Prefix",
    description: "Sets the ASN barcode prefix.",
    type: configOptionTypes.string,
    category: configCategories.barcode,
    configKey: "PAPERLESS_CONSUMER_ASN_BARCODE_PREFIX",
  },
  {
    key: "barcode_upscale",
    title: "Upscale",
    description: "Sets the barcode upscale factor.",
    type: configOptionTypes.number,
    category: configCategories.barcode,
    configKey: "PAPERLESS_CONSUMER_BARCODE_UPSCALE",
  },
  {
    key: "barcode_dpi",
    title: "DPI",
    description: "Sets the barcode DPI.",
    type: configOptionTypes.number,
    category: configCategories.barcode,
    configKey: "PAPERLESS_CONSUMER_BARCODE_DPI",
  },
  {
    key: "barcode_max_pages",
    title: "Max Pages",
    description: "Sets the maximum pages for barcode scanning.",
    type: configOptionTypes.number,
    category: configCategories.barcode,
    configKey: "PAPERLESS_CONSUMER_BARCODE_MAX_PAGES",
  },
  {
    key: "barcode_enable_tag",
    title: "Enable Tag Detection",
    description: "Enables tag barcode detection.",
    type: configOptionTypes.boolean,
    category: configCategories.barcode,
    configKey: "PAPERLESS_CONSUMER_ENABLE_TAG_BARCODE",
  },
  {
    key: "barcode_tag_mapping",
    title: "Tag Mapping",
    description: "Sets the tag barcode mapping.",
    type: configOptionTypes.json,
    category: configCategories.barcode,
    configKey: "PAPERLESS_CONSUMER_TAG_BARCODE_MAPPING",
  },
  {
    key: "barcode_tag_split",
    title: "Split on Tag Barcodes",
    description: "Enables splitting on tag barcodes.",
    type: configOptionTypes.boolean,
    category: configCategories.barcode,
    configKey: "PAPERLESS_CONSUMER_TAG_BARCODE_SPLIT",
  },
  {
    key: "ai_enabled",
    title: "AI Enabled",
    type: configOptionTypes.boolean,
    category: configCategories.ai,
    configKey: "PAPERLESS_AI_ENABLED",
    note: "Consider privacy implications when enabling AI features, especially if using a remote model.",
  },
  {
    key: "llm_embedding_backend",
    title: "LLM Embedding Backend",
    type: configOptionTypes.select,
    category: configCategories.ai,
    configKey: "PAPERLESS_AI_LLM_EMBEDDING_BACKEND",
    choices: llmEmbeddingBackendChoices,
  },
  {
    key: "llm_embedding_model",
    title: "LLM Embedding Model",
    type: configOptionTypes.string,
    category: configCategories.ai,
    configKey: "PAPERLESS_AI_LLM_EMBEDDING_MODEL",
  },
  {
    key: "llm_backend",
    title: "LLM Backend",
    type: configOptionTypes.select,
    category: configCategories.ai,
    configKey: "PAPERLESS_AI_LLM_BACKEND",
    choices: llmBackendChoices,
  },
  {
    key: "llm_model",
    title: "LLM Model",
    type: configOptionTypes.string,
    category: configCategories.ai,
    configKey: "PAPERLESS_AI_LLM_MODEL",
  },
  {
    key: "llm_api_key",
    title: "LLM API Key",
    type: configOptionTypes.password,
    category: configCategories.ai,
    configKey: "PAPERLESS_AI_LLM_API_KEY",
  },
  {
    key: "llm_endpoint",
    title: "LLM Endpoint",
    type: configOptionTypes.string,
    category: configCategories.ai,
    configKey: "PAPERLESS_AI_LLM_ENDPOINT",
  },
]
