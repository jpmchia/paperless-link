"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Props = {
  attributeUsageCount: number
  entityTypeCount: number
  entityUsageCount: number
  profileCount: number
  qualifierCount: number
}

export function DomainModelsOverviewCards({
  attributeUsageCount,
  entityTypeCount,
  entityUsageCount,
  profileCount,
  qualifierCount,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Profiles</CardTitle>
          <CardDescription>Saved context profiles for review and extraction.</CardDescription>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{profileCount}</CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Entity Usages</CardTitle>
          <CardDescription>Context-specific entities represented across profiles.</CardDescription>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{entityUsageCount}</CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Attribute Usages</CardTitle>
          <CardDescription>Context-specific attributes currently modeled.</CardDescription>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{attributeUsageCount}</CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Entity Library</CardTitle>
          <CardDescription>Approved canonical entities available for reuse.</CardDescription>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{entityTypeCount}</CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Qualifiers</CardTitle>
          <CardDescription>Contextual qualifiers available to refine meaning.</CardDescription>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{qualifierCount}</CardContent>
      </Card>
    </div>
  )
}
