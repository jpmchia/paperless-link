"use client"

import Color from "color"
import { PipetteIcon } from "lucide-react"
import { Slider } from "radix-ui"
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface ColorPickerContextValue {
  hue: number
  saturation: number
  lightness: number
  alpha: number
  mode: string
  setHue: (hue: number) => void
  setSaturation: (saturation: number) => void
  setLightness: (lightness: number) => void
  setAlpha: (alpha: number) => void
  setMode: (mode: string) => void
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(
  undefined
)

export const useColorPicker = () => {
  const context = useContext(ColorPickerContext)

  if (!context) {
    throw new Error("useColorPicker must be used within a ColorPickerProvider")
  }

  return context
}

export type ColorPickerProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue"
> & {
  value?: Parameters<typeof Color>[0]
  defaultValue?: Parameters<typeof Color>[0]
  onChange?: (value: Parameters<typeof Color.rgb>[0]) => void
}

function resolveColor(
  value: Parameters<typeof Color>[0] | undefined,
  fallback: string
) {
  try {
    if (value !== undefined) {
      return Color(value)
    }
  } catch {
    // fall through to fallback
  }

  return Color(fallback)
}

export const ColorPicker = ({
  value,
  defaultValue = "#000000",
  onChange,
  className,
  children,
  ...props
}: ColorPickerProps) => {
  const selectedColor = resolveColor(
    value,
    typeof defaultValue === "string" ? defaultValue : "#000000"
  )
  const defaultColor = resolveColor(defaultValue, "#000000")
  const skipNextOnChangeRef = useRef(false)
  const onChangeRef = useRef(onChange)

  const [hue, setHue] = useState(selectedColor.hue() || defaultColor.hue() || 0)
  const [saturation, setSaturation] = useState(
    selectedColor.saturationl() || defaultColor.saturationl() || 100
  )
  const [lightness, setLightness] = useState(
    selectedColor.lightness() || defaultColor.lightness() || 50
  )
  const [alpha, setAlpha] = useState(
    selectedColor.alpha() * 100 || defaultColor.alpha() * 100
  )
  const [mode, setMode] = useState("hex")

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Update color when controlled value changes
  useEffect(() => {
    if (value) {
      const color = resolveColor(value, "#000000")
      const [nextHue = 0, nextSaturation = 100, nextLightness = 50] = color
        .hsl()
        .array()

      // Avoid emitting a mirrored update back to the parent while syncing props.
      skipNextOnChangeRef.current = true
      setHue(nextHue)
      setSaturation(nextSaturation)
      setLightness(nextLightness)
      setAlpha(color.alpha() * 100)

      // If the values didn't actually change, React won't re-render, the
      // notify effect won't fire, and the skip flag will stay stuck at true —
      // silently swallowing the next user edit.  Clear it on the next tick so
      // it's always reset after React has had a chance to process state updates.
      const timer = setTimeout(() => {
        skipNextOnChangeRef.current = false
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [value])

  // Notify parent of changes
  useEffect(() => {
    if (skipNextOnChangeRef.current) {
      skipNextOnChangeRef.current = false
      return
    }

    const callback = onChangeRef.current
    if (!callback) {
      return
    }

    const color = Color.hsl(hue, saturation, lightness).alpha(alpha / 100)
    const rgba = color.rgb().array()

    callback([rgba[0], rgba[1], rgba[2], alpha / 100])
  }, [hue, saturation, lightness, alpha])

  return (
    <ColorPickerContext.Provider
      value={{
        hue,
        saturation,
        lightness,
        alpha,
        mode,
        setHue,
        setSaturation,
        setLightness,
        setAlpha,
        setMode,
      }}
    >
      <div
        className={cn("flex size-full flex-col gap-4", className)}
        {...(props as any)}
      >
        {children ?? (
          <>
            <ColorPickerSelection className="h-28 rounded-lg" />
            <ColorPickerHue />
            <ColorPickerAlpha />
            <div className="flex items-center gap-2">
              <ColorPickerOutput />
              <ColorPickerFormat />
            </div>
          </>
        )}
      </div>
    </ColorPickerContext.Provider>
  )
}

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>

export const ColorPickerSelection = memo(
  ({ className, ...props }: ColorPickerSelectionProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [positionX, setPositionX] = useState(0)
    const [positionY, setPositionY] = useState(0)
    const { hue, setSaturation, setLightness } = useColorPicker()

    const backgroundGradient = useMemo(() => {
      return `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
            linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
            hsl(${hue}, 100%, 50%)`
    }, [hue])

    const handlePointerMove = useCallback(
      (event: PointerEvent) => {
        if (!(isDragging && containerRef.current)) {
          return
        }
        const rect = containerRef.current.getBoundingClientRect()
        const x = Math.max(
          0,
          Math.min(1, (event.clientX - rect.left) / rect.width)
        )
        const y = Math.max(
          0,
          Math.min(1, (event.clientY - rect.top) / rect.height)
        )
        setPositionX(x)
        setPositionY(y)
        setSaturation(x * 100)
        const topLightness = x < 0.01 ? 100 : 50 + 50 * (1 - x)
        const lightness = topLightness * (1 - y)

        setLightness(lightness)
      },
      [isDragging, setSaturation, setLightness]
    )

    useEffect(() => {
      const handlePointerUp = () => setIsDragging(false)

      if (isDragging) {
        window.addEventListener("pointermove", handlePointerMove)
        window.addEventListener("pointerup", handlePointerUp)
      }

      return () => {
        window.removeEventListener("pointermove", handlePointerMove)
        window.removeEventListener("pointerup", handlePointerUp)
      }
    }, [isDragging, handlePointerMove])

    return (
      <div
        className={cn("relative size-full cursor-crosshair rounded", className)}
        onPointerDown={(e) => {
          e.preventDefault()
          setIsDragging(true)
          handlePointerMove(e.nativeEvent)
        }}
        ref={containerRef}
        style={{
          background: backgroundGradient,
        }}
        {...(props as any)}
      >
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
          style={{
            left: `${positionX * 100}%`,
            top: `${positionY * 100}%`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
          }}
        />
      </div>
    )
  }
)

ColorPickerSelection.displayName = "ColorPickerSelection"

export type ColorPickerHueProps = ComponentProps<typeof Slider.Root>

export const ColorPickerHue = ({
  className,
  ...props
}: ColorPickerHueProps) => {
  const { hue, setHue } = useColorPicker()

  return (
    <Slider.Root
      className={cn("relative flex h-4 w-full touch-none", className)}
      max={360}
      onValueChange={([hue]) => setHue(hue)}
      step={1}
      value={[hue]}
      {...(props as any)}
    >
      <Slider.Track className="relative my-0.5 h-3 w-full grow rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
        <Slider.Range className="absolute h-full" />
      </Slider.Track>
      <Slider.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" />
    </Slider.Root>
  )
}

export type ColorPickerAlphaProps = ComponentProps<typeof Slider.Root>

export const ColorPickerAlpha = ({
  className,
  ...props
}: ColorPickerAlphaProps) => {
  const { alpha, setAlpha } = useColorPicker()

  return (
    <Slider.Root
      className={cn("relative flex h-4 w-full touch-none", className)}
      max={100}
      onValueChange={([alpha]) => setAlpha(alpha)}
      step={1}
      value={[alpha]}
      {...(props as any)}
    >
      <Slider.Track
        className="relative my-0.5 h-3 w-full grow rounded-full"
        style={{
          background:
            'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
        }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent to-black/50" />
        <Slider.Range className="absolute h-full rounded-full bg-transparent" />
      </Slider.Track>
      <Slider.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" />
    </Slider.Root>
  )
}

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>

export const ColorPickerEyeDropper = ({
  className,
  ...props
}: ColorPickerEyeDropperProps) => {
  const { setHue, setSaturation, setLightness, setAlpha } = useColorPicker()
  const isEyeDropperSupported =
    typeof window !== "undefined" && "EyeDropper" in window

  const handleEyeDropper = async () => {
    if (!isEyeDropperSupported) return

    try {
      // @ts-expect-error - EyeDropper API is experimental
      const eyeDropper = new window.EyeDropper()
      const result = await eyeDropper.open()
      const color = Color(result.sRGBHex)
      const [h, s, l] = color.hsl().array()

      setHue(h)
      setSaturation(s)
      setLightness(l)
      setAlpha(100)
    } catch (error) {
      console.error("EyeDropper failed:", error)
    }
  }

  return (
    <Button
      className={cn("shrink-0 text-muted-foreground", className)}
      disabled={!isEyeDropperSupported || props.disabled}
      onClick={handleEyeDropper}
      size="icon"
      type="button"
      variant="outline"
      {...(props as any)}
    >
      <PipetteIcon size={16} />
    </Button>
  )
}

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>

const formats = ["hex", "rgb", "css", "hsl"]

export const ColorPickerOutput = ({
  className,
  ...props
}: ColorPickerOutputProps) => {
  const { mode, setMode } = useColorPicker()

  return (
    <Select onValueChange={setMode} value={mode}>
      <SelectTrigger className="h-8 w-20 shrink-0 text-xs" {...(props as any)}>
        <SelectValue placeholder="Mode" />
      </SelectTrigger>
      <SelectContent>
        {formats.map((format) => (
          <SelectItem className="text-xs" key={format} value={format}>
            {format.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

type PercentageInputProps = ComponentProps<typeof Input>

const PercentageInput = ({ className, ...props }: PercentageInputProps) => {
  return (
    <div className="relative">
      <Input
        type="text"
        {...(props as any)}
        className={cn(
          "h-8 w-[3.25rem] rounded-l-none bg-secondary px-2 text-xs shadow-none",
          className
        )}
      />
      <span className="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
        %
      </span>
    </div>
  )
}

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>

export const ColorPickerFormat = ({
  className,
  ...props
}: ColorPickerFormatProps) => {
  const {
    hue,
    saturation,
    lightness,
    alpha,
    mode,
    setHue,
    setSaturation,
    setLightness,
    setAlpha,
  } = useColorPicker()
  const color = Color.hsl(hue, saturation, lightness, alpha / 100)
  const [localHex, setLocalHex] = useState("")
  const [editingHex, setEditingHex] = useState(false)
  const [localAlpha, setLocalAlpha] = useState("")
  const [editingAlpha, setEditingAlpha] = useState(false)

  if (mode === "hex") {
    const hex = color.hex()

    return (
      <div
        className={cn(
          "relative flex min-w-[12rem] flex-1 items-center -space-x-px rounded-md shadow-sm",
          className
        )}
        {...(props as any)}
      >
        <Input
          className="h-8 min-w-[8rem] flex-1 rounded-r-none bg-secondary px-2 text-xs shadow-none"
          type="text"
          value={editingHex ? localHex : hex}
          onFocus={() => {
            setEditingHex(true)
            setLocalHex(hex)
          }}
          onBlur={() => setEditingHex(false)}
          onChange={(e) => {
            const val = e.target.value
            setLocalHex(val)
            try {
              const parsed = Color(val.startsWith("#") ? val : `#${val}`)
              const [h = 0, s = 100, l = 50] = parsed.hsl().array()
              setHue(h)
              setSaturation(s)
              setLightness(l)
            } catch {
              // partial hex input, keep local state
            }
          }}
        />
        <PercentageInput
          value={editingAlpha ? localAlpha : Math.round(alpha)}
          onFocus={() => {
            setEditingAlpha(true)
            setLocalAlpha(String(Math.round(alpha)))
          }}
          onBlur={() => setEditingAlpha(false)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value
            setLocalAlpha(val)
            const num = Number(val)
            if (!isNaN(num) && num >= 0 && num <= 100) {
              setAlpha(num)
            }
          }}
        />
      </div>
    )
  }

  if (mode === "rgb") {
    const rgb = color
      .rgb()
      .array()
      .map((value: number) => Math.round(value))

    return (
      <div
        className={cn(
          "flex min-w-[12rem] flex-1 items-center -space-x-px rounded-md shadow-sm",
          className
        )}
        {...(props as any)}
      >
        {rgb.map((value: number, index: number) => (
          <Input
            className={cn(
              "h-8 min-w-[3.5rem] flex-1 rounded-r-none bg-secondary px-2 text-xs shadow-none",
              index && "rounded-l-none",
              className
            )}
            key={index}
            readOnly
            type="text"
            value={value}
          />
        ))}
        <PercentageInput readOnly value={alpha} />
      </div>
    )
  }

  if (mode === "css") {
    const rgb = color
      .rgb()
      .array()
      .map((value: number) => Math.round(value))

    return (
      <div
        className={cn("w-full rounded-md shadow-sm", className)}
        {...(props as any)}
      >
        <Input
          className="h-8 w-full min-w-[12rem] bg-secondary px-2 text-xs shadow-none"
          readOnly
          type="text"
          value={`rgba(${rgb.join(", ")}, ${alpha}%)`}
          {...(props as any)}
        />
      </div>
    )
  }

  if (mode === "hsl") {
    const hsl = color
      .hsl()
      .array()
      .map((value: number) => Math.round(value))

    return (
      <div
        className={cn(
          "flex min-w-[12rem] flex-1 items-center -space-x-px rounded-md shadow-sm",
          className
        )}
        {...(props as any)}
      >
        {hsl.map((value: number, index: number) => (
          <Input
            className={cn(
              "h-8 min-w-[3.5rem] flex-1 rounded-r-none bg-secondary px-2 text-xs shadow-none",
              index && "rounded-l-none",
              className
            )}
            key={index}
            readOnly
            type="text"
            value={value}
          />
        ))}
        <PercentageInput readOnly value={alpha} />
      </div>
    )
  }

  return null
}

export type ColorPickerSwatchProps = HTMLAttributes<HTMLButtonElement>

export const ColorPickerSwatch = ({
  className,
  ...props
}: ColorPickerSwatchProps) => {
  const { hue, saturation, lightness, alpha } = useColorPicker()
  const color = Color.hsl(hue, saturation, lightness).alpha(alpha / 100)
  const cssColor = color.rgb().string()

  return (
    <button
      type="button"
      className={cn(
        "h-8 w-8 shrink-0 rounded-md border border-border/60 shadow-sm",
        className
      )}
      style={{ backgroundColor: cssColor }}
      {...(props as any)}
    />
  )
}

export type ColorPickerPopoverProps = ColorPickerProps

export const ColorPickerPopover = ({
  value,
  defaultValue = "#000000",
  onChange,
  className,
}: ColorPickerPopoverProps) => {
  return (
    <ColorPicker
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      className={cn("h-auto gap-0", className)}
    >
      <Popover>
        <div className="flex items-center gap-2">
          <PopoverTrigger asChild>
            <ColorPickerSwatch />
          </PopoverTrigger>
          <ColorPickerOutput />
          <ColorPickerFormat />
        </div>
        <PopoverContent className="w-64" align="start">
          <ColorPickerSelection className="h-36 rounded-lg" />
          <ColorPickerHue />
          <ColorPickerAlpha />
        </PopoverContent>
      </Popover>
    </ColorPicker>
  )
}

// Demo
export function Demo() {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-8">
      <ColorPicker defaultValue="#6366f1" className="h-auto w-64">
        <ColorPickerSelection className="h-40 rounded-lg" />
        <ColorPickerHue />
        <ColorPickerAlpha />
        <div className="flex items-center gap-2">
          <ColorPickerOutput />
          <ColorPickerFormat />
        </div>
      </ColorPicker>
    </div>
  )
}
