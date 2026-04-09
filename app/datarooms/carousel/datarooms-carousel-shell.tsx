"use client"

import {
  Carousel,
  CarouselContent,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

const CAROUSEL_OPTS = { align: "start" as const }

export function DataroomsCarouselShell({ children }: { children: React.ReactNode }) {
  return (
    <Carousel className="h-full w-full" opts={CAROUSEL_OPTS}>
      <CarouselPrevious className="-left-2 top-1/2 z-20" />
      <CarouselNext className="-right-2 top-1/2 z-20" />
      <CarouselContent className="ml-0 h-full">{children}</CarouselContent>
    </Carousel>
  )
}
