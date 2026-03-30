"use client"

import { DomainModelsContextPane } from "./context-pane"
import { DomainExplorerCanvas } from "./domain-explorer-canvas"
import { DomainModelsEvidencePane } from "./evidence-pane"
import { DomainModelsInspectorPane } from "./inspector-pane"

type ContextPaneProps = React.ComponentProps<typeof DomainModelsContextPane>
type EvidencePaneProps = React.ComponentProps<typeof DomainModelsEvidencePane>
type InspectorPaneProps = React.ComponentProps<typeof DomainModelsInspectorPane>
type ExplorerCanvasProps = React.ComponentProps<typeof DomainExplorerCanvas>

type Props = {
  canvas: ExplorerCanvasProps
  contextPane: ContextPaneProps
  evidencePane: EvidencePaneProps
  inspectorPane: InspectorPaneProps
}

export function DomainExplorerScreen({ canvas, contextPane, evidencePane, inspectorPane }: Props) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(18rem,22rem)_minmax(34rem,1fr)_minmax(18rem,22rem)_minmax(22rem,28rem)]">
      <DomainModelsContextPane {...contextPane} />
      <DomainExplorerCanvas {...canvas} />
      <DomainModelsInspectorPane {...inspectorPane} />
      <DomainModelsEvidencePane {...evidencePane} />
    </div>
  )
}
