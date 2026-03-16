import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  actions: defineTable({
    moduleId: v.string(),
    workflowId: v.string(),
    blockId: v.string(),
    actionId: v.string(),

    module: v.string(),
    workflow: v.string(),
    block: v.string(),
    name: v.string(),
    description: v.string(),

    eventPhase: v.string(),
    eventTypes: v.array(v.string()),
    ownerRoles: v.array(v.string()),
    inputs: v.array(v.string()),
    outputs: v.array(v.string()),
    toolsOptional: v.array(v.string()),
    openQuestions: v.array(v.string()),
    categoryTags: v.array(v.string()),

    sourceTitle: v.optional(v.string()),
    docFingerprint: v.optional(v.string()),
    rowFingerprint: v.optional(v.string()),
  })
    .index("by_action_id", ["actionId"])
    .index("by_module", ["moduleId"])
    .index("by_workflow", ["workflowId"])
    .index("by_block", ["blockId"])
    .index("by_phase", ["eventPhase"]),
});
