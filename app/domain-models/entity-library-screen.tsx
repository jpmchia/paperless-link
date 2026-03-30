"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DomainModelsComposerPane } from "./composer-pane"
import { DomainModelsInspectorPane } from "./inspector-pane"

type ComposerPaneProps = React.ComponentProps<typeof DomainModelsComposerPane>
type InspectorPaneProps = React.ComponentProps<typeof DomainModelsInspectorPane>

type Props = {
  composerPane: ComposerPaneProps
  inspectorPane: InspectorPaneProps
}

export function EntityLibraryScreen({ composerPane, inspectorPane }: Props) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(48rem,1fr)_minmax(20rem,24rem)]">
      <div className="grid min-h-0 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Entity Library</CardTitle>
            <CardDescription>
              Maintain approved canonical entities and attributes after they have been reviewed and promoted.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The dominant workflow is still proposal-first. Use this screen for low-level maintenance, cleanup,
            and adding extra detail once an entity has been approved.
          </CardContent>
        </Card>
        <DomainModelsComposerPane {...composerPane} />
      </div>
      <DomainModelsInspectorPane {...inspectorPane} />
    </div>
  )
}
