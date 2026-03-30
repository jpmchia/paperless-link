"use client"

import { FileCode2, Network } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type DomainModelsSection = "explorer" | "library"

type Props = {
  activeSection: DomainModelsSection
  onSectionChange: (section: DomainModelsSection) => void
}

const sections = [
  {
    description: "Graph-first repository exploration with evidence and context linkage.",
    icon: Network,
    id: "explorer" as const,
    label: "Domain Explorer",
  },
  {
    description: "Low-level maintenance of approved canonical entities and attributes.",
    icon: FileCode2,
    id: "library" as const,
    label: "Entity Library",
  },
]

export function DomainModelsSectionSwitcher({ activeSection, onSectionChange }: Props) {
  return (
    <div className="rounded-xl border bg-card p-2">
      <div className="grid gap-2 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon
          const isActive = section.id === activeSection

          return (
            <Button
              key={section.id}
              variant="ghost"
              className={cn(
                "h-auto items-start justify-start rounded-lg px-4 py-3 text-left",
                isActive && "bg-accent text-accent-foreground"
              )}
              onClick={() => onSectionChange(section.id)}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border bg-background/80 p-2">
                  <Icon className="size-4" />
                </div>
                <div>
                  <div className="font-medium">{section.label}</div>
                  <div className="text-xs text-muted-foreground">{section.description}</div>
                </div>
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
