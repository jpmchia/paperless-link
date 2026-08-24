import { ObjectWithId } from './object-with-id'

// see /src/paperless/models.py

export enum OutputTypeConfig {
  PDF = 'pdf',
  PDF_A = 'pdfa',
  PDF_A1 = 'pdfa-1',
  PDF_A2 = 'pdfa-2',
  PDF_A3 = 'pdfa-3',
}

export enum ModeConfig {
  SKIP = 'skip',
  REDO = 'redo',
  FORCE = 'force',
  SKIP_NO_ARCHIVE = 'skip_noarchive',
}

export enum ArchiveFileConfig {
  NEVER = 'never',
  WITH_TEXT = 'with_text',
  ALWAYS = 'always',
}

export enum CleanConfig {
  CLEAN = 'clean',
  FINAL = 'clean-final',
  NONE = 'none',
}

export enum ColorConvertConfig {
  UNCHANGED = 'LeaveColorUnchanged',
  RGB = 'RGB',
  INDEPENDENT = 'UseDeviceIndependentColor',
  GRAY = 'Gray',
  CMYK = 'CMYK',
}

export enum RemoteOCREngineConfig {
  AZURE_AI = 'azureai',
}

export enum RemoteOCRModeConfig {
  ALWAYS = 'always',
  WORKFLOW_ONLY = 'workflow_only',
}

export enum ConfigOptionType {
  String = 'string',
  Number = 'number',
  Select = 'select',
  Boolean = 'boolean',
  JSON = 'json',
  File = 'file',
  Password = 'password',
}

export const ConfigCategory = {
  General: 'General Settings',
  OCR: 'OCR Settings',
  Barcode: 'Barcode Settings',
  AI: 'AI Settings',
}

export const LLMEmbeddingBackendConfig = {
  OPENAI: 'openai',
  HUGGINGFACE: 'huggingface',
}

export const LLMBackendConfig = {
  OPENAI: 'openai',
  OLLAMA: 'ollama',
}

export interface ConfigOption {
  key: string
  title: string
  type: ConfigOptionType
  choices?: Array<{ id: string; name: string }>
  config_key?: string
  category: string
  note?: string
}

function mapToItems<T extends Record<string, string>>(enumObj: T): Array<{ id: string; name: string }> {
  return Object.values(enumObj).map((value) => {
    return {
      id: value,
      name: value,
    }
  })
}

export const PaperlessConfigOptions: ConfigOption[] = [
  {
    key: 'output_type',
    title: 'Output Type',
    type: ConfigOptionType.Select,
    choices: mapToItems(OutputTypeConfig),
    config_key: 'PAPERLESS_OCR_OUTPUT_TYPE',
    category: ConfigCategory.OCR,
  },
  {
    key: 'language',
    title: 'Language',
    type: ConfigOptionType.String,
    config_key: 'PAPERLESS_OCR_LANGUAGE',
    category: ConfigCategory.OCR,
  },
  {
    key: 'pages',
    title: 'Pages',
    type: ConfigOptionType.Number,
    config_key: 'PAPERLESS_OCR_PAGES',
    category: ConfigCategory.OCR,
  },
  {
    key: 'mode',
    title: 'Mode',
    type: ConfigOptionType.Select,
    choices: mapToItems(ModeConfig),
    config_key: 'PAPERLESS_OCR_MODE',
    category: ConfigCategory.OCR,
  },
  {
    key: 'skip_archive_file',
    title: 'Skip Archive File',
    type: ConfigOptionType.Select,
    choices: mapToItems(ArchiveFileConfig),
    config_key: 'PAPERLESS_OCR_SKIP_ARCHIVE_FILE',
    category: ConfigCategory.OCR,
  },
  {
    key: 'image_dpi',
    title: 'Image DPI',
    type: ConfigOptionType.Number,
    config_key: 'PAPERLESS_OCR_IMAGE_DPI',
    category: ConfigCategory.OCR,
  },
  {
    key: 'unpaper_clean',
    title: 'Clean',
    type: ConfigOptionType.Select,
    choices: mapToItems(CleanConfig),
    config_key: 'PAPERLESS_OCR_CLEAN',
    category: ConfigCategory.OCR,
  },
  {
    key: 'deskew',
    title: 'Deskew',
    type: ConfigOptionType.Boolean,
    config_key: 'PAPERLESS_OCR_DESKEW',
    category: ConfigCategory.OCR,
  },
  {
    key: 'rotate_pages',
    title: 'Rotate Pages',
    type: ConfigOptionType.Boolean,
    config_key: 'PAPERLESS_OCR_ROTATE_PAGES',
    category: ConfigCategory.OCR,
  },
  {
    key: 'rotate_pages_threshold',
    title: 'Rotate Pages Threshold',
    type: ConfigOptionType.Number,
    config_key: 'PAPERLESS_OCR_ROTATE_PAGES_THRESHOLD',
    category: ConfigCategory.OCR,
  },
  {
    key: 'max_image_pixels',
    title: 'Max Image Pixels',
    type: ConfigOptionType.Number,
    config_key: 'PAPERLESS_OCR_MAX_IMAGE_PIXELS',
    category: ConfigCategory.OCR,
  },
  {
    key: 'color_conversion_strategy',
    title: 'Color Conversion Strategy',
    type: ConfigOptionType.Select,
    choices: mapToItems(ColorConvertConfig),
    config_key: 'PAPERLESS_OCR_COLOR_CONVERSION_STRATEGY',
    category: ConfigCategory.OCR,
  },
  {
    key: 'user_args',
    title: 'OCR Arguments',
    type: ConfigOptionType.JSON,
    config_key: 'PAPERLESS_OCR_USER_ARGS',
    category: ConfigCategory.OCR,
  },
  {
    key: 'remote_ocr_engine',
    title: 'Remote OCR Engine',
    type: ConfigOptionType.Select,
    choices: mapToItems(RemoteOCREngineConfig),
    config_key: 'PAPERLESS_REMOTE_OCR_ENGINE',
    category: ConfigCategory.OCR,
    note: 'Enabling remote OCR sends documents to a third-party service for processing. Consider the privacy implications and potential cost before turning this on.',
  },
  {
    key: 'remote_ocr_api_key',
    title: 'Remote OCR API Key',
    type: ConfigOptionType.Password,
    config_key: 'PAPERLESS_REMOTE_OCR_API_KEY',
    category: ConfigCategory.OCR,
  },
  {
    key: 'remote_ocr_endpoint',
    title: 'Remote OCR Endpoint',
    type: ConfigOptionType.String,
    config_key: 'PAPERLESS_REMOTE_OCR_ENDPOINT',
    category: ConfigCategory.OCR,
    note: 'Required when using the Azure AI engine.',
  },
  {
    key: 'remote_ocr_mode',
    title: 'Remote OCR Mode',
    type: ConfigOptionType.Select,
    choices: mapToItems(RemoteOCRModeConfig),
    config_key: 'PAPERLESS_REMOTE_OCR_MODE',
    category: ConfigCategory.OCR,
    note: "Use 'workflow_only' to keep remote OCR off unless a workflow enables it for a specific document.",
  },
  {
    key: 'app_logo',
    title: 'Application Logo',
    type: ConfigOptionType.File,
    config_key: 'PAPERLESS_APP_LOGO',
    category: ConfigCategory.General,
  },
  {
    key: 'app_title',
    title: 'Application Title',
    type: ConfigOptionType.String,
    config_key: 'PAPERLESS_APP_TITLE',
    category: ConfigCategory.General,
  },
  {
    key: 'barcodes_enabled',
    title: 'Enable Barcodes',
    type: ConfigOptionType.Boolean,
    config_key: 'PAPERLESS_CONSUMER_ENABLE_BARCODES',
    category: ConfigCategory.Barcode,
  },
  {
    key: 'barcode_enable_tiff_support',
    title: 'Enable TIFF Support',
    type: ConfigOptionType.Boolean,
    config_key: 'PAPERLESS_CONSUMER_BARCODE_TIFF_SUPPORT',
    category: ConfigCategory.Barcode,
  },
  {
    key: 'barcode_string',
    title: 'Barcode String',
    type: ConfigOptionType.String,
    config_key: 'PAPERLESS_CONSUMER_BARCODE_STRING',
    category: ConfigCategory.Barcode,
  },
  {
    key: 'barcode_retain_split_pages',
    title: 'Retain Split Pages',
    type: ConfigOptionType.Boolean,
    config_key: 'PAPERLESS_CONSUMER_BARCODE_RETAIN_SPLIT_PAGES',
    category: ConfigCategory.Barcode,
  },
  {
    key: 'barcode_enable_asn',
    title: 'Enable ASN',
    type: ConfigOptionType.Boolean,
    config_key: 'PAPERLESS_CONSUMER_ENABLE_ASN_BARCODE',
    category: ConfigCategory.Barcode,
  },
  {
    key: 'barcode_asn_prefix',
    title: 'ASN Prefix',
    type: ConfigOptionType.String,
    config_key: 'PAPERLESS_CONSUMER_ASN_BARCODE_PREFIX',
    category: ConfigCategory.Barcode,
  },
  {
    key: 'barcode_upscale',
    title: 'Upscale',
    type: ConfigOptionType.Number,
    config_key: 'PAPERLESS_CONSUMER_BARCODE_UPSCALE',
    category: ConfigCategory.Barcode,
  },
  {
    key: 'barcode_dpi',
    title: 'DPI',
    type: ConfigOptionType.Number,
    config_key: 'PAPERLESS_CONSUMER_BARCODE_DPI',
    category: ConfigCategory.Barcode,
  },
  {
    key: 'barcode_max_pages',
    title: 'Max Pages',
    type: ConfigOptionType.Number,
    config_key: 'PAPERLESS_CONSUMER_BARCODE_MAX_PAGES',
    category: ConfigCategory.Barcode,
  },
  {
    key: 'barcode_enable_tag',
    title: 'Enable Tag Detection',
    type: ConfigOptionType.Boolean,
    config_key: 'PAPERLESS_CONSUMER_ENABLE_TAG_BARCODE',
    category: ConfigCategory.Barcode,
  },
  {
    key: 'barcode_tag_mapping',
    title: 'Tag Mapping',
    type: ConfigOptionType.JSON,
    config_key: 'PAPERLESS_CONSUMER_TAG_BARCODE_MAPPING',
    category: ConfigCategory.Barcode,
  },
  {
    key: 'barcode_tag_split',
    title: 'Split on Tag Barcodes',
    type: ConfigOptionType.Boolean,
    config_key: 'PAPERLESS_CONSUMER_TAG_BARCODE_SPLIT',
    category: ConfigCategory.Barcode,
  },
  {
    key: 'ai_enabled',
    title: 'AI Enabled',
    type: ConfigOptionType.Boolean,
    config_key: 'PAPERLESS_AI_ENABLED',
    category: ConfigCategory.AI,
    note: 'Consider privacy implications when enabling AI features, especially if using a remote model.',
  },
  {
    key: 'llm_embedding_backend',
    title: 'LLM Embedding Backend',
    type: ConfigOptionType.Select,
    choices: mapToItems(LLMEmbeddingBackendConfig),
    config_key: 'PAPERLESS_AI_LLM_EMBEDDING_BACKEND',
    category: ConfigCategory.AI,
  },
  {
    key: 'llm_embedding_model',
    title: 'LLM Embedding Model',
    type: ConfigOptionType.String,
    config_key: 'PAPERLESS_AI_LLM_EMBEDDING_MODEL',
    category: ConfigCategory.AI,
  },
  {
    key: 'llm_backend',
    title: 'LLM Backend',
    type: ConfigOptionType.Select,
    choices: mapToItems(LLMBackendConfig),
    config_key: 'PAPERLESS_AI_LLM_BACKEND',
    category: ConfigCategory.AI,
  },
  {
    key: 'llm_model',
    title: 'LLM Model',
    type: ConfigOptionType.String,
    config_key: 'PAPERLESS_AI_LLM_MODEL',
    category: ConfigCategory.AI,
  },
  {
    key: 'llm_api_key',
    title: 'LLM API Key',
    type: ConfigOptionType.Password,
    config_key: 'PAPERLESS_AI_LLM_API_KEY',
    category: ConfigCategory.AI,
  },
  {
    key: 'llm_endpoint',
    title: 'LLM Endpoint',
    type: ConfigOptionType.String,
    config_key: 'PAPERLESS_AI_LLM_ENDPOINT',
    category: ConfigCategory.AI,
  },
]

export interface PaperlessConfig extends ObjectWithId {
  output_type: OutputTypeConfig
  pages: number
  language: string
  mode: ModeConfig
  skip_archive_file: ArchiveFileConfig
  image_dpi: number
  unpaper_clean: CleanConfig
  deskew: boolean
  rotate_pages: boolean
  rotate_pages_threshold: number
  max_image_pixels: number
  color_conversion_strategy: ColorConvertConfig
  user_args: object
  remote_ocr_engine: string
  remote_ocr_api_key: string
  remote_ocr_endpoint: string
  remote_ocr_mode: string
  app_logo: string
  app_title: string
  barcodes_enabled: boolean
  barcode_enable_tiff_support: boolean
  barcode_string: string
  barcode_retain_split_pages: boolean
  barcode_enable_asn: boolean
  barcode_asn_prefix: string
  barcode_upscale: number
  barcode_dpi: number
  barcode_max_pages: number
  barcode_enable_tag: boolean
  barcode_tag_mapping: object
  barcode_tag_split: boolean
  ai_enabled: boolean
  llm_embedding_backend: string
  llm_embedding_model: string
  llm_backend: string
  llm_model: string
  llm_api_key: string
  llm_endpoint: string
}
