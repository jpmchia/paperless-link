"use client"

import * as React from "react"
import Link, { type LinkProps } from "next/link"
import { useSetAtom } from "jotai"
import { openDocumentAtom } from "@/lib/stores/open-documents"

function shouldTrackNavigation(
  event: React.MouseEvent<HTMLAnchorElement, MouseEvent>
) {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
}

interface OpenDocumentLinkProps
  extends Omit<React.ComponentProps<typeof Link>, "href"> {
  documentId: number
  href?: LinkProps["href"]
  title: string
}

export const OpenDocumentLink = React.forwardRef<
  HTMLAnchorElement,
  OpenDocumentLinkProps
>(function OpenDocumentLink(
  { children, documentId, href, onClick, title, ...props },
  ref
) {
  const openDocument = useSetAtom(openDocumentAtom)
  const targetHref = href ?? `/documents/${documentId}`
  const normalizedHref =
    typeof targetHref === "string" ? targetHref : `/documents/${documentId}`

  return (
    <Link
      {...props}
      href={targetHref}
      ref={ref}
      onClick={(event) => {
        onClick?.(event)

        if (shouldTrackNavigation(event)) {
          openDocument({
            href: normalizedHref,
            id: documentId,
            title: title || `Document ${documentId}`,
          })
        }
      }}
    >
      {children}
    </Link>
  )
})
