import { describe, expect, it } from "vitest"
import {
  buildDocumentQueryString,
  filterParamsFromSavedView,
  type FilterParams,
} from "@/lib/api"

// Helper to parse a query string into a URLSearchParams-like map
function parseQs(qs: string) {
  return Object.fromEntries(new URLSearchParams(qs).entries())
}

describe("buildDocumentQueryString", () => {
  it("always includes page and page_size", () => {
    const qs = buildDocumentQueryString(1, 25, {})
    const params = parseQs(qs)
    expect(params.page).toBe("1")
    expect(params.page_size).toBe("25")
  })

  it("includes full-text search filters", () => {
    const params = parseQs(
      buildDocumentQueryString(1, 10, {
        query: "invoice",
        titleContains: "Q1",
        contentContains: "total",
        titleContentContains: "2024",
        moreLikeId: 42,
      })
    )
    expect(params.query).toBe("invoice")
    expect(params.title__icontains).toBe("Q1")
    expect(params.content__icontains).toBe("total")
    expect(params.title_content).toBe("2024")
    expect(params.more_like_id).toBe("42")
  })

  it("includes correspondent filters", () => {
    const params = parseQs(
      buildDocumentQueryString(1, 10, {
        correspondent: 5,
        correspondentAny: [1, 2],
        correspondentNone: [3],
      })
    )
    expect(params.correspondent__id).toBe("5")
    expect(params.correspondent__id__in).toBe("1,2")
    expect(params.correspondent__id__none).toBe("3")
  })

  it("includes document type filters", () => {
    const params = parseQs(
      buildDocumentQueryString(1, 10, {
        documentType: 7,
        documentTypeAny: [8, 9],
        documentTypeNone: [10],
      })
    )
    expect(params.document_type__id).toBe("7")
    expect(params.document_type__id__in).toBe("8,9")
    expect(params.document_type__id__none).toBe("10")
  })

  it("includes storage path filters", () => {
    const params = parseQs(
      buildDocumentQueryString(1, 10, {
        storagePath: 3,
        storagePathAny: [4, 5],
        storagePathNone: [6],
      })
    )
    expect(params.storage_path__id).toBe("3")
    expect(params.storage_path__id__in).toBe("4,5")
    expect(params.storage_path__id__none).toBe("6")
  })

  it("includes tag filters", () => {
    const params = parseQs(
      buildDocumentQueryString(1, 10, {
        tags: [1, 2, 3],
        tagsAny: [4],
        tagsExclude: [5, 6],
        hasTag: true,
        isInInbox: false,
      })
    )
    expect(params.tags__id__all).toBe("1,2,3")
    expect(params.tags__id__in).toBe("4")
    expect(params.tags__id__none).toBe("5,6")
    expect(params.is_tagged).toBe("true")
    expect(params.is_in_inbox).toBe("false")
  })

  it("includes date filters", () => {
    const params = parseQs(
      buildDocumentQueryString(1, 10, {
        createdAfter: "2024-01-01",
        createdBefore: "2024-12-31",
        createdYear: 2024,
        createdMonth: 6,
        createdDay: 15,
        addedAfter: "2024-03-01",
        addedBefore: "2024-09-30",
      })
    )
    expect(params.created__date__gt).toBe("2024-01-01")
    expect(params.created__date__lt).toBe("2024-12-31")
    expect(params.created__year).toBe("2024")
    expect(params.created__month).toBe("6")
    expect(params.created__day).toBe("15")
    expect(params.added__date__gt).toBe("2024-03-01")
    expect(params.added__date__lt).toBe("2024-09-30")
  })

  it("includes ASN filters", () => {
    const params = parseQs(
      buildDocumentQueryString(1, 10, {
        asnGte: 100,
        asnLte: 200,
        asnIsNull: true,
      })
    )
    expect(params.archive_serial_number__gte).toBe("100")
    expect(params.archive_serial_number__lte).toBe("200")
    expect(params.archive_serial_number__isnull).toBe("true")
  })

  it("includes ordering and custom field filters", () => {
    const params = parseQs(
      buildDocumentQueryString(1, 10, {
        ordering: "-created",
        customFieldQuery: 'field:"value"',
        customFieldsContain: "keyword",
      })
    )
    expect(params.ordering).toBe("-created")
    expect(params.custom_field_query).toBe('field:"value"')
    expect(params.custom_fields__icontains).toBe("keyword")
  })

  it("includes ownership filters", () => {
    const params = parseQs(
      buildDocumentQueryString(1, 10, {
        owner: 1,
        ownerAny: [2, 3],
        ownerExclude: [4],
        ownerIsNull: true,
        sharedByUser: 5,
      })
    )
    expect(params.owner__id).toBe("1")
    expect(params.owner__id__in).toBe("2,3")
    expect(params.owner__id__none).toBe("4")
    expect(params.owner__isnull).toBe("true")
    expect(params.shared_by__id).toBe("5")
  })

  it("sets owner__isnull to 'false' explicitly", () => {
    const params = parseQs(
      buildDocumentQueryString(1, 10, { ownerIsNull: false })
    )
    expect(params.owner__isnull).toBe("false")
  })

  it("omits filters that are empty arrays", () => {
    const qs = buildDocumentQueryString(1, 10, {
      tags: [],
      correspondentAny: [],
    })
    expect(qs).not.toContain("tags__id__all")
    expect(qs).not.toContain("correspondent__id__in")
  })

  it("omits filters that are undefined", () => {
    const qs = buildDocumentQueryString(1, 10, { query: undefined })
    expect(qs).not.toContain("query=")
  })
})

describe("filterParamsFromSavedView", () => {
  it("returns empty params for a view with no rules", () => {
    expect(filterParamsFromSavedView({})).toEqual({})
  })

  it("converts sort_field and sort_reverse into ordering", () => {
    expect(
      filterParamsFromSavedView({
        sort_field: "created",
        sort_reverse: false,
      })
    ).toEqual({ ordering: "created" })

    expect(
      filterParamsFromSavedView({
        sort_field: "created",
        sort_reverse: true,
      })
    ).toEqual({ ordering: "-created" })
  })

  it("maps text filter rules (title, content, query)", () => {
    const params = filterParamsFromSavedView({
      filter_rules: [
        { rule_type: 0, value: "invoice" },
        { rule_type: 1, value: "total" },
        { rule_type: 19, value: "2024 Q1" },
        { rule_type: 20, value: "search term" },
      ],
    })
    expect(params.titleContains).toBe("invoice")
    expect(params.contentContains).toBe("total")
    expect(params.titleContentContains).toBe("2024 Q1")
    expect(params.query).toBe("search term")
  })

  it("maps more_like_id rule", () => {
    const params = filterParamsFromSavedView({
      filter_rules: [{ rule_type: 21, value: 42 }],
    })
    expect(params.moreLikeId).toBe(42)
  })

  it("maps correspondent rules (single, any, none)", () => {
    const params = filterParamsFromSavedView({
      filter_rules: [
        { rule_type: 3, value: 5 },
        { rule_type: 26, value: 1 },
        { rule_type: 26, value: 2 },
        { rule_type: 27, value: 3 },
      ],
    })
    expect(params.correspondent).toBe(5)
    expect(params.correspondentAny).toEqual([1, 2])
    expect(params.correspondentNone).toEqual([3])
  })

  it("maps document type rules (single, any, none)", () => {
    const params = filterParamsFromSavedView({
      filter_rules: [
        { rule_type: 4, value: 7 },
        { rule_type: 28, value: 8 },
        { rule_type: 29, value: 9 },
      ],
    })
    expect(params.documentType).toBe(7)
    expect(params.documentTypeAny).toEqual([8])
    expect(params.documentTypeNone).toEqual([9])
  })

  it("maps storage path rules (single, any, none)", () => {
    const params = filterParamsFromSavedView({
      filter_rules: [
        { rule_type: 25, value: 10 },
        { rule_type: 30, value: 11 },
        { rule_type: 31, value: 12 },
      ],
    })
    expect(params.storagePath).toBe(10)
    expect(params.storagePathAny).toEqual([11])
    expect(params.storagePathNone).toEqual([12])
  })

  it("maps tag rules (all, any, exclude)", () => {
    const params = filterParamsFromSavedView({
      filter_rules: [
        { rule_type: 6, value: 1 },
        { rule_type: 6, value: 2 },
        { rule_type: 22, value: 3 },
        { rule_type: 17, value: 4 },
      ],
    })
    expect(params.tags).toEqual([1, 2])
    expect(params.tagsAny).toEqual([3])
    expect(params.tagsExclude).toEqual([4])
  })

  it("maps hasTag and isInInbox rules", () => {
    const params = filterParamsFromSavedView({
      filter_rules: [
        { rule_type: 7, value: "true" },
        { rule_type: 5, value: "true" },
      ],
    })
    expect(params.hasTag).toBe(true)
    expect(params.isInInbox).toBe(true)
  })

  it("sets hasTag to false when value is 'false'", () => {
    const params = filterParamsFromSavedView({
      filter_rules: [{ rule_type: 7, value: "false" }],
    })
    expect(params.hasTag).toBe(false)
  })

  it("maps ASN rules", () => {
    const params = filterParamsFromSavedView({
      filter_rules: [
        { rule_type: 23, value: 100 },
        { rule_type: 24, value: 200 },
        { rule_type: 18, value: "true" },
      ],
    })
    expect(params.asnGte).toBe(100)
    expect(params.asnLte).toBe(200)
    expect(params.asnIsNull).toBe(true)
  })

  it("maps date rules (created and added)", () => {
    const params = filterParamsFromSavedView({
      filter_rules: [
        { rule_type: 8, value: "2024-12-31" },
        { rule_type: 9, value: "2024-01-01" },
        { rule_type: 10, value: 2024 },
        { rule_type: 11, value: 6 },
        { rule_type: 12, value: 15 },
        { rule_type: 13, value: "2024-06-30" },
        { rule_type: 14, value: "2024-03-01" },
      ],
    })
    expect(params.createdBefore).toBe("2024-12-31")
    expect(params.createdAfter).toBe("2024-01-01")
    expect(params.createdYear).toBe(2024)
    expect(params.createdMonth).toBe(6)
    expect(params.createdDay).toBe(15)
    expect(params.addedBefore).toBe("2024-06-30")
    expect(params.addedAfter).toBe("2024-03-01")
  })

  it("maps alternate date rule types (43, 44, 45, 46)", () => {
    const params = filterParamsFromSavedView({
      filter_rules: [
        { rule_type: 43, value: "2025-01-01" },
        { rule_type: 44, value: "2025-06-01" },
        { rule_type: 45, value: "2025-12-31" },
        { rule_type: 46, value: "2025-07-01" },
      ],
    })
    expect(params.createdBefore).toBe("2025-01-01")
    expect(params.createdAfter).toBe("2025-06-01")
    expect(params.addedBefore).toBe("2025-12-31")
    expect(params.addedAfter).toBe("2025-07-01")
  })

  it("maps custom field rules", () => {
    const params = filterParamsFromSavedView({
      filter_rules: [
        { rule_type: 36, value: "keyword" },
        { rule_type: 42, value: 'field:"value"' },
      ],
    })
    expect(params.customFieldsContain).toBe("keyword")
    expect(params.customFieldQuery).toBe('field:"value"')
  })

  it("maps ownership rules", () => {
    const params = filterParamsFromSavedView({
      filter_rules: [
        { rule_type: 32, value: 1 },
        { rule_type: 33, value: 2 },
        { rule_type: 33, value: 3 },
        { rule_type: 34, value: "true" },
        { rule_type: 35, value: 4 },
        { rule_type: 37, value: 5 },
      ],
    })
    expect(params.owner).toBe(1)
    expect(params.ownerAny).toEqual([2, 3])
    expect(params.ownerIsNull).toBe(true)
    expect(params.ownerExclude).toEqual([4])
    expect(params.sharedByUser).toBe(5)
  })

  it("ignores unknown rule types", () => {
    const params = filterParamsFromSavedView({
      filter_rules: [{ rule_type: 999, value: "unknown" }],
    })
    expect(params).toEqual({})
  })

  it("handles null value in filter rules gracefully", () => {
    const params = filterParamsFromSavedView({
      filter_rules: [{ rule_type: 0, value: null }],
    })
    expect(params.titleContains).toBeUndefined()
  })
})
