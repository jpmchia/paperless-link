import { ObjectWithId } from './object-with-id'

export enum CustomFieldDataType {
  String = 'string',
  Url = 'url',
  Date = 'date',
  Boolean = 'boolean',
  Integer = 'integer',
  Float = 'float',
  Monetary = 'monetary',
  DocumentLink = 'documentlink',
  Select = 'select',
  LongText = 'longtext',
}

export const DATA_TYPE_LABELS = [
  {
    id: CustomFieldDataType.Boolean,
    name: 'Boolean',
  },
  {
    id: CustomFieldDataType.Date,
    name: 'Date',
  },
  {
    id: CustomFieldDataType.Integer,
    name: 'Integer',
  },
  {
    id: CustomFieldDataType.Float,
    name: 'Number',
  },
  {
    id: CustomFieldDataType.Monetary,
    name: 'Monetary',
  },
  {
    id: CustomFieldDataType.String,
    name: 'Text',
  },
  {
    id: CustomFieldDataType.Url,
    name: 'Url',
  },
  {
    id: CustomFieldDataType.DocumentLink,
    name: 'Document Link',
  },
  {
    id: CustomFieldDataType.Select,
    name: 'Select',
  },
  {
    id: CustomFieldDataType.LongText,
    name: 'Long Text',
  },
]

export interface CustomField extends ObjectWithId {
  data_type: CustomFieldDataType
  name: string
  created?: Date
  extra_data?: {
    select_options?: Array<{ label: string; id: string }>
    default_currency?: string
  }
  document_count?: number
}
