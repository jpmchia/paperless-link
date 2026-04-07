import { describe, expect, it } from "vitest"

import {
  allowsExistingDuplicateLabel,
  findDuplicateModelLabel,
} from "@/lib/ai-models"
import type { AIModel } from "@/lib/link-iq-types"

const MODELS: AIModel[] = [
  {
    model_id: "model-1",
    provider_id: "provider-a",
    label: "GPT-4o Production",
    model_name: "gpt-4o",
    model_type: "completion",
    status: "active",
  },
  {
    model_id: "model-2",
    provider_id: "provider-a",
    label: "GPT-4o Draft",
    model_name: "gpt-4o",
    model_type: "completion",
    status: "active",
  },
  {
    model_id: "model-3",
    provider_id: "provider-b",
    label: "GPT-4o Production",
    model_name: "gpt-4o",
    model_type: "completion",
    status: "active",
  },
]

describe("findDuplicateModelLabel", () => {
  it("finds duplicates within the same provider case-insensitively", () => {
    expect(
      findDuplicateModelLabel(
        MODELS,
        "provider-a",
        "  gpt-4o production  "
      )?.model_id
    ).toBe("model-1")
  })

  it("ignores the currently edited model", () => {
    expect(
      findDuplicateModelLabel(
        MODELS,
        "provider-a",
        "GPT-4o Production",
        "model-1"
      )
    ).toBeNull()
  })

  it("allows the same label under a different provider", () => {
    expect(
      findDuplicateModelLabel(MODELS, "provider-b", "GPT-4o Draft")
    ).toBeNull()
  })

  it("allows unchanged labels on an existing persisted model", () => {
    expect(
      allowsExistingDuplicateLabel(MODELS[0], "  gpt-4o production ")
    ).toBe(true)
  })

  it("does not allow changed labels to bypass duplicate validation", () => {
    expect(
      allowsExistingDuplicateLabel(MODELS[0], "GPT-4o Draft")
    ).toBe(false)
  })
})
