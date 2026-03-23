import { describe, expect, it } from "vitest"
import { createStore } from "jotai"
import {
  activeRealtimeTasksAtom,
  upsertRealtimeTaskAtom,
  removeRealtimeTaskAtom,
} from "@/lib/stores/realtime"

describe("realtime store atoms", () => {
  describe("upsertRealtimeTaskAtom", () => {
    it("adds a new task to the active tasks map", () => {
      const store = createStore()

      store.set(upsertRealtimeTaskAtom, {
        taskId: "task-1",
        filename: "doc.pdf",
        status: "WORKING",
        currentProgress: 50,
        maxProgress: 100,
      })

      const tasks = store.get(activeRealtimeTasksAtom)
      expect(tasks["task-1"]).toEqual(
        expect.objectContaining({
          taskId: "task-1",
          filename: "doc.pdf",
          status: "WORKING",
          currentProgress: 50,
          maxProgress: 100,
          updatedAt: expect.any(String),
        })
      )
    })

    it("updates an existing task", () => {
      const store = createStore()

      store.set(upsertRealtimeTaskAtom, {
        taskId: "task-1",
        status: "WORKING",
        currentProgress: 20,
        maxProgress: 100,
      })

      store.set(upsertRealtimeTaskAtom, {
        taskId: "task-1",
        status: "WORKING",
        currentProgress: 80,
        maxProgress: 100,
      })

      const tasks = store.get(activeRealtimeTasksAtom)
      expect(tasks["task-1"].currentProgress).toBe(80)
    })

    it("tracks multiple tasks simultaneously", () => {
      const store = createStore()

      store.set(upsertRealtimeTaskAtom, {
        taskId: "task-a",
        status: "WORKING",
      })
      store.set(upsertRealtimeTaskAtom, {
        taskId: "task-b",
        status: "STARTED",
      })

      const tasks = store.get(activeRealtimeTasksAtom)
      expect(Object.keys(tasks)).toHaveLength(2)
      expect(tasks["task-a"].status).toBe("WORKING")
      expect(tasks["task-b"].status).toBe("STARTED")
    })

    it("sets updatedAt to a valid ISO timestamp", () => {
      const store = createStore()

      store.set(upsertRealtimeTaskAtom, {
        taskId: "task-1",
        status: "WORKING",
      })

      const tasks = store.get(activeRealtimeTasksAtom)
      const timestamp = new Date(tasks["task-1"].updatedAt).getTime()
      expect(Number.isNaN(timestamp)).toBe(false)
    })
  })

  describe("removeRealtimeTaskAtom", () => {
    it("removes an existing task", () => {
      const store = createStore()

      store.set(upsertRealtimeTaskAtom, {
        taskId: "task-1",
        status: "WORKING",
      })
      store.set(upsertRealtimeTaskAtom, {
        taskId: "task-2",
        status: "STARTED",
      })

      store.set(removeRealtimeTaskAtom, "task-1")

      const tasks = store.get(activeRealtimeTasksAtom)
      expect(tasks["task-1"]).toBeUndefined()
      expect(tasks["task-2"]).toBeDefined()
    })

    it("is a no-op when taskId is null", () => {
      const store = createStore()

      store.set(upsertRealtimeTaskAtom, {
        taskId: "task-1",
        status: "WORKING",
      })
      store.set(removeRealtimeTaskAtom, null)

      const tasks = store.get(activeRealtimeTasksAtom)
      expect(Object.keys(tasks)).toHaveLength(1)
    })

    it("is a no-op when taskId is undefined", () => {
      const store = createStore()

      store.set(upsertRealtimeTaskAtom, {
        taskId: "task-1",
        status: "WORKING",
      })
      store.set(removeRealtimeTaskAtom, undefined)

      const tasks = store.get(activeRealtimeTasksAtom)
      expect(Object.keys(tasks)).toHaveLength(1)
    })

    it("is a no-op when the taskId does not exist", () => {
      const store = createStore()

      store.set(upsertRealtimeTaskAtom, {
        taskId: "task-1",
        status: "WORKING",
      })
      store.set(removeRealtimeTaskAtom, "nonexistent")

      const tasks = store.get(activeRealtimeTasksAtom)
      expect(Object.keys(tasks)).toHaveLength(1)
    })
  })
})
