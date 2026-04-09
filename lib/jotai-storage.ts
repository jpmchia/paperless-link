"use client"

import { createJSONStorage } from "jotai/utils"
import type {
  SyncStorage,
  SyncStringStorage,
} from "jotai/vanilla/utils/atomWithStorage"

const memoryStorage = new Map<string, string>()

function createMemoryStorage(): SyncStringStorage {
  return {
    getItem(key: string) {
      return memoryStorage.get(key) ?? null
    },
    removeItem(key: string) {
      memoryStorage.delete(key)
    },
    setItem(key: string, value: string) {
      memoryStorage.set(key, value)
    },
  }
}

function resolveStorage(): SyncStringStorage {
  if (typeof window === "undefined") {
    return createMemoryStorage()
  }

  let candidate: Storage | null = null
  try {
    candidate = window.localStorage
  } catch {
    return createMemoryStorage()
  }
  if (
    candidate &&
    typeof candidate.getItem === "function" &&
    typeof candidate.setItem === "function" &&
    typeof candidate.removeItem === "function"
  ) {
    return {
      getItem: (key: string) => {
        try {
          return candidate.getItem(key)
        } catch {
          return null
        }
      },
      removeItem: (key: string) => {
        try {
          candidate.removeItem(key)
        } catch {
          // Ignore storage failures in restricted contexts.
        }
      },
      setItem: (key: string, value: string) => {
        try {
          candidate.setItem(key, value)
        } catch {
          // Ignore storage failures in restricted contexts.
        }
      },
    }
  }

  return createMemoryStorage()
}

export function safeJsonStorage<Value>(): SyncStorage<Value> {
  return createJSONStorage<Value>(() => resolveStorage())
}
