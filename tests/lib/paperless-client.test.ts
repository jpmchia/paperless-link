import { describe, expect, it, vi } from "vitest"
import { getJson, patchJson, withQuery } from "@/lib/paperless-client"

describe("paperless-client", () => {
  it("builds query strings without nullish params", () => {
    expect(
      withQuery("/api/tasks", {
        acknowledged: false,
        page: 2,
        q: null,
      })
    ).toBe("/api/tasks?acknowledged=false&page=2")
  })

  it("adds JSON headers and serializes object bodies", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    )

    const data = await patchJson<{ ok: boolean }>("/api/example", { foo: "bar" })

    expect(data.ok).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/example",
      expect.objectContaining({
        body: JSON.stringify({ foo: "bar" }),
        method: "PATCH",
      })
    )

    fetchSpy.mockRestore()
  })

  it("parses JSON responses", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ result: [1, 2, 3] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    )

    const data = await getJson<{ result: number[] }>("/api/tasks")
    expect(data.result).toEqual([1, 2, 3])

    fetchSpy.mockRestore()
  })
})
