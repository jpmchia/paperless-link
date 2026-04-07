import type React from "react"
import type {
  ColorToken,
  EmphasisToken,
  FontToken,
  TextRoleConfig,
  TextRoleKey,
} from "@/lib/theme-preset-types"

export const fontTokenOptions: Record<FontToken, { label: string; value: string }> = {
  sans: { label: "Sans", value: "var(--font-sans)" },
  serif: { label: "Serif", value: "var(--font-serif)" },
  mono: { label: "Mono", value: "var(--font-mono)" },
}

export const colorTokenOptions: Record<ColorToken, { label: string; value: string }> = {
  background: { label: "Background", value: "var(--background)" },
  foreground: { label: "Foreground", value: "var(--foreground)" },
  card: { label: "Card", value: "var(--card)" },
  "card-foreground": { label: "Card foreground", value: "var(--card-foreground)" },
  popover: { label: "Popover", value: "var(--popover)" },
  "popover-foreground": { label: "Popover foreground", value: "var(--popover-foreground)" },
  muted: { label: "Muted", value: "var(--muted)" },
  "muted-foreground": { label: "Muted foreground", value: "var(--muted-foreground)" },
  brand: { label: "Brand", value: "var(--brand)" },
  "brand-foreground": { label: "Brand foreground", value: "var(--brand-foreground)" },
  primary: { label: "Primary", value: "var(--primary)" },
  "primary-foreground": { label: "Primary foreground", value: "var(--primary-foreground)" },
  secondary: { label: "Secondary", value: "var(--secondary)" },
  "secondary-foreground": { label: "Secondary foreground", value: "var(--secondary-foreground)" },
  accent: { label: "Accent", value: "var(--accent)" },
  "accent-foreground": { label: "Accent foreground", value: "var(--accent-foreground)" },
  border: { label: "Border", value: "var(--border)" },
  input: { label: "Input", value: "var(--input)" },
  ring: { label: "Ring", value: "var(--ring)" },
  "chart-1": { label: "Chart 1", value: "var(--chart-1)" },
  "chart-2": { label: "Chart 2", value: "var(--chart-2)" },
  "chart-3": { label: "Chart 3", value: "var(--chart-3)" },
  "chart-4": { label: "Chart 4", value: "var(--chart-4)" },
  "chart-5": { label: "Chart 5", value: "var(--chart-5)" },
  destructive: { label: "Destructive", value: "var(--destructive)" },
  sidebar: { label: "Sidebar", value: "var(--sidebar)" },
  "sidebar-foreground": { label: "Sidebar foreground", value: "var(--sidebar-foreground)" },
  "sidebar-border": { label: "Sidebar border", value: "var(--sidebar-border)" },
  "sidebar-ring": { label: "Sidebar ring", value: "var(--sidebar-ring)" },
  "sidebar-primary": { label: "Sidebar primary", value: "var(--sidebar-primary)" },
  "sidebar-primary-foreground": {
    label: "Sidebar primary foreground",
    value: "var(--sidebar-primary-foreground)",
  },
  "sidebar-accent": { label: "Sidebar accent", value: "var(--sidebar-accent)" },
  "sidebar-accent-foreground": {
    label: "Sidebar accent foreground",
    value: "var(--sidebar-accent-foreground)",
  },
}

export const emphasisOptions: Record<EmphasisToken, { label: string; value: number }> = {
  regular: { label: "Regular", value: 400 },
  medium: { label: "Medium", value: 500 },
  semibold: { label: "Semibold", value: 600 },
  bold: { label: "Bold", value: 700 },
}

export interface AccentStyle {
  tint: string
  border: string
  text: string
  color: string
  foreground: string
}

export interface PreviewCardProps {
  previewGap: string
  sectionClass: string
  showNestedCards: boolean
  showBorders: boolean
  previewCardBackgroundColor: string
  previewInputBackgroundColor: string
  titleScale: number
  helperTextColor: string
  textRoles: Record<TextRoleKey, TextRoleConfig>
  fieldBlockGap: string
  fieldBlockSeparation: string
  accent: AccentStyle
}

export function buildTextRoleStyle(
  role: TextRoleConfig,
  titleScale: number,
  helperTextColor: string,
): React.CSSProperties {
  const colorValue =
    role.color === "muted-foreground"
      ? helperTextColor
      : colorTokenOptions[role.color].value

  return {
    fontFamily: fontTokenOptions[role.font].value,
    fontSize: `${role.sizeRem * titleScale}rem`,
    lineHeight: role.lineHeight,
    fontWeight: emphasisOptions[role.emphasis].value,
    color: colorValue,
    textTransform: role.uppercase ? "uppercase" : undefined,
    letterSpacing: role.tracking,
  }
}
