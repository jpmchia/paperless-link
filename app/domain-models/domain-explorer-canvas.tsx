"use client"

import * as React from "react"
import "@xyflow/react/dist/style.css"
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { EntityType, EntityUsage } from "@/lib/link-iq-types"

type Props = {
  documentType: string
  entityTypesByID: Record<string, EntityType>
  entityUsages: EntityUsage[]
  exampleDocumentCount: number
  profileLabel: string
  selectedAttributeUsageID: string
  selectedEntityUsageID: string
  taxonomyPath: string
  onSelectAttributeUsage: (entityUsageID: string, attributeUsageID: string) => void
  onSelectEntityUsage: (usageID: string) => void
}

type CanvasNodeData = {
  entityUsageID?: string
  attributeUsageID?: string
  label: string
  subtitle?: string
  type: "context" | "entity" | "attribute"
}

function makeNodeStyle(kind: CanvasNodeData["type"], selected: boolean): React.CSSProperties {
  const base = {
    borderRadius: 16,
    borderWidth: 1,
    minWidth: kind === "attribute" ? 190 : kind === "entity" ? 220 : 260,
    padding: 12,
  } satisfies React.CSSProperties

  if (selected) {
    return {
      ...base,
      background: "hsl(var(--accent))",
      borderColor: "hsl(var(--primary))",
      color: "hsl(var(--accent-foreground))",
      boxShadow: "0 0 0 2px hsl(var(--primary) / 0.18)",
    }
  }

  if (kind === "context") {
    return {
      ...base,
      background: "hsl(var(--muted) / 0.8)",
      borderColor: "hsl(var(--border))",
    }
  }

  if (kind === "entity") {
    return {
      ...base,
      background: "hsl(var(--card))",
      borderColor: "hsl(var(--border))",
    }
  }

  return {
    ...base,
    background: "hsl(var(--background))",
    borderColor: "hsl(var(--border))",
  }
}

export function DomainExplorerCanvas({
  documentType,
  entityTypesByID,
  entityUsages,
  exampleDocumentCount,
  profileLabel,
  selectedAttributeUsageID,
  selectedEntityUsageID,
  taxonomyPath,
  onSelectAttributeUsage,
  onSelectEntityUsage,
}: Props) {
  const { edges, nodes } = React.useMemo(() => {
    const nextNodes: Node<CanvasNodeData>[] = []
    const nextEdges: Edge[] = []

    nextNodes.push({
      data: {
        label: profileLabel || "Untitled context profile",
        subtitle: [taxonomyPath || "Any taxonomy", documentType || "Any document type"]
          .filter(Boolean)
          .join(" • "),
        type: "context",
      },
      draggable: false,
      id: "context-profile",
      position: { x: 40, y: 160 },
      selectable: true,
      style: makeNodeStyle("context", false),
      type: "default",
    })

    entityUsages.forEach((entityUsage, entityIndex) => {
      const entityType = entityTypesByID[entityUsage.entity_type_id]
      const entityNodeID = "entity-" + entityUsage.usage_id
      const entityY = 60 + entityIndex * 220
      const entitySelected = entityUsage.usage_id === selectedEntityUsageID

      nextNodes.push({
        data: {
          entityUsageID: entityUsage.usage_id,
          label: entityUsage.label || entityType?.label || "Entity",
          subtitle: [entityUsage.cardinality, entityUsage.applicability || "allowed"]
            .filter(Boolean)
            .join(" • "),
          type: "entity",
        },
        draggable: false,
        id: entityNodeID,
        position: { x: 360, y: entityY },
        style: makeNodeStyle("entity", entitySelected),
        type: "default",
      })

      nextEdges.push({
        animated: true,
        id: "edge-context-" + entityUsage.usage_id,
        source: "context-profile",
        target: entityNodeID,
        type: "smoothstep",
      })

      ;(entityUsage.attributes ?? []).forEach((attributeUsage, attributeIndex) => {
        const attributeType = entityType?.attributes?.find(
          (candidate) => candidate.attribute_type_id === attributeUsage.attribute_type_id
        )
        const attributeNodeID = "attribute-" + attributeUsage.usage_id
        const attributeSelected = attributeUsage.usage_id === selectedAttributeUsageID

        nextNodes.push({
          data: {
            attributeUsageID: attributeUsage.usage_id,
            entityUsageID: entityUsage.usage_id,
            label: attributeUsage.label || attributeType?.label || "Attribute",
            subtitle: [attributeType?.value_type, attributeUsage.applicability || "allowed"]
              .filter(Boolean)
              .join(" • "),
            type: "attribute",
          },
          draggable: false,
          id: attributeNodeID,
          position: { x: 760, y: entityY + attributeIndex * 86 },
          style: makeNodeStyle("attribute", attributeSelected),
          type: "default",
        })

        nextEdges.push({
          id: "edge-entity-" + attributeUsage.usage_id,
          source: entityNodeID,
          target: attributeNodeID,
          type: "smoothstep",
        })
      })
    })

    return { edges: nextEdges, nodes: nextNodes }
  }, [
    documentType,
    entityTypesByID,
    entityUsages,
    profileLabel,
    selectedAttributeUsageID,
    selectedEntityUsageID,
    taxonomyPath,
  ])

  const handleNodeClick = React.useCallback<NodeMouseHandler<Node<CanvasNodeData>>>(
    (_event, node) => {
      if (node.data.type === "entity" && node.data.entityUsageID) {
        onSelectEntityUsage(node.data.entityUsageID)
        return
      }

      if (node.data.type === "attribute" && node.data.entityUsageID && node.data.attributeUsageID) {
        onSelectAttributeUsage(node.data.entityUsageID, node.data.attributeUsageID)
      }
    },
    [onSelectAttributeUsage, onSelectEntityUsage]
  )

  return (
    <Card className="min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 flex-col">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Domain Explorer</CardTitle>
              <CardDescription>
                Review the interpreted entity model for the selected context and follow the evidence.
              </CardDescription>
            </div>
            <Badge variant="outline">{exampleDocumentCount} bound examples</Badge>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          {entityUsages.length === 0 ? (
            <div className="flex h-full min-h-[26rem] items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Select or create a context profile, then add or approve entities to see the model graph.
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              minZoom={0.25}
              maxZoom={1.75}
              onNodeClick={handleNodeClick}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              proOptions={{ hideAttribution: true }}
            >
              <MiniMap pannable zoomable />
              <Controls />
              <Background gap={24} size={1} />
            </ReactFlow>
          )}
        </CardContent>
      </div>
    </Card>
  )
}
