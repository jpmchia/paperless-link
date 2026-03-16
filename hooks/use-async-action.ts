"use client"

import * as React from "react"
import { toast } from "sonner"
import { toErrorMessage } from "@/lib/errors"

interface UseAsyncActionOptions<TArgs extends unknown[], TResult> {
  action: (...args: TArgs) => Promise<TResult>
  errorMessage?: string
  onError?: (error: unknown) => void
  onSuccess?: (result: TResult) => void
  successMessage?: string
}

export function useAsyncAction<TArgs extends unknown[], TResult>({
  action,
  errorMessage = "Request failed",
  onError,
  onSuccess,
  successMessage,
}: UseAsyncActionOptions<TArgs, TResult>) {
  const [pending, setPending] = React.useState(false)

  const run = React.useCallback(
    async (...args: TArgs) => {
      setPending(true)

      try {
        const result = await action(...args)
        if (successMessage) {
          toast.success(successMessage)
        }
        onSuccess?.(result)
        return result
      } catch (error) {
        toast.error(errorMessage, {
          description: toErrorMessage(error),
        })
        onError?.(error)
        throw error
      } finally {
        setPending(false)
      }
    },
    [action, errorMessage, onError, onSuccess, successMessage]
  )

  return { pending, run }
}
