"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { TextRoleConfig, TextRoleKey } from "@/lib/theme-preset-types"
import { cn } from "@/lib/utils"
import { type PreviewCardProps, buildTextRoleStyle } from "./preview-shared"

export interface VisualHierarchyPreviewProps extends PreviewCardProps {
  nextFieldLabelOffset: string
}

export function VisualHierarchyPreview({
  previewGap,
  sectionClass,
  showNestedCards,
  showBorders,
  previewCardBackgroundColor,
  previewInputBackgroundColor,
  titleScale,
  helperTextColor,
  textRoles,
  fieldBlockGap,
  fieldBlockSeparation,
  accent,
  nextFieldLabelOffset,
}: VisualHierarchyPreviewProps) {
  const sectionStyle = showNestedCards ? { backgroundColor: previewCardBackgroundColor } : undefined
  const headingStyle: React.CSSProperties = { fontSize: `${1.02 * titleScale}rem` }

  return (
    <div className="grid xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]" style={{ gap: previewGap }}>
      <div style={{ display: "grid", gap: previewGap }}>
        <section className={sectionClass} style={sectionStyle}>
          <div style={{ display: "grid", gap: `${Number.parseFloat(fieldBlockGap) / 2}px` }}>
            <h2 style={buildTextRoleStyle(textRoles.section, titleScale, helperTextColor)}>
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
                showBorders ? "border border-border/60" : "bg-background/50",
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
                showBorders ? "border border-border/60" : "bg-background/50",
              )}
              style={{ backgroundColor: previewCardBackgroundColor }}
            >
              Write a concise, business-facing description...
            </div>
          </div>
        </section>

        <section className={sectionClass} style={sectionStyle}>
          <div style={{ display: "grid", gap: `${Number.parseFloat(fieldBlockGap) / 2}px` }}>
            <h3 className="font-semibold text-foreground" style={headingStyle}>
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

        <section className={sectionClass} style={sectionStyle}>
          <div style={{ display: "grid", gap: `${Number.parseFloat(fieldBlockGap) / 2}px` }}>
            <h3 className="font-semibold text-foreground" style={headingStyle}>
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

        <section className={sectionClass} style={sectionStyle}>
          <div style={{ display: "grid", gap: `${Number.parseFloat(fieldBlockGap) / 2}px` }}>
            <h3 className="font-semibold text-foreground" style={headingStyle}>
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
        <section className={sectionClass} style={sectionStyle}>
          <div style={{ display: "grid", gap: `${Number.parseFloat(fieldBlockGap) / 2}px` }}>
            <h3 className="font-semibold text-foreground" style={headingStyle}>
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

        <section className={sectionClass} style={sectionStyle}>
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

        <section className={sectionClass}>
          <div style={{ display: "grid", gap: `${Number.parseFloat(fieldBlockGap) / 2}px` }}>
            <h3 className="font-semibold text-foreground" style={headingStyle}>
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
