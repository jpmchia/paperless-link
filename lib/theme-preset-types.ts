export type AccentFamily =
  | "brand"
  | "primary"
  | "secondary"
  | "accent"
  | "chart1"
  | "chart2"
  | "chart3"
  | "chart4"
  | "chart5"
  | "sidebar-primary"
  | "sidebar-accent"
  | "slate"

export type SurfaceStyle = "minimal" | "outlined" | "elevated"

export type TextRoleKey =
  | "page"
  | "section"
  | "card"
  | "field"
  | "help"
  | "caption"
  | "subtext"

export type FontToken = "sans" | "serif" | "mono"

export type BackgroundToken =
  | "background"
  | "card"
  | "popover"
  | "muted"
  | "secondary"
  | "accent"
  | "sidebar"
  | "input"

export type ColorToken =
  | "foreground"
  | "card-foreground"
  | "popover-foreground"
  | "muted-foreground"
  | "brand"
  | "brand-foreground"
  | "primary"
  | "primary-foreground"
  | "secondary"
  | "secondary-foreground"
  | "accent"
  | "accent-foreground"
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"
  | "destructive"
  | "sidebar-foreground"
  | "sidebar-primary"
  | "sidebar-primary-foreground"
  | "sidebar-accent"
  | "sidebar-accent-foreground"

export type EmphasisToken = "regular" | "medium" | "semibold" | "bold"

export interface TextRoleConfig {
  label: string
  sample: string
  guidance: string
  font: FontToken
  sizeRem: number
  emphasis: EmphasisToken
  color: ColorToken
  uppercase?: boolean
  tracking?: string
  lineHeight: string
}

export interface ThemePresetDraft {
  accentFamily: AccentFamily
  surfaceStyle: SurfaceStyle
  headingScale: number
  helperContrast: number
  innerPadding: number
  spacing: number
  fieldSpacing: number
  fieldSeparation: number
  fieldLabelOffset: number
  previewBackgroundToken: BackgroundToken
  previewCardBackgroundToken: BackgroundToken
  previewInputBackgroundToken: BackgroundToken
  textRoles: Record<TextRoleKey, TextRoleConfig>
  showNestedCards: boolean
  showBorders: boolean
}

export interface ThemePresetRecord {
  id: string
  name: string
  description?: string
  draft: ThemePresetDraft
  variables: Record<string, string>
  createdAt: string
  updatedAt: string
}

export type ThemePresetSummary = Pick<
  ThemePresetRecord,
  "id" | "name" | "description" | "updatedAt"
>
