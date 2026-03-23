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

  const candidate = window.localStorage
  if (
    candidate &&
    typeof candidate.getItem === "function" &&
    typeof candidate.setItem === "function" &&
    typeof candidate.removeItem === "function"
  ) {
    return {
      getItem: candidate.getItem.bind(candidate),
      removeItem: candidate.removeItem.bind(candidate),
      setItem: candidate.setItem.bind(candidate),
    }
  }

  return createMemoryStorage()
}

export function safeJsonStorage<Value>(): SyncStorage<Value> {
  return createJSONStorage<Value>(() => resolveStorage())
}
