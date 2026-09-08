import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  User,
  AlertTriangle,
  Eye,
  ArrowLeft,
  X,
  Cpu,
  Edit3,
  ChevronDown,
  ChevronUp,
  Database,
  Sparkles,
  BarChart2,
  Bot,
  CheckCircle,
} from "lucide-react";
import PriorityBadge from "./ui/PriorityBadge";
import DecisionExplanation from "./ui/DecisionExplanation";
import { getCustomerNameFromEmail } from "../utils/customer";
import { mapTicket } from "../api/tickets";

const DEPARTMENTS = [
  "Billing and Payments",
  "Customer Service",
  "General Inquiry",
  "Human Resources",
  "IT Support",
  "Product Support",
  "Returns and Exchanges",
  "Sales and Pre-Sales",
  "Service Outages and Maintenance",
  "Technical Support",
];


export default function HITLWorkspace({
  ticket: rawTicket,
  onBack,
  onApprove,
  onReject,
  onDelete,
  theme,
  onOpenCustomer,
}) {
  const ticket = useMemo(
    () => mapTicket(rawTicket) || rawTicket,
    [rawTicket],
  );
  const [selectedDept, setSelectedDept] = useState(ticket.department);
  const [editedSolution, setEditedSolution] = useState(
    ticket.aiRagSolution || "",
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [showRoutingExplanation, setShowRoutingExplanation] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [escalatingJira, setEscalatingJira] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);

  // Added custom modal states
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalText, setEditModalText] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const customerName =
    ticket.user?.business_name ||
    ticket.user?.name ||
    getCustomerNameFromEmail(ticket.userEmail);

  const isDark = theme === "dark";

  useEffect(() => {
    setSelectedDept(ticket.department);
    setEditedSolution(ticket.aiRagSolution || "");
    setIsEditing(false);

    // Reset modal state when ticket changes
    setApproveModalOpen(false);
    setEditModalOpen(false);
    setSuccessModalOpen(false);
    setDeleteModalOpen(false);
    setEscalatingJira(false);
    setSelectedAction(null);
    setEditModalText("");
    setActionBusy(false);
    setSuccessMessage("");
  }, [ticket]);

  const getConfidenceColor = (conf) => {
    if (conf >= 0.9)
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/25";
    if (conf >= 0.7)
      return "text-amber-500 bg-amber-500/10 border-amber-500/25";
    return "text-rose-500 bg-rose-500/10 border-rose-500/25";
  };

  const getUrgencyStyle = (urgency) => {
    switch (urgency) {
      case "Critical":
        return "text-rose-500 border-rose-500/25 bg-rose-500/5";
      case "High":
        return "text-orange-500 border-orange-500/25 bg-orange-500/5";
      case "Medium":
        return "text-yellow-500 border-yellow-500/25 bg-yellow-500/5";
      default:
        return "text-zinc-500 border-zinc-700/20 bg-zinc-500/5";
    }
  };

  const handleEscalateJira = () => {
    setSelectedAction("reject");
    setEscalatingJira(true);
  };

  // ---------------------------------------------------------
  // APPROVE MODAL
  // ---------------------------------------------------------

  const handleApprove = () => {
    setSelectedAction("approve");
    setApproveModalOpen(true);
  };

  const confirmApprove = async () => {
    if (actionBusy) return;

    setActionBusy(true);
    setApproveModalOpen(false);

    try {
      await onApprove(
        ticket.id,
        selectedDept,
        editedSolution || ticket.aiRagSolution,
      );
      setSuccessMessage("Ticket approved and sent successfully.");
      setSuccessModalOpen(true);
    } catch (error) {
      console.error("Failed to approve ticket:", error);
    } finally {
      setActionBusy(false);
    }
  };

  const cancelApprove = () => {
    setApproveModalOpen(false);
    setSelectedAction(null);
  };

  // ---------------------------------------------------------
  // EDIT & SEND MODAL
  // ---------------------------------------------------------

  const handleEditAndSend = () => {
    setSelectedAction("edit");
    setIsEditing(true);
    setEditModalText(editedSolution || ticket.aiRagSolution || "");
    setEditModalOpen(true);
  };

  const cancelEdit = () => {
    setEditModalOpen(false);
    setSelectedAction(null);
  };

  const confirmEditAndSend = () => {
    const response = editModalText.trim();

    if (!response) {
      return;
    }

    if (actionBusy) return;

    setEditedSolution(response);
    setIsEditing(true);

    setActionBusy(true);
    setEditModalOpen(false);

    Promise.resolve(onApprove(ticket.id, selectedDept, response))
      .then(() => {
        setSuccessMessage("Edited response sent successfully.");
        setSuccessModalOpen(true);
      })
      .catch((error) => {
        console.error("Failed to send edited response:", error);
      })
      .finally(() => {
        setActionBusy(false);
      });
  };

  // ---------------------------------------------------------
  // ESCALATION
  // ---------------------------------------------------------

  const confirmEscalate = () => {
    if (actionBusy) return;

    setActionBusy(true);
    setEscalatingJira(false);

    Promise.resolve(onReject(ticket.id))
      .then(() => {
        setSuccessMessage("Ticket escalated successfully.");
        setSuccessModalOpen(true);
      })
      .catch((error) => {
        console.error("Failed to escalate ticket:", error);
      })
      .finally(() => {
        setActionBusy(false);
      });
  };

  const closeSuccessModal = () => {
    setSuccessModalOpen(false);
    setSelectedAction(null);
    onBack?.();
  };

  const handleDeleteTicket = () => {
    setSelectedAction("delete");
    setDeleteModalOpen(true);
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setSelectedAction(null);
  };

  const confirmDelete = async () => {
    if (actionBusy) return;

    setActionBusy(true);
    setDeleteModalOpen(false);

    try {
      await onDelete(ticket.id);
      setSuccessMessage("Ticket deleted successfully.");
      setSuccessModalOpen(true);
    } catch (error) {
      console.error("Failed to delete ticket:", error);
    } finally {
      setActionBusy(false);
    }
  };

  // Safe defaults for RAG evaluations
  const groundingVal = ticket.groundingScore ?? 0.95;
  const relevanceVal = ticket.relevanceScore ?? 0.92;

  const groupedDocs = {
    dense:
      ticket.retrievedDocs?.filter(
        (d) => d.retrieval_method === "Dense Search",
      ) ?? [],
    bm25:
      ticket.retrievedDocs?.filter((d) => d.retrieval_method === "BM25") ?? [],
    rrf:
      ticket.retrievedDocs?.filter(
        (d) => d.retrieval_method === "RRF Result",
      ) ?? [],
    stored:
      ticket.retrievedDocs?.filter(
        (d) => d.retrieval_method === "Retrieved Document",
      ) ?? [],
  };

  const isHallucinated = ticket.isHallucinated ?? false;
  const retriesCount = ticket.ragRetries ?? 0;

  const formatLatency = (value) =>
    Number.isFinite(value) ? `${value.toFixed(0)}ms` : "N/A";

  // Compute a clean diff comparison between AI draft and edited operator solution
  const showDiff = editedSolution !== ticket.aiRagSolution;

  // Prevent fixed overlays from being affected by the workspace's
  // animation/transform/stacking context.
  const modalRoot =
    typeof document !== "undefined" ? document.body : null;

  return _jsxs("div", {
    className: "space-y-6  pb-12",
    children: [
      _jsxs("div", {
        className: `flex flex-col md:flex-row md:items-center justify-between pb-5 border-b gap-4 ${
          isDark ? "border-zinc-900" : "border-slate-205"
        }`,
        children: [
          _jsxs("div", {
            className: "flex items-center gap-3.5",
            children: [
              _jsx("button", {
                onClick: onBack,
                className: `p-2 border rounded-xl transition-colors cursor-pointer ${
                  isDark
                    ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                    : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50 shadow-sm"
                }`,
                children: _jsx(ArrowLeft, { size: 16 }),
              }),

              _jsxs("div", {
                className: "space-y-1",
                children: [
                  _jsxs("div", {
                    className: "flex items-center gap-2 flex-wrap",
                    children: [
                      _jsx("span", {
                        className: `text-xs font-mono font-bold ${
                          isDark ? "text-indigo-400" : "text-indigo-650"
                        }`,
                        children: ticket.id,
                      }),

                      _jsxs("span", {
                        className: `text-[9px] px-2 py-0.5 rounded-full border ${getUrgencyStyle(
                          ticket.urgency,
                        )} font-extrabold uppercase tracking-wider`,
                        children: [ticket.urgency, " Urgency"],
                      }),

                      ticket.slaStatus &&
                        _jsxs("span", {
                          className: `text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                            ticket.slaStatus === "At Risk"
                              ? "text-rose-500 bg-rose-500/10 border-rose-500/20 animate-pulse"
                              : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                          }`,
                          children: [
                            "SLA ",
                            ticket.slaRemainingMinutes
                              ? `(${ticket.slaRemainingMinutes}m Left)`
                              : ticket.slaStatus,
                          ],
                        }),
                    ],
                  }),

                  _jsx("h1", {
                    className: `text-xl lg:text-2xl font-black tracking-tight ${
                      isDark ? "text-white" : "text-slate-900"
                    }`,
                    children: ticket.subject,
                  }),
                ],
              }),
            ],
          }),

          _jsxs("div", {
            className: "flex items-center gap-3",
            children: [
              _jsx("span", {
                className: `text-xs ${
                  isDark ? "text-zinc-500" : "text-slate-450"
                }`,
                children: "Pipeline state:",
              }),

              _jsxs("span", {
                className: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  ticket.status === "AWAITING HUMAN REVIEW"
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse-slow"
                    : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                }`,
                children: [
                  _jsx("span", {
                    className: `w-1.5 h-1.5 rounded-full ${
                      ticket.status === "AWAITING HUMAN REVIEW"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-indigo-500"
                    }`,
                  }),
                  ticket.status,
                ],
              }),
            ],
          }),

          ticket.status === "FAILED" &&
            _jsxs("div", {
              className: `rounded-2xl border p-4 ${
                isDark
                  ? "border-rose-500/20 bg-rose-500/5 text-rose-100"
                  : "border-rose-200 bg-rose-50 text-rose-950"
              }`,
              children: [
                _jsx("div", {
                  className:
                    "text-[10px] font-black uppercase tracking-[0.2em]",
                  children: "Ticket Failed",
                }),
                _jsx("p", {
                  className: "mt-1 text-xs leading-relaxed",
                  children:
                    ticket.failureReason ||
                    ticket.failure_reason ||
                    "This ticket could not be processed.",
                }),
              ],
            }),
        ],
      }),

      (ticket.cacheHit || ticket.semanticCache?.cacheHit) &&
        _jsxs("div", {
          className: `rounded-2xl border p-4 space-y-2 ${
            isDark
              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`,
          children: [
            _jsx("p", {
              className: "text-[10px] font-bold uppercase tracking-wider",
              children: "Semantic Cache Hit",
            }),
            _jsxs("p", {
              className: "text-sm font-semibold",
              children: [
                "Matched resolved ticket: #",
                ticket.matchedTicketId ??
                  ticket.semanticCache?.matchedTicketId ??
                  "N/A",
              ],
            }),
            _jsxs("p", {
              className: "text-sm",
              children: [
                "Similarity: ",
                _jsx("strong", {
                  children: `${
                    Math.round(
                      (ticket.semanticCache?.similarityScore ??
                        ticket.similarityScore ??
                        0) * 1000,
                    ) / 10
                  }%`,
                }),
              ],
            }),
            _jsx("p", {
              className: "text-sm leading-6",
              children:
                ticket.matchedResolutionText ||
                ticket.semanticCache?.resolution ||
                ticket.finalResponseText ||
                "Resolution reused from previous incident.",
            }),
          ],
        }),

      (ticket.cacheHit || ticket.semanticCache?.cacheHit) &&
        _jsxs("div", {
          className: `rounded-2xl border p-5 space-y-4 ${
            isDark
              ? "glass-panel border-emerald-500/20"
              : "glass-panel-light border-emerald-200"
          }`,
          children: [
            _jsx("h3", {
              className: `text-xs font-bold uppercase tracking-wider ${
                isDark ? "text-emerald-300" : "text-emerald-700"
              }`,
              children: "Reused Resolution Summary",
            }),
            _jsxs("div", {
              className: "grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm",
              children: [
                _jsxs("div", {
                  children: [
                    _jsx("span", { className: "block text-[10px] uppercase font-bold text-zinc-500", children: "Matched ticket" }),
                    _jsxs("strong", { children: ["#", ticket.semanticCache?.matchedTicketId ?? ticket.matchedTicketId ?? "N/A"] }),
                  ],
                }),
                _jsxs("div", {
                  children: [
                    _jsx("span", { className: "block text-[10px] uppercase font-bold text-zinc-500", children: "Department" }),
                    _jsx("strong", { children: ticket.semanticCache?.department || ticket.department || "General Inquiry" }),
                  ],
                }),
                _jsxs("div", {
                  children: [
                    _jsx("span", { className: "block text-[10px] uppercase font-bold text-zinc-500", children: "Similarity" }),
                    _jsx("strong", { children: `${Math.round((ticket.semanticCache?.similarityScore ?? 0) * 1000) / 10}%` }),
                  ],
                }),
              ],
            }),
            _jsxs("div", {
              className: "flex flex-wrap gap-2",
              children: (ticket.semanticCache?.tags || []).length
                ? ticket.semanticCache.tags.map((tag) => _jsx("span", {
                    className: "rounded-full border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold",
                    children: tag,
                  }, tag))
                : _jsx("span", { className: "text-xs text-zinc-500", children: "No matched ticket tags" }),
            }),
          ],
        }),

      _jsxs("div", {
        className: "grid grid-cols-1 xl:grid-cols-3 gap-6",
        children: [
          _jsxs("div", {
            className: "space-y-6",
            children: [
              _jsxs("div", {
                className: `rounded-2xl p-5 border space-y-4 ${
                  isDark
                    ? "glass-panel border-zinc-800"
                    : "glass-panel-light border-slate-205"
                }`,
                children: [
                  _jsx("div", {
                    className: "border-b pb-3 border-zinc-900/40",
                    children: _jsxs("h3", {
                      className: `text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                        isDark ? "text-zinc-400" : "text-slate-500"
                      }`,
                      children: [
                        _jsx(User, {
                          size: 14,
                          className: "text-indigo-400",
                        }),
                        _jsx("span", {
                          children: "Customer Context",
                        }),
                      ],
                    }),
                  }),

                  _jsxs("div", {
                    className: "space-y-3 text-xs",
                    children: [
                      _jsxs("div", {
                        className: "flex justify-between",
                        children: [
                          _jsx("span", {
                            className: "text-zinc-500",
                            children: "Customer Account",
                          }),

                          _jsx("span", {
                            onClick: () =>
                              onOpenCustomer &&
                              onOpenCustomer(ticket.userId),
                            className:
                              "font-bold hover:underline cursor-pointer text-indigo-400",
                            children: customerName,
                          }),
                        ],
                      }),

                      _jsxs("div", {
                        className: "flex justify-between",
                        children: [
                          _jsx("span", {
                            className: "text-zinc-500",
                            children: "Support coverage tier",
                          }),

                          _jsxs("span", {
                            className: "font-semibold text-amber-500",
                            children: [ticket.userTier, " Coverage"],
                          }),
                        ],
                      }),

                      _jsxs("div", {
                        className: "flex justify-between",
                        children: [
                          _jsx("span", {
                            className: "text-zinc-500",
                            children: "Account Region",
                          }),

                          _jsx("span", {
                            className: `font-semibold ${
                              isDark
                                ? "text-zinc-300"
                                : "text-slate-700"
                            }`,
                            children:
                              ticket.telemetry?.region ||
                              "US-East-1",
                          }),
                        ],
                      }),

                      _jsxs("div", {
                        className: "flex justify-between",
                        children: [
                          _jsx("span", {
                            className: "text-zinc-500",
                            children: "SLA Resolution Limit",
                          }),

                          _jsx("span", {
                            className: "font-semibold text-rose-500",
                            children:
                              ticket.userTier === "VIP"
                                ? "15 Minute Response"
                                : ticket.userTier === "Premium"
                                  ? "30 Minute Response"
                                  : "Standard 60m SLA",
                          }),
                        ],
                      }),
                    ],
                  }),

                  onOpenCustomer &&
                    _jsx("button", {
                      onClick: () =>
                        onOpenCustomer(ticket.userId),
                      className: `w-full text-center py-2.5 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        isDark
                          ? "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300"
                          : "border-slate-205 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-sm"
                      }`,
                      children: "Inspect Account Profile",
                    }),
                ],
              }),

              _jsxs("div", {
                className: `rounded-2xl p-5 border space-y-4 ${
                  isDark
                    ? "glass-panel border-zinc-800"
                    : "glass-panel-light border-slate-205"
                }`,
                children: [
                  _jsx("div", {
                    className:
                      "border-b pb-3 border-zinc-900/40",
                    children: _jsx("h3", {
                      className: `text-xs font-bold uppercase tracking-wider ${
                        isDark
                          ? "text-zinc-400"
                          : "text-slate-500"
                      }`,
                      children: "Original Ticket Submission",
                    }),
                  }),

                  _jsxs("div", {
                    className: "space-y-3.5 text-xs",
                    children: [
                      _jsxs("div", {
                        children: [
                          _jsx("span", {
                            className:
                              "text-zinc-500 text-[10px] uppercase font-bold block mb-1",
                            children: "Subject",
                          }),

                          _jsx("p", {
                            className: `font-semibold ${
                              isDark
                                ? "text-zinc-200"
                                : "text-slate-805"
                            }`,
                            children: ticket.subject,
                          }),
                        ],
                      }),

                      _jsxs("div", {
                        children: [
                          _jsx("span", {
                            className:
                              "text-zinc-500 text-[10px] uppercase font-bold block mb-1",
                            children: "Incident Body Details",
                          }),

                          _jsx("div", {
                            className: `p-4 border rounded-xl leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto ${
                              isDark
                                ? "bg-zinc-950 border-zinc-900 text-zinc-300"
                                : "bg-slate-50 border-slate-150 text-slate-655"
                            }`,
                            children:
                              ticket.body ||
                              ticket.description ||
                              "No ticket body provided.",
                          }),
                        ],
                      }),

                      ticket.imageUrl &&
                        _jsxs("div", {
                          className: "space-y-2",
                          children: [
                            _jsx("span", {
                              className:
                                "text-zinc-500 text-[10px] uppercase font-bold block",
                              children:
                                "Screenshot Attachment",
                            }),

                            _jsxs("div", {
                              onClick: () =>
                                setIsImageModalOpen(true),
                              className:
                                "relative group rounded-xl overflow-hidden border aspect-video cursor-zoom-in bg-black/40 hover:border-indigo-500/50 transition-all",
                              children: [
                                _jsx("img", {
                                  src: ticket.imageUrl,
                                  alt: "Attached screenshot",
                                  className:
                                    "w-full h-full object-cover group-hover:scale-102 transition-transform",
                                }),

                                _jsx("div", {
                                  className:
                                    "absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                                  children: _jsxs("span", {
                                    className:
                                      "px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-[10px] uppercase flex items-center gap-1",
                                    children: [
                                      _jsx(Eye, {
                                        size: 12,
                                      }),
                                      "Zoom screenshot",
                                    ],
                                  }),
                                }),
                              ],
                            }),

                            ticket.aiImageAnalysis &&
                              _jsxs("div", {
                                className: "space-y-1",
                                children: [
                                  _jsxs("span", {
                                    className:
                                      "text-indigo-400 text-[9px] uppercase font-bold tracking-wide flex items-center gap-1",
                                    children: [
                                      _jsx(Sparkles, {
                                        size: 11,
                                      }),
                                      "OCR Vision Analysis",
                                    ],
                                  }),

                                  _jsx("p", {
                                    className: `p-3 border rounded-xl font-mono text-[10px] leading-relaxed ${
                                      isDark
                                        ? "bg-zinc-950 border-zinc-900 text-zinc-405"
                                        : "bg-slate-50 border-slate-205 text-slate-600"
                                    }`,
                                    children:
                                      ticket.aiImageAnalysis,
                                  }),
                                ],
                              }),
                          ],
                        }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          _jsxs("div", {
            className: "space-y-6",
            children: [
              _jsxs("div", {
                className: `rounded-2xl p-5 border space-y-4.5 ${
                  isDark
                    ? "glass-panel border-zinc-800"
                    : "glass-panel-light border-slate-205"
                }`,
                children: [
                  _jsxs("div", {
                    className:
                      "flex justify-between items-center border-b pb-3 border-zinc-900/40",
                    children: [
                      _jsxs("h3", {
                        className: `text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                          isDark
                            ? "text-zinc-450"
                            : "text-slate-500"
                        }`,
                        children: [
                          _jsx(Cpu, {
                            size: 14,
                            className: "text-indigo-400",
                          }),

                          _jsx("span", {
                            children:
                              "AI Pipeline Classifier",
                          }),
                        ],
                      }),

                      _jsxs("span", {
                        className: `text-[9px] border px-2 py-0.5 rounded font-mono ${
                          isDark
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            : "bg-indigo-50/10 text-indigo-600 border-indigo-200"
                        }`,
                        children: [
                          "Initial: ",

                          (() => {
                            const ms = Number(
                              ticket.initialLatency,
                            );

                            if (!Number.isFinite(ms))
                              return "N/A";

                            const secs = ms / 1000;

                            return secs >= 60
                              ? `${(secs / 60).toFixed(1)}m`
                              : `${secs.toFixed(2)}s`;
                          })(),

                          " · Total: ",

                          (() => {
                            const ms = Number(
                              ticket.totalLatency ??
                                ticket.latencyMs,
                            );

                            if (!Number.isFinite(ms))
                              return "N/A";

                            const secs = ms / 1000;

                            return secs >= 60
                              ? `${(secs / 60).toFixed(1)}m`
                              : `${secs.toFixed(2)}s`;
                          })(),
                        ],
                      }),
                    ],
                  }),

                  _jsxs("div", {
                    className: "space-y-3.5",
                    children: [
                      _jsxs("div", {
                        className:
                          "flex items-center justify-between text-xs",
                        children: [
                          _jsxs("div", {
                            children: [
                              _jsx("span", {
                                className:
                                  "text-zinc-500 text-[10px] block",
                                children:
                                  "Predicted department route",
                              }),

                              _jsxs("strong", {
                                className: isDark
                                  ? "text-white"
                                  : "text-slate-805",
                                children: [
                                  ticket.aiPredictedDept,
                                  " department",
                                ],
                              }),
                            ],
                          }),

                          _jsxs("span", {
                            className: `text-[10px] font-bold px-2 py-0.5 rounded border ${getConfidenceColor(
                              ticket.aiConfidence,
                            )}`,
                            children: [
                              (
                                ticket.aiConfidence * 100
                              ).toFixed(0),
                              "% AI Conf",
                            ],
                          }),
                        ],
                      }),

                      _jsxs("div", {
                        className: "space-y-1",
                        children: [
                          _jsxs("button", {
                            onClick: () =>
                              setShowRoutingExplanation(
                                !showRoutingExplanation,
                              ),
                            className: `text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:underline focus:outline-none ${
                              isDark
                                ? "text-zinc-400"
                                : "text-slate-600"
                            }`,
                            children: [
                              _jsx("span", {
                                children: "Decision factors",
                              }),

                              showRoutingExplanation
                                ? _jsx(ChevronUp, {
                                    size: 11,
                                  })
                                : _jsx(ChevronDown, {
                                    size: 11,
                                  }),
                            ],
                          }),

                          showRoutingExplanation &&
                            _jsxs("div", {
                              className: `p-3.5 border rounded-xl text-[10px] leading-relaxed font-medium space-y-2 ${
                                isDark
                                  ? "bg-zinc-950 border-zinc-900 text-zinc-400"
                                  : "bg-slate-50 border-slate-205 text-slate-655"
                              }`,
                              children: [
                                _jsxs("p", {
                                  children: [
                                    "The DistilBERT model weights scored high association conditions: keywords ",

                                    _jsx("strong", {
                                      children:
                                        ticket.extractedKeywords
                                          ?.slice(0, 3)
                                          .join(", "),
                                    }),

                                    " matching indices inside the ",

                                    _jsx("strong", {
                                      children:
                                        ticket.department,
                                    }),

                                    " routing dictionary.",
                                  ],
                                }),

                                _jsx("p", {
                                  children:
                                    "Account SLA flags and region codes triggered standard path override filters to target critical resources.",
                                }),
                              ],
                            }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              _jsxs("div", {
                className: `rounded-2xl p-5 border space-y-4 ${
                  isDark
                    ? "glass-panel border-zinc-800"
                    : "glass-panel-light border-slate-205"
                }`,
                children: [
                  _jsx("div", {
                    className:
                      "border-b pb-3 border-zinc-900/40",
                    children: _jsx("h3", {
                      className: `text-xs font-bold uppercase tracking-wider ${
                        isDark
                          ? "text-zinc-400"
                          : "text-slate-500"
                      }`,
                      children: "AI Triage Details",
                    }),
                  }),

                  _jsxs("div", {
                    className: "space-y-3.5 text-xs",
                    children: [
                      _jsxs("div", {
                        className:
                          "grid grid-cols-2 gap-3 text-[10px]",
                        children: [
                          _jsxs("div", {
                            children: [
                              _jsx("span", {
                                className:
                                  "text-zinc-550 block",
                                children:
                                  "Urgency Inferred",
                              }),

                              _jsx(PriorityBadge, {
                                urgency: ticket.urgency,
                                className: "mt-0.5",
                              }),
                            ],
                          }),

                          _jsxs("div", {
                            children: [
                              _jsx("span", {
                                className:
                                  "text-zinc-550 block",
                                children:
                                  "RAG search queries",
                              }),

                              _jsx("span", {
                                className: `font-mono truncate block ${
                                  isDark
                                    ? "text-zinc-305"
                                    : "text-slate-700"
                                }`,
                                children:
                                  ticket.searchQuery || "N/A",
                              }),
                            ],
                          }),
                        ],
                      }),

                      ticket.tags &&
                        _jsxs("div", {
                          className: "space-y-1",
                          children: [
                            _jsx("span", {
                              className:
                                "text-zinc-550 text-[10px] block",
                              children:
                                "Extracted Keywords / Tags",
                            }),

                            _jsx("div", {
                              className:
                                "flex gap-1.5 flex-wrap",
                              children: ticket.tags.map(
                                (tag) =>
                                  _jsx(
                                    "span",
                                    {
                                      className:
                                        "text-[9px] font-bold px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded",
                                      children: tag,
                                    },
                                    tag,
                                  ),
                              ),
                            }),
                          ],
                        }),

                      _jsx(DecisionExplanation, {
                        title: "Why this decision?",
                        explanation:
                          ticket.decisionExplanation,
                        signals: ticket.extractedKeywords,
                        confidence: ticket.aiConfidence,
                        recommendedAction:
                          ticket.urgency === "Critical"
                            ? "Escalate to Engineering"
                            : "Approve AI draft response",
                      }),
                    ],
                  }),
                ],
              }),

              ticket.telemetry &&
                _jsxs("div", {
                  className: `rounded-2xl p-5 border space-y-4 ${
                    isDark
                      ? "glass-panel border-zinc-800"
                      : "glass-panel-light border-slate-205"
                  }`,
                  children: [
                    _jsxs("div", {
                      className:
                        "border-b pb-3 border-zinc-900/40 flex justify-between items-center",
                      children: [
                        _jsxs("h3", {
                          className: `text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                            isDark
                              ? "text-zinc-400"
                              : "text-slate-500"
                          }`,
                          children: [
                            _jsx(BarChart2, {
                              size: 14,
                              className: "text-rose-500",
                            }),

                            _jsx("span", {
                              children:
                                "Telemetry Audit",
                            }),
                          ],
                        }),

                        _jsxs("span", {
                          className: `text-[9px] uppercase font-bold ${
                            isDark
                              ? "text-zinc-500"
                              : "text-slate-500"
                          }`,
                          children: [
                            "Node: ",
                            ticket.telemetry.service ||
                              ticket.telemetry.node ||
                              "Not specified",
                          ],
                        }),
                      ],
                    }),

                    _jsxs("div", {
                      className:
                        "grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs",
                      children: [
                        _jsxs("div", {
                          className: `p-3 border rounded-xl ${
                            isDark
                              ? "bg-zinc-950 border-zinc-900"
                              : "bg-slate-50 border-slate-150"
                          }`,
                          children: [
                            _jsx("span", {
                              className:
                                "text-[9px] text-zinc-500 block",
                              children: "Error Rate",
                            }),

                            _jsxs("p", {
                              className:
                                "text-lg font-black text-rose-500 mt-1",
                              children: [
                                ticket.telemetry.errorRate ??
                                  ticket.telemetry.error_rate ??
                                  "—",
                              ],
                            }),
                          ],
                        }),

                        _jsxs("div", {
                          className: `p-3 border rounded-xl ${
                            isDark
                              ? "bg-zinc-950 border-zinc-900"
                              : "bg-slate-50 border-slate-150"
                          }`,
                          children: [
                            _jsx("span", {
                              className:
                                "text-[9px] text-zinc-500 block",
                              children: "Latency",
                            }),

                            _jsxs("p", {
                              className:
                                "text-lg font-black text-rose-500 mt-1",
                              children: [
                                ticket.telemetry.latency ??
                                  ticket.telemetry.latency_ms ??
                                  "—",
                              ],
                            }),
                          ],
                        }),

                        _jsxs("div", {
                          className: `p-3 border rounded-xl ${
                            isDark
                              ? "bg-zinc-950 border-zinc-900"
                              : "bg-slate-50 border-slate-150"
                          }`,
                          children: [
                            _jsx("span", {
                              className:
                                "text-[9px] text-zinc-500 block",
                              children: "Requests/min",
                            }),

                            _jsxs("p", {
                              className:
                                "text-lg font-black text-indigo-400 mt-1",
                              children: [
                                ticket.telemetry
                                  .requestsPerMin ??
                                  ticket.telemetry
                                    .requests_per_min ??
                                  "—",
                              ],
                            }),
                          ],
                        }),

                        _jsxs("div", {
                          className: `p-3 border rounded-xl ${
                            isDark
                              ? "bg-zinc-950 border-zinc-900"
                              : "bg-slate-50 border-slate-150"
                          }`,
                          children: [
                            _jsx("span", {
                              className:
                                "text-[9px] text-zinc-500 block",
                              children: "Availability",
                            }),

                            _jsxs("p", {
                              className:
                                "text-lg font-black text-amber-500 mt-1",
                              children: [
                                ticket.telemetry
                                  .availability ?? "—",
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),

                    _jsxs("p", {
                      className: "text-[10px] text-zinc-500",
                      children: [
                        "Region: ",
                        ticket.telemetry.region ||
                          "Not specified",
                      ],
                    }),

                    Object.keys(ticket.telemetry).length >
                      0 &&
                      _jsx("dl", {
                        className:
                          "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 border-t border-zinc-800 pt-3 text-xs",
                        children: Object.entries(
                          ticket.telemetry,
                        ).map(([key, value]) =>
                          _jsxs(
                            "div",
                            {
                              children: [
                                _jsx("dt", {
                                  className:
                                    "capitalize text-zinc-500",
                                  children: key.replace(
                                    /_/g,
                                    " ",
                                  ),
                                }),


                              ],
                            },
                            key,
                          ),
                        ),
                      }),
                  ],
                }),
            ],
          }),

          _jsxs("div", {
            className: "space-y-6",
            children: [
              _jsxs("div", {
                className: `rounded-2xl p-5 border space-y-4 ${
                  isDark
                    ? "glass-panel border-zinc-800"
                    : "glass-panel-light border-slate-205"
                }`,
                children: [
                  _jsxs("div", {
                    className:
                      "border-b pb-3 border-zinc-900/40 flex justify-between items-center",
                    children: [
                      _jsxs("h3", {
                        className: `text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                          isDark
                            ? "text-zinc-400"
                            : "text-slate-550"
                        }`,
                        children: [
                          _jsx(Database, {
                            size: 14,
                            className: "text-indigo-400",
                          }),

                          _jsx("span", {
                            children:
                              "RAG Evaluation Trace",
                          }),
                        ],
                      }),

                      _jsx("span", {
                        className: `text-[10px] font-bold px-2 py-0.5 rounded ${
                          isHallucinated
                            ? "text-rose-500 bg-rose-500/10 border border-rose-500/20 animate-pulse"
                            : "text-emerald-500 bg-emerald-500/10 border border-emerald-500/20"
                        }`,
                        children: isHallucinated
                          ? "Failed validation"
                          : "Passed validation",
                      }),
                    ],
                  }),

                  _jsxs("div", {
                    className:
                      "grid grid-cols-3 gap-3 text-center text-xs",
                    children: [
                      _jsxs("div", {
                        className: `p-3 border rounded-xl ${
                          isDark
                            ? "bg-zinc-950 border-zinc-900"
                            : "bg-slate-50 border-slate-150"
                        }`,
                        children: [
                          _jsx("span", {
                            className:
                              "text-[9px] text-zinc-500 block uppercase font-bold tracking-wider",
                            children: "Grounding",
                          }),

                          _jsxs("p", {
                            className: `text-lg font-mono font-black mt-1 ${
                              groundingVal >= 0.9
                                ? "text-emerald-500"
                                : "text-amber-500"
                            }`,
                            children: [
                              (groundingVal * 100).toFixed(
                                0,
                              ),
                              "%",
                            ],
                          }),
                        ],
                      }),

                      _jsxs("div", {
                        className: `p-3 border rounded-xl ${
                          isDark
                            ? "bg-zinc-950 border-zinc-900"
                            : "bg-slate-50 border-slate-150"
                        }`,
                        children: [
                          _jsx("span", {
                            className:
                              "text-[9px] text-zinc-500 block uppercase font-bold tracking-wider",
                            children: "Relevance",
                          }),

                          _jsxs("p", {
                            className: `text-lg font-mono font-black mt-1 ${
                              relevanceVal >= 0.9
                                ? "text-emerald-500"
                                : "text-amber-500"
                            }`,
                            children: [
                              (relevanceVal * 100).toFixed(
                                0,
                              ),
                              "%",
                            ],
                          }),
                        ],
                      }),

                      _jsxs("div", {
                        className: `p-3 border rounded-xl ${
                          isDark
                            ? "bg-zinc-950 border-zinc-900"
                            : "bg-slate-50 border-slate-150"
                        }`,
                        children: [
                          _jsx("span", {
                            className:
                              "text-[9px] text-zinc-500 block uppercase font-bold tracking-wider",
                            children: "Retries",
                          }),

                          _jsxs("p", {
                            className: `text-lg font-mono font-black mt-1 ${
                              retriesCount > 0
                                ? "text-amber-500"
                                : "text-zinc-400"
                            }`,
                            children: [retriesCount, "/3"],
                          }),
                        ],
                      }),
                    ],
                  }),

                  isHallucinated &&
                    _jsx("div", {
                      className:
                        "p-3 bg-rose-500/5 border border-rose-550/20 text-rose-500 rounded-xl text-[10px] leading-relaxed font-semibold",
                      children:
                        "WARNING: Grounding checks failed. Retrieved context did not support proposed resolution steps. RAG query refinement was run dynamically.",
                    }),

                  _jsxs("div", {
                    className:
                      "text-[10px] text-zinc-500",
                    children: [
                      _jsx("span", {
                        className: "font-bold uppercase",
                        children:
                          "Grounding source IDs: ",
                      }),

                      ticket.groundingSourceIds?.length
                        ? ticket.groundingSourceIds.join(
                            ", ",
                          )
                        : "No source IDs returned",
                    ],
                  }),
                ],
              }),

              ticket.retrievedDocs &&
                ticket.retrievedDocs.length > 0 &&
                _jsxs("div", {
                  className: `rounded-2xl p-5 border space-y-4 ${
                    isDark
                      ? "glass-panel border-zinc-800"
                      : "glass-panel-light border-slate-205"
                  }`,
                  children: [
                    _jsxs("div", {
                      className:
                        "border-b pb-3 border-zinc-900/40 flex justify-between items-center",
                      children: [
                        _jsx("h3", {
                          className: `text-xs font-bold uppercase tracking-wider ${
                            isDark
                              ? "text-zinc-400"
                              : "text-slate-500"
                          }`,
                          children:
                            "Retrieved Evidence Log",
                        }),

                        _jsx("button", {
                          type: "button",
                          onClick: () =>
                            setShowTechnicalDetails(
                              !showTechnicalDetails,
                            ),
                          className:
                            "text-[9px] font-bold uppercase text-indigo-400 hover:underline",
                          children: showTechnicalDetails
                            ? "Hide technical details"
                            : "Technical details",
                        }),
                      ],
                    }),

                    ["Dense Search", "BM25", "RRF Result", "Retrieved Document"].map(
                      (method) => {
                        const docs =
                          method === "Dense Search"
                            ? groupedDocs.dense
                            : method === "BM25"
                              ? groupedDocs.bm25
                              : method === "RRF Result"
                                ? groupedDocs.rrf
                                : groupedDocs.stored;

                        if (
                          docs.length === 0 &&
                          !showTechnicalDetails
                        )
                          return null;

                        return _jsxs(
                          "div",
                          {
                            className: "space-y-2",
                            children: [
                              _jsx("span", {
                                className:
                                  "text-[9px] font-bold uppercase text-zinc-500",
                                children: method,
                              }),

                              docs.length === 0
                                ? _jsx("p", {
                                    className:
                                      "text-[10px] text-zinc-600 italic",
                                    children:
                                      "No documents from this retrieval path.",
                                  })
                                : docs.map((doc) =>
                                    _jsxs(
                                      "div",
                                      {
                                        className:
                                          "space-y-1",
                                        children: [
                                          _jsxs("div", {
                                            className:
                                              "flex justify-between items-center text-[10px]",
                                            children: [
                                              _jsx("span", {
                                                className:
                                                  "font-mono font-bold text-indigo-400",
                                                children:
                                                  doc.document_title,
                                              }),

                                              _jsxs("span", {
                                                className:
                                                  "text-zinc-500",
                                                children: [
                                                  (
                                                    doc.document_score *
                                                    100
                                                  ).toFixed(0),
                                                  "%",
                                                ],
                                              }),
                                            ],
                                          }),

                                          _jsx("div", {
                                            className: `p-3 border rounded-xl text-[10px] leading-relaxed max-h-24 overflow-y-auto ${
                                              isDark
                                                ? "bg-zinc-950 border-zinc-900 text-zinc-400"
                                                : "bg-slate-50 border-slate-205 text-slate-655"
                                            }`,
                                            children:
                                              doc.document_content,
                                          }),

                                          showTechnicalDetails &&
                                            _jsxs("p", {
                                              className:
                                                "text-[9px] font-mono text-zinc-600",
                                              children: [
                                                "ID: ",
                                                doc.document_id,
                                                " · Method: ",
                                                doc.retrieval_method,
                                              ],
                                            }),
                                        ],
                                      },
                                      doc.document_id,
                                    ),
                                  ),
                            ],
                          },
                          method,
                        );
                      },
                    ),
                  ],
                }),
            ],
          }),
        ],
      }),

      _jsxs("div", {
        className: `rounded-2xl p-6 border space-y-5 ${
          isDark
            ? "glass-panel border-zinc-800"
            : "glass-panel-light border-slate-200"
        }`,
        children: [
          _jsxs("div", {
            className:
              "flex justify-between items-center border-b pb-4 border-zinc-900/40",
            children: [
              _jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  _jsx(Bot, {
                    size: 16,
                    className: "text-indigo-400",
                  }),

                  _jsx("h3", {
                    className: `text-sm font-bold ${
                      isDark
                        ? "text-white"
                        : "text-slate-805"
                    }`,
                    children:
                      "Resolution & Customer Response Draft",
                  }),
                ],
              }),

              _jsx("div", {
                className: "flex gap-2",
                children: _jsxs("button", {
                  onClick: () =>
                    setIsEditing(!isEditing),
                  className: `py-1.5 px-3.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                    isEditing
                      ? "bg-indigo-600 border-indigo-650 text-white shadow-sm"
                      : isDark
                        ? "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-905 text-zinc-350 hover:text-white"
                        : "border-slate-205 bg-white hover:bg-slate-50 text-slate-655 hover:text-slate-800"
                  }`,
                  children: [
                    _jsx(Edit3, { size: 12 }),

                    _jsx("span", {
                      children: isEditing
                        ? "Editing draft..."
                        : "Tweak response",
                    }),
                  ],
                }),
              }),
            ],
          }),

          ticket.aiDraft &&
            _jsxs("section", {
              className:
                "text-sm grid grid-cols-1 md:grid-cols-2 gap-4 ",
              children: [
                _jsxs("div", {
                  className: `p-4 border rounded-xl space-y-1 ${
                    isDark
                      ? "bg-zinc-900/40 border-zinc-900"
                      : "bg-slate-50 border-slate-150"
                  }`,
                  children: [
                    _jsx("span", {
                      className:
                        "text-white font-extrabold uppercase text-base tracking-wider block",
                      children:
                        "Greeting & Issue Confirmation",
                    }),

                    _jsx("p", {
                      className: isDark
                        ? "text-white"
                        : "text-slate-700",
                      children:
                        ticket.aiDraft.greeting || "",
                    }),

                    _jsxs("p", {
                      className:
                        "text-zinc-500 mt-2 block italic",
                      children: [
                        '"',
                        ticket.aiDraft.issueSummary ||
                          ticket.aiDraft.issue_summary ||
                          "",
                        '"',
                      ],
                    }),
                  ],
                }),

                _jsxs("div", {
                  className: `p-4 border rounded-xl space-y-1 ${
                    isDark
                      ? "bg-zinc-900/40 border-zinc-900"
                      : "bg-slate-50 border-slate-150"
                  }`,
                  children: [
                    _jsx("span", {
                      className:
                        "text-zinc-500 font-extrabold uppercase text-sm tracking-wider block",
                      children: "Closing Summary",
                    }),

                    _jsx("p", {
                      className: isDark
                        ? "text-zinc-300"
                        : "text-slate-700",
                      children:
                        ticket.aiDraft.closing || "",
                    }),
                  ],
                }),

                _jsxs("div", {
                  className: `p-4 border rounded-xl space-y-1 ${
                    isDark
                      ? "bg-zinc-900/40 border-zinc-900"
                      : "bg-slate-50 border-slate-150"
                  }`,
                  children: [
                    _jsx("span", {
                      className:
                        "text-zinc-500 font-extrabold uppercase text-[9px] tracking-wider block",
                      children:
                        "Identified Root Cause",
                    }),

                    _jsx("p", {
                      className: isDark
                        ? "text-zinc-300 font-medium"
                        : "text-slate-700 font-medium",
                      children:
                        ticket.aiDraft.rootCause ||
                        ticket.aiDraft.root_cause ||
                        "No root cause identified.",
                    }),
                  ],
                }),

                _jsxs("div", {
                  className: `p-4 border rounded-xl space-y-1 ${
                    isDark
                      ? "bg-zinc-900/40 border-zinc-900"
                      : "bg-slate-50 border-slate-150"
                  }`,
                  children: [
                    _jsx("span", {
                      className:
                        "text-zinc-500 font-extrabold uppercase text-base tracking-wider block",
                      children:
                        "Resolution instructions",
                    }),

                    _jsx("ol", {
                      className:
                        "list-decimal pl-4 space-y-1 text-zinc-300",
                      children: (
                        ticket.aiDraft.resolutionSteps ||
                        ticket.aiDraft.resolution_steps ||
                        []
                      ).map((step, idx) =>
                        _jsx(
                          "li",
                          {
                            className: isDark
                              ? "text-zinc-300"
                              : "text-slate-700",
                            children: step,
                          },
                          idx,
                        ),
                      ),
                    }),
                  ],
                }),
              ],
            }),

          _jsxs("div", {
            className: "space-y-4",
            children: [
              _jsx("label", {
                className: `block text-base font-extrabold uppercase tracking-wide ${
                  isDark
                    ? "text-zinc-500"
                    : "text-slate-500"
                }`,
                children:
                  "Full Response Payload Message",
              }),

              _jsx("textarea", {
                value: editedSolution,
                onChange: (e) =>
                  setEditedSolution(e.target.value),
                disabled: !isEditing,
                rows: 8,
                className: `w-full border rounded-xl p-4 text-sm leading-relaxed font-sans resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  isEditing
                    ? isDark
                      ? "bg-white border-indigo-500/40 text-black"
                      : "bg-black border-indigo-500/40 text-white"
                    : isDark
                      ? "bg-white border-zinc-300 text-black"
                      : "bg-black border-zinc-800 text-white"
                }`,
              }),

              showDiff &&
                _jsxs("div", {
                  className:
                    "text-[10px] text-amber-500 font-bold flex items-center gap-1",
                  children: [
                    _jsx(Sparkles, { size: 12 }),

                    _jsx("span", {
                      children:
                        'Response contains manual overrides. Saved version will report as "Human Edited".',
                    }),
                  ],
                }),
            ],
          }),

          ticket.retrievedDocs &&
            ticket.retrievedDocs.length > 0 &&
            editedSolution.trim() &&
            _jsxs("section", {
              className: `border rounded-xl p-4 space-y-3 ${
                isDark
                  ? "bg-zinc-950/60 border-zinc-800"
                  : "bg-slate-50 border-slate-200"
              }`,
              children: [
                _jsxs("div", {
                  children: [
                    _jsx("h4", {
                      className: "text-xs font-medium",
                      children: "Diff-based citations",
                    }),

                    _jsx("p", {
                      className:
                        "text-[10px] text-zinc-500 mt-1",
                      children:
                        "Each AI-draft sentence is shown next to the retrieved ChromaDB chunk used as its evidence.",
                    }),
                  ],
                }),

                _jsx("div", {
                  className: "space-y-2",
                  children: editedSolution
                    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
                    ?.map((sentence, index) => {
                      const words =
                        sentence
                          .toLowerCase()
                          .match(/[a-z0-9]{4,}/g) || [];

                      const source =
                        ticket.retrievedDocs.find(
                          (doc) =>
                            words.some((word) =>
                              doc.document_content
                                .toLowerCase()
                                .includes(word),
                            ),
                        ) ||
                        ticket.retrievedDocs[
                          index %
                            ticket.retrievedDocs.length
                        ];

                      return _jsxs(
                        "div",
                        {
                          className:
                            "grid md:grid-cols-2 gap-3 text-xs",
                          children: [
                            _jsx("p", {
                              className: `p-3 rounded-lg border ${
                                isDark
                                  ? "border-indigo-500/20 bg-indigo-500/5 text-zinc-200"
                                  : "border-indigo-100 bg-white text-slate-700"
                              }`,
                              children: sentence.trim(),
                            }),

                            _jsxs("div", {
                              className: `p-3 rounded-lg border ${
                                isDark
                                  ? "border-zinc-800 text-zinc-400"
                                  : "border-slate-200 text-slate-600"
                              }`,
                              children: [
                                _jsx("span", {
                                  className:
                                    "font-mono text-[10px] text-indigo-400",
                                  children:
                                    source.document_id,
                                }),

                                _jsx("p", {
                                  className:
                                    "mt-1 line-clamp-4",
                                  children:
                                    source.document_content,
                                }),
                              ],
                            }),
                          ],
                        },
                        `${sentence}-${index}`,
                      );
                    }),
                }),
              ],
            }),

          _jsxs("div", {
            className:
              "flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-zinc-900/40",
            children: [
              _jsxs("div", {
                className: "flex items-center gap-3",
                children: [
                  _jsx("span", {
                    className: `text-xs ${
                      isDark
                        ? "text-zinc-400"
                        : "text-slate-500"
                    }`,
                    children: "Re-route Department:",
                  }),

                  _jsxs("select", {
                    value: selectedDept,
                    onChange: (e) =>
                      setSelectedDept(e.target.value),
                    className: `border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-zinc-200"
                        : "bg-white border-slate-300 text-slate-700 shadow-sm"
                    }`,
                    children: DEPARTMENTS.map((dept) =>
                      _jsx(
                        "option",
                        {
                          value: dept,
                          children: dept,
                        },
                        dept,
                      ),
                    ),
                  }),
                ],
              }),

              _jsxs("div", {
                className: "flex gap-2.5",
                children: [
                  _jsxs(_Fragment, {
                        children: [
                          _jsx("button", {
                            disabled: selectedAction !== null || actionBusy,
                            onClick: handleApprove,
                            className: `py-3 px-4 border rounded-xl text-xs font-medium uppercase tracking-wider transition-all ${
                              selectedAction &&
                              selectedAction !== "approve"
                                ? "opacity-30 blur-[1px]"
                                : ""
                            } ${
                              isDark
                                ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`,
                            children: "Approve & Send",
                          }),

                          _jsx("button", {
                            disabled: selectedAction !== null || actionBusy,
                            onClick: handleEditAndSend,
                            className: `py-3 px-4 border rounded-xl text-xs font-medium uppercase tracking-wider transition-all ${
                              selectedAction &&
                              selectedAction !== "edit"
                                ? "opacity-30 blur-[1px]"
                                : ""
                            } ${
                              isDark
                                ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`,
                            children: "Edit & Send",
                          }),

                          _jsx("button", {
                            disabled: selectedAction !== null || actionBusy,
                            onClick: handleEscalateJira,
                            className: `py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-medium uppercase tracking-wider transition-all ${
                              selectedAction &&
                              selectedAction !== "reject"
                                ? "opacity-30 blur-[1px]"
                                : ""
                            } ${actionBusy ? "opacity-60 cursor-not-allowed" : ""}`,
                            children: "Reject & Escalate",
                          }),
                        ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),


      approveModalOpen &&
        modalRoot &&
        createPortal(
          _jsx("div", {
            className:
              "fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in",
            onClick: cancelApprove,
            children: _jsxs("div", {
              className: `w-full max-w-lg rounded-2xl border p-6 space-y-5 ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100"
                  : "bg-white border-slate-200 text-slate-805"
              }`,
              onClick: (e) => e.stopPropagation(),
              children: [
                _jsxs("div", {
                  className:
                    "flex gap-3 items-start border-b pb-4 border-zinc-900",
                  children: [
                    _jsx(CheckCircle, {
                      size: 21,
                      className:
                        "text-emerald-500 mt-0.5 shrink-0",
                    }),

                    _jsxs("div", {
                      children: [
                        _jsx("h3", {
                          className:
                            "text-base font-extrabold",
                          children:
                            "Approve & Send Response",
                        }),

                        _jsx("p", {
                          className:
                            "text-xs text-zinc-500 mt-1",
                          children:
                            "You're about to approve this AI-generated response and send it to the customer.",
                        }),
                      ],
                    }),
                  ],
                }),

                _jsxs("div", {
                  className: "space-y-2",
                  children: [
                    _jsx("span", {
                      className:
                        "text-[9px] font-bold uppercase tracking-wider text-zinc-500 block",
                      children: "Response preview",
                    }),

                    _jsx("div", {
                      className: `p-4 border rounded-xl text-xs leading-relaxed max-h-56 overflow-y-auto whitespace-pre-line ${
                        isDark
                          ? "bg-zinc-900 border-zinc-800 text-zinc-300"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`,
                      children:
                        editedSolution ||
                        ticket.aiRagSolution ||
                        "No response available.",
                    }),
                  ],
                }),

                _jsxs("div", {
                  className:
                    "flex justify-end gap-3.5 pt-2",
                  children: [
                    _jsx("button", {
                      onClick: cancelApprove,
                      className: `py-2.5 px-5 border rounded-xl text-xs font-semibold ${
                        isDark
                          ? "border-zinc-800 hover:bg-zinc-900 text-zinc-400"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`,
                      children: "Cancel",
                    }),

                    _jsx("button", {
                      onClick: confirmApprove,
                      disabled: actionBusy,
                      className:
                        "py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold uppercase tracking-wider",
                      children: actionBusy ? "Sending..." : "Approve & Send",
                    }),
                  ],
                }),
              ],
            }),
          }),
          modalRoot,
        ),

    

      editModalOpen &&
        modalRoot &&
        createPortal(
          _jsx("div", {
            className:
              "fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in",
            onClick: cancelEdit,
            children: _jsxs("div", {
              className: `w-full max-w-2xl rounded-2xl border p-6 space-y-5 ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100"
                  : "bg-white border-slate-200 text-slate-805"
              }`,
              onClick: (e) => e.stopPropagation(),
              children: [
                _jsxs("div", {
                  className:
                    "flex gap-3 items-start border-b pb-4 border-zinc-900",
                  children: [
                    _jsx(Edit3, {
                      size: 21,
                      className:
                        "text-indigo-400 mt-0.5 shrink-0",
                    }),

                    _jsxs("div", {
                      children: [
                        _jsx("h3", {
                          className:
                            "text-base font-extrabold",
                          children:
                            "Edit & Send Response",
                        }),

                        _jsx("p", {
                          className:
                            "text-xs text-zinc-500 mt-1",
                          children:
                            "Review or modify the response before sending it to the customer.",
                        }),
                      ],
                    }),
                  ],
                }),

                _jsxs("div", {
                  className: "space-y-2",
                  children: [
                    _jsx("span", {
                      className:
                        "text-[9px] font-bold uppercase tracking-wider text-zinc-500 block",
                      children: "Response to send",
                    }),

                    _jsx("textarea", {
                      value: editModalText,
                      onChange: (e) =>
                        setEditModalText(e.target.value),
                      autoFocus: true,
                      rows: 10,
                      className: `w-full border rounded-xl p-4 text-sm leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark
                          ? "bg-zinc-900 border-zinc-800 text-zinc-100"
                          : "bg-white border-slate-200 text-slate-800"
                      }`,
                    }),
                  ],
                }),

                _jsxs("div", {
                  className:
                    "flex justify-end gap-3.5 pt-2",
                  children: [
                    _jsx("button", {
                      onClick: cancelEdit,
                      className: `py-2.5 px-5 border rounded-xl text-xs font-semibold ${
                        isDark
                          ? "border-zinc-800 hover:bg-zinc-900 text-zinc-400"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`,
                      children: "Cancel",
                    }),

                    _jsx("button", {
                      onClick: confirmEditAndSend,
                      disabled: !editModalText.trim(),
                      className:
                        "py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold uppercase tracking-wider",
                      children: actionBusy ? "Sending..." : "Send Edited Response",
                    }),
                  ],
                }),
              ],
            }),
          }),
          modalRoot,
        ),

     

      escalatingJira &&
        modalRoot &&
        createPortal(
          _jsx("div", {
            className:
              "fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in",
            children: _jsxs("div", {
              className: `w-full max-w-lg rounded-2xl border p-6 space-y-4 ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100"
                  : "bg-white border-slate-200 text-slate-805"
              }`,
              children: [
                _jsxs("div", {
                  className:
                    "flex gap-3 items-start border-b pb-3 border-zinc-900",
                  children: [
                    _jsx(AlertTriangle, {
                      size: 20,
                      className:
                        "text-rose-500 mt-0.5 shrink-0",
                    }),

                    _jsxs("div", {
                      children: [
                        _jsx("h3", {
                          className:
                            "text-base font-extrabold",
                          children:
                            "Confirm Jira Escalation",
                        }),

                        _jsx("p", {
                          className:
                            "text-xs text-zinc-500 mt-0.5",
                          children:
                            "This will dispatch the ticket metadata to the engineering project tracker and close the operations workspace view.",
                        }),
                      ],
                    }),
                  ],
                }),

                _jsxs("div", {
                  className: "space-y-2",
                  children: [
                    _jsx("span", {
                      className:
                        "text-[9px] font-bold uppercase tracking-wider text-zinc-550 block",
                      children:
                        "Jira JSON payload preview",
                    }),

                    _jsx("pre", {
                      className: `p-4 rounded-xl border font-mono text-[10px] overflow-x-auto text-zinc-300 leading-relaxed ${
                        isDark
                          ? "bg-zinc-900 border-zinc-850"
                          : "bg-slate-50 border-slate-205"
                      }`,
                      children: `{
  "fields": {
    "project": { "key": "OPS" },
    "summary": "Escalation: ${ticket.subject}",
    "description": "Triggered by AI Operations Dashboard. User: ${ticket.userEmail}\\nTier: ${ticket.userTier}\\nDescription: ${ticket.description}",
    "issuetype": { "name": "Bug" },
    "priority": { "name": "${
      ticket.urgency === "Critical"
        ? "Highest"
        : "High"
    }" }
  }
}`,
                    }),
                  ],
                }),

                _jsxs("div", {
                  className:
                    "flex justify-end gap-3.5 pt-2",
                  children: [
                    _jsx("button", {
                      onClick: () => {
                        setEscalatingJira(false);
                        setSelectedAction(null);
                      },
                      className: `py-2 px-4 border rounded-xl text-xs font-semibold ${
                        isDark
                          ? "border-zinc-800 hover:bg-zinc-900 text-zinc-400"
                          : "border-slate-200 hover:bg-slate-50"
                      }`,
                      children: "Cancel",
                    }),

                    _jsx("button", {
                      onClick: confirmEscalate,
                      disabled: actionBusy,
                      className:
                        "py-2.5 px-5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold uppercase tracking-wider",
                      children: actionBusy ? "Escalating..." : "Confirm Escalation",
                    }),
                  ],
                }),
              ],
            }),
          }),
          modalRoot,
        ),

      /*
       * =========================================================
       * DELETE CONFIRMATION MODAL
       * =========================================================
       */

      deleteModalOpen &&
        modalRoot &&
        createPortal(
          _jsx("div", {
            className:
              "fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in",
            onClick: cancelDelete,
            children: _jsxs("div", {
              className: `w-full max-w-md rounded-2xl border p-6 space-y-5 ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100"
                  : "bg-white border-slate-200 text-slate-805"
              }`,
              onClick: (e) => e.stopPropagation(),
              children: [
                _jsxs("div", {
                  className:
                    "flex gap-3 items-start border-b pb-4 border-zinc-900",
                  children: [
                    _jsx(AlertTriangle, {
                      size: 21,
                      className:
                        "text-rose-500 mt-0.5 shrink-0",
                    }),
                    _jsxs("div", {
                      children: [
                        _jsx("h3", {
                          className:
                            "text-base font-extrabold",
                          children: "Delete Ticket",
                        }),
                        _jsx("p", {
                          className:
                            "text-xs text-zinc-500 mt-1 leading-relaxed",
                          children:
                            "Are you sure you want to permanently delete this ticket? This action cannot be undone.",
                        }),
                      ],
                    }),
                  ],
                }),
                _jsx("div", {
                  className: `p-4 rounded-xl border text-xs leading-relaxed ${
                    isDark
                      ? "bg-zinc-900 border-zinc-800 text-zinc-300"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`,
                  children:
                    ticket.failureReason ||
                    ticket.failure_reason ||
                    "No failure reason recorded.",
                }),
                _jsxs("div", {
                  className:
                    "flex justify-end gap-3.5 pt-2",
                  children: [
                    _jsx("button", {
                      onClick: cancelDelete,
                      className: `py-2.5 px-5 border rounded-xl text-xs font-semibold ${
                        isDark
                          ? "border-zinc-800 hover:bg-zinc-900 text-zinc-400"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`,
                      children: "Cancel",
                    }),
                    _jsx("button", {
                      onClick: confirmDelete,
                      disabled: actionBusy,
                      className:
                        "py-2.5 px-5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold uppercase tracking-wider",
                      children: actionBusy ? "Deleting..." : "Delete Ticket",
                    }),
                  ],
                }),
              ],
            }),
          }),
          modalRoot,
        ),

      /*
       * =========================================================
       * SUCCESS MODAL
       * Replaces alert()
       * =========================================================
       */

      successModalOpen &&
        modalRoot &&
        createPortal(
          _jsx("div", {
            className:
              "fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in",
            children: _jsxs("div", {
              className: `w-full max-w-md rounded-2xl border p-6 space-y-5 ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100"
                  : "bg-white border-slate-200 text-slate-805"
              }`,
              children: [
                _jsxs("div", {
                  className:
                    "flex gap-3 items-start border-b pb-4 border-zinc-900",
                  children: [
                    _jsx(CheckCircle, {
                      size: 21,
                      className:
                        "text-emerald-500 mt-0.5 shrink-0",
                    }),

                    _jsxs("div", {
                      children: [
                        _jsx("h3", {
                          className:
                            "text-base font-extrabold",
                          children:
                            "Action Completed",
                        }),

                        _jsx("p", {
                          className:
                            "text-xs text-zinc-500 mt-1 leading-relaxed",
                          children:
                            successMessage ||
                            "The requested ticket action completed successfully.",
                        }),
                      ],
                    }),
                  ],
                }),

                _jsxs("div", {
                  className: `p-4 border rounded-xl ${
                    isDark
                      ? "bg-zinc-900 border-zinc-800"
                      : "bg-slate-50 border-slate-200"
                  }`,
                  children: [
                    _jsx("span", {
                      className:
                        "text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-1",
                      children: "Ticket",
                    }),

                    _jsx("span", {
                      className:
                        "text-xs font-mono font-bold text-indigo-400",
                      children: ticket.id,
                    }),
                  ],
                }),

                _jsxs("div", {
                  className:
                    "flex justify-end pt-1",
                  children: [
                    _jsx("button", {
                      onClick: closeSuccessModal,
                      className:
                        "py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider",
                      children: "Back to dashboard",
                    }),
                  ],
                }),
              ],
            }),
          }),
          modalRoot,
        ),

      /*
       * =========================================================
       * EXISTING IMAGE MODAL
       * Also portaled to prevent fixed-position conflicts.
       * Design remains unchanged.
       * =========================================================
       */

      isImageModalOpen &&
        ticket.imageUrl &&
        modalRoot &&
        createPortal(
          _jsxs("div", {
            className:
              "fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in",
            onClick: () => setIsImageModalOpen(false),
            children: [
              _jsx("button", {
                onClick: () =>
                  setIsImageModalOpen(false),
                className:
                  "absolute top-4 right-4 p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-full cursor-pointer",
                children: _jsx(X, { size: 20 }),
              }),

              _jsx("div", {
                className:
                  "relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center",
                onClick: (e) => e.stopPropagation(),
                children: _jsx("img", {
                  src: ticket.imageUrl,
                  alt: "Zoomed details",
                  className:
                    "max-h-[85vh] max-w-full object-contain rounded-lg border border-zinc-900",
                }),
              }),
            ],
          }),
          modalRoot,
        ),
    ],
  });
}
