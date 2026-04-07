import { beforeEach, describe, expect, it, vi } from "vitest"

const { invokeLinkIQAction } = vi.hoisted(() => ({
  invokeLinkIQAction: vi.fn(),
}))

vi.mock("@/lib/link-iq", () => ({
  invokeLinkIQAction,
}))

import {
  isManagedTaxonomyNodeTypeQualifier,
  listTaxonomyNodeTypes,
  saveTaxonomyNodeTypes,
} from "@/lib/taxonomy-node-types"

describe("taxonomy node type configuration", () => {
  beforeEach(() => {
    invokeLinkIQAction.mockReset()
  })

  it("identifies managed taxonomy node type qualifiers", () => {
    expect(
      isManagedTaxonomyNodeTypeQualifier({
        qualifier_id: "system.taxonomy-node-type:0001:document-type",
      })
    ).toBe(true)

    expect(
      isManagedTaxonomyNodeTypeQualifier({
        qualifier_id: "custom:document-type",
      })
    ).toBe(false)
  })

  it("lists configured taxonomy node types from qualifiers", async () => {
    invokeLinkIQAction.mockResolvedValue({
      qualifiers: [
        {
          qualifier_id: "system.taxonomy-node-type:0002:document-type",
          label: "Document Type",
        },
        {
          qualifier_id: "system.taxonomy-node-type:0001:business-area",
          label: "Business Area",
        },
        {
          qualifier_id: "custom:ignore-me",
          label: "Ignore me",
        },
      ],
    })

    await expect(listTaxonomyNodeTypes()).resolves.toEqual([
      "Business Area",
      "Document Type",
    ])
    expect(invokeLinkIQAction).toHaveBeenCalledWith({
      capability: "qualifier.list",
      input: {
        status: "active",
      },
    })
  })

  it("saves normalized taxonomy node type qualifiers", async () => {
    invokeLinkIQAction.mockResolvedValueOnce({
      qualifiers: [
        {
          qualifier_id: "system.taxonomy-node-type:0001:business-area",
          label: "Business Area",
          name: "business-area",
          source_scope: "link_global",
          status: "active",
        },
      ],
    })
    invokeLinkIQAction.mockResolvedValue({})

    await expect(
      saveTaxonomyNodeTypes([
        " Business Area ",
        "Document Type",
        "document type",
      ])
    ).resolves.toEqual(["Business Area", "Document Type"])

    expect(invokeLinkIQAction).toHaveBeenNthCalledWith(1, {
      capability: "qualifier.list",
      input: {
        status: "all",
      },
    })
    expect(invokeLinkIQAction).toHaveBeenNthCalledWith(2, {
      capability: "qualifier.upsert",
      input: {
        qualifier_id: "system.taxonomy-node-type:0001:business-area",
        label: "Business Area",
        name: "business-area",
        description: "System-managed taxonomy node type option.",
        source_scope: "link_global",
        status: "active",
      },
    })
    expect(invokeLinkIQAction).toHaveBeenNthCalledWith(3, {
      capability: "qualifier.upsert",
      input: {
        qualifier_id: "system.taxonomy-node-type:0002:document-type",
        label: "Document Type",
        name: "document-type",
        description: "System-managed taxonomy node type option.",
        source_scope: "link_global",
        status: "active",
      },
    })
  })
})
