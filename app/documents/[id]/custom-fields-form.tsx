"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Document } from "../columns"
import { updateDocument } from "./actions"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Props = {
  document: Document
  customFieldsList: any[]
}

export function CustomFieldsForm({ document, customFieldsList }: Props) {
  const [isSaving, setIsSaving] = useState(false)

  // Map existing values
  const defaultValues: Record<string, any> = {}
  customFieldsList.forEach(cf => {
    const existing = document.custom_fields?.find((f: any) => f.field === cf.id)
    defaultValues[`cf_${cf.id}`] = existing !== undefined ? existing.value : ""
    
    if (cf.data_type === "boolean") {
        defaultValues[`cf_${cf.id}`] = existing !== undefined && existing.value !== null ? existing.value : false
    }
    if (cf.data_type === "documentlink" && existing !== undefined && Array.isArray(existing.value)) {
        defaultValues[`cf_${cf.id}`] = existing.value.join(", ")
    }
  })

  // We do not predefine a strict zod schema since it's fully dynamic. 
  // We'll rely on HTML validation and basic coercion.
  const form = useForm({
    defaultValues
  })

  async function onSubmit(values: any) {
    setIsSaving(true)
    try {
      const payload: any = { custom_fields: [] }
      
      for (const cf of customFieldsList) {
        let val = values[`cf_${cf.id}`]
        
        // Handle empty values
        if (cf.data_type === 'integer' || cf.data_type === 'float') {
            if (val === "" || val === null || val === undefined) {
                val = null
            } else {
                val = cf.data_type === 'integer' ? parseInt(val) : parseFloat(val)
            }
        } else if (cf.data_type === 'documentlink' && typeof val === 'string') {
            if (val.trim() === "") {
                val = []
            } else {
                val = val.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
            }
        } else {
            if (val === "") val = null
        }
        
        if (cf.data_type === "boolean") {
             if (val === "" || val === null) val = false
             val = !!val
        }
        
        payload.custom_fields.push({
          field: cf.id,
          value: val
        })
      }

      await updateDocument(document.id!, payload)
      // Update form state so isDirty goes to false
      form.reset(values)
      toast.success("Custom fields updated successfully")
    } catch (error) {
      toast.error("Failed to update custom fields")
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  function renderInput(cf: any, field: any) {
    switch (cf.data_type) {
      case "boolean":
        return (
          <div className="flex items-center h-10">
            <Switch
              checked={field.value === true}
              onCheckedChange={field.onChange}
            />
          </div>
        )
      case "date":
        return <Input type="date" {...field} value={field.value || ""} />
      case "integer":
        return <Input type="number" {...field} value={field.value ?? ""} />
      case "float":
        return <Input type="number" step="any" {...field} value={field.value ?? ""} />
      case "monetary":
        return <Input type="text" placeholder="e.g. USD123.45" {...field} value={field.value || ""} />
      case "url":
        return <Input type="url" placeholder="https://" {...field} value={field.value || ""} />
      case "documentlink":
        return <Input type="text" placeholder="e.g. 100, 101, 102" {...field} value={field.value || ""} />
      case "select":
        return (
          <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {cf.extra_data?.select_options?.map((opt: any) => (
                <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case "long_text":
        return <Textarea rows={4} {...field} value={field.value || ""} />
      case "string":
      default:
        return <Input type="text" {...field} value={field.value || ""} />
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        {customFieldsList.length === 0 && (
          <div className="text-sm text-muted-foreground italic rounded-md border p-4 bg-muted/20">
            No custom fields are defined on this server.
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {customFieldsList.map(cf => {
            const isHalfWidth = ["integer", "float", "monetary", "date", "boolean", "documentlink", "select"].includes(cf.data_type)
            
            return (
              <FormField
                key={cf.id}
                control={form.control}
                name={`cf_${cf.id}`}
                render={({ field }) => (
                  <FormItem className={cn(
                    "flex flex-row items-center gap-4 space-y-0",
                    isHalfWidth ? "col-span-1" : "col-span-1 md:col-span-2"
                  )}>
                    <FormLabel className="w-[30%] min-w-[90px] sm:max-w-[150px] text-right shrink-0 m-0 leading-tight">
                      {cf.name}
                    </FormLabel>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <FormControl>
                        {renderInput(cf, field)}
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            )
          })}
        </div>

        {customFieldsList.length > 0 && (
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}
