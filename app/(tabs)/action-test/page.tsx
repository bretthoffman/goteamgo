"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import SageLogo from "@/app/components/SageLogo";

const ACTION_TEST_PASSWORD = "sage5180";
const ALL_VALUE = "__ALL__";

type ActionRecord = any;

export default function ActionTestPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [selectedEventPhase, setSelectedEventPhase] = useState<string | null>(
    null
  );
  const [selectedEventType, setSelectedEventType] = useState<string | null>(
    null
  );

  const [filteredActions, setFilteredActions] = useState<ActionRecord[]>([]);

  const actions = useQuery(api.actions.listAll) as ActionRecord[] | undefined;
  const updateAction = useMutation(api.actions.updateActionByActionId);

  const handlePasswordSubmit = () => {
    if (password === ACTION_TEST_PASSWORD) {
      setIsAuthenticated(true);
      setPassword("");
    } else {
      alert("Incorrect password");
      setPassword("");
    }
  };

  const handleModuleChange = (value: string | null) => {
    setSelectedModule(value);
    setSelectedWorkflow(null);
    setSelectedBlock(null);
    setSelectedEventPhase(null);
    setSelectedEventType(null);
  };

  const handleWorkflowChange = (value: string | null) => {
    setSelectedWorkflow(value);
    setSelectedBlock(null);
    setSelectedEventPhase(null);
    setSelectedEventType(null);
  };

  const handleBlockChange = (value: string | null) => {
    setSelectedBlock(value);
    setSelectedEventPhase(null);
    setSelectedEventType(null);
  };

  const handleEventPhaseChange = (value: string | null) => {
    setSelectedEventPhase(value);
    setSelectedEventType(null);
  };

  const handleEventTypeChange = (value: string | null) => {
    setSelectedEventType(value);
  };

  const hasAllSelections =
    selectedModule !== null &&
    selectedWorkflow !== null &&
    selectedBlock !== null &&
    selectedEventPhase !== null &&
    selectedEventType !== null;

  const baseActions = actions ?? [];
  const [hasPulled, setHasPulled] = useState(false);

  const filteredForModule = baseActions;

  const filteredForWorkflow = useMemo(() => {
    return filteredForModule.filter((a: any) => {
      if (!selectedModule || selectedModule === ALL_VALUE) return true;
      return a.module === selectedModule;
    });
  }, [filteredForModule, selectedModule]);

  const filteredForBlock = useMemo(() => {
    return filteredForWorkflow.filter((a: any) => {
      if (selectedWorkflow && selectedWorkflow !== ALL_VALUE) {
        return a.workflow === selectedWorkflow;
      }
      return true;
    });
  }, [filteredForWorkflow, selectedWorkflow]);

  const filteredForEventPhase = useMemo(() => {
    return filteredForBlock.filter((a: any) => {
      if (selectedBlock && selectedBlock !== ALL_VALUE) {
        return a.block === selectedBlock;
      }
      return true;
    });
  }, [filteredForBlock, selectedBlock]);

  const filteredForEventType = useMemo(() => {
    return filteredForEventPhase.filter((a: any) => {
      if (selectedEventPhase && selectedEventPhase !== ALL_VALUE) {
        return a.eventPhase === selectedEventPhase;
      }
      return true;
    });
  }, [filteredForEventPhase, selectedEventPhase]);

  const uniqueModules = useMemo(() => {
    const set = new Set<string>();
    filteredForModule.forEach((a: any) => {
      if (a.module) set.add(a.module);
    });
    return Array.from(set).sort();
  }, [filteredForModule]);

  const uniqueWorkflows = useMemo(() => {
    const set = new Set<string>();
    filteredForWorkflow.forEach((a: any) => {
      if (a.workflow) set.add(a.workflow);
    });
    return Array.from(set).sort();
  }, [filteredForWorkflow]);

  const uniqueBlocks = useMemo(() => {
    const set = new Set<string>();
    filteredForBlock.forEach((a: any) => {
      if (a.block) set.add(a.block);
    });
    return Array.from(set).sort();
  }, [filteredForBlock]);

  const uniqueEventPhases = useMemo(() => {
    const set = new Set<string>();
    filteredForEventPhase.forEach((a: any) => {
      if (a.eventPhase) set.add(a.eventPhase);
    });
    return Array.from(set).sort();
  }, [filteredForEventPhase]);

  const uniqueEventTypes = useMemo(() => {
    const set = new Set<string>();
    filteredForEventType.forEach((a: any) => {
      if (Array.isArray(a.eventTypes)) {
        a.eventTypes.forEach((et: string) => {
          if (et) set.add(et);
        });
      }
    });
    return Array.from(set).sort();
  }, [filteredForEventType]);

  const computeFiltered = (source: ActionRecord[]) => {
    return source.filter((a: any) => {
      if (selectedModule && selectedModule !== ALL_VALUE) {
        if (a.module !== selectedModule) return false;
      }
      if (selectedWorkflow && selectedWorkflow !== ALL_VALUE) {
        if (a.workflow !== selectedWorkflow) return false;
      }
      if (selectedBlock && selectedBlock !== ALL_VALUE) {
        if (a.block !== selectedBlock) return false;
      }
      if (selectedEventPhase && selectedEventPhase !== ALL_VALUE) {
        if (a.eventPhase !== selectedEventPhase) return false;
      }
      if (selectedEventType && selectedEventType !== ALL_VALUE) {
        if (!Array.isArray(a.eventTypes)) return false;
        if (!a.eventTypes.includes(selectedEventType)) return false;
      }
      return true;
    });
  };

  const handlePull = () => {
    if (!hasAllSelections) return;
    const next = computeFiltered(baseActions);
    setFilteredActions(next);
    setHasPulled(true);
  };

  const handleClear = () => {
    setSelectedModule(null);
    setSelectedWorkflow(null);
    setSelectedBlock(null);
    setSelectedEventPhase(null);
    setSelectedEventType(null);
    setFilteredActions([]);
    setHasPulled(false);
  };

  const [selectedForModal, setSelectedForModal] =
    useState<ActionRecord | null>(null);
  const [editingAction, setEditingAction] =
    useState<ActionRecord | null>(null);

  // When underlying actions change (e.g. after an edit), refresh results
  useEffect(() => {
    if (hasPulled && hasAllSelections) {
      const next = computeFiltered(baseActions);
      setFilteredActions(next);
    }
  }, [baseActions, hasPulled, hasAllSelections]);

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6"
        style={{ color: "#111" }}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 border border-gray-200">
          <div className="text-center mb-6">
            <div className="mx-auto mb-6 w-64">
              <SageLogo />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Welcome to SAGE
            </h1>
            <p className="text-gray-600">
              Enter password to access action test
            </p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
            placeholder="enter password"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
            autoFocus
          />
          <button
            onClick={handlePasswordSubmit}
            className="w-full bg-[#3C6577] text-white px-4 py-3 rounded-lg hover:bg-[#2D4D5C] transition-colors font-medium"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        padding: "24px",
        boxSizing: "border-box",
        fontFamily: "system-ui",
        background: "#0b0b0b",
        color: "white",
      }}
    >
      <h1
        style={{
          fontSize: 26,
          fontWeight: 900,
          marginBottom: 10,
          letterSpacing: 0.2,
        }}
      >
        Action Test
      </h1>

      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 10 }}>
        Filter and inspect actions from Convex.
      </div>

      <div
        style={{
          width: "100%",
          marginTop: 16,
          background: "#121212",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div
          style={{
            background: "#181818",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <Dropdown
              label="Module"
              options={uniqueModules}
              disabled={false}
              value={selectedModule}
              onChange={handleModuleChange}
            />
            <Dropdown
              label="Workflow"
              options={uniqueWorkflows}
              disabled={selectedModule === null}
              value={selectedWorkflow}
              onChange={handleWorkflowChange}
            />
            <Dropdown
              label="Block"
              options={uniqueBlocks}
              disabled={selectedWorkflow === null}
              value={selectedBlock}
              onChange={handleBlockChange}
            />
            <Dropdown
              label="Event Phase"
              options={uniqueEventPhases}
              disabled={selectedBlock === null}
              value={selectedEventPhase}
              onChange={handleEventPhaseChange}
            />
            <Dropdown
              label="Event Type"
              options={uniqueEventTypes}
              disabled={selectedEventPhase === null}
              value={selectedEventType}
              onChange={handleEventTypeChange}
            />
          </div>

          <div className="flex justify-end gap-3 mb-4">
            <button
              onClick={handleClear}
              className="px-4 py-2 rounded-lg border border-slate-500 text-slate-100 text-sm hover:bg-slate-700/40 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handlePull}
              disabled={!hasAllSelections}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                hasAllSelections
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-600 text-slate-300 cursor-not-allowed"
              }`}
            >
              Pull
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {filteredActions.length === 0 ? (
              <div className="text-sm text-slate-300">
                Choose your filters and click Pull to view matching actions.
              </div>
            ) : (
              filteredActions.map((action: any) => (
                <div
                  key={action._id ?? action.actionId}
                  className="border border-slate-700 rounded-lg p-4 bg-slate-900/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-sm truncate">
                      {action.name}
                    </div>
                    <button
                      onClick={() => setSelectedForModal(action)}
                      className="px-3 py-1 rounded-lg border border-slate-500 text-xs text-slate-100 hover:bg-slate-700/60 transition-colors whitespace-nowrap"
                    >
                      more info
                    </button>
                  </div>
                  {action.description && (
                    <div className="mt-1 text-xs text-slate-200">
                      {action.description}
                    </div>
                  )}
                  {Array.isArray(action.ownerRoles) &&
                    action.ownerRoles.length > 0 && (
                      <div className="mt-1 pl-4 text-[11px] text-slate-400">
                        {action.ownerRoles.join(", ")}
                      </div>
                    )}
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => setEditingAction(action)}
                      className="px-3 py-1 rounded-lg border border-slate-600 text-xs text-slate-100 hover:bg-slate-700/70 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedForModal && (
        <Modal onClose={() => setSelectedForModal(null)}>
          <ModalSection
            label="Action Inputs:"
            value={selectedForModal.inputs}
          />
          <ModalSection
            label="Action Outputs:"
            value={selectedForModal.outputs}
          />
          <ModalSection
            label="Optional Tools:"
            value={selectedForModal.toolsOptional}
          />
          <ModalSection
            label="Open Questions:"
            value={selectedForModal.openQuestions}
          />
        </Modal>
      )}

      {editingAction && (
        <EditActionModal
          action={editingAction}
          allActions={baseActions}
          onClose={() => setEditingAction(null)}
          onSaved={() => {
            setEditingAction(null);
            // results will refresh via useEffect when Convex data updates
          }}
          updateAction={updateAction}
        />
      )}
    </main>
  );
}

type DropdownProps = {
  label: string;
  options: string[];
  disabled: boolean;
  value: string | null;
  onChange: (value: string | null) => void;
};

function Dropdown({ label, options, disabled, value, onChange }: DropdownProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange(null);
    } else {
      onChange(raw);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-200">{label}</label>
      <select
        value={value ?? ""}
        onChange={handleChange}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
      >
        <option value="" disabled>
          Select...
        </option>
        <option value={ALL_VALUE}>All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

type ModalProps = {
  children: React.ReactNode;
  onClose: () => void;
};

function Modal({ children, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="relative max-w-lg w-full mx-4 rounded-lg bg-slate-950 border border-slate-700 p-5">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-xs px-2 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
        >
          X
        </button>
        <div className="space-y-4 text-sm text-slate-100">{children}</div>
      </div>
    </div>
  );
}

type ModalSectionProps = {
  label: string;
  value: any;
};

function ModalSection({ label, value }: ModalSectionProps) {
  const lines: string[] = [];

  if (Array.isArray(value)) {
    value.forEach((v) => {
      if (typeof v === "string" && v.trim().length > 0) {
        lines.push(v);
      }
    });
  } else if (typeof value === "string" && value.trim().length > 0) {
    lines.push(value);
  }

  return (
    <div>
      <div className="font-semibold mb-1">{label}</div>
      {lines.length > 0 && (
        <div className="pl-3 space-y-1">
          {lines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

type EditActionModalProps = {
  action: ActionRecord;
  allActions: ActionRecord[];
  onClose: () => void;
  onSaved: () => void;
  updateAction: (args: {
    actionId: string;
    name: string;
    description: string;
    block: string;
    eventPhase: string;
    eventTypes: string[];
    ownerRoles: string[];
  }) => Promise<unknown>;
};

function EditActionModal({
  action,
  allActions,
  onClose,
  onSaved,
  updateAction,
}: EditActionModalProps) {
  const original = useMemo(
    () => ({
      name: action.name || "",
      description: action.description || "",
      block: action.block || "",
      eventPhase: action.eventPhase || "",
      eventTypes: Array.isArray(action.eventTypes)
        ? [...action.eventTypes]
        : [],
      ownerRoles: Array.isArray(action.ownerRoles)
        ? [...action.ownerRoles]
        : [],
    }),
    [action]
  );

  const [name, setName] = useState(original.name);
  const [description, setDescription] = useState(original.description);
  const [block, setBlock] = useState(original.block);
  const [eventPhase, setEventPhase] = useState(original.eventPhase);
  const [eventTypes, setEventTypes] = useState<string[]>(original.eventTypes);
  const [ownerRoles, setOwnerRoles] = useState<string[]>(original.ownerRoles);

  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const [pendingRemoveOwner, setPendingRemoveOwner] = useState<string | null>(
    null
  );
  const [pendingRemoveEventType, setPendingRemoveEventType] = useState<
    string | null
  >(null);

  const [ownerSearchOpen, setOwnerSearchOpen] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [eventTypeSearchOpen, setEventTypeSearchOpen] = useState(false);
  const [eventTypeSearch, setEventTypeSearch] = useState("");

  const isDirty =
    name !== original.name ||
    description !== original.description ||
    block !== original.block ||
    eventPhase !== original.eventPhase ||
    JSON.stringify(eventTypes) !== JSON.stringify(original.eventTypes) ||
    JSON.stringify(ownerRoles) !== JSON.stringify(original.ownerRoles);

  const blockOptions = useMemo(() => {
    const set = new Set<string>();
    allActions.forEach((a: any) => {
      if (a.workflow === action.workflow && a.block) {
        set.add(a.block);
      }
    });
    return Array.from(set).sort();
  }, [allActions, action.workflow]);

  const allOwnerRoleOptions = useMemo(() => {
    const set = new Set<string>();
    allActions.forEach((a: any) => {
      if (Array.isArray(a.ownerRoles)) {
        a.ownerRoles.forEach((r: string) => {
          if (r) set.add(r);
        });
      }
    });
    return Array.from(set).sort();
  }, [allActions]);

  const allEventTypeOptions = useMemo(() => {
    const set = new Set<string>();
    allActions.forEach((a: any) => {
      if (Array.isArray(a.eventTypes)) {
        a.eventTypes.forEach((t: string) => {
          if (t) set.add(t);
        });
      }
    });
    return Array.from(set).sort();
  }, [allActions]);

  const allEventPhaseOptions = useMemo(() => {
    const set = new Set<string>();
    allActions.forEach((a: any) => {
      if (a.eventPhase) set.add(a.eventPhase);
    });
    return Array.from(set).sort();
  }, [allActions]);

  const filteredOwnerOptions = allOwnerRoleOptions.filter(
    (opt) =>
      !ownerRoles.includes(opt) &&
      opt.toLowerCase().includes(ownerSearch.toLowerCase())
  );

  const filteredEventTypeOptions = allEventTypeOptions.filter(
    (opt) =>
      !eventTypes.includes(opt) &&
      opt.toLowerCase().includes(eventTypeSearch.toLowerCase())
  );

  const requestClose = () => {
    if (!isDirty) {
      onClose();
    } else {
      setShowDiscardConfirm(true);
    }
  };

  const handleConfirmSave = async () => {
    if (!action.actionId) return;
    await updateAction({
      actionId: action.actionId,
      name,
      description,
      block,
      eventPhase,
      eventTypes,
      ownerRoles,
    });
    setShowSaveConfirm(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="relative max-w-3xl w-full mx-4 rounded-lg bg-slate-950 border border-slate-700 p-5">
        <button
          onClick={requestClose}
          className="absolute top-3 right-3 text-xs px-2 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
        >
          X
        </button>

        <div className="space-y-4 text-sm text-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Block */}
            <div>
              <div className="text-xs font-semibold mb-1">Block</div>
              <select
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
              >
                {blockOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Phase */}
            <div>
              <div className="text-xs font-semibold mb-1">Event Phase</div>
              <select
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={eventPhase}
                onChange={(e) => setEventPhase(e.target.value)}
              >
                {allEventPhaseOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Types */}
            <div>
              <div className="text-xs font-semibold mb-1">Event Types</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {eventTypes.map((t) => (
                  <div
                    key={t}
                    className="relative px-2 py-1 border border-slate-500 rounded-full text-xs flex items-center gap-2"
                  >
                    <span>{t}</span>
                    <button
                      className="text-[10px] text-red-400"
                      onClick={() => setPendingRemoveEventType(t)}
                    >
                      x
                    </button>
                  </div>
                ))}
                <button
                  className="w-7 h-7 border border-dashed border-slate-500 rounded flex items-center justify-center text-sm text-slate-200"
                  onClick={() => {
                    setEventTypeSearchOpen(true);
                    setEventTypeSearch("");
                  }}
                >
                  +
                </button>
              </div>
              {eventTypeSearchOpen && (
                <div className="mt-1 border border-slate-700 rounded-lg bg-slate-900 p-2 space-y-2">
                  <input
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs"
                    placeholder="Search event types..."
                    value={eventTypeSearch}
                    onChange={(e) => setEventTypeSearch(e.target.value)}
                    onBlur={() => {
                      // collapse on blur if nothing chosen
                      setEventTypeSearchOpen(false);
                    }}
                  />
                  <div className="max-h-40 overflow-y-auto text-xs">
                    {filteredEventTypeOptions.length === 0 ? (
                      <div className="text-slate-400">No matches found</div>
                    ) : (
                      filteredEventTypeOptions.map((opt) => (
                        <button
                          key={opt}
                          className="block w-full text-left px-2 py-1 rounded hover:bg-slate-800"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setEventTypes((prev) =>
                              prev.includes(opt) ? prev : [...prev, opt]
                            );
                            setEventTypeSearchOpen(false);
                            setEventTypeSearch("");
                          }}
                        >
                          {opt}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Name and Description */}
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold mb-1">Action Name</div>
              {editingName ? (
                <input
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  autoFocus
                />
              ) : (
                <button
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 hover:bg-slate-800"
                  onClick={() => setEditingName(true)}
                >
                  {name || <span className="text-slate-500">Click to edit</span>}
                </button>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold mb-1">
                Action Description
              </div>
              {editingDescription ? (
                <textarea
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm min-h-[80px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => setEditingDescription(false)}
                />
              ) : (
                <button
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 hover:bg-slate-800"
                  onClick={() => setEditingDescription(true)}
                >
                  {description || (
                    <span className="text-slate-500">Click to edit</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Owner Roles */}
          <div>
            <div className="text-xs font-semibold mb-1">Owner Roles</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {ownerRoles.map((r) => (
                <div
                  key={r}
                  className="relative px-2 py-1 border border-slate-500 rounded-full text-xs flex items-center gap-2"
                >
                  <span>{r}</span>
                  <button
                    className="text-[10px] text-red-400"
                    onClick={() => setPendingRemoveOwner(r)}
                  >
                    x
                  </button>
                </div>
              ))}
              <button
                className="w-7 h-7 border border-dashed border-slate-500 rounded flex items-center justify-center text-sm text-slate-200"
                onClick={() => {
                  setOwnerSearchOpen(true);
                  setOwnerSearch("");
                }}
              >
                +
              </button>
            </div>
            {ownerSearchOpen && (
              <div className="mt-1 border border-slate-700 rounded-lg bg-slate-900 p-2 space-y-2">
                <input
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs"
                  placeholder="Search owners..."
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                  onBlur={() => {
                    setOwnerSearchOpen(false);
                  }}
                />
                <div className="max-h-40 overflow-y-auto text-xs">
                  {filteredOwnerOptions.length === 0 ? (
                    <div className="text-slate-400">No matches found</div>
                  ) : (
                    filteredOwnerOptions.map((opt) => (
                      <button
                        key={opt}
                        className="block w-full text-left px-2 py-1 rounded hover:bg-slate-800"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setOwnerRoles((prev) =>
                            prev.includes(opt) ? prev : [...prev, opt]
                          );
                          setOwnerSearchOpen(false);
                          setOwnerSearch("");
                        }}
                      >
                        {opt}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom buttons */}
          <div className="flex justify-between items-center pt-2">
            <button
              className="px-4 py-2 rounded-lg border border-slate-600 text-sm text-slate-100 hover:bg-slate-800"
              onClick={requestClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white disabled:bg-slate-600 disabled:text-slate-300"
              onClick={() => setShowSaveConfirm(true)}
              disabled={!isDirty}
            >
              Confirm Changes
            </button>
          </div>
        </div>

        {/* Discard confirmation */}
        {showDiscardConfirm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 max-w-sm w-full space-y-3 text-sm">
              <div>Discard unsaved changes?</div>
              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-1 rounded-lg border border-slate-600 text-slate-100 text-xs"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  No
                </button>
                <button
                  className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700"
                  onClick={onClose}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save confirmation */}
        {showSaveConfirm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 max-w-sm w-full space-y-3 text-sm">
              <div>Are you sure you want to confirm these changes?</div>
              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-1 rounded-lg border border-slate-600 text-slate-100 text-xs"
                  onClick={() => setShowSaveConfirm(false)}
                >
                  No
                </button>
                <button
                  className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700"
                  onClick={handleConfirmSave}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Owner delete confirmation */}
        {pendingRemoveOwner && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 max-w-sm w-full space-y-3 text-sm">
              <div>Are you sure you want to delete this owner?</div>
              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-1 rounded-lg border border-slate-600 text-slate-100 text-xs"
                  onClick={() => setPendingRemoveOwner(null)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700"
                  onClick={() => {
                    setOwnerRoles((prev) =>
                      prev.filter((r) => r !== pendingRemoveOwner)
                    );
                    setPendingRemoveOwner(null);
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event type delete confirmation */}
        {pendingRemoveEventType && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 max-w-sm w-full space-y-3 text-sm">
              <div>Are you sure you want to delete this event type?</div>
              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-1 rounded-lg border border-slate-600 text-slate-100 text-xs"
                  onClick={() => setPendingRemoveEventType(null)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700"
                  onClick={() => {
                    setEventTypes((prev) =>
                      prev.filter((t) => t !== pendingRemoveEventType)
                    );
                    setPendingRemoveEventType(null);
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


