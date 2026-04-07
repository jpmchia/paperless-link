"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { type PreviewCardProps, buildTextRoleStyle } from "./preview-shared"

export function UIComponentShowcase({
  previewGap,
  sectionClass,
  showNestedCards,
  previewCardBackgroundColor,
  previewInputBackgroundColor,
  titleScale,
  helperTextColor,
  textRoles,
  fieldBlockGap,
  accent,
}: PreviewCardProps) {
  const [checkboxChecked, setCheckboxChecked] = React.useState(false)
  const [switchChecked, setSwitchChecked] = React.useState(true)
  const [sliderValue, setSliderValue] = React.useState([50])

  const sectionStyle = showNestedCards ? { backgroundColor: previewCardBackgroundColor } : undefined
  const headingStyle: React.CSSProperties = { fontSize: `${1.02 * titleScale}rem` }

  return (
    <div style={{ display: "grid", gap: previewGap }}>
      {/* Buttons */}
      <section className={sectionClass} style={sectionStyle}>
        <h3 className="font-semibold text-foreground" style={headingStyle}>
          Buttons
        </h3>
        <p className="mt-1 text-sm" style={{ color: helperTextColor }}>
          Primary actions, secondary options, and destructive confirmations.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon"><Sparkles className="size-4" /></Button>
        </div>
      </section>

      {/* Badges */}
      <section className={sectionClass} style={sectionStyle}>
        <h3 className="font-semibold text-foreground" style={headingStyle}>
          Badges
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge
            variant="outline"
            style={{
              borderColor: accent.border,
              backgroundColor: accent.tint,
              color: accent.text,
            }}
          >
            Accent
          </Badge>
        </div>
      </section>

      {/* Form Controls */}
      <section className={sectionClass} style={sectionStyle}>
        <h3 className="font-semibold text-foreground" style={headingStyle}>
          Form Controls
        </h3>
        <p className="mt-1 text-sm" style={{ color: helperTextColor }}>
          Inputs, selects, checkboxes, switches, and sliders.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div style={{ display: "grid", gap: fieldBlockGap }}>
            <Label
              className="text-xs"
              style={buildTextRoleStyle(textRoles.field, titleScale, helperTextColor)}
            >
              Text input
            </Label>
            <Input
              placeholder="Enter a value..."
              style={{ backgroundColor: previewInputBackgroundColor }}
            />
          </div>
          <div style={{ display: "grid", gap: fieldBlockGap }}>
            <Label
              className="text-xs"
              style={buildTextRoleStyle(textRoles.field, titleScale, helperTextColor)}
            >
              Textarea
            </Label>
            <Textarea
              placeholder="Multi-line input..."
              rows={2}
              style={{ backgroundColor: previewInputBackgroundColor }}
            />
          </div>
          <div style={{ display: "grid", gap: fieldBlockGap }}>
            <Label
              className="text-xs"
              style={buildTextRoleStyle(textRoles.field, titleScale, helperTextColor)}
            >
              Select
            </Label>
            <Select defaultValue="option-1">
              <SelectTrigger>
                <SelectValue placeholder="Choose..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option-1">Option 1</SelectItem>
                <SelectItem value="option-2">Option 2</SelectItem>
                <SelectItem value="option-3">Option 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div style={{ display: "grid", gap: fieldBlockGap }}>
            <Label
              className="text-xs"
              style={buildTextRoleStyle(textRoles.field, titleScale, helperTextColor)}
            >
              Slider
            </Label>
            <Slider min={0} max={100} step={1} value={sliderValue} onValueChange={setSliderValue} />
            <div className="text-xs text-muted-foreground">{sliderValue[0]}%</div>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="showcase-checkbox"
              checked={checkboxChecked}
              onCheckedChange={(v) => setCheckboxChecked(v === true)}
            />
            <Label htmlFor="showcase-checkbox" className="text-sm">
              Checkbox option
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="showcase-switch"
              checked={switchChecked}
              onCheckedChange={setSwitchChecked}
            />
            <Label htmlFor="showcase-switch" className="text-sm">
              Switch toggle
            </Label>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className={sectionClass} style={sectionStyle}>
        <h3 className="font-semibold text-foreground" style={headingStyle}>
          Tabs
        </h3>
        <div className="mt-4">
          <Tabs defaultValue="tab-1">
            <TabsList>
              <TabsTrigger value="tab-1">Overview</TabsTrigger>
              <TabsTrigger value="tab-2">Details</TabsTrigger>
              <TabsTrigger value="tab-3">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="tab-1" className="mt-3 text-sm text-muted-foreground">
              Overview content area. Tabs separate related content into switchable panels.
            </TabsContent>
            <TabsContent value="tab-2" className="mt-3 text-sm text-muted-foreground">
              Detailed information goes here.
            </TabsContent>
            <TabsContent value="tab-3" className="mt-3 text-sm text-muted-foreground">
              Configuration and settings panel.
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Alert */}
      <section className={sectionClass} style={sectionStyle}>
        <h3 className="font-semibold text-foreground" style={headingStyle}>
          Alert
        </h3>
        <div className="mt-4 space-y-3">
          <Alert>
            <AlertTitle>Default alert</AlertTitle>
            <AlertDescription>Informational alert with standard styling.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Destructive alert</AlertTitle>
            <AlertDescription>Something went wrong. Please try again.</AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Progress */}
      <section className={sectionClass} style={sectionStyle}>
        <h3 className="font-semibold text-foreground" style={headingStyle}>
          Progress
        </h3>
        <div className="mt-4 space-y-2">
          <Progress value={65} />
          <div className="text-xs text-muted-foreground">65% complete</div>
        </div>
      </section>

      {/* Accordion */}
      <section className={sectionClass} style={sectionStyle}>
        <h3 className="font-semibold text-foreground" style={headingStyle}>
          Accordion
        </h3>
        <div className="mt-4">
          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>Section one</AccordionTrigger>
              <AccordionContent>
                Collapsible content area. Accordions are useful for progressive disclosure of related content.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Section two</AccordionTrigger>
              <AccordionContent>
                A second collapsible section with independent content.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Table */}
      <section className={sectionClass} style={sectionStyle}>
        <h3 className="font-semibold text-foreground" style={headingStyle}>
          Table
        </h3>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Document A</TableCell>
                <TableCell><Badge variant="outline">Active</Badge></TableCell>
                <TableCell className="text-right">$250.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Document B</TableCell>
                <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                <TableCell className="text-right">$150.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Document C</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: accent.border,
                      backgroundColor: accent.tint,
                      color: accent.text,
                    }}
                  >
                    Reviewed
                  </Badge>
                </TableCell>
                <TableCell className="text-right">$350.00</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Avatar, Tooltip & Skeleton */}
      <section className={sectionClass} style={sectionStyle}>
        <h3 className="font-semibold text-foreground" style={headingStyle}>
          Avatar, Tooltip & Skeleton
        </h3>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar>
                    <AvatarFallback>AB</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>Alice Brown</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar>
                    <AvatarFallback>CD</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>Charles Davis</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-sm text-muted-foreground">Hover for tooltip</span>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Loading skeleton</div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className={sectionClass} style={sectionStyle}>
        <h3 className="font-semibold text-foreground" style={headingStyle}>
          Card
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Default card</CardTitle>
              <CardDescription>Supporting description text.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Card body content.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Interactive card</CardTitle>
              <CardDescription>With an action button.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end">
              <Button size="sm" variant="outline">Action</Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Separator */}
      <section className={sectionClass} style={sectionStyle}>
        <h3 className="font-semibold text-foreground" style={headingStyle}>
          Separator
        </h3>
        <div className="mt-4 space-y-3">
          <div className="text-sm">Content above</div>
          <Separator />
          <div className="text-sm text-muted-foreground">Content below</div>
        </div>
      </section>
    </div>
  )
}
