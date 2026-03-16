import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("actions").collect();
  },
});

export const getByActionId = query({
  args: { actionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("actions")
      .withIndex("by_action_id", (q) => q.eq("actionId", args.actionId))
      .unique();
  },
});

export const getByWorkflow = query({
  args: { workflowId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("actions")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();
  },
});

export const getByBlock = query({
  args: { blockId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("actions")
      .withIndex("by_block", (q) => q.eq("blockId", args.blockId))
      .collect();
  },
});

export const getByPhase = query({
  args: { eventPhase: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("actions")
      .withIndex("by_phase", (q) => q.eq("eventPhase", args.eventPhase))
      .collect();
  },
});

export const updateActionByActionId = mutation({
  args: {
    actionId: v.string(),
    name: v.string(),
    description: v.string(),
    block: v.string(),
    eventPhase: v.string(),
    eventTypes: v.array(v.string()),
    ownerRoles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { actionId, ...fields } = args;

    const existing = await ctx.db
      .query("actions")
      .withIndex("by_action_id", (q) => q.eq("actionId", actionId))
      .unique();

    if (!existing?._id) {
      throw new Error("Action not found");
    }

    await ctx.db.patch(existing._id, fields);
  },
});
