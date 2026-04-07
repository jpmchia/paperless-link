"use client"

import * as React from "react"
import "@xyflow/react/dist/style.css"
import {
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  MiniMap,
  NodeResizeControl,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type NodeProps,
} from "@xyflow/react"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

export type TaxonomyFlowNodeRecord = {
  description?: string
  label: string
  mapping_state: string
  node_type?: string
  parent_node_id?: string
  path: string
  sort_order?: number
  source_id?: string
  source_scope: string
  status: string
  taxonomy_node_id: string
}

type Props = {
  nodes: TaxonomyFlowNodeRecord[]
  search: string
  selectedNodeID: string
  onMoveNode: (nodeID: string, parentNodeID: string | null) => Promise<void>
  onSelectNode: (nodeID: string) => void
  layoutInsetLeft?: number
  layoutInsetTop?: number
}

type TaxonomyFlowNodeData = {
  description: string
  isDropTarget: boolean
  isSelected: boolean
  label: string
  nodeType?: string
  path: string
  sourceHandlePosition: Position
  status: string
  targetHandlePosition: Position
}

const NODE_WIDTH = 220
const NODE_MIN_WIDTH = 220
const NODE_MAX_WIDTH = 640
const HORIZONTAL_GAP = 44
const ROOT_GAP = 96
const VERTICAL_GAP = 156
const CANVAS_PADDING = 32
const FREEFORM_COLUMN_GAP = 280
const FREEFORM_ROW_GAP = 132
const VIEWPORT_WALL = CANVAS_PADDING
const TRANSLATE_EXTENT: [[number, number], [number, number]] = [
  [-VIEWPORT_WALL, -VIEWPORT_WALL],
  [20000, 20000],
]

function compareNodes(
  left: TaxonomyFlowNodeRecord,
  right: TaxonomyFlowNodeRecord
) {
  const leftSort =
    typeof left.sort_order === "number"
      ? left.sort_order
      : Number.MAX_SAFE_INTEGER
  const rightSort =
    typeof right.sort_order === "number"
      ? right.sort_order
      : Number.MAX_SAFE_INTEGER
  if (leftSort !== rightSort) return leftSort - rightSort
  return left.label.localeCompare(right.label)
}

function getPathSegments(node: TaxonomyFlowNodeRecord) {
  return node.path
    .split(" > ")
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function getDisplayLabel(node: TaxonomyFlowNodeRecord) {
  const segments = getPathSegments(node)
  return segments[segments.length - 1] || node.label || node.path
}

function getNodeDepth(node: TaxonomyFlowNodeRecord) {
  return Math.max(0, getPathSegments(node).length - 1)
}

function normalizeNodeType(nodeType?: string) {
  return nodeType?.trim().toLowerCase() ?? ""
}

function getTargetHandlePosition(nodeType?: string) {
  return normalizeNodeType(nodeType) === "process" ? Position.Left : Position.Top
}

function getSourceHandlePosition(nodeType?: string) {
  return normalizeNodeType(nodeType) === "function"
    ? Position.Bottom
    : Position.Bottom
}

function TaxonomyCanvasNode({ data }: NodeProps<Node<TaxonomyFlowNodeData>>) {
  return (
    <div className="relative w-full">
      {data.isSelected ? (
        <NodeResizeControl
          minWidth={NODE_MIN_WIDTH}
          maxWidth={NODE_MAX_WIDTH}
          minHeight={76}
          position="bottom-right"
          resizeDirection="horizontal"
          className="!h-3 !w-3 !rounded-sm !border !border-border !bg-background shadow-sm"
        />
      ) : null}
      <div
        className={cn(
          "flex w-full items-stretch rounded-2xl border border-white/15 bg-background/55 text-left shadow-[0_18px_40px_-26px_hsl(var(--foreground)/0.65)] backdrop-blur-xl transition-colors supports-[backdrop-filter]:bg-background/38",
          data.isSelected
            ? "border-primary ring-2 ring-primary/20"
            : "border-border/70",
          data.isDropTarget &&
            "border-primary bg-accent/45 ring-2 ring-primary/15"
        )}
      >
        <Handle
          type="target"
          position={data.targetHandlePosition}
          isConnectable={false}
          className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
        />
        <div
          className={cn(
            "taxonomy-node-drag-handle flex w-7 shrink-0 cursor-grab items-center justify-center border-r border-white/10 bg-muted/20 text-muted-foreground/65 active:cursor-grabbing",
            data.isDropTarget && "bg-primary/10 text-primary"
          )}
        >
          <GripVertical className="size-4" />
        </div>
        <div className="min-w-0 flex-1 px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-xs leading-5 font-medium">
                {data.label}
              </div>
              {data.nodeType ? (
                <div className="mt-1 inline-flex max-w-full items-center rounded-full border border-white/15 bg-background/45 px-1.5 py-0.5 text-[8px] font-medium tracking-[0.16em] text-muted-foreground backdrop-blur-md supports-[backdrop-filter]:bg-background/25">
                  <span className="truncate">{data.nodeType}</span>
                </div>
              ) : null}
            </div>
            <div
              className={cn(
                "mt-1 size-2 shrink-0 rounded-full",
                data.status === "active"
                  ? "bg-emerald-500"
                  : "bg-muted-foreground/40"
              )}
            />
          </div>
          <div className="mt-1 line-clamp-2 min-h-8 text-[9px] leading-4 text-muted-foreground">
            {data.description}
          </div>
          <div className="text-brand-foreground/50 mt-1 truncate text-[7.5px] leading-2 whitespace-nowrap">
            {data.path}
          </div>
        </div>
        <Handle
          type="source"
          position={data.sourceHandlePosition}
          isConnectable={false}
          className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
        />
      </div>
    </div>
  )
}

const nodeTypes = {
  taxonomy: TaxonomyCanvasNode,
}

export function TaxonomyFlowSurface({
  nodes,
  search,
  selectedNodeID,
  onMoveNode: _onMoveNode,
  onSelectNode,
  layoutInsetLeft = CANVAS_PADDING,
  layoutInsetTop = CANVAS_PADDING,
}: Props) {
  const [viewport, setViewport] = React.useState({ x: 0, y: 0, zoom: 1 })
  const nodePositionsRef = React.useRef<Record<string, { x: number; y: number }>>(
    {}
  )
  const nodeWidthsRef = React.useRef<Record<string, number>>({})
  const [flowNodes, setFlowNodes] = React.useState<Node<TaxonomyFlowNodeData>[]>(
    []
  )

  const { edges, visibleIds } = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    const nodesByPath = new Map(nodes.map((node) => [node.path, node]))
    const parentById = new Map<string, string>()
    const childrenByParent = new Map<string, TaxonomyFlowNodeRecord[]>()

    for (const node of nodes) {
      const segments = getPathSegments(node)
      const parentPath =
        segments.length > 1 ? segments.slice(0, -1).join(" > ") : ""
      const inferredParent = parentPath
        ? nodesByPath.get(parentPath)
        : undefined
      const parentId =
        node.parent_node_id || inferredParent?.taxonomy_node_id || ""
      parentById.set(node.taxonomy_node_id, parentId)
      const key = parentId || "__root__"
      const siblings = childrenByParent.get(key) ?? []
      siblings.push(node)
      childrenByParent.set(key, siblings)
    }

    for (const siblings of childrenByParent.values()) {
      siblings.sort(compareNodes)
    }

    const visibleIds = new Set<string>()
    if (!query) {
      for (const node of nodes) {
        visibleIds.add(node.taxonomy_node_id)
      }
    } else {
      for (const node of nodes) {
        const matches =
          getDisplayLabel(node).toLowerCase().includes(query) ||
          (node.node_type || "").toLowerCase().includes(query) ||
          node.path.toLowerCase().includes(query) ||
          (node.description || "").toLowerCase().includes(query)

        if (!matches) continue

        let currentId: string | undefined = node.taxonomy_node_id
        while (currentId) {
          visibleIds.add(currentId)
          currentId = parentById.get(currentId) || undefined
        }
      }
    }

    const visibleChildrenByParent = new Map<string, TaxonomyFlowNodeRecord[]>()
    for (const [parentId, siblings] of childrenByParent.entries()) {
      const visibleChildren = siblings.filter((node) =>
        visibleIds.has(node.taxonomy_node_id)
      )
      if (visibleChildren.length > 0) {
        visibleChildrenByParent.set(parentId, visibleChildren)
      }
    }

    const nextEdges: Edge[] = []

    for (const [parentId, children] of visibleChildrenByParent.entries()) {
      if (parentId === "__root__") continue
      for (const child of children) {
        nextEdges.push({
          animated: false,
          id: `edge-${parentId}-${child.taxonomy_node_id}`,
          source: parentId,
          target: child.taxonomy_node_id,
          type: "step",
          style: {
            stroke: "color-mix(in oklch, var(--border) 88%, var(--foreground) 12%)",
            strokeWidth: 1.5,
          },
        })
      }
    }

    return { edges: nextEdges, visibleIds }
  }, [nodes, search])

  React.useEffect(() => {
    const sortedNodes = [...nodes].sort((left, right) =>
      left.path.localeCompare(right.path)
    )
    const activeIDs = new Set(nodes.map((node) => node.taxonomy_node_id))

    for (const nodeID of Object.keys(nodePositionsRef.current)) {
      if (!activeIDs.has(nodeID)) {
        delete nodePositionsRef.current[nodeID]
      }
    }

    for (const nodeID of Object.keys(nodeWidthsRef.current)) {
      if (!activeIDs.has(nodeID)) {
        delete nodeWidthsRef.current[nodeID]
      }
    }

    sortedNodes.forEach((node, index) => {
      if (nodePositionsRef.current[node.taxonomy_node_id]) return
      nodePositionsRef.current[node.taxonomy_node_id] = {
        x: layoutInsetLeft + getNodeDepth(node) * FREEFORM_COLUMN_GAP,
        y: layoutInsetTop + index * FREEFORM_ROW_GAP,
      }
    })

    setFlowNodes(
      nodes
        .filter((node) => visibleIds.has(node.taxonomy_node_id))
        .map((node) => ({
          data: {
            description: node.description?.trim() || "No description",
            isDropTarget: false,
            isSelected: node.taxonomy_node_id === selectedNodeID,
            label: getDisplayLabel(node),
            nodeType: node.node_type?.trim() || undefined,
            path: node.path,
            sourceHandlePosition: getSourceHandlePosition(node.node_type),
            status: node.status,
            targetHandlePosition: getTargetHandlePosition(node.node_type),
          },
          dragHandle: ".taxonomy-node-drag-handle",
          id: node.taxonomy_node_id,
          position: nodePositionsRef.current[node.taxonomy_node_id],
          selectable: true,
          sourcePosition: getSourceHandlePosition(node.node_type),
          style: {
            width: nodeWidthsRef.current[node.taxonomy_node_id] ?? NODE_WIDTH,
          },
          targetPosition: getTargetHandlePosition(node.node_type),
          type: "taxonomy",
        }))
    )
  }, [layoutInsetLeft, layoutInsetTop, nodes, selectedNodeID, visibleIds])

  const handleNodeClick = React.useCallback<
    NodeMouseHandler<Node<TaxonomyFlowNodeData>>
  >(
    (_event, node) => {
      onSelectNode(node.id)
    },
    [onSelectNode]
  )

  const handleNodeDragStart = React.useCallback<
    NodeMouseHandler<Node<TaxonomyFlowNodeData>>
  >(
    (_event, node) => {
      onSelectNode(node.id)
    },
    [onSelectNode]
  )

  const handleNodesChange = React.useCallback(
    (changes: NodeChange<Node<TaxonomyFlowNodeData>>[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          nodePositionsRef.current[change.id] = change.position
        }

        if (
          change.type === "dimensions" &&
          change.dimensions?.width &&
          (change.setAttributes === true || change.setAttributes === "width")
        ) {
          nodeWidthsRef.current[change.id] = Math.max(
            NODE_MIN_WIDTH,
            Math.min(NODE_MAX_WIDTH, change.dimensions.width)
          )
        }
      }

      setFlowNodes((current) =>
        applyNodeChanges(changes, current).map((node) => ({
          ...node,
          data: {
            ...node.data,
            isSelected: node.id === selectedNodeID,
          },
          style: {
            ...node.style,
            width: nodeWidthsRef.current[node.id] ?? node.style?.width ?? NODE_WIDTH,
          },
        }))
      )
    },
    [selectedNodeID]
  )

  const handleViewportChange = React.useCallback(
    (nextViewport: { x: number; y: number; zoom: number }) => {
      setViewport((current) => {
        if (
          current.x === nextViewport.x &&
          current.y === nextViewport.y &&
          current.zoom === nextViewport.zoom
        ) {
          return current
        }

        return nextViewport
      })
    },
    []
  )

  if (flowNodes.length === 0) {
    return (
      <div className="flex h-full min-h-[24rem] items-center justify-center bg-background/20 px-6 text-center text-sm text-muted-foreground backdrop-blur-2xl supports-[backdrop-filter]:bg-background/10">
        No taxonomy nodes match the current search.
      </div>
    )
  }

  return (
    <div className="h-full w-full rounded-xl border  bg-[radial-gradient(circle_at_top_left,hsl(var(--background)/0.72),transparent_32%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.18),transparent_28%),linear-gradient(180deg,hsl(var(--background)/0.42),hsl(var(--background)/0.24))] backdrop-blur-2xl">
      <ReactFlow
        className="[&_.react-flow__attribution]:hidden [&_.react-flow__background]:opacity-80 [&_.react-flow__controls]:overflow-hidden [&_.react-flow__controls]:rounded-xl [&_.react-flow__controls]:border [&_.react-flow__controls]:border-white/15 [&_.react-flow__controls]:bg-background/60 [&_.react-flow__controls]:shadow-lg [&_.react-flow__controls]:backdrop-blur-xl [&_.react-flow__controls-button]:border-0 [&_.react-flow__controls-button]:bg-transparent [&_.react-flow__controls-button]:text-foreground/80 [&_.react-flow__controls-button:hover]:bg-background/40 [&_.react-flow__minimap]:overflow-hidden [&_.react-flow__minimap]:rounded-xl [&_.react-flow__minimap]:border [&_.react-flow__minimap]:border-white/15 [&_.react-flow__minimap]:bg-background/55 [&_.react-flow__minimap]:shadow-lg [&_.react-flow__minimap]:backdrop-blur-xl"
        nodes={flowNodes}
        edges={edges}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        viewport={viewport}
        onViewportChange={handleViewportChange}
        onNodesChange={handleNodesChange}
        onNodeDragStart={handleNodeDragStart}
        minZoom={0.2}
        maxZoom={1.5}
        nodesDraggable
        nodesConnectable={false}
        panOnDrag
        panOnScroll={false}
        translateExtent={TRANSLATE_EXTENT}
        autoPanOnNodeDrag={false}
        selectNodesOnDrag={false}
        zoomOnScroll
        zoomOnPinch
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap pannable zoomable />
        <Controls showFitView={false} />
        <Background gap={20} size={1} color="var(--border)" />
      </ReactFlow>
    </div>
  )
}
