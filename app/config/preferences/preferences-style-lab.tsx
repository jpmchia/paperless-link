"use client"

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  LayoutPanelTop,
  Palette,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { saveSharedThemePreset } from "./actions"
import {
  fontTokenOptions,
  colorTokenOptions,
  emphasisOptions,
  buildTextRoleStyle,
} from "./preview-shared"
import { UIComponentShowcase } from "./preview-ui-showcase"
import { VisualHierarchyPreview } from "./preview-visual-hierarchy"
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
import { ColorPickerPopover } from "@/components/ui/color-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import type {
  AccentFamily,
  BackgroundToken,
  FontToken,
  ColorToken,
  EmphasisToken,
  SurfaceStyle,
  ThemeColorRole,
  TextRoleConfig,
  TextRoleKey,
  ThemePresetDraft,
  ThemePresetRecord,
} from "@/lib/theme-preset-types"
import { cn } from "@/lib/utils"

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
    uppercase: false,
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

const defaultThemeColors: Record<ThemeColorRole, string> = {
  background: "oklch(1 0 0)",
  foreground: "oklch(0.14 0 0)",
  card: "oklch(1 0 0)",
  "card-foreground": "oklch(0.14 0 0)",
  popover: "oklch(1 0 0)",
  "popover-foreground": "oklch(0.14 0 0)",
  muted: "oklch(0.97 0 0)",
  "muted-foreground": "oklch(0.56 0 0)",
  brand: "#001d3d",
  "brand-foreground": "oklch(0.99 0 0)",
  primary: "oklch(0.20 0 0)",
  "primary-foreground": "oklch(0.99 0 0)",
  secondary: "oklch(0.97 0 0)",
  "secondary-foreground": "oklch(0.20 0 0)",
  accent: "oklch(0.97 0 0)",
  "accent-foreground": "oklch(0.20 0 0)",
  border: "oklch(0.92 0 0)",
  input: "oklch(0.92 0 0)",
  ring: "oklch(0.71 0 0)",
  destructive: "oklch(0.58 0.24 28.48)",
  "chart-1": "oklch(0.65 0.22 36.85)",
  "chart-2": "oklch(0.60 0.11 184.15)",
  "chart-3": "oklch(0.40 0.07 227.18)",
  "chart-4": "oklch(0.83 0.17 81.03)",
  "chart-5": "oklch(0.77 0.17 65.36)",
  sidebar: "oklch(0.99 0 0)",
  "sidebar-foreground": "oklch(0.14 0 0)",
  "sidebar-border": "oklch(0.92 0 0)",
  "sidebar-ring": "oklch(0.708 0 0)",
  "sidebar-primary": "oklch(0.20 0 0)",
  "sidebar-primary-foreground": "oklch(0.99 0 0)",
  "sidebar-accent": "oklch(0.97 0 0)",
  "sidebar-accent-foreground": "oklch(0.20 0 0)",
}

const themeColorGroups: Array<{
  title: string
  description: string
  roles: ThemeColorRole[]
}> = [
  {
    title: "Core surfaces",
    description: "Backgrounds, reading colors, and boundaries.",
    roles: [
      "background",
      "foreground",
      "card",
      "card-foreground",
      "popover",
      "popover-foreground",
      "muted",
      "muted-foreground",
      "border",
      "input",
      "ring",
    ],
  },
  {
    title: "Interaction & emphasis",
    description: "Interactive accents, semantic emphasis, and data colors.",
    roles: [
      "brand",
      "brand-foreground",
      "primary",
      "primary-foreground",
      "secondary",
      "secondary-foreground",
      "accent",
      "accent-foreground",
      "destructive",
      "chart-1",
      "chart-2",
      "chart-3",
      "chart-4",
      "chart-5",
    ],
  },
  {
    title: "Sidebar",
    description: "Navigation-specific surfaces and emphasis tokens.",
    roles: [
      "sidebar",
      "sidebar-foreground",
      "sidebar-border",
      "sidebar-ring",
      "sidebar-primary",
      "sidebar-primary-foreground",
      "sidebar-accent",
      "sidebar-accent-foreground",
    ],
  },
]

const typographyRoleOrder: TextRoleKey[] = [
  "page",
  "section",
  "card",
  "field",
  "help",
  "caption",
  "subtext",
]

const labSlides = [
  {
    key: "typography",
    title: "Typography",
    description: "Hierarchy, scale, emphasis, and text treatment.",
  },
  {
    key: "spacing",
    title: "Spacing",
    description: "Surface rhythm, field spacing, and layout breathing room.",
  },
  {
    key: "colours",
    title: "Colours",
    description: "Semantic token remapping for surfaces, accents, and sidebar states.",
  },
  {
    key: "other",
    title: "Other",
    description: "Surface treatment, principles, and preset export.",
  },
] as const

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

function createDefaultTextRoles(): Record<TextRoleKey, TextRoleConfig> {
  return Object.fromEntries(
    Object.entries(defaultTextRoles).map(([roleKey, role]) => [roleKey, { ...role }])
  ) as Record<TextRoleKey, TextRoleConfig>
}

function createDefaultThemeColors(): Record<ThemeColorRole, string> {
  return { ...defaultThemeColors }
}

function normalizeTextRoles(
  value: Partial<Record<TextRoleKey, Partial<TextRoleConfig>>> | undefined
) {
  const defaults = createDefaultTextRoles()
  if (!value) {
    return defaults
  }

  return Object.fromEntries(
    typographyRoleOrder.map((roleKey) => [
      roleKey,
      {
        ...defaults[roleKey],
        ...value[roleKey],
      },
    ])
  ) as Record<TextRoleKey, TextRoleConfig>
}

function normalizeThemeColors(
  value: Partial<Record<ThemeColorRole, string>> | undefined,
  fallbackBackgrounds?: {
    previewBackgroundToken?: BackgroundToken
    previewCardBackgroundToken?: BackgroundToken
    previewInputBackgroundToken?: BackgroundToken
  }
) {
  const defaults = createDefaultThemeColors()
  const next = {
    ...defaults,
    ...value,
  }

  if (fallbackBackgrounds?.previewBackgroundToken) {
    next.background = defaultThemeColors[fallbackBackgrounds.previewBackgroundToken]
  }
  if (fallbackBackgrounds?.previewCardBackgroundToken) {
    next.card = defaultThemeColors[fallbackBackgrounds.previewCardBackgroundToken]
  }
  if (fallbackBackgrounds?.previewInputBackgroundToken) {
    next.input = defaultThemeColors[fallbackBackgrounds.previewInputBackgroundToken]
  }

  return next
}

function createDefaultThemePresetDraft(): ThemePresetDraft {
  return {
    accentFamily: "brand",
    surfaceStyle: "outlined",
    headingScale: 100,
    helperContrast: 58,
    innerPadding: 24,
    spacing: 3.6,
    fieldSpacing: 8,
    fieldSeparation: 16,
    fieldLabelOffset: 14,
    themeColors: createDefaultThemeColors(),
    textRoles: createDefaultTextRoles(),
    showNestedCards: false,
    showBorders: true,
  }
}

function normalizeThemePresetDraft(
  value: Partial<ThemePresetDraft> &
    Partial<{
      previewBackgroundToken: BackgroundToken
      previewCardBackgroundToken: BackgroundToken
      previewInputBackgroundToken: BackgroundToken
    }>
) {
  const defaults = createDefaultThemePresetDraft()

  return {
    ...defaults,
    ...value,
    themeColors: normalizeThemeColors(value.themeColors, value),
    textRoles: normalizeTextRoles(value.textRoles),
  }
}

function buildThemeColorOverrides(themeColors: Record<ThemeColorRole, string>) {
  return (Object.entries(themeColors) as Array<[ThemeColorRole, string]>).flatMap(
    ([role, value]) => {
      if (value === defaultThemeColors[role]) {
        return []
      }

      return [[`--${role}`, value] as const]
    }
  )
}

interface PreferencesStyleLabProps {
  canManageThemes?: boolean
  initialThemePresets?: ThemePresetRecord[]
}

export function PreferencesStyleLab({
  canManageThemes = false,
  initialThemePresets = [],
}: PreferencesStyleLabProps) {
  const defaultDraft = React.useMemo(() => createDefaultThemePresetDraft(), [])
  const [themePresets, setThemePresets] = React.useState<ThemePresetRecord[]>(initialThemePresets)
  const [labCarouselApi, setLabCarouselApi] = React.useState<CarouselApi>()
  const [activeLabSlide, setActiveLabSlide] = React.useState(0)
  const [previewCarouselApi, setPreviewCarouselApi] = React.useState<CarouselApi>()
  const [editingThemeId, setEditingThemeId] = React.useState("")
  const [themeName, setThemeName] = React.useState("")
  const [themeDescription, setThemeDescription] = React.useState("")
  const [accentFamily, setAccentFamily] = React.useState<AccentFamily>(defaultDraft.accentFamily)
  const [surfaceStyle, setSurfaceStyle] = React.useState<SurfaceStyle>(defaultDraft.surfaceStyle)
  const [headingScale, setHeadingScale] = React.useState([defaultDraft.headingScale])
  const [helperContrast, setHelperContrast] = React.useState([defaultDraft.helperContrast])
  const [innerPadding, setInnerPadding] = React.useState([defaultDraft.innerPadding])
  const [spacing, setSpacing] = React.useState([defaultDraft.spacing])
  const [fieldSpacing, setFieldSpacing] = React.useState([defaultDraft.fieldSpacing])
  const [fieldSeparation, setFieldSeparation] = React.useState([defaultDraft.fieldSeparation])
  const [fieldLabelOffset, setFieldLabelOffset] = React.useState([defaultDraft.fieldLabelOffset])
  const [themeColors, setThemeColors] = React.useState<Record<ThemeColorRole, string>>(
    defaultDraft.themeColors
  )
  const [textRoles, setTextRoles] = React.useState<Record<TextRoleKey, TextRoleConfig>>(
    defaultDraft.textRoles
  )
  const [showNestedCards, setShowNestedCards] = React.useState(defaultDraft.showNestedCards)
  const [showBorders, setShowBorders] = React.useState(defaultDraft.showBorders)

  const accent = accentOptions[accentFamily]
  const titleScale = headingScale[0] / 100
  const helperTextColor = `color-mix(in oklch, var(--foreground) ${helperContrast[0]}%, transparent)`
  const previewGap = `${spacing[0] * 4}px`
  const sectionPadding = `${innerPadding[0]}px`
  const fieldBlockGap = `${fieldSpacing[0]}px`
  const fieldBlockSeparation = `${fieldSeparation[0]}px`
  const nextFieldLabelOffset = `${fieldLabelOffset[0]}px`
  const previewBackgroundColor = "var(--background)"
  const previewCardBackgroundColor = "var(--card)"
  const previewInputBackgroundColor = "var(--input)"

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
      themeColors,
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
      showBorders,
      showNestedCards,
      spacing,
      surfaceStyle,
      themeColors,
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
      ...buildThemeColorOverrides(themeColors),
      ["--inner-padding", `${innerPadding[0]}px`],
      ["--spacing", `${spacing[0].toFixed(1)}px`],
      ["--field-spacing", `${fieldSpacing[0]}px`],
      ["--field-separation", `${fieldSeparation[0]}px`],
      ["--field-label-offset", `${fieldLabelOffset[0]}px`],
      ...textRoleEntries,
    ].filter((entry): entry is [string, string] => Array.isArray(entry)))
  }, [
    fieldLabelOffset,
    fieldSeparation,
    fieldSpacing,
    innerPadding,
    spacing,
    themeColors,
    textRoles,
  ])

  const generatedCssVariables = React.useMemo(
    () => formatThemeVariables(themeVariables),
    [themeVariables]
  )

  const previewThemeStyle = React.useMemo(
    () => themeVariables as React.CSSProperties,
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

  function updateThemeColor(role: ThemeColorRole, value: string) {
    setThemeColors((current) => {
      if (current[role] === value) {
        return current
      }

      return {
        ...current,
        [role]: value,
      }
    })
  }

  function applyDraftToState(nextDraft: ThemePresetDraft) {
    setAccentFamily(nextDraft.accentFamily)
    setSurfaceStyle(nextDraft.surfaceStyle)
    setHeadingScale([nextDraft.headingScale])
    setHelperContrast([nextDraft.helperContrast])
    setInnerPadding([nextDraft.innerPadding])
    setSpacing([nextDraft.spacing])
    setFieldSpacing([nextDraft.fieldSpacing])
    setFieldSeparation([nextDraft.fieldSeparation])
    setFieldLabelOffset([nextDraft.fieldLabelOffset])
    setThemeColors(nextDraft.themeColors)
    setTextRoles(nextDraft.textRoles)
    setShowNestedCards(nextDraft.showNestedCards)
    setShowBorders(nextDraft.showBorders)
  }

  function loadThemePreset(preset: ThemePresetRecord) {
    const normalizedDraft = normalizeThemePresetDraft(
      preset.draft as Partial<ThemePresetDraft> &
        Partial<{
          previewBackgroundToken: BackgroundToken
          previewCardBackgroundToken: BackgroundToken
          previewInputBackgroundToken: BackgroundToken
        }>
    )
    setEditingThemeId(preset.id)
    setThemeName(preset.name)
    setThemeDescription(preset.description ?? "")
    applyDraftToState(normalizedDraft)
  }

  function resetThemePresetDraft() {
    setEditingThemeId("")
    setThemeName("")
    setThemeDescription("")
    applyDraftToState(createDefaultThemePresetDraft())
  }

  React.useEffect(() => {
    if (!labCarouselApi) {
      return
    }

    const onSelect = () => {
      setActiveLabSlide(labCarouselApi.selectedScrollSnap())
    }

    onSelect()
    labCarouselApi.on("select", onSelect)
    labCarouselApi.on("reInit", onSelect)

    return () => {
      labCarouselApi.off("select", onSelect)
      labCarouselApi.off("reInit", onSelect)
    }
  }, [labCarouselApi])

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
    <div className="grid h-full min-h-0 gap-6 xl:grid-cols-[560px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col gap-4">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Preferences Lab</CardTitle>
            <CardDescription>
              A shared mock-up space for refining hierarchy, emphasis, surfaces, and shared theme presets before changes are applied across the application.
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
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/70 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-foreground">
              {labSlides[activeLabSlide]?.title}
            </div>
            <div className="text-xs text-muted-foreground">
              {labSlides[activeLabSlide]?.description}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => labCarouselApi?.scrollPrev()}
              disabled={!labCarouselApi?.canScrollPrev()}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Previous controls</span>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => labCarouselApi?.scrollNext()}
              disabled={!labCarouselApi?.canScrollNext()}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Next controls</span>
            </Button>
          </div>
        </div>

        <Carousel
          className="min-h-0 flex-1"
          opts={{ align: "start" }}
          setApi={setLabCarouselApi}
        >
          <CarouselContent className="ml-0 h-full">
            <CarouselItem className="h-full pl-0">
              <Card className="flex h-full min-h-0 flex-col">
                <CardHeader>
                  <CardTitle className="text-base">Typography</CardTitle>
                  <CardDescription>
                    Control the semantic text ladder, hierarchy scale, and whether field labels stay calm or shout.
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-h-0 space-y-6 overflow-y-auto pr-2">
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

                  <Separator />

                  <div className="space-y-4">
                    <div className="text-sm font-medium">Text hierarchy controls</div>
                    <div className="grid gap-4 xl:grid-cols-2">
                      {typographyRoleOrder.map((roleKey) => {
                        const role = textRoles[roleKey]

                        return (
                          <div key={roleKey} className="rounded-lg border border-border/60 p-3">
                            <div className="mb-3 text-xs font-semibold tracking-wide text-foreground/75">
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
                                    onValueChange={(value) =>
                                      updateTextRole(roleKey, "sizeRem", value[0] ?? role.sizeRem)
                                    }
                                  />
                                  <div className="text-[11px] text-muted-foreground">
                                    {role.sizeRem.toFixed(2)}rem
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Line height</Label>
                                  <Input
                                    value={role.lineHeight}
                                    onChange={(event) => updateTextRole(roleKey, "lineHeight", event.target.value)}
                                    placeholder="1.2"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Tracking</Label>
                                  <Input
                                    value={role.tracking || "normal"}
                                    onChange={(event) =>
                                      updateTextRole(
                                        roleKey,
                                        "tracking",
                                        event.target.value.trim() || "normal"
                                      )
                                    }
                                    placeholder="normal or 0.04em"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs">Text transform</Label>
                                <Select
                                  value={role.uppercase ? "uppercase" : "none"}
                                  onValueChange={(value) =>
                                    updateTextRole(roleKey, "uppercase", value === "uppercase")
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="uppercase">Uppercase</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>

            <CarouselItem className="h-full pl-0">
              <Card className="flex h-full min-h-0 flex-col">
                <CardHeader>
                  <CardTitle className="text-base">Spacing</CardTitle>
                  <CardDescription>
                    Tune rhythm between surfaces, fields, labels, helper copy, and inputs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-h-0 overflow-y-auto pr-2">
                  <div className="grid gap-6 xl:grid-cols-2">
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

                    <div className="space-y-3 xl:col-span-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <SlidersHorizontal className="size-4" />
                        Field label offset
                    </div>
                    <Slider min={0} max={24} step={1} value={fieldLabelOffset} onValueChange={setFieldLabelOffset} />
                    <div className="text-xs text-muted-foreground">
                      Space between a previous input and the next field label: {fieldLabelOffset[0]}px
                    </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>

            <CarouselItem className="h-full pl-0">
              <Card className="flex h-full min-h-0 flex-col">
                <CardHeader>
                  <CardTitle className="text-base">Colours</CardTitle>
                  <CardDescription>
                    Remap the semantic theme roles that the app actually applies when a preset is selected.
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-h-0 space-y-6 overflow-y-auto pr-2">
                  {themeColorGroups.map((group) => (
                    <div key={group.title} className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-foreground">{group.title}</div>
                        <div className="text-xs text-muted-foreground">{group.description}</div>
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2">
                        {group.roles.map((role) => (
                          <div key={role} className="space-y-1.5">
                            <Label className="text-xs">{colorTokenOptions[role].label}</Label>
                            <ColorPickerPopover
                              onChange={(value) =>
                                updateThemeColor(role, serializeThemeColorValue(value))
                              }
                              value={themeColors[role]}
                            />
                          </div>
                        ))}
                      </div>
                      <Separator />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </CarouselItem>

            <CarouselItem className="h-full pl-0">
              <Card className="flex h-full min-h-0 flex-col">
                <CardHeader>
                  <CardTitle className="text-base">Other</CardTitle>
                  <CardDescription>
                    Surface treatment, boundary behavior, principles, and exported CSS variables.
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-h-0 space-y-6 overflow-y-auto pr-2">
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
                    <pre className="max-h-80 overflow-auto rounded-lg border border-border/60 bg-muted/30 p-3 text-[11px] leading-5 text-foreground">
                      <code>{generatedCssVariables}</code>
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>

      <Carousel className="h-full min-h-0" opts={{ align: "start" }} setApi={setPreviewCarouselApi}>
        <CarouselContent className="ml-0 h-full">
          <CarouselItem className="h-full pl-0">
            <div
              className={cn("flex h-full min-h-0 flex-col overflow-hidden", previewStyles.outerClass)}
              style={{
                ...previewThemeStyle,
                ...previewSurfaceStyle,
                paddingTop: sectionPadding,
                paddingBottom: sectionPadding,
                paddingLeft: sectionPadding,
                paddingRight: 0,
                backgroundColor: previewBackgroundColor,
              }}
            >
              <div className="flex items-start justify-between gap-4" style={{ paddingRight: sectionPadding }}>
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
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: accent.border,
                      backgroundColor: accent.tint,
                      color: accent.text,
                    }}
                  >
                    Preview
                  </Badge>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-7"
                    onClick={() => previewCarouselApi?.scrollNext()}
                  >
                    <ChevronRight className="size-3.5" />
                    <span className="sr-only">Next preview</span>
                  </Button>
                </div>
              </div>
              <div className="mt-6 min-h-0 flex-1 overflow-y-auto" style={{ paddingRight: sectionPadding }}>
                <VisualHierarchyPreview
                  previewGap={previewGap}
                  sectionClass={previewStyles.sectionClass}
                  showNestedCards={showNestedCards}
                  showBorders={showBorders}
                  previewCardBackgroundColor={previewCardBackgroundColor}
                  previewInputBackgroundColor={previewInputBackgroundColor}
                  titleScale={titleScale}
                  helperTextColor={helperTextColor}
                  textRoles={textRoles}
                  fieldBlockGap={fieldBlockGap}
                  fieldBlockSeparation={fieldBlockSeparation}
                  accent={accent}
                  nextFieldLabelOffset={nextFieldLabelOffset}
                />
              </div>
            </div>
          </CarouselItem>
          <CarouselItem className="h-full pl-0">
            <div
              className={cn("flex h-full min-h-0 flex-col overflow-hidden", previewStyles.outerClass)}
              style={{
                ...previewThemeStyle,
                ...previewSurfaceStyle,
                paddingTop: sectionPadding,
                paddingBottom: sectionPadding,
                paddingLeft: sectionPadding,
                paddingRight: 0,
                backgroundColor: previewBackgroundColor,
              }}
            >
              <div className="flex items-start justify-between gap-4" style={{ paddingRight: sectionPadding }}>
                <div className="space-y-2">
                  <div
                    className="tracking-tight"
                    style={buildTextRoleStyle(textRoles.page, titleScale, helperTextColor)}
                  >
                    UI Component Showcase
                  </div>
                  <div
                    className="max-w-3xl text-sm"
                    style={{ color: helperTextColor }}
                  >
                    Live examples of the Shadcn UI components used across the application, rendered with the current theme settings.
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: accent.border,
                      backgroundColor: accent.tint,
                      color: accent.text,
                    }}
                  >
                    Components
                  </Badge>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-7"
                    onClick={() => previewCarouselApi?.scrollPrev()}
                  >
                    <ChevronLeft className="size-3.5" />
                    <span className="sr-only">Previous preview</span>
                  </Button>
                </div>
              </div>
              <div className="mt-6 min-h-0 flex-1 overflow-y-auto" style={{ paddingRight: sectionPadding }}>
                <UIComponentShowcase
                  previewGap={previewGap}
                  sectionClass={previewStyles.sectionClass}
                  showNestedCards={showNestedCards}
                  showBorders={showBorders}
                  previewCardBackgroundColor={previewCardBackgroundColor}
                  previewInputBackgroundColor={previewInputBackgroundColor}
                  titleScale={titleScale}
                  helperTextColor={helperTextColor}
                  textRoles={textRoles}
                  fieldBlockGap={fieldBlockGap}
                  fieldBlockSeparation={fieldBlockSeparation}
                  accent={accent}
                />
              </div>
            </div>
          </CarouselItem>
        </CarouselContent>
      </Carousel>
    </div>
  )
}

function serializeThemeColorValue(value: unknown) {
  if (typeof value === "string") {
    return value
  }

  if (Array.isArray(value)) {
    const [r = 0, g = 0, b = 0, a = 1] = value as number[]
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`
  }

  if (value && typeof value === "object") {
    const candidate = value as Partial<Record<"r" | "g" | "b" | "alpha", unknown>>
    if (
      typeof candidate.r === "number" &&
      typeof candidate.g === "number" &&
      typeof candidate.b === "number"
    ) {
      const alpha = typeof candidate.alpha === "number" ? candidate.alpha : 1
      return `rgba(${Math.round(candidate.r)}, ${Math.round(candidate.g)}, ${Math.round(candidate.b)}, ${alpha})`
    }
  }

  return String(value)
}

