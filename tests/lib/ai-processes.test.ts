import { describe, expect, it } from "vitest"

import {
  buildAIProcessUpsertInput,
  buildBusinessContextToken,
  normalizeAIProcessAllocation,
} from "@/lib/ai-processes"
import type { AIProcessConfig, ContextField } from "@/lib/link-iq-types"

describe("AI process save payloads", () => {
  it("always includes a business_context map for template validation", () => {
    const process: AIProcessConfig = {
      process_key: "taxonomy.description",
      section: "taxonomy",
      label: "Taxonomy Description",
      prompt_template:
        'Node: {{ .label }} {{ index .business_context "organisation_name" }}',
      status: "active",
    }

    expect(buildAIProcessUpsertInput(process, [])).toEqual({
      ...process,
      default_model_id: "",
      fallback_model_id: "",
      available_model_ids: [],
      model_id: "",
      prompt_template: `Node: {{ .label }} ${buildBusinessContextToken("organisation_name")}`,
      business_context: {},
    })
  })

  it("hydrates the business_context map from configured fields", () => {
    const process: AIProcessConfig = {
      process_key: "taxonomy.description",
      section: "taxonomy",
      label: "Taxonomy Description",
      prompt_template:
        'Node: {{ .label }} {{ index .business_context "organisation_name" }}',
      status: "active",
    }
    const fields: ContextField[] = [
      {
        field_id: "org-name",
        section: "business_context",
        scope: "system",
        key: "organisation_name",
        label: "Organisation name",
        field_mode: "text",
        data_type: "string",
        value: "Acme plc",
        status: "active",
      },
      {
        field_id: "industry",
        section: "business_context",
        scope: "system",
        key: "industry",
        label: "Industry",
        field_mode: "text",
        data_type: "string",
        sample_values: ["Manufacturing"],
        status: "active",
      },
    ]

    expect(buildAIProcessUpsertInput(process, fields)).toEqual({
      ...process,
      default_model_id: "",
      fallback_model_id: "",
      available_model_ids: [],
      model_id: "",
      prompt_template: `Node: {{ .label }} ${buildBusinessContextToken("organisation_name")}`,
      business_context: {
        industry: "Manufacturing",
        organisation_name: "Acme plc",
      },
    })
  })

  it("preserves already-safe business context lookups", () => {
    const process: AIProcessConfig = {
      process_key: "taxonomy.description",
      section: "taxonomy",
      label: "Taxonomy Description",
      prompt_template: `Node: {{ .label }} ${buildBusinessContextToken("organisation_name")}`,
      status: "active",
    }

    expect(buildAIProcessUpsertInput(process, [])).toEqual({
      ...process,
      default_model_id: "",
      fallback_model_id: "",
      available_model_ids: [],
      model_id: "",
      business_context: {},
    })
  })

  it("normalizes richer process allocations and syncs model_id to default_model_id", () => {
    const process: AIProcessConfig = {
      process_key: "taxonomy.description",
      section: "taxonomy",
      label: "Taxonomy Description",
      default_model_id: "model-default",
      fallback_model_id: "model-default",
      available_model_ids: [
        "model-available",
        "model-default",
        "model-available",
      ],
      prompt_template: "Example",
      status: "active",
    }

    expect(normalizeAIProcessAllocation(process)).toEqual({
      ...process,
      default_model_id: "model-default",
      fallback_model_id: "",
      available_model_ids: ["model-available"],
      model_id: "model-default",
    })
  })
})
