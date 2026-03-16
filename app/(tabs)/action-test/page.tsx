"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
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

  const handlePull = () => {
    if (!hasAllSelections) return;

    const next = baseActions.filter((a: any) => {
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

    setFilteredActions(next);
  };

  const handleClear = () => {
    setSelectedModule(null);
    setSelectedWorkflow(null);
    setSelectedBlock(null);
    setSelectedEventPhase(null);
    setSelectedEventType(null);
    setFilteredActions([]);
  };

  const [selectedForModal, setSelectedForModal] =
    useState<ActionRecord | null>(null);

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

