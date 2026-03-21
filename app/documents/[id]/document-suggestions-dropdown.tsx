"use client"

import * as React from "react"
import { useAtomValue } from "jotai"
import { Check, Loader2, Plus, Sparkles } from "lucide-react"
import { toast } from "sonner"
import {
  createCorrespondent,
  createDocumentType,
  createStoragePath,
  createTag,
} from "@/lib/management-actions"
import { documentDetailsControllerAtom } from "@/lib/store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type NamedEntity = {
  id: number
  name: string
}

type TagEntity = NamedEntity & {
  color?: string
  text_color?: string | null
}

type DocumentSuggestions = {
  title?: string
  tags?: number[]
  suggested_tags?: string[]
  correspondents?: number[]
  suggested_correspondents?: string[]
  document_types?: number[]
  suggested_document_types?: string[]
  storage_paths?: number[]
  suggested_storage_paths?: string[]
  dates?: string[]
}

interface DocumentSuggestionsDropdownProps {
  documentId: number
  correspondents: NamedEntity[]
  documentTypes: NamedEntity[]
  storagePaths: NamedEntity[]
  tags: TagEntity[]
  disabled?: boolean
}

export function DocumentSuggestionsDropdown({
  documentId,
  correspondents,
  documentTypes,
  storagePaths,
  tags,
  disabled = false,
}: DocumentSuggestionsDropdownProps) {
  const controller = useAtomValue(documentDetailsControllerAtom)
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [creatingKey, setCreatingKey] = React.useState<string | null>(null)
  const [suggestions, setSuggestions] = React.useState<DocumentSuggestions | null>(null)
  const [loaded, setLoaded] = React.useState(false)

  const lookupName = React.useCallback((items: NamedEntity[], id: number) => {
    return items.find((item) => item.id === id)?.name ?? `#${id}`
  }, [])

  const fetchSuggestions = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/proxy/documents/${documentId}/suggestions`)
      if (!response.ok) {
        throw new Error(await response.text())
      }

      const contentType = response.headers.get("content-type") ?? ""
      if (!contentType.includes("application/json")) {
        throw new Error(await response.text())
      }

      const nextSuggestions = (await response.json()) as DocumentSuggestions
      setSuggestions(nextSuggestions)
      setLoaded(true)
    } catch (error) {
      toast.error("Failed to load suggestions", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }, [documentId])

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen && !loaded && !loading) {
      void fetchSuggestions()
    }
  }, [fetchSuggestions, loaded, loading])

  const applyFieldValue = React.useCallback((fieldId: string, value: unknown, successMessage: string) => {
    if (!controller) return
    controller.setFieldValue(fieldId, value)
    toast.success(successMessage)
  }, [controller])

  const applyTags = React.useCallback((tagIds: number[]) => {
    if (!controller || tagIds.length === 0) return

    const current = controller.getFieldValue("tags")
    const currentTagIds = Array.isArray(current)
      ? current.map((value) => Number(value)).filter((value) => Number.isFinite(value))
      : []
    const nextTagIds = Array.from(new Set([...currentTagIds, ...tagIds]))
    controller.setFieldValue("tags", nextTagIds)
    toast.success(`Applied ${tagIds.length === 1 ? "tag suggestion" : "tag suggestions"}`)
  }, [controller])

  const createAndApply = React.useCallback(async (
    type: "tag" | "correspondent" | "documentType" | "storagePath",
    name: string
  ) => {
    if (!controller) return

    const key = `${type}:${name}`
    setCreatingKey(key)
    try {
      if (type === "tag") {
        const created = await createTag({ name })
        controller.appendTagOption(created)
        const current = controller.getFieldValue("tags")
        const currentTagIds = Array.isArray(current)
          ? current.map((value) => Number(value)).filter((value) => Number.isFinite(value))
          : []
        controller.setFieldValue("tags", Array.from(new Set([...currentTagIds, created.id])))
        setSuggestions((previous) =>
          previous
            ? {
                ...previous,
                suggested_tags: (previous.suggested_tags ?? []).filter((item) => item !== name),
                tags: Array.from(new Set([...(previous.tags ?? []), created.id])),
              }
            : previous
        )
      } else if (type === "correspondent") {
        const created = await createCorrespondent({ name })
        controller.appendCorrespondentOption(created)
        controller.setFieldValue("correspondent", created.id)
        setSuggestions((previous) =>
          previous
            ? {
                ...previous,
                suggested_correspondents: (previous.suggested_correspondents ?? []).filter((item) => item !== name),
                correspondents: Array.from(new Set([...(previous.correspondents ?? []), created.id])),
              }
            : previous
        )
      } else if (type === "documentType") {
        const created = await createDocumentType({ name })
        controller.appendDocumentTypeOption(created)
        controller.setFieldValue("document_type", created.id)
        setSuggestions((previous) =>
          previous
            ? {
                ...previous,
                suggested_document_types: (previous.suggested_document_types ?? []).filter((item) => item !== name),
                document_types: Array.from(new Set([...(previous.document_types ?? []), created.id])),
              }
            : previous
        )
      } else {
        const created = await createStoragePath({ name })
        controller.appendStoragePathOption(created)
        controller.setFieldValue("storage_path", created.id)
        setSuggestions((previous) =>
          previous
            ? {
                ...previous,
                suggested_storage_paths: (previous.suggested_storage_paths ?? []).filter((item) => item !== name),
                storage_paths: Array.from(new Set([...(previous.storage_paths ?? []), created.id])),
              }
            : previous
        )
      }

      toast.success(`Created and applied ${name}`)
    } catch (error) {
      toast.error(`Failed to create ${name}`, {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setCreatingKey(null)
    }
  }, [controller])

  const hasSuggestions = Boolean(
    suggestions?.title ||
    suggestions?.dates?.length ||
    suggestions?.correspondents?.length ||
    suggestions?.document_types?.length ||
    suggestions?.storage_paths?.length ||
    suggestions?.tags?.length ||
    suggestions?.suggested_tags?.length ||
    suggestions?.suggested_correspondents?.length ||
    suggestions?.suggested_document_types?.length ||
    suggestions?.suggested_storage_paths?.length
  )

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="h-8 hover:bg-accent" disabled={disabled || !controller}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Suggestions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[420px] w-[340px] overflow-y-auto">
        <DropdownMenuLabel>Document suggestions</DropdownMenuLabel>
        {!loaded && loading ? (
          <div className="flex items-center gap-2 px-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading suggestions…
          </div>
        ) : !hasSuggestions ? (
          <div className="px-2 py-4 text-sm text-muted-foreground">
            No suggestions are currently available.
          </div>
        ) : (
          <>
            {suggestions?.title ? (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Title</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => applyFieldValue("title", suggestions.title, "Applied title suggestion")}>
                  <Check className="mr-2 h-4 w-4" />
                  <span className="truncate">{suggestions.title}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}

            {suggestions?.dates?.length ? (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Dates</DropdownMenuLabel>
                {suggestions.dates.map((date) => (
                  <DropdownMenuItem
                    key={date}
                    onClick={() => applyFieldValue("created", date.slice(0, 10), "Applied created date suggestion")}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {date.slice(0, 10)}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            ) : null}

            {suggestions?.correspondents?.length ? (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Correspondents</DropdownMenuLabel>
                {suggestions.correspondents.map((id) => (
                  <DropdownMenuItem
                    key={`correspondent-${id}`}
                    onClick={() => applyFieldValue("correspondent", id, "Applied correspondent suggestion")}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {lookupName(correspondents, id)}
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}

            {suggestions?.suggested_correspondents?.length ? (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Suggested new correspondents</DropdownMenuLabel>
                {suggestions.suggested_correspondents.map((name) => {
                  const key = `correspondent:${name}`
                  return (
                    <DropdownMenuItem key={key} onClick={() => void createAndApply("correspondent", name)}>
                      {creatingKey === key ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      {name}
                    </DropdownMenuItem>
                  )
                })}
              </>
            ) : null}

            {(suggestions?.correspondents?.length || suggestions?.suggested_correspondents?.length) ? (
              <DropdownMenuSeparator />
            ) : null}

            {suggestions?.document_types?.length ? (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Document types</DropdownMenuLabel>
                {suggestions.document_types.map((id) => (
                  <DropdownMenuItem
                    key={`document-type-${id}`}
                    onClick={() => applyFieldValue("document_type", id, "Applied document type suggestion")}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {lookupName(documentTypes, id)}
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}

            {suggestions?.suggested_document_types?.length ? (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Suggested new document types</DropdownMenuLabel>
                {suggestions.suggested_document_types.map((name) => {
                  const key = `documentType:${name}`
                  return (
                    <DropdownMenuItem key={key} onClick={() => void createAndApply("documentType", name)}>
                      {creatingKey === key ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      {name}
                    </DropdownMenuItem>
                  )
                })}
              </>
            ) : null}

            {(suggestions?.document_types?.length || suggestions?.suggested_document_types?.length) ? (
              <DropdownMenuSeparator />
            ) : null}

            {suggestions?.storage_paths?.length ? (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Storage paths</DropdownMenuLabel>
                {suggestions.storage_paths.map((id) => (
                  <DropdownMenuItem
                    key={`storage-path-${id}`}
                    onClick={() => applyFieldValue("storage_path", id, "Applied storage path suggestion")}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {lookupName(storagePaths, id)}
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}

            {suggestions?.suggested_storage_paths?.length ? (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Suggested new storage paths</DropdownMenuLabel>
                {suggestions.suggested_storage_paths.map((name) => {
                  const key = `storagePath:${name}`
                  return (
                    <DropdownMenuItem key={key} onClick={() => void createAndApply("storagePath", name)}>
                      {creatingKey === key ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      {name}
                    </DropdownMenuItem>
                  )
                })}
              </>
            ) : null}

            {(suggestions?.storage_paths?.length || suggestions?.suggested_storage_paths?.length) ? (
              <DropdownMenuSeparator />
            ) : null}

            {suggestions?.tags?.length ? (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Tags</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => applyTags(suggestions.tags ?? [])}>
                  <Check className="mr-2 h-4 w-4" />
                  Apply all matched tags
                </DropdownMenuItem>
                {suggestions.tags.map((id) => (
                  <DropdownMenuItem key={`tag-${id}`} onClick={() => applyTags([id])}>
                    <Check className="mr-2 h-4 w-4" />
                    {lookupName(tags, id)}
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}

            {suggestions?.suggested_tags?.length ? (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Suggested new tags</DropdownMenuLabel>
                {suggestions.suggested_tags.map((name) => {
                  const key = `tag:${name}`
                  return (
                    <DropdownMenuItem key={key} onClick={() => void createAndApply("tag", name)}>
                      {creatingKey === key ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      {name}
                    </DropdownMenuItem>
                  )
                })}
              </>
            ) : null}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
