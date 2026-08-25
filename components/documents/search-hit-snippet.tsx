import { normalizeSearchHighlights } from "@/lib/search-highlights"

export function SearchHitSnippet({ hit }: { hit: unknown }) {
  const highlights = normalizeSearchHighlights(hit)
  if (highlights.length === 0) return null

  return (
    <div
      className="mt-1 space-y-0.5 text-xs leading-snug text-muted-foreground"
      data-testid="search-hit-snippet"
    >
      {highlights.map((highlight, highlightIndex) => (
        <p
          key={`${highlight.key ?? "highlight"}-${highlightIndex}`}
          className="line-clamp-2"
        >
          {highlight.segments.map((segment, segmentIndex) =>
            segment.matched ? (
              <mark
                key={segmentIndex}
                className="rounded-sm bg-yellow-200 px-0.5 text-foreground dark:bg-yellow-700/70"
              >
                {segment.text}
              </mark>
            ) : (
              <span key={segmentIndex}>{segment.text}</span>
            )
          )}
        </p>
      ))}
    </div>
  )
}
