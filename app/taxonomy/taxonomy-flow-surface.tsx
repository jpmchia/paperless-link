"use client"

import * as React from "react"
import "@xyflow/react/dist/style.css"
import {
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
  type ReactFlowInstance,
} from "@xyflow/react"
import { GripVertical } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export type TaxonomyFlowNodeRecord = {
  description?: string
  label: string
  mapping_state: string
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
  path: string
  status: string
}

const NODE_WIDTH = 220
const NODE_MIN_WIDTH = 220
const NODE_MAX_WIDTH = 640
const HORIZONTAL_GAP = 44
const ROOT_GAP = 96
const VERTICAL_GAP = 156
const CANVAS_PADDING = 32

function compareNodes(left: TaxonomyFlowNodeRecord, right: TaxonomyFlowNodeRecord) {
  const leftSort = typeof left.sort_order === "number" ? left.sort_order : Number.MAX_SAFE_INTEGER
  const rightSort = typeof right.sort_order === "number" ? right.sort_order : Number.MAX_SAFE_INTEGER
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
          "flex w-full items-stretch rounded-lg border bg-background text-left shadow-sm transition-colors",
          data.isSelected ? "border-primary ring-2 ring-primary/20" : "border-border",
          data.isDropTarget && "border-primary bg-accent/40 ring-2 ring-primary/15"
        )}
      >
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={false}
          className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
        />
        <div
          className={cn(
            "taxonomy-node-drag-handle flex w-6 shrink-0 cursor-grab items-center justify-center border-r bg-muted/20 text-muted-foreground/65 active:cursor-grabbing",
            data.isDropTarget && "bg-primary/10 text-primary"
          )}
        >
          <GripVertical className="size-4" />
        </div>
        <div className="min-w-0 flex-1 px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 truncate text-xs font-medium leading-5">{data.label}</div>
            <div
              className={cn(
                "mt-1 size-2 shrink-0 rounded-full",
                data.status === "active" ? "bg-emerald-500" : "bg-muted-foreground/40"
              )}
            />
          </div>
          <div className="mt-1 line-clamp-2 min-h-8 text-[9px] leading-4 text-muted-foreground">
            {data.description}
          </div>
          <div className="mt-1 truncate whitespace-nowrap text-[7.5px] leading-2 text-brand-foreground/50">
            {data.path}
          </div>
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
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
  onMoveNode,
  onSelectNode,
  layoutInsetLeft = CANVAS_PADDING,
  layoutInsetTop = CANVAS_PADDING,
}: Props) {
  const [viewport, setViewport] = React.useState({ x: 0, y: 0, zoom: 1 })
  const [nodeWidths, setNodeWidths] = React.useState<Record<string, number>>({})
  const [movingNodeID, setMovingNodeID] = React.useState<string>("")
  const [dropTargetNodeID, setDropTargetNodeID] = React.useState<string>("")
  const [reactFlowInstance, setReactFlowInstance] = React.useState<ReactFlowInstance<
    Node<TaxonomyFlowNodeData>,
    Edge
  > | null>(null)

  const nodeLookup = React.useMemo(
    () => new Map(nodes.map((node) => [node.taxonomy_node_id, node])),
    [nodes]
  )

  const resolveDropTarget = React.useCallback(
    (draggedNodeID: string, draggedNode: Node<TaxonomyFlowNodeData>) => {
      if (!reactFlowInstance) return null

      const sourceNode = nodeLookup.get(draggedNodeID)
      if (!sourceNode) return null

      const targetNode = reactFlowInstance
        .getIntersectingNodes(draggedNode)
        .find((candidate) => candidate.id !== draggedNodeID)

      if (!targetNode) return null

      const parentNode = nodeLookup.get(targetNode.id)
      if (!parentNode) return null
      if (sourceNode.taxonomy_node_id === parentNode.taxonomy_node_id) return null
      if (sourceNode.parent_node_id === parentNode.taxonomy_node_id) return null
      if (parentNode.path.startsWith(`${sourceNode.path} > `)) return null

      return parentNode
    },
    [nodeLookup, reactFlowInstance]
  )

  const { edges, flowNodes } = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    const nodesByPath = new Map(nodes.map((node) => [node.path, node]))
    const parentById = new Map<string, string>()
    const childrenByParent = new Map<string, TaxonomyFlowNodeRecord[]>()

    for (const node of nodes) {
      const segments = getPathSegments(node)
      const parentPath = segments.length > 1 ? segments.slice(0, -1).join(" > ") : ""
      const inferredParent = parentPath ? nodesByPath.get(parentPath) : undefined
      const parentId = node.parent_node_id || inferredParent?.taxonomy_node_id || ""
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
      const visibleChildren = siblings.filter((node) => visibleIds.has(node.taxonomy_node_id))
      if (visibleChildren.length > 0) {
        visibleChildrenByParent.set(parentId, visibleChildren)
      }
    }

    const subtreeWidthCache = new Map<string, number>()

    function getNodeWidth(nodeId: string) {
      return nodeWidths[nodeId] ?? NODE_WIDTH
    }

    function getSubtreeWidth(nodeId: string): number {
      const cached = subtreeWidthCache.get(nodeId)
      if (cached != null) return cached

      const children = visibleChildrenByParent.get(nodeId) ?? []
      const nodeWidth = getNodeWidth(nodeId)
      if (children.length === 0) {
        subtreeWidthCache.set(nodeId, nodeWidth)
        return nodeWidth
      }

      const childrenWidth = children.reduce((total, child, index) => {
        const childWidth = getSubtreeWidth(child.taxonomy_node_id)
        return total + childWidth + (index > 0 ? HORIZONTAL_GAP : 0)
      }, 0)

      const subtreeWidth = Math.max(nodeWidth, childrenWidth)
      subtreeWidthCache.set(nodeId, subtreeWidth)
      return subtreeWidth
    }

    const nextNodes: Node<TaxonomyFlowNodeData>[] = []
    const nextEdges: Edge[] = []

    function placeNode(node: TaxonomyFlowNodeRecord, depth: number, startX: number) {
      const nodeId = node.taxonomy_node_id
      const children = visibleChildrenByParent.get(nodeId) ?? []
      const subtreeWidth = getSubtreeWidth(nodeId)
      const nodeWidth = getNodeWidth(nodeId)
      const nodeX = startX + (subtreeWidth - nodeWidth) / 2

      nextNodes.push({
        data: {
          description: node.description?.trim() || "No description",
          isDropTarget: nodeId === dropTargetNodeID,
          isSelected: nodeId === selectedNodeID,
          label: getDisplayLabel(node),
          path: node.path,
          status: node.status,
        },
        dragHandle: ".taxonomy-node-drag-handle",
        id: nodeId,
        position: {
          x: nodeX,
          y: layoutInsetTop + depth * VERTICAL_GAP,
        },
        selectable: true,
        sourcePosition: Position.Bottom,
        style: {
          width: nodeWidth,
        },
        targetPosition: Position.Top,
        type: "taxonomy",
      })

      let childStartX = startX
      for (const child of children) {
        const childWidth = getSubtreeWidth(child.taxonomy_node_id)

        nextEdges.push({
          animated: false,
          id: `edge-${nodeId}-${child.taxonomy_node_id}`,
          source: nodeId,
          target: child.taxonomy_node_id,
          type: "smoothstep",
          style: {
            stroke: "hsl(var(--border))",
            strokeWidth: 1.25,
          },
        })

        placeNode(child, depth + 1, childStartX)
        childStartX += childWidth + HORIZONTAL_GAP
      }
    }

    const roots = visibleChildrenByParent.get("__root__") ?? []
    let currentX = layoutInsetLeft
    for (const root of roots) {
      placeNode(root, 0, currentX)
      currentX += getSubtreeWidth(root.taxonomy_node_id) + ROOT_GAP
    }

    return { edges: nextEdges, flowNodes: nextNodes }
  }, [dropTargetNodeID, layoutInsetLeft, layoutInsetTop, nodeWidths, nodes, search, selectedNodeID])

  const handleNodeClick = React.useCallback<NodeMouseHandler<Node<TaxonomyFlowNodeData>>>(
    (_event, node) => {
      onSelectNode(node.id)
    },
    [onSelectNode]
  )

  const handleNodeDragStart = React.useCallback<NodeMouseHandler<Node<TaxonomyFlowNodeData>>>(
    (_event, node) => {
      onSelectNode(node.id)
      setMovingNodeID(node.id)
      setDropTargetNodeID("")
    },
    [onSelectNode]
  )

  const handleNodeDrag = React.useCallback<NodeMouseHandler<Node<TaxonomyFlowNodeData>>>(
    (_event, node) => {
      const nextTarget = resolveDropTarget(node.id, node)
      setDropTargetNodeID(nextTarget?.taxonomy_node_id || "")
    },
    [resolveDropTarget]
  )

  const handleNodeDragStop = React.useCallback<NodeMouseHandler<Node<TaxonomyFlowNodeData>>>(
    async (_event, node) => {
      const parentNode = resolveDropTarget(node.id, node)
      setDropTargetNodeID("")

      if (!parentNode) {
        setMovingNodeID("")
        return
      }

      const sourceNode = nodeLookup.get(node.id)
      if (!sourceNode) {
        setMovingNodeID("")
        return
      }

      try {
        await onMoveNode(sourceNode.taxonomy_node_id, parentNode.taxonomy_node_id)
      } catch (error) {
        toast.error("Failed to move taxonomy node", {
          description: error instanceof Error ? error.message : "Unknown error",
        })
      } finally {
        setMovingNodeID("")
      }
    },
    [nodeLookup, onMoveNode, resolveDropTarget]
  )

  const handleNodesChange = React.useCallback(
    (changes: NodeChange<Node<TaxonomyFlowNodeData>>[]) => {
      let hasWidthChange = false

      setNodeWidths((current) => {
        const next = { ...current }

        for (const change of changes) {
          if (change.type !== "dimensions" || !change.dimensions?.width) continue
          if (change.setAttributes !== true && change.setAttributes !== "width") continue

          next[change.id] = Math.max(
            NODE_MIN_WIDTH,
            Math.min(NODE_MAX_WIDTH, change.dimensions.width)
          )
          hasWidthChange = true
        }

        return hasWidthChange ? next : current
      })
    },
    []
  )

  const handleViewportChange = React.useCallback(
    (nextViewport: { x: number; y: number; zoom: number }) => {
      setViewport((current) => {
        if (current.zoom === nextViewport.zoom) return current
        return { x: 0, y: 0, zoom: nextViewport.zoom }
      })
    },
    []
  )

  if (flowNodes.length === 0) {
    return (
      <div className="flex h-full min-h-[24rem] items-center justify-center p-6 text-center text-sm text-muted-foreground">
        No taxonomy nodes match the current search.
      </div>
    )
  }

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={edges}
      defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      viewport={viewport}
      onInit={setReactFlowInstance}
      onViewportChange={handleViewportChange}
      onNodesChange={handleNodesChange}
      onNodeDragStart={handleNodeDragStart}
      onNodeDrag={handleNodeDrag}
      onNodeDragStop={handleNodeDragStop}
      minZoom={0.2}
      maxZoom={1.5}
      nodesDraggable
      nodesConnectable={false}
      panOnDrag={false}
      panOnScroll={false}
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
      <Background gap={20} size={1} />
    </ReactFlow>
  )
}
