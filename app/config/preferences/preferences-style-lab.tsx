"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  Copy,
  LayoutPanelTop,
  Palette,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { saveSharedThemePreset } from "./actions"
import { useAsyncAction } from "@/hooks/use-async-action"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import type {
  AccentFamily,
  BackgroundToken,
  ColorToken,
  EmphasisToken,
  FontToken,
  SurfaceStyle,
  TextRoleConfig,
  TextRoleKey,
  ThemePresetDraft,
  ThemePresetRecord,
} from "@/lib/theme-preset-types"
import { cn } from "@/lib/utils"

const fontTokenOptions: Record<FontToken, { label: string; value: string }> = {
  sans: { label: "Sans", value: "var(--font-sans)" },
  serif: { label: "Serif", value: "var(--font-serif)" },
  mono: { label: "Mono", value: "var(--font-mono)" },
}

const backgroundTokenOptions: Record<BackgroundToken, { label: string; value: string }> = {
  background: { label: "Background", value: "var(--background)" },
  card: { label: "Card", value: "var(--card)" },
  popover: { label: "Popover", value: "var(--popover)" },
  muted: { label: "Muted", value: "var(--muted)" },
  secondary: { label: "Secondary", value: "var(--secondary)" },
  accent: { label: "Accent", value: "var(--accent)" },
  sidebar: { label: "Sidebar", value: "var(--sidebar)" },
  input: { label: "Input", value: "var(--input)" },
}

const colorTokenOptions: Record<ColorToken, { label: string; value: string }> = {
  foreground: { label: "Foreground", value: "var(--foreground)" },
  "card-foreground": { label: "Card foreground", value: "var(--card-foreground)" },
  "popover-foreground": { label: "Popover foreground", value: "var(--popover-foreground)" },
  "muted-foreground": { label: "Muted foreground", value: "var(--muted-foreground)" },
  brand: { label: "Brand", value: "var(--brand)" },
  "brand-foreground": { label: "Brand foreground", value: "var(--brand-foreground)" },
  primary: { label: "Primary", value: "var(--primary)" },
  "primary-foreground": { label: "Primary foreground", value: "var(--primary-foreground)" },
  secondary: { label: "Secondary", value: "var(--secondary)" },
  "secondary-foreground": { label: "Secondary foreground", value: "var(--secondary-foreground)" },
  accent: { label: "Accent", value: "var(--accent)" },
  "accent-foreground": { label: "Accent foreground", value: "var(--accent-foreground)" },
  "chart-1": { label: "Chart 1", value: "var(--chart-1)" },
  "chart-2": { label: "Chart 2", value: "var(--chart-2)" },
  "chart-3": { label: "Chart 3", value: "var(--chart-3)" },
  "chart-4": { label: "Chart 4", value: "var(--chart-4)" },
  "chart-5": { label: "Chart 5", value: "var(--chart-5)" },
  destructive: { label: "Destructive", value: "var(--destructive)" },
  "sidebar-foreground": { label: "Sidebar foreground", value: "var(--sidebar-foreground)" },
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

const emphasisOptions: Record<EmphasisToken, { label: string; value: number }> = {
  regular: { label: "Regular", value: 400 },
  medium: { label: "Medium", value: 500 },
  semibold: { label: "Semibold", value: 600 },
  bold: { label: "Bold", value: 700 },
}

const defaultTextRoles: Record<TextRoleKey, TextRoleConfig> = {
  page: {
    label: "Page heading",
    sample: "AI & NLP",
    guidance: "Top-level screen title. Use once per page.",
    font: "sans",
    sizeRem: 1.7,
    emphasis: "regular",
    color: "brand",
    lineHeight: "1.1",
  },
  section: {
    label: "Section heading",
    sample: "Provider / Model comparison",
    guidance: "Major task boundary inside a page or workspace.",
    font: "sans",
    sizeRem: 1.15,
    emphasis: "semibold",
    color: "foreground",
    lineHeight: "1.2",
  },
  card: {
    label: "Card heading",
    sample: "Available models",
    guidance: "Title for a distinct surface or card.",
    font: "sans",
    sizeRem: 1.1,
    emphasis: "regular",
    color: "foreground",
    lineHeight: "1.25",
  },
  field: {
    label: "Field label",
    sample: "Provider source",
    guidance: "Compact, consistent label for an editable control.",
    font: "sans",
    sizeRem: 0.75,
    emphasis: "medium",
    color: "primary",
    uppercase: true,
    tracking: "0.04em",
    lineHeight: "1.15",
  },
  help: {
    label: "Help / guidance text",
    sample: "Select the delivery source for this provider.",
    guidance: "Instructional copy attached to a field or section.",
    font: "sans",
    sizeRem: 0.8125,
    emphasis: "regular",
    color: "muted-foreground",
    lineHeight: "1.45",
  },
  caption: {
    label: "Caption",
    sample: "Updated 31 Mar 2026, 14:02",
    guidance: "Small metadata or supporting annotation.",
    font: "sans",
    sizeRem: 0.75,
    emphasis: "medium",
    color: "muted-foreground",
    lineHeight: "1.35",
  },
  subtext: {
    label: "Subtext",
    sample: "Applies only to enabled models.",
    guidance: "Lowest-emphasis supporting note. Never use for primary meaning.",
    font: "sans",
    sizeRem: 0.72,
    emphasis: "regular",
    color: "muted-foreground",
    lineHeight: "1.35",
  },
}

const accentOptions: Record<
  AccentFamily,
  { name: string; tint: string; border: string; text: string; color: string; foreground: string }
> = {
  brand: {
    name: "Brand accent",
    tint: "color-mix(in oklch, var(--brand) 14%, transparent)",
    border: "color-mix(in oklch, var(--brand) 34%, var(--border))",
    text: "var(--brand)",
    color: "var(--brand)",
    foreground: "var(--brand-foreground)",
  },
  primary: {
    name: "Primary accent",
    tint: "color-mix(in oklch, var(--primary) 14%, transparent)",
    border: "color-mix(in oklch, var(--primary) 34%, var(--border))",
    text: "var(--primary)",
    color: "var(--primary)",
    foreground: "var(--primary-foreground)",
  },
  secondary: {
    name: "Secondary accent",
    tint: "color-mix(in oklch, var(--secondary) 16%, transparent)",
    border: "color-mix(in oklch, var(--secondary-foreground) 30%, var(--border))",
    text: "var(--secondary-foreground)",
    color: "var(--secondary-foreground)",
    foreground: "var(--secondary)",
  },
  accent: {
    name: "Accent token",
    tint: "color-mix(in oklch, var(--accent) 18%, transparent)",
    border: "color-mix(in oklch, var(--accent-foreground) 26%, var(--border))",
    text: "var(--accent-foreground)",
    color: "var(--accent)",
    foreground: "var(--accent-foreground)",
  },
  chart1: {
    name: "Chart 1 accent",
    tint: "color-mix(in oklch, var(--chart-1) 14%, transparent)",
    border: "color-mix(in oklch, var(--chart-1) 34%, var(--border))",
    text: "var(--chart-1)",
    color: "var(--chart-1)",
    foreground: "var(--foreground)",
  },
  chart2: {
    name: "Chart 2 accent",
    tint: "color-mix(in oklch, var(--chart-2) 14%, transparent)",
    border: "color-mix(in oklch, var(--chart-2) 34%, var(--border))",
    text: "var(--chart-2)",
    color: "var(--chart-2)",
    foreground: "var(--foreground)",
  },
  chart3: {
    name: "Chart 3 accent",
    tint: "color-mix(in oklch, var(--chart-3) 14%, transparent)",
    border: "color-mix(in oklch, var(--chart-3) 34%, var(--border))",
    text: "var(--chart-3)",
    color: "var(--chart-3)",
    foreground: "var(--foreground)",
  },
  chart4: {
    name: "Chart 4 accent",
    tint: "color-mix(in oklch, var(--chart-4) 14%, transparent)",
    border: "color-mix(in oklch, var(--chart-4) 34%, var(--border))",
    text: "var(--chart-4)",
    color: "var(--chart-4)",
    foreground: "var(--foreground)",
  },
  chart5: {
    name: "Chart 5 accent",
    tint: "color-mix(in oklch, var(--chart-5) 14%, transparent)",
    border: "color-mix(in oklch, var(--chart-5) 34%, var(--border))",
    text: "var(--chart-5)",
    color: "var(--chart-5)",
    foreground: "var(--foreground)",
  },
  "sidebar-primary": {
    name: "Sidebar primary",
    tint: "color-mix(in oklch, var(--sidebar-primary) 14%, transparent)",
    border: "color-mix(in oklch, var(--sidebar-primary) 34%, var(--sidebar-border))",
    text: "var(--sidebar-primary)",
    color: "var(--sidebar-primary)",
    foreground: "var(--sidebar-primary-foreground)",
  },
  "sidebar-accent": {
    name: "Sidebar accent",
    tint: "color-mix(in oklch, var(--sidebar-accent) 18%, transparent)",
    border: "color-mix(in oklch, var(--sidebar-accent-foreground) 28%, var(--sidebar-border))",
    text: "var(--sidebar-accent-foreground)",
    color: "var(--sidebar-accent)",
    foreground: "var(--sidebar-accent-foreground)",
  },
  slate: {
    name: "Neutral slate",
    tint: "color-mix(in oklch, var(--muted-foreground) 12%, transparent)",
    border: "color-mix(in oklch, var(--muted-foreground) 28%, var(--border))",
    text: "var(--foreground)",
    color: "var(--foreground)",
    foreground: "var(--background)",
  },
}

function formatThemeVariables(variables: Record<string, string>) {
  const lines = Object.entries(variables).map(([key, value]) => `  ${key}: ${value};`)
  return `/* Shared theme preset variables */\n:root {\n${lines.join("\n")}\n}`
}

function buildSurfaceOverride(
  variableName: "--background" | "--card" | "--input",
  token: BackgroundToken
) {
  const selfTokenMap: Record<typeof variableName, BackgroundToken> = {
    "--background": "background",
    "--card": "card",
    "--input": "input",
  }

  return token === selfTokenMap[variableName]
    ? null
    : [variableName, backgroundTokenOptions[token].value] as const
}

function buildBrandOverrides(accentFamily: AccentFamily) {
  if (accentFamily === "brand") {
    return [] as const
  }

  const accent = accentOptions[accentFamily]
  return [
    ["--brand", accent.color],
    ["--brand-foreground", accent.foreground],
  ] as const
}

interface PreferencesStyleLabProps {
  canManageThemes?: boolean
  initialThemePresets?: ThemePresetRecord[]
}

export function PreferencesStyleLab({
  canManageThemes = false,
  initialThemePresets = [],
}: PreferencesStyleLabProps) {
  const [themePresets, setThemePresets] = React.useState<ThemePresetRecord[]>(initialThemePresets)
  const [editingThemeId, setEditingThemeId] = React.useState("")
  const [themeName, setThemeName] = React.useState("")
  const [themeDescription, setThemeDescription] = React.useState("")
  const [accentFamily, setAccentFamily] = React.useState<AccentFamily>("brand")
  const [surfaceStyle, setSurfaceStyle] = React.useState<SurfaceStyle>("outlined")
  const [headingScale, setHeadingScale] = React.useState([100])
  const [helperContrast, setHelperContrast] = React.useState([58])
  const [innerPadding, setInnerPadding] = React.useState([24])
  const [spacing, setSpacing] = React.useState([3.6])
  const [fieldSpacing, setFieldSpacing] = React.useState([8])
  const [fieldSeparation, setFieldSeparation] = React.useState([16])
  const [fieldLabelOffset, setFieldLabelOffset] = React.useState([14])
  const [previewBackgroundToken, setPreviewBackgroundToken] = React.useState<BackgroundToken>("background")
  const [previewCardBackgroundToken, setPreviewCardBackgroundToken] = React.useState<BackgroundToken>("card")
  const [previewInputBackgroundToken, setPreviewInputBackgroundToken] = React.useState<BackgroundToken>("input")
  const [textRoles, setTextRoles] = React.useState<Record<TextRoleKey, TextRoleConfig>>(defaultTextRoles)
  const [showNestedCards, setShowNestedCards] = React.useState(false)
  const [showBorders, setShowBorders] = React.useState(true)

  const accent = accentOptions[accentFamily]
  const titleScale = headingScale[0] / 100
  const helperTextColor = `color-mix(in oklch, var(--foreground) ${helperContrast[0]}%, transparent)`
  const previewGap = `${spacing[0] * 4}px`
  const sectionPadding = `${innerPadding[0]}px`
  const fieldBlockGap = `${fieldSpacing[0]}px`
  const fieldBlockSeparation = `${fieldSeparation[0]}px`
  const nextFieldLabelOffset = `${fieldLabelOffset[0]}px`
  const previewBackgroundColor = backgroundTokenOptions[previewBackgroundToken].value
  const previewCardBackgroundColor = backgroundTokenOptions[previewCardBackgroundToken].value
  const previewInputBackgroundColor = backgroundTokenOptions[previewInputBackgroundToken].value

  const draft = React.useMemo<ThemePresetDraft>(
    () => ({
      accentFamily,
      surfaceStyle,
      headingScale: headingScale[0] ?? 100,
      helperContrast: helperContrast[0] ?? 58,
      innerPadding: innerPadding[0] ?? 24,
      spacing: spacing[0] ?? 3.6,
      fieldSpacing: fieldSpacing[0] ?? 8,
      fieldSeparation: fieldSeparation[0] ?? 16,
      fieldLabelOffset: fieldLabelOffset[0] ?? 14,
      previewBackgroundToken,
      previewCardBackgroundToken,
      previewInputBackgroundToken,
      textRoles,
      showNestedCards,
      showBorders,
    }),
    [
      accentFamily,
      fieldLabelOffset,
      fieldSeparation,
      fieldSpacing,
      headingScale,
      helperContrast,
      innerPadding,
      previewBackgroundToken,
      previewCardBackgroundToken,
      previewInputBackgroundToken,
      showBorders,
      showNestedCards,
      spacing,
      surfaceStyle,
      textRoles,
    ]
  )

  const previewStyles = React.useMemo(() => {
    const outerClass =
      surfaceStyle === "elevated"
        ? "rounded-2xl border border-border/70"
        : surfaceStyle === "minimal"
          ? "rounded-2xl"
          : "rounded-2xl border border-border/70"

    const sectionClass = showNestedCards
      ? cn(
          "rounded-xl p-4",
          showBorders ? "border border-border/60" : ""
        )
      : "rounded-xl p-0"

    return {
      outerClass,
      sectionClass,
    }
  }, [showBorders, showNestedCards, surfaceStyle])

  const previewSurfaceStyle = React.useMemo<React.CSSProperties>(
    () => ({
      boxShadow:
        surfaceStyle === "elevated"
          ? "var(--shadow-2xl)"
          : surfaceStyle === "outlined"
            ? "var(--shadow-sm)"
            : "none",
    }),
    [surfaceStyle]
  )

  const themeVariables = React.useMemo(() => {
    const textRoleEntries = (Object.entries(textRoles) as Array<[TextRoleKey, TextRoleConfig]>)
      .flatMap(([roleKey, role]) => [
        [`--text-${roleKey}-font`, fontTokenOptions[role.font].value],
        [`--text-${roleKey}-size`, `${role.sizeRem.toFixed(2)}rem`],
        [`--text-${roleKey}-weight`, String(emphasisOptions[role.emphasis].value)],
        [`--text-${roleKey}-color`, colorTokenOptions[role.color].value],
        [`--text-${roleKey}-line-height`, role.lineHeight],
        [`--text-${roleKey}-tracking`, role.tracking || "normal"],
        [`--text-${roleKey}-transform`, role.uppercase ? "uppercase" : "none"],
      ])

    return Object.fromEntries([
      ...buildBrandOverrides(accentFamily),
      buildSurfaceOverride("--background", previewBackgroundToken),
      buildSurfaceOverride("--card", previewCardBackgroundToken),
      buildSurfaceOverride("--input", previewInputBackgroundToken),
      ["--inner-padding", `${innerPadding[0]}px`],
      ["--spacing", `${spacing[0].toFixed(1)}px`],
      ["--field-spacing", `${fieldSpacing[0]}px`],
      ["--field-separation", `${fieldSeparation[0]}px`],
      ["--field-label-offset", `${fieldLabelOffset[0]}px`],
      ...textRoleEntries,
    ].filter((entry): entry is [string, string] => Array.isArray(entry)))
  }, [
    accentFamily,
    fieldLabelOffset,
    fieldSeparation,
    fieldSpacing,
    innerPadding,
    previewBackgroundToken,
    previewCardBackgroundToken,
    previewInputBackgroundToken,
    spacing,
    textRoles,
  ])

  const generatedCssVariables = React.useMemo(
    () => formatThemeVariables(themeVariables),
    [themeVariables]
  )

  function updateTextRole<K extends keyof TextRoleConfig>(
    role: TextRoleKey,
    key: K,
    value: TextRoleConfig[K]
  ) {
    setTextRoles((current) => ({
      ...current,
      [role]: {
        ...current[role],
        [key]: value,
      },
    }))
  }

  function loadThemePreset(preset: ThemePresetRecord) {
    setEditingThemeId(preset.id)
    setThemeName(preset.name)
    setThemeDescription(preset.description ?? "")
    setAccentFamily(preset.draft.accentFamily)
    setSurfaceStyle(preset.draft.surfaceStyle)
    setHeadingScale([preset.draft.headingScale])
    setHelperContrast([preset.draft.helperContrast])
    setInnerPadding([preset.draft.innerPadding])
    setSpacing([preset.draft.spacing])
    setFieldSpacing([preset.draft.fieldSpacing])
    setFieldSeparation([preset.draft.fieldSeparation])
    setFieldLabelOffset([preset.draft.fieldLabelOffset])
    setPreviewBackgroundToken(preset.draft.previewBackgroundToken)
    setPreviewCardBackgroundToken(preset.draft.previewCardBackgroundToken)
    setPreviewInputBackgroundToken(preset.draft.previewInputBackgroundToken)
    setTextRoles(preset.draft.textRoles)
    setShowNestedCards(preset.draft.showNestedCards)
    setShowBorders(preset.draft.showBorders)
  }

  function resetThemePresetDraft() {
    setEditingThemeId("")
    setThemeName("")
    setThemeDescription("")
  }

  const { pending: savingTheme, run: handleSaveTheme } = useAsyncAction({
    action: async () =>
      saveSharedThemePreset({
        id: editingThemeId || undefined,
        name: themeName,
        description: themeDescription,
        draft,
        variables: themeVariables,
      }),
    errorMessage: "Failed to save theme preset",
    successMessage: editingThemeId ? "Theme preset updated" : "Theme preset saved",
    onSuccess: (preset) => {
      setThemePresets((current) => {
        const next = current.some((entry) => entry.id === preset.id)
          ? current.map((entry) => (entry.id === preset.id ? preset : entry))
          : [...current, preset]
        return next.sort((left, right) => left.name.localeCompare(right.name))
      })
      loadThemePreset(preset)
    },
  })

  async function handleCopyGeneratedCss() {
    try {
      await navigator.clipboard.writeText(generatedCssVariables)
      toast.success("Copied CSS variables")
    } catch (error) {
      toast.error("Failed to copy CSS variables", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return (
    <div className="grid min-h-0 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Preferences Lab</CardTitle>
          <CardDescription>
            A shared mock-up space for refining hierarchy, emphasis, and surface usage, then saving administrator-defined theme presets for users to select.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="text-sm font-medium">Shared theme presets</div>
            <div className="space-y-1.5">
              <Label className="text-xs">Saved themes</Label>
              <Select
                value={editingThemeId || "__working_draft__"}
                onValueChange={(value) => {
                  if (value === "__working_draft__") {
                    resetThemePresetDraft()
                    return
                  }
                  const preset = themePresets.find((entry) => entry.id === value)
                  if (preset) {
                    loadThemePreset(preset)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Working draft" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__working_draft__">Working draft</SelectItem>
                  {themePresets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Theme name</Label>
              <Input
                value={themeName}
                onChange={(event) => setThemeName(event.target.value)}
                placeholder="e.g. Operations dark"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Theme description</Label>
              <Input
                value={themeDescription}
                onChange={(event) => setThemeDescription(event.target.value)}
                placeholder="Short guidance for when users should choose this preset"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="flex-1"
                disabled={!canManageThemes || savingTheme || themeName.trim().length === 0}
                onClick={() => void handleSaveTheme()}
              >
                {editingThemeId ? "Update theme" : "Save theme"}
              </Button>
              <Button variant="outline" onClick={resetThemePresetDraft}>
                New
              </Button>
            </div>
            {!canManageThemes ? (
              <p className="text-xs text-muted-foreground">
                You can use the lab as a reference, but only administrators can save shared themes.
              </p>
            ) : null}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="size-4" />
              Accent role
            </div>
            <Select value={accentFamily} onValueChange={(value) => setAccentFamily(value as AccentFamily)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(accentOptions).map(([key, option]) => (
                  <SelectItem key={key} value={key}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="size-4" />
              Heading scale
            </div>
            <Slider min={90} max={120} step={2} value={headingScale} onValueChange={setHeadingScale} />
            <div className="text-xs text-muted-foreground">{headingScale[0]}%</div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4" />
              Helper-text contrast
            </div>
            <Slider min={35} max={80} step={1} value={helperContrast} onValueChange={setHelperContrast} />
            <div className="text-xs text-muted-foreground">{helperContrast[0]}%</div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="size-4" />
              Inner padding
            </div>
            <Slider min={12} max={40} step={2} value={innerPadding} onValueChange={setInnerPadding} />
            <div className="text-xs text-muted-foreground">
              {innerPadding[0]}px for main surfaces and cards
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="size-4" />
              Spacing
            </div>
            <Slider min={2} max={8} step={0.2} value={spacing} onValueChange={setSpacing} />
            <div className="text-xs text-muted-foreground">
              Simulates <code>--spacing</code>: {spacing[0].toFixed(1)}px
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="size-4" />
              Field spacing
            </div>
            <Slider min={4} max={16} step={1} value={fieldSpacing} onValueChange={setFieldSpacing} />
            <div className="text-xs text-muted-foreground">
              Vertical spacing between a field label, helper text, and input: {fieldSpacing[0]}px
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="size-4" />
              Field separation
            </div>
            <Slider min={8} max={28} step={2} value={fieldSeparation} onValueChange={setFieldSeparation} />
            <div className="text-xs text-muted-foreground">
              Vertical margin between fields or field groups: {fieldSeparation[0]}px
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="size-4" />
              Field label offset
            </div>
            <Slider min={0} max={24} step={1} value={fieldLabelOffset} onValueChange={setFieldLabelOffset} />
            <div className="text-xs text-muted-foreground">
              Space between a previous input and the next field label: {fieldLabelOffset[0]}px
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LayoutPanelTop className="size-4" />
              Surface treatment
            </div>
            <Select value={surfaceStyle} onValueChange={(value) => setSurfaceStyle(value as SurfaceStyle)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="outlined">Outlined</SelectItem>
                <SelectItem value="elevated">Elevated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="size-4" />
              Background
            </div>
            <Select
              value={previewBackgroundToken}
              onValueChange={(value) => setPreviewBackgroundToken(value as BackgroundToken)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(backgroundTokenOptions).map(([key, option]) => (
                  <SelectItem key={key} value={key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="size-4" />
              Card background
            </div>
            <Select
              value={previewCardBackgroundToken}
              onValueChange={(value) => setPreviewCardBackgroundToken(value as BackgroundToken)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(backgroundTokenOptions).map(([key, option]) => (
                  <SelectItem key={key} value={key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="size-4" />
              Input background
            </div>
            <Select
              value={previewInputBackgroundToken}
              onValueChange={(value) => setPreviewInputBackgroundToken(value as BackgroundToken)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(backgroundTokenOptions).map(([key, option]) => (
                  <SelectItem key={key} value={key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="text-sm font-medium">Text hierarchy controls</div>
            <div className="space-y-4">
              {(Object.entries(textRoles) as Array<[TextRoleKey, TextRoleConfig]>).map(([roleKey, role]) => (
                <div key={roleKey} className="rounded-lg border border-border/60 p-3">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/75">
                    {role.label}
                  </div>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Font token</Label>
                        <Select
                          value={role.font}
                          onValueChange={(value) => updateTextRole(roleKey, "font", value as FontToken)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(fontTokenOptions).map(([key, option]) => (
                              <SelectItem key={key} value={key}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Colour token</Label>
                        <Select
                          value={role.color}
                          onValueChange={(value) => updateTextRole(roleKey, "color", value as ColorToken)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(colorTokenOptions).map(([key, option]) => (
                              <SelectItem key={key} value={key}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Emphasis</Label>
                        <Select
                          value={role.emphasis}
                          onValueChange={(value) =>
                            updateTextRole(roleKey, "emphasis", value as EmphasisToken)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(emphasisOptions).map(([key, option]) => (
                              <SelectItem key={key} value={key}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Size</Label>
                        <Slider
                          min={roleKey === "page" ? 1.2 : 0.65}
                          max={roleKey === "page" ? 2.5 : 1.4}
                          step={0.01}
                          value={[role.sizeRem]}
                          onValueChange={(value) => updateTextRole(roleKey, "sizeRem", value[0] ?? role.sizeRem)}
                        />
                        <div className="text-[11px] text-muted-foreground">{role.sizeRem.toFixed(2)}rem</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Nested cards</div>
                <div className="text-xs text-muted-foreground">
                  Useful for testing whether interior groupings need their own surfaces.
                </div>
              </div>
              <Switch checked={showNestedCards} onCheckedChange={setShowNestedCards} />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Visible borders</div>
                <div className="text-xs text-muted-foreground">
                  Toggle boundaries separately from background surfaces.
                </div>
              </div>
              <Switch checked={showBorders} onCheckedChange={setShowBorders} />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">What this page is for</div>
            <div className="text-xs text-muted-foreground">
              Use this as the reference screen for any future design work. It should answer:
              what looks like a page title, what looks editable, what is guidance, and when a card or border is justified.
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">Locked-in starting principles</div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>`Brand` is the structural emphasis color for page titles and workspace-level emphasis.</li>
              <li>`Primary` remains the interaction accent for field labels, focus states, and active controls.</li>
              <li>Page headings are distinguished mainly by size, placement, and brand color rather than heavy weight.</li>
              <li>Section and card headings stay on foreground so accent colors keep their meaning.</li>
              <li>Helper text, captions, and subtext remain on muted tokens so editable values stay dominant.</li>
              <li>Cards should represent real task boundaries, not be used as a default wrapper around every field group.</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Generated CSS variables</div>
                <div className="text-xs text-muted-foreground">
                  Export the current preset as the CSS variables applied when users choose this theme.
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => void handleCopyGeneratedCss()}>
                <Copy className="size-4" />
                Copy
              </Button>
            </div>
            <pre className="max-h-64 overflow-auto rounded-lg border border-border/60 bg-muted/30 p-3 text-[11px] leading-5 text-foreground">
              <code>{generatedCssVariables}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      <div
        className={cn("min-h-0 overflow-hidden", previewStyles.outerClass)}
        style={{
          ...previewSurfaceStyle,
          padding: sectionPadding,
          backgroundColor: previewBackgroundColor,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div
              className="tracking-tight"
              style={buildTextRoleStyle(textRoles.page, titleScale, helperTextColor)}
            >
              Visual Hierarchy Preview
            </div>
            <div
              className="max-w-3xl text-sm"
              style={{ color: helperTextColor }}
            >
              This mock-up helps tune how page titles, section headings, editable fields, helper text, and surfaces should relate before any global design token changes are applied.
            </div>
          </div>
          <Badge
            variant="outline"
            style={{
              borderColor: accent.border,
              backgroundColor: accent.tint,
              color: accent.text,
            }}
          >
            Preview only
          </Badge>
        </div>

        <div className="mt-6 grid xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]" style={{ gap: previewGap }}>
          <div style={{ display: "grid", gap: previewGap }}>
            <section
              className={previewStyles.sectionClass}
              style={showNestedCards ? { backgroundColor: previewCardBackgroundColor } : undefined}
            >
              <div style={{ display: "grid", gap: `${fieldSpacing[0] / 2}px` }}>
                <h2
                  style={buildTextRoleStyle(textRoles.section, titleScale, helperTextColor)}
                >
                  Editor surface
                </h2>
                <p className="text-sm" style={{ color: helperTextColor }}>
                  Sample authoring area showing intended separation between headings, field labels, editable content, and guidance.
                </p>
              </div>

              <div className="mt-4 grid md:grid-cols-2" style={{ gap: fieldBlockSeparation }}>
                <PreviewField
                  label="Label"
                  helper="Field labels should be small and consistent."
                  value="Taxonomy Description"
                  fieldSpacing={fieldBlockGap}
                  labelStyle={buildTextRoleStyle(textRoles.field, titleScale, helperTextColor)}
                  helpStyle={buildTextRoleStyle(textRoles.help, titleScale, helperTextColor)}
                  inputStyle={{ backgroundColor: previewInputBackgroundColor }}
                />
                <PreviewField
                  label="Status"
                  helper="Editable values should always have stronger contrast than guidance."
                  value="Active"
                  fieldSpacing={fieldBlockGap}
                  labelStyle={buildTextRoleStyle(textRoles.field, titleScale, helperTextColor)}
                  helpStyle={buildTextRoleStyle(textRoles.help, titleScale, helperTextColor)}
                  inputStyle={{ backgroundColor: previewInputBackgroundColor }}
                />
              </div>

              <div style={{ marginTop: nextFieldLabelOffset, display: "grid", gap: fieldBlockGap }}>
                <Label style={buildTextRoleStyle(textRoles.field, titleScale, helperTextColor)}>
                  Description
                </Label>
                <div
                  className={cn(
                    "rounded-lg px-4 py-3 text-sm text-foreground",
                    showBorders ? "border border-border/60" : "bg-background/50"
                  )}
                  style={{ backgroundColor: previewCardBackgroundColor }}
                >
                  Use this prompt to generate concise, business-facing taxonomy descriptions grounded in context.
                </div>
                <p style={buildTextRoleStyle(textRoles.help, titleScale, helperTextColor)}>
                  Helper text should support the field, not compete with the input value.
                </p>
              </div>

              <div style={{ marginTop: nextFieldLabelOffset, display: "grid", gap: fieldBlockGap }}>
                <Label style={buildTextRoleStyle(textRoles.field, titleScale, helperTextColor)}>
                  Prompt template
                </Label>
                <p style={buildTextRoleStyle(textRoles.help, titleScale, helperTextColor)}>
                  This shows the spacing between one field input ending and the next field label beginning.
                </p>
                <div
                  className={cn(
                    "rounded-lg px-4 py-3 text-sm text-foreground",
                    showBorders ? "border border-border/60" : "bg-background/50"
                  )}
                  style={{ backgroundColor: previewCardBackgroundColor }}
                >
                  Write a concise, business-facing description...
                </div>
              </div>
            </section>

            <section
              className={previewStyles.sectionClass}
              style={showNestedCards ? { backgroundColor: previewCardBackgroundColor } : undefined}
            >
              <div style={{ display: "grid", gap: `${fieldSpacing[0] / 2}px` }}>
                <h3
                  className="font-semibold text-foreground"
                  style={{ fontSize: `${1.02 * titleScale}rem` }}
                >
                  Section heading
                </h3>
                <p className="text-sm" style={{ color: helperTextColor }}>
                  Use section headings to separate tasks, not as decorative labels.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline">Editable field</Badge>
                <Badge variant="secondary">Guidance</Badge>
                <Badge
                  variant="outline"
                  style={{
                    borderColor: accent.border,
                    backgroundColor: accent.tint,
                    color: accent.text,
                  }}
                >
                  Accent usage
                </Badge>
              </div>
            </section>

            <section
              className={previewStyles.sectionClass}
              style={showNestedCards ? { backgroundColor: previewCardBackgroundColor } : undefined}
            >
              <div style={{ display: "grid", gap: `${fieldSpacing[0] / 2}px` }}>
                <h3
                  className="font-semibold text-foreground"
                  style={{ fontSize: `${1.02 * titleScale}rem` }}
                >
                  Text hierarchy
                </h3>
                <p className="text-sm" style={{ color: helperTextColor }}>
                  This is the intended semantic ladder for future screens. Each role should stay consistent across the application.
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                {(Object.entries(textRoles) as Array<[TextRoleKey, TextRoleConfig]>).map(([roleKey, role]) => (
                  <TextHierarchyRow
                    key={roleKey}
                    role={role.label}
                    sample={role.sample}
                    guidance={role.guidance}
                    helperTextColor={helperTextColor}
                    sampleStyle={buildTextRoleStyle(role, titleScale, helperTextColor)}
                  />
                ))}
              </div>
            </section>

            <section
              className={previewStyles.sectionClass}
              style={showNestedCards ? { backgroundColor: previewCardBackgroundColor } : undefined}
            >
              <div style={{ display: "grid", gap: `${fieldSpacing[0] / 2}px` }}>
                <h3
                  className="font-semibold text-foreground"
                  style={{ fontSize: `${1.02 * titleScale}rem` }}
                >
                  Style guide rules
                </h3>
                <p className="text-sm" style={{ color: helperTextColor }}>
                  These rules should carry forward into any new screen design.
                </p>
              </div>
              <div className="mt-4 grid md:grid-cols-2" style={{ gap: fieldBlockSeparation }}>
                <StyleGuideRule
                  title="Page titles"
                  body="Use one consistent title size and weight for every top-level screen. Page titles should never share the same styling as section headings."
                  backgroundColor={previewCardBackgroundColor}
                />
                <StyleGuideRule
                  title="Field labels"
                  body="Keep field labels small, semibold, and consistent. They should describe the control, not compete with the value."
                  backgroundColor={previewCardBackgroundColor}
                />
                <StyleGuideRule
                  title="Helper text"
                  body="Muted guidance belongs below or beside a control. It should explain usage, not carry primary meaning."
                  backgroundColor={previewCardBackgroundColor}
                />
                <StyleGuideRule
                  title="Accent usage"
                  body="Use accent color for selection, focus, and intentional emphasis. Do not use it as the default text color for most content."
                  backgroundColor={previewCardBackgroundColor}
                />
                <StyleGuideRule
                  title="Cards and borders"
                  body="Only introduce a card when the content is a separate task or surface. Avoid nesting cards unless the extra boundary is doing real work."
                  backgroundColor={previewCardBackgroundColor}
                />
                <StyleGuideRule
                  title="Editable values"
                  body="Input values and chosen options should always read with stronger contrast than descriptive copy or notes."
                  backgroundColor={previewCardBackgroundColor}
                />
              </div>
            </section>
          </div>

          <div style={{ display: "grid", gap: previewGap }}>
            <section
              className={previewStyles.sectionClass}
              style={showNestedCards ? { backgroundColor: previewCardBackgroundColor } : undefined}
            >
              <div style={{ display: "grid", gap: `${fieldSpacing[0] / 2}px` }}>
                <h3
                  className="font-semibold text-foreground"
                  style={{ fontSize: `${1.02 * titleScale}rem` }}
                >
                  Guidance panel
                </h3>
                <p className="text-sm" style={{ color: helperTextColor }}>
                  This panel shows how supporting notes should read against the main editing surface.
                </p>
              </div>
              <div className="mt-4 rounded-xl border border-border/50 bg-background/50 p-4">
                <div className="text-sm font-medium text-foreground">Recommended rules</div>
                <ul className="mt-2 space-y-2 text-xs" style={{ color: helperTextColor }}>
                  <li>Use normal foreground for headings and editable values.</li>
                  <li>Reserve green for enabled or healthy states.</li>
                  <li>Use muted text only for descriptions and guidance.</li>
                  <li>Apply cards only where they create a genuine task boundary.</li>
                </ul>
              </div>
            </section>

            <section
              className={previewStyles.sectionClass}
              style={showNestedCards ? { backgroundColor: previewCardBackgroundColor } : undefined}
            >
              <div style={{ display: "grid", gap: fieldBlockGap }}>
                <div className="text-sm font-medium text-foreground">Next step</div>
                <p className="text-xs" style={{ color: helperTextColor }}>
                  Once the hierarchy feels right here, we can apply the same rules to `AI & NLP`, `Business Context`, and `Taxonomy`.
                </p>
              </div>
              <Button asChild className="mt-4">
                <Link href="/config">
                  Back to Configuration
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </section>

            <section className={previewStyles.sectionClass}>
              <div style={{ display: "grid", gap: `${fieldSpacing[0] / 2}px` }}>
                <h3
                  className="font-semibold text-foreground"
                  style={{ fontSize: `${1.02 * titleScale}rem` }}
                >
                  New screen checklist
                </h3>
                <p className="text-sm" style={{ color: helperTextColor }}>
                  Use this checklist before signing off a new screen.
                </p>
              </div>
              <ul className="mt-4 space-y-2 text-xs" style={{ color: helperTextColor }}>
                <li>Can a new user immediately tell the page title from the section titles?</li>
                <li>Are editable values more visually prominent than guidance?</li>
                <li>Are accents reserved for emphasis, state, and focus rather than normal copy?</li>
                <li>Does every card represent a real task boundary?</li>
                <li>Would the same hierarchy still work in both light and dark mode?</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function StyleGuideRule({
  title,
  body,
  backgroundColor,
}: {
  title: string
  body: string
  backgroundColor: string
}) {
  return (
    <div
      className="rounded-lg border border-border/50 p-3"
      style={{ backgroundColor }}
    >
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </div>
  )
}

function buildTextRoleStyle(
  role: TextRoleConfig,
  titleScale: number,
  helperTextColor: string
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

function TextHierarchyRow({
  role,
  sample,
  guidance,
  helperTextColor,
  sampleStyle,
}: {
  role: string
  sample: string
  guidance: string
  helperTextColor: string
  sampleStyle: React.CSSProperties
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-border/50 bg-background/40 p-3 md:grid-cols-[160px_minmax(0,1fr)] md:items-start">
      <div className="text-xs font-semibold uppercase tracking-wide text-foreground/75">
        {role}
      </div>
      <div className="space-y-1">
        <div className="text-foreground" style={sampleStyle}>
          {sample}
        </div>
        <div className="text-xs" style={{ color: helperTextColor }}>
          {guidance}
        </div>
      </div>
    </div>
  )
}

function PreviewField({
  label,
  helper,
  value,
  fieldSpacing,
  labelStyle,
  helpStyle,
  inputStyle,
}: {
  label: string
  helper: string
  value: string
  fieldSpacing: string
  labelStyle: React.CSSProperties
  helpStyle: React.CSSProperties
  inputStyle: React.CSSProperties
}) {
  return (
    <div style={{ display: "grid", gap: fieldSpacing }}>
      <Label style={labelStyle}>
        {label}
      </Label>
      <p style={helpStyle}>
        {helper}
      </p>
      <Input value={value} readOnly style={inputStyle} />
    </div>
  )
}
