"use client"

import { createJSONStorage, type SyncStorage } from "jotai/utils"

const memoryStorage = new Map<string, string>()

function createMemoryStorage(): Storage {
  return {
    get length() {
      return memoryStorage.size
    },
    clear() {
      memoryStorage.clear()
    },
    getItem(key: string) {
      return memoryStorage.get(key) ?? null
    },
    key(index: number) {
      return Array.from(memoryStorage.keys())[index] ?? null
    },
    removeItem(key: string) {
      memoryStorage.delete(key)
    },
    setItem(key: string, value: string) {
      memoryStorage.set(key, value)
    },
  }
}

function resolveStorage(): Storage {
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
    return candidate
  }

  return createMemoryStorage()
}

export const safeJsonStorage = createJSONStorage(() => resolveStorage()) as SyncStorage<unknown>
