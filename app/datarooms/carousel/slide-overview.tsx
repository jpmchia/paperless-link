"use client"

import * as React from "react"
import { CarouselItem } from "@/components/ui/carousel"
import { DataroomConfigurationCard } from "../components/dataroom-configuration-card"
import { AuthorisedMembersCard } from "../components/authorised-members-card"

export type DataroomsCarouselOverviewSlideProps = {
  configuration: React.ComponentProps<typeof DataroomConfigurationCard>
  members: React.ComponentProps<typeof AuthorisedMembersCard>
}

export function DataroomsCarouselOverviewSlide({
  configuration,
  members,
}: DataroomsCarouselOverviewSlideProps) {
  return (
    <CarouselItem className="h-full basis-full pl-0">
      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
        <div className="min-h-0 overflow-auto">
          <DataroomConfigurationCard {...configuration} />
        </div>
        <div className="min-h-0 overflow-auto">
          <AuthorisedMembersCard {...members} />
        </div>
      </div>
    </CarouselItem>
  )
}
