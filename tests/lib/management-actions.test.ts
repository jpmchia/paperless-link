import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock next-auth, next/cache, and auth before importing the module under test
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))
vi.mock("@/auth", () => ({
  authOptions: {},
}))

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import {
  createTag,
  updateTag,
  deleteTag,
  createCorrespondent,
  updateCorrespondent,
  deleteCorrespondent,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
  createStoragePath,
  updateStoragePath,
  deleteStoragePath,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  updateSavedViewMeta,
  deleteSavedViewManagement,
} from "@/lib/management-actions"

const mockSession = { accessToken: "test-token-123" }

describe("management actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: "test" }),
        text: () => Promise.resolve("OK"),
      })
    )
  })

  it("throws when no session token is available", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    await expect(createTag({ name: "test" })).rejects.toThrow("Unauthorized")
  })

  describe("tags", () => {
    it("createTag posts to tags/ and revalidates", async () => {
      await createTag({ name: "Important", color: "#ff0000" })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/tags/"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Important", color: "#ff0000" }),
        })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/tags")
    })

    it("updateTag patches tags/{id}/ and revalidates", async () => {
      await updateTag(5, { name: "Urgent" })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/tags/5/"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ name: "Urgent" }),
        })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/tags")
    })

    it("deleteTag sends DELETE and revalidates", async () => {
      await deleteTag(5)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/tags/5/"),
        expect.objectContaining({ method: "DELETE" })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/tags")
    })
  })

  describe("correspondents", () => {
    it("createCorrespondent posts and revalidates", async () => {
      await createCorrespondent({ name: "ACME Corp" })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/correspondents/"),
        expect.objectContaining({ method: "POST" })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/correspondents")
    })

    it("updateCorrespondent patches and revalidates", async () => {
      await updateCorrespondent(3, { name: "ACME Inc" })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/correspondents/3/"),
        expect.objectContaining({ method: "PATCH" })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/correspondents")
    })

    it("deleteCorrespondent sends DELETE and revalidates", async () => {
      await deleteCorrespondent(3)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/correspondents/3/"),
        expect.objectContaining({ method: "DELETE" })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/correspondents")
    })
  })

  describe("document types", () => {
    it("createDocumentType posts and revalidates", async () => {
      await createDocumentType({ name: "Invoice" })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/document_types/"),
        expect.objectContaining({ method: "POST" })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/document-types")
    })

    it("updateDocumentType patches and revalidates", async () => {
      await updateDocumentType(2, { name: "Receipt" })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/document_types/2/"),
        expect.objectContaining({ method: "PATCH" })
      )
    })

    it("deleteDocumentType sends DELETE and revalidates", async () => {
      await deleteDocumentType(2)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/document_types/2/"),
        expect.objectContaining({ method: "DELETE" })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/document-types")
    })
  })

  describe("storage paths", () => {
    it("createStoragePath posts and revalidates", async () => {
      await createStoragePath({ name: "Archive", path: "/archive/" })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/storage_paths/"),
        expect.objectContaining({ method: "POST" })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/storage-paths")
    })

    it("updateStoragePath patches and revalidates", async () => {
      await updateStoragePath(4, { name: "Backup" })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/storage_paths/4/"),
        expect.objectContaining({ method: "PATCH" })
      )
    })

    it("deleteStoragePath sends DELETE and revalidates", async () => {
      await deleteStoragePath(4)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/storage_paths/4/"),
        expect.objectContaining({ method: "DELETE" })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/storage-paths")
    })
  })

  describe("custom fields", () => {
    it("createCustomField posts and revalidates", async () => {
      await createCustomField({ name: "Priority", data_type: "select" })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/custom_fields/"),
        expect.objectContaining({ method: "POST" })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/custom-fields")
    })

    it("updateCustomField patches and revalidates", async () => {
      await updateCustomField(6, { name: "Urgency" })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/custom_fields/6/"),
        expect.objectContaining({ method: "PATCH" })
      )
    })

    it("deleteCustomField sends DELETE and revalidates", async () => {
      await deleteCustomField(6)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/custom_fields/6/"),
        expect.objectContaining({ method: "DELETE" })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/custom-fields")
    })
  })

  describe("saved views", () => {
    it("updateSavedViewMeta patches and revalidates both paths", async () => {
      await updateSavedViewMeta(10, { name: "My View" })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/saved_views/10/"),
        expect.objectContaining({ method: "PATCH" })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/savedviews")
      expect(revalidatePath).toHaveBeenCalledWith("/view/10")
    })

    it("deleteSavedViewManagement sends DELETE and revalidates", async () => {
      await deleteSavedViewManagement(10)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/saved_views/10/"),
        expect.objectContaining({ method: "DELETE" })
      )
      expect(revalidatePath).toHaveBeenCalledWith("/savedviews")
      expect(revalidatePath).toHaveBeenCalledWith("/documents")
    })
  })

  it("throws when the API returns an error response", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      text: () => Promise.resolve("Not Found"),
      statusText: "Not Found",
    } as Response)

    await expect(createTag({ name: "fail" })).rejects.toThrow(
      /API POST tags\/ failed/
    )
  })

  it("sends Authorization header with the session token", async () => {
    await createTag({ name: "auth-test" })

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Token test-token-123",
        }),
      })
    )
  })
})
