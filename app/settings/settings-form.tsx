"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Save } from "lucide-react"

// ── Helpers ────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2>
      {children}
      <Separator />
    </div>
  )
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 items-start">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div>{children}</div>
    </div>
  )
}

// ── OCR mode & output type options ────────────────────────────────────────────

const OCR_MODES = [
  { value: "skip", label: "Skip — only run OCR when no text layer is found" },
  { value: "redo", label: "Redo — always re-run OCR" },
  { value: "force", label: "Force — force OCR even on non-image PDFs" },
  { value: "skip_noarchive", label: "Skip (no archive) — skip OCR without creating archive" },
]

const OUTPUT_TYPES = [
  { value: "pdf", label: "PDF" },
  { value: "pdfa", label: "PDF/A (archival)" },
  { value: "pdfa-1", label: "PDF/A-1" },
  { value: "pdfa-2", label: "PDF/A-2" },
  { value: "pdfa-3", label: "PDF/A-3" },
  { value: "none", label: "None (don't create archive copy)" },
]

const SKIP_ARCHIVE_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "with_text", label: "When document has a text layer" },
  { value: "always", label: "Always" },
]

// ── Component ──────────────────────────────────────────────────────────────────

export function SettingsForm({ initialConfig }: { initialConfig: any }) {
  const [config, setConfig] = React.useState<any>(initialConfig ?? {})
  const [saving, setSaving] = React.useState(false)
  const isEmpty = !initialConfig || Object.keys(initialConfig).length === 0

  const set = (key: string, value: any) =>
    setConfig((prev: any) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/proxy/config/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`)
      const updated = await res.json()
      setConfig(updated)
      toast.success("Settings saved")
    } catch (e: any) {
      toast.error("Failed to save settings", { description: e.message })
    } finally {
      setSaving(false)
    }
  }

  if (isEmpty) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        <p className="text-sm">Application configuration is not available.</p>
        <p className="text-xs mt-1">This feature requires Paperless-NGX v2.0 or newer.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── General ── */}
      <Section title="General">
        {"app_title" in config && (
          <Field label="Application title" description="Custom name displayed in the UI">
            <Input
              className="h-8 text-sm"
              value={config.app_title ?? ""}
              onChange={(e) => set("app_title", e.target.value)}
              placeholder="Paperless-ngx"
            />
          </Field>
        )}
        {"app_logo" in config && (
          <Field label="Application logo URL" description="URL to a custom logo image">
            <Input
              className="h-8 text-sm"
              value={config.app_logo ?? ""}
              onChange={(e) => set("app_logo", e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </Field>
        )}
      </Section>

      {/* ── OCR ── */}
      <Section title="OCR">
        {"language" in config && (
          <Field label="OCR language" description="ISO 639-2 language codes, comma-separated (e.g. eng, deu)">
            <Input
              className="h-8 text-sm font-mono"
              value={config.language ?? ""}
              onChange={(e) => set("language", e.target.value)}
              placeholder="eng"
            />
          </Field>
        )}
        {"mode" in config && (
          <Field label="OCR mode" description="When to apply OCR to incoming documents">
            <Select value={config.mode ?? "skip"} onValueChange={(v) => set("mode", v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OCR_MODES.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {"output_type" in config && (
          <Field label="Output type" description="PDF output format for archive files">
            <Select value={config.output_type ?? "pdfa"} onValueChange={(v) => set("output_type", v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTPUT_TYPES.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {"skip_archive_file" in config && (
          <Field label="Skip archive file" description="Condition under which an archive copy is skipped">
            <Select value={config.skip_archive_file ?? "never"} onValueChange={(v) => set("skip_archive_file", v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SKIP_ARCHIVE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {"pages" in config && (
          <Field label="Max pages" description="Maximum pages to process with OCR (0 = unlimited)">
            <Input
              type="number"
              min={0}
              className="h-8 text-sm w-28"
              value={config.pages ?? 0}
              onChange={(e) => set("pages", Number(e.target.value))}
            />
          </Field>
        )}
        {"image_dpi" in config && (
          <Field label="Image DPI" description="DPI for rendering image-based PDFs">
            <Input
              type="number"
              min={72}
              className="h-8 text-sm w-28"
              value={config.image_dpi ?? 300}
              onChange={(e) => set("image_dpi", Number(e.target.value))}
            />
          </Field>
        )}
        {"rotate_pages" in config && (
          <Field label="Auto-rotate pages" description="Automatically rotate pages based on text orientation">
            <Switch
              checked={!!config.rotate_pages}
              onCheckedChange={(v) => set("rotate_pages", v)}
            />
          </Field>
        )}
        {"deskew" in config && (
          <Field label="Deskew pages" description="Correct slight rotations in scanned documents">
            <Switch
              checked={!!config.deskew}
              onCheckedChange={(v) => set("deskew", v)}
            />
          </Field>
        )}
        {"unpaper_clean" in config && (
          <Field label="Clean pages" description="Run unpaper to remove scanning artefacts">
            <Switch
              checked={!!config.unpaper_clean}
              onCheckedChange={(v) => set("unpaper_clean", v)}
            />
          </Field>
        )}
      </Section>

      {/* ── Barcodes ── */}
      {"barcodes_enabled" in config && (
        <Section title="Barcodes">
          <Field label="Barcode detection" description="Detect barcodes and use them for document processing">
            <Switch
              checked={!!config.barcodes_enabled}
              onCheckedChange={(v) => set("barcodes_enabled", v)}
            />
          </Field>
          {"barcode_string" in config && config.barcodes_enabled && (
            <Field label="ASN barcode prefix" description="String that identifies an ASN barcode">
              <Input
                className="h-8 text-sm font-mono"
                value={config.barcode_string ?? "ASN"}
                onChange={(e) => set("barcode_string", e.target.value)}
              />
            </Field>
          )}
          {"barcodes_tiff_support" in config && (
            <Field label="TIFF barcode support" description="Enable barcode detection in TIFF files">
              <Switch
                checked={!!config.barcodes_tiff_support}
                onCheckedChange={(v) => set("barcodes_tiff_support", v)}
              />
            </Field>
          )}
        </Section>
      )}

      {/* ── Permissions ── */}
      {"default_perms_owner" in config && (
        <Section title="Permissions">
          <Field label="Default document owner" description="User ID to assign as owner of newly consumed documents (0 = none)">
            <Input
              type="number"
              min={0}
              className="h-8 text-sm w-28"
              value={config.default_perms_owner ?? 0}
              onChange={(e) => set("default_perms_owner", Number(e.target.value))}
            />
          </Field>
        </Section>
      )}

      {/* ── Raw JSON fallback for unknown keys ── */}
      {Object.keys(config).some((k) => ![
        "app_title", "app_logo", "language", "mode", "output_type", "skip_archive_file",
        "pages", "image_dpi", "rotate_pages", "deskew", "unpaper_clean",
        "barcodes_enabled", "barcode_string", "barcodes_tiff_support", "default_perms_owner",
      ].includes(k)) && (
        <Section title="Other settings">
          <div className="text-xs text-muted-foreground bg-muted rounded-md p-3 font-mono overflow-auto max-h-[300px] whitespace-pre">
            {JSON.stringify(
              Object.fromEntries(
                Object.entries(config).filter(([k]) => ![
                  "app_title", "app_logo", "language", "mode", "output_type", "skip_archive_file",
                  "pages", "image_dpi", "rotate_pages", "deskew", "unpaper_clean",
                  "barcodes_enabled", "barcode_string", "barcodes_tiff_support", "default_perms_owner",
                ].includes(k))
              ),
              null, 2
            )}
          </div>
        </Section>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  )
}
