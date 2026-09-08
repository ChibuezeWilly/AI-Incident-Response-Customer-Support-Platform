import React, { useState, useMemo, useEffect } from "react";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {
  Search,
  Filter,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Tag as TagIcon,
  Key as KeyIcon,
  FileText,
  Clock,
  Sparkles,
  Edit3,
  CheckCircle,
  Wrench,
} from "lucide-react";

import StatusBadge from "./ui/StatusBadge";
import ConfidenceBadge from "./ui/ConfidenceBadge";
import SLAIndicator from "./ui/SLAIndicator";
import { fetchPendingTickets, retryFailedTicket } from "../api";
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

// Retry Helper Utility
async function fetchWithRetry(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 1) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return fetchWithRetry(fn, retries - 1, delay * 2);
  }
}

export default function TicketsManager({
  tickets = [],
  onSelectTicket,
  theme = "dark",
  onOpenCustomer,
  onEngineerResolution,
  onRefreshTickets,
}) {
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedUrgency, setSelectedUrgency] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedTier, setSelectedTier] = useState("All");
  const [selectedSla, setSelectedSla] = useState("All");
  const [minConfidence, setMinConfidence] = useState(0);
  const [processedTickets, setProcessedTickets] = useState(null);
  const [retryingTicketId, setRetryingTicketId] = useState(null);

  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [editingDrafts, setEditingDrafts] = useState({});
  const [editedDepartments, setEditedDepartments] = useState({});

  const isDark = theme === "dark";

  const normalizedTickets = useMemo(
    () => tickets.map(mapTicket).filter(Boolean),
    [tickets],
  );

  useEffect(() => {
    if (selectedStatus !== "AWAITING HUMAN REVIEW") return;

    fetchWithRetry(fetchPendingTickets, 3, 1000)
      .then((items) => setProcessedTickets(items.map(mapTicket)))
      .catch((err) => {
        console.error("Failed to fetch pending tickets after retries:", err);
        setProcessedTickets([]);
      });
  }, [selectedStatus]);

  const handleDraftChange = (ticketId, text) => {
    setEditingDrafts((prev) => ({ ...prev, [ticketId]: text }));
  };

  const handleRetryTicket = async (ticket, event) => {
    event?.stopPropagation();

    const ticketId = ticket?.id || ticket?.ticket_id;
    if (!ticketId) return;

    setRetryingTicketId(ticketId);
    try {
      await retryFailedTicket(ticketId);
      await onRefreshTickets?.();
    } catch (err) {
      console.error(`Failed to retry ticket #${ticketId}:`, err);
    } finally {
      setRetryingTicketId((current) => (current === ticketId ? null : current));
    }
  };

  const resolveTicket = (ticket, isEdited) => {
    // Parentheses added to resolve the operator mixing compilation error
    const draftText =
      editingDrafts[ticket.id] ??
      ticket.aiDraftT ??
      (ticket.finalResponseText ||
        ticket.aiDraft?.fullResponseText ||
        "");

    // Rebuilds the schema format that mapTicket created
    const updatedAiDraft = {
      ...(ticket.aiDraft || {}),
      fullResponseText: draftText,
      full_response_text: draftText,
    };

    onSelectTicket({
      ...ticket,
      aiDraft: updatedAiDraft,
      aiDraftText: draftText,
      aiRagSolution: draftText,
      finalResponseText: draftText,
      department: editedDepartments[ticket.id] ?? ticket.department,
      humanEditedText: isEdited ? draftText : null,
      humanDecision: isEdited ? "EDITED_AND_APPROVED" : "APPROVED",
    });
  };

  const filteredTickets = useMemo(() => {
    const source =
      selectedStatus === "AWAITING HUMAN REVIEW" && processedTickets
        ? processedTickets
        : normalizedTickets;

    return source.filter((t) => {
      const email = t.userEmail || t.user?.email || "";
      const subject = t.subject || "";
      const description = t.description || t.body || "";
      const id = t.id || t.ticket_id || "";
      const confidence = t.aiConfidence ?? t.confidence ?? 0;

      const matchesSearch =
        subject.toLowerCase().includes(search.toLowerCase()) ||
        description.toLowerCase().includes(search.toLowerCase()) ||
        id.toLowerCase().includes(search.toLowerCase()) ||
        email.toLowerCase().includes(search.toLowerCase());

      const matchesDept =
        selectedDept === "All" || t.department === selectedDept;
      const matchesUrgency =
        selectedUrgency === "All" ||
        (t.urgency || t.priority) === selectedUrgency;
      const matchesStatus =
        selectedStatus === "All" || t.status === selectedStatus;
      const matchesTier =
        selectedTier === "All" ||
        (t.userTier || t.account_tier) === selectedTier;
      const matchesSla = selectedSla === "All" || t.slaStatus === selectedSla;
      const matchesConfidence = confidence >= minConfidence / 100;

      return (
        matchesSearch &&
        matchesDept &&
        matchesUrgency &&
        matchesStatus &&
        matchesTier &&
        matchesSla &&
        matchesConfidence
      );
    });
  }, [
    normalizedTickets,
    processedTickets,
    search,
    selectedDept,
    selectedUrgency,
    selectedStatus,
    selectedTier,
    selectedSla,
    minConfidence,
  ]);

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case "Critical":
        return "text-rose-500 bg-rose-500/10 border-rose-500/25";
      case "High":
        return "text-orange-500 bg-orange-500/10 border-orange-500/25";
      case "Medium":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/25";
      default:
        return "text-slate-500 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
    }
  };

  return _jsxs("div", {
    className: `space-y-6 w-full max-w-full overflow-x-hidden ${isDark ? "text-zinc-100" : "text-slate-900"
      }`,
    children: [
      /* Header */
      _jsxs("div", {
        children: [
          _jsx("h2", {
            className: `text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"
              }`,
            children: "Ticket Explorer",
          }),
          _jsx("p", {
            className: `text-sm mt-0.5 ${isDark ? "text-zinc-400" : "text-slate-600"
              }`,
            children:
              "Query full historical database records of the automated classification pipeline.",
          }),
        ],
      }),

      /* Filter Controls */
      _jsxs("div", {
        className: `rounded-2xl p-5 border space-y-4 ${isDark
          ? "bg-zinc-900/80 border-zinc-800"
          : "bg-white border-slate-200 shadow-sm"
          }`,
        children: [
          _jsxs("div", {
            className:
              "flex flex-col lg:flex-row lg:items-center justify-between gap-4",
            children: [
              _jsxs("div", {
                className: "relative w-full lg:w-96",
                children: [
                  _jsx(Search, {
                    className: `absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? "text-zinc-500" : "text-slate-400"
                      }`,
                    size: 16,
                  }),
                  _jsx("input", {
                    type: "text",
                    value: search,
                    onChange: (e) => setSearch(e.target.value),
                    placeholder: "Search Subject, ID, Description, Email...",
                    className: `w-full border rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500"
                      : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                      }`,
                  }),
                ],
              }),
              _jsxs("div", {
                className: "flex items-center gap-3 w-full lg:w-72",
                children: [
                  _jsxs("span", {
                    className: `text-[10px] font-bold uppercase tracking-wider shrink-0 ${isDark ? "text-zinc-400" : "text-slate-600"
                      }`,
                    children: ["Min Confidence: ", minConfidence, "%"],
                  }),
                  _jsx("input", {
                    type: "range",
                    min: "0",
                    max: "100",
                    value: minConfidence,
                    onChange: (e) => setMinConfidence(Number(e.target.value)),
                    className: `w-full accent-indigo-500 h-1.5 rounded-full cursor-pointer ${isDark ? "bg-zinc-800" : "bg-slate-200"
                      }`,
                  }),
                ],
              }),
            ],
          }),

          /* Dropdown Filters Grid */
          _jsxs("div", {
            className: `grid grid-cols-2 md:grid-cols-5 gap-4 border-t pt-4 ${isDark ? "border-zinc-800" : "border-slate-200"
              }`,
            children: [
              /* Department Filter */
              _jsxs("div", {
                className: "space-y-1.5",
                children: [
                  _jsxs("label", {
                    className: `text-[9px]  font-bold uppercase tracking-wider flex items-center gap-1 ${isDark ? "text-zinc-400" : "text-slate-600"
                      }`,
                    children: [
                      _jsx(Filter, { size: 10 }),
                      _jsx("span", { children: "Department" }),
                    ],
                  }),
                  _jsxs("select", {
                    value: selectedDept,
                    onChange: (e) => setSelectedDept(e.target.value),
                    className: `w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-200"
                      : "bg-slate-50 border-slate-300 text-slate-800"
                      }`,
                    children: [
                      _jsx("option", {
                        value: "All",
                        children: "All Departments",
                      }),
                      DEPARTMENTS.map((dept) =>
                        _jsx("option", { value: dept, children: dept }, dept),
                      ),
                    ],
                  }),
                ],
              }),

              /* Urgency Filter */
              _jsxs("div", {
                className: "space-y-1.5",
                children: [
                  _jsxs("label", {
                    className: `text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${isDark ? "text-zinc-400" : "text-slate-600"
                      }`,
                    children: [
                      _jsx(Filter, { size: 10 }),
                      _jsx("span", { children: "Urgency" }),
                    ],
                  }),
                  _jsxs("select", {
                    value: selectedUrgency,
                    onChange: (e) => setSelectedUrgency(e.target.value),
                    className: `w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-200"
                      : "bg-slate-50 border-slate-300 text-slate-800"
                      }`,
                    children: [
                      _jsx("option", {
                        value: "All",
                        children: "All Urgencies",
                      }),
                      _jsx("option", {
                        value: "Critical",
                        children: "Critical",
                      }),
                      _jsx("option", { value: "High", children: "High" }),
                      _jsx("option", { value: "Medium", children: "Medium" }),
                      _jsx("option", { value: "Low", children: "Low" }),
                    ],
                  }),
                ],
              }),

              /* Routing Status Filter */
              _jsxs("div", {
                className: "space-y-1.5",
                children: [
                  _jsxs("label", {
                    className: `text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${isDark ? "text-zinc-400" : "text-slate-600"
                      }`,
                    children: [
                      _jsx(Filter, { size: 10 }),
                      _jsx("span", { children: "Routing Status" }),
                    ],
                  }),
                  _jsxs("select", {
                    value: selectedStatus,
                    onChange: (e) => setSelectedStatus(e.target.value),
                    className: `w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-200"
                      : "bg-slate-50 border-slate-300 text-slate-800"
                      }`,
                    children: [
                      _jsx("option", {
                        value: "All",
                        children: "All Statuses",
                      }),
                      _jsx("option", {
                        value: "AWAITING HUMAN REVIEW",
                        children: "AWAITING HUMAN REVIEW",
                      }),
                      _jsx("option", {
                        value: "PROCESSED",
                        children: "PROCESSED",
                      }),
                      _jsx("option", { value: "QUEUED", children: "QUEUED" }),
                      _jsx("option", {
                        value: "RESOLVED",
                        children: "RESOLVED",
                      }),
                      _jsx("option", {
                        value: "ESCALATED",
                        children: "ESCALATED",
                      }),
                      _jsx("option", { value: "FAILED", children: "FAILED" }),
                    ],
                  }),
                ],
              }),

              /* Tier Filter */
              _jsxs("div", {
                className: "space-y-1.5",
                children: [
                  _jsxs("label", {
                    className: `text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${isDark ? "text-zinc-400" : "text-slate-600"
                      }`,
                    children: [
                      _jsx(Filter, { size: 10 }),
                      _jsx("span", { children: "User Tier" }),
                    ],
                  }),
                  _jsxs("select", {
                    value: selectedTier,
                    onChange: (e) => setSelectedTier(e.target.value),
                    className: `w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-200"
                      : "bg-slate-50 border-slate-300 text-slate-800"
                      }`,
                    children: [
                      _jsx("option", {
                        value: "All",
                        children: "All Account Tiers",
                      }),
                      _jsx("option", { value: "VIP", children: "VIP" }),
                      _jsx("option", {
                        value: "Enterprise",
                        children: "Enterprise",
                      }),
                      _jsx("option", { value: "Team", children: "Team" }),
                      _jsx("option", {
                        value: "Standard",
                        children: "Standard",
                      }),
                    ],
                  }),
                ],
              }),

              /* SLA Filter */
              _jsxs("div", {
                className: "space-y-1.5",
                children: [
                  _jsxs("label", {
                    className: `text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${isDark ? "text-zinc-400" : "text-slate-600"
                      }`,
                    children: [
                      _jsx(Filter, { size: 10 }),
                      _jsx("span", { children: "SLA Status" }),
                    ],
                  }),
                  _jsxs("select", {
                    value: selectedSla,
                    onChange: (e) => setSelectedSla(e.target.value),
                    className: `w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-200"
                      : "bg-slate-50 border-slate-300 text-slate-800"
                      }`,
                    children: [
                      _jsx("option", {
                        value: "All",
                        children: "All SLA States",
                      }),
                      _jsx("option", { value: "Healthy", children: "Healthy" }),
                      _jsx("option", { value: "At Risk", children: "At Risk" }),
                      _jsx("option", {
                        value: "Breached",
                        children: "Breached",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),

      /* Tickets Table */
      _jsx("div", {
        className: `rounded-2xl border overflow-hidden w-full max-w-full ${isDark
          ? "bg-zinc-900/60 border-zinc-800"
          : "bg-white border-slate-200 shadow-sm"
          }`,
        children:
          filteredTickets.length === 0
            ? _jsxs("div", {
              className:
                "py-16 text-center text-slate-400 dark:text-zinc-500 space-y-2",
              children: [
                _jsx(HelpCircle, { className: "mx-auto", size: 28 }),
                _jsx("p", {
                  className: "text-sm font-semibold",
                  children: "No cases match the query criteria.",
                }),
              ],
            })
            : _jsx("div", {
              className: "overflow-x-auto w-full max-w-full",
              children: _jsxs("table", {
                className: "w-full text-left border-collapse min-w-0",
                children: [
                  _jsx("thead", {
                    children: _jsxs("tr", {
                      className: `border-b text-[10px] font-bold uppercase tracking-wider ${isDark
                        ? "border-zinc-800 bg-zinc-900/80 text-zinc-400"
                        : "border-slate-200 bg-slate-100/70 text-slate-600"
                        }`,
                      children: [
                        _jsx("th", {
                          className: "py-4 px-6",
                          children: "ID & Subject",
                        }),
                        _jsx("th", {
                          className: "py-4 px-6",
                          children: "Client / Tier",
                        }),
                        _jsx("th", {
                          className: "py-4 px-6",
                          children: "Assigned Dept",
                        }),
                        _jsx("th", {
                          className: "py-4 px-6",
                          children: "Priority",
                        }),
                        _jsx("th", {
                          className: "py-4 px-6",
                          children: "AI Confidence",
                        }),
                        _jsx("th", {
                          className: "py-4 px-6",
                          children: "SLA",
                        }),
                        _jsx("th", {
                          className: "py-4 px-6",
                          children: "Status",
                        }),
                        _jsx("th", {
                          className: "py-4 px-6",
                          children: "Created",
                        }),
                        _jsx("th", {
                          className: "py-4 px-6",
                          children: "Actions",
                        }),
                      ],
                    }),
                  }),
                  _jsx("tbody", {
                    className: `divide-y ${isDark ? "divide-zinc-800/60" : "divide-slate-200"
                      }`,
                    children: filteredTickets.map((t) => {
                      const ticketId = t.id || t.ticket_id;
                      const email = t.userEmail || t.user?.email || "N/A";
                      const tier = t.userTier || t.account_tier || "Standard";
                      const urgency = t.urgency || t.priority || "Low";
                      const confidence = t.aiConfidence ?? t.confidence ?? 0;
                      const currentDraft =
                        editingDrafts[ticketId] ??
                        t.aiDraftText ??
                        t.aiRagSolution ??
                        "";
                      const selectedDepartment =
                        editedDepartments[ticketId] ?? t.department;
                      const isExpanded = expandedTicketId === ticketId;

                      return _jsxs(
                        React.Fragment,
                        {
                          children: [
                            _jsxs("tr", {
                              onClick: () => onSelectTicket(t),
                              className: `transition-colors cursor-pointer group ${isDark
                                ? "hover:bg-zinc-800/40"
                                : "hover:bg-slate-50"
                                }`,
                              children: [
                                /* Subject Column */
                                _jsx("td", {
                                  className: "py-4 px-6",
                                  children: _jsxs("div", {
                                    className: "space-y-0.5",
                                    children: [
                                      _jsx("span", {
                                        className: `text-sm font-mono font-bold transition-colors ${isDark
                                          ? "text-zinc-100 group-hover:text-indigo-400"
                                          : "text-slate-900 group-hover:text-indigo-600"
                                          }`,
                                        children: ticketId,
                                      }),
                                      _jsx("p", {
                                        className: `text-sm font-semibold truncate max-w-xs ${isDark
                                          ? "text-zinc-300"
                                          : "text-slate-800"
                                          }`,
                                        children: t.subject,
                                      }),
                                      t.status === "FAILED" &&
                                        _jsx("p", {
                                          className: `text-[10px] leading-relaxed max-w-xs line-clamp-2 ${
                                            t.ticketSafe === false
                                              ? "text-rose-500"
                                              : isDark
                                                ? "text-zinc-500"
                                                : "text-slate-500"
                                          }`,
                                          children:
                                            t.failureReason ||
                                            t.failure_reason ||
                                            "This ticket could not be processed.",
                                        }),
                                    ],
                                  }),
                                }),

                                /* Client Column */
                                _jsx("td", {
                                  className: "py-4 px-6 whitespace-nowrap",
                                  children: _jsxs("div", {
                                    className: "space-y-0.5",
                                    children: [
                                      _jsx("span", {
                                        onClick: (e) => {
                                          e.stopPropagation();
                                            onOpenCustomer?.(t.userId);
                                        },
                                        className: `text-sm font-medium hover:underline block ${isDark
                                          ? "text-zinc-300 hover:text-white"
                                          : "text-slate-700 hover:text-slate-900"
                                          }`,
                                        children: email,
                                      }),
                                      _jsxs("span", {
                                        className: `text-[11px] font-bold ${tier === "VIP"
                                          ? "text-rose-500"
                                          : tier === "Enterprise"
                                            ? "text-amber-500"
                                            : "text-slate-500 dark:text-zinc-400"
                                          }`,
                                        children: [tier, " Coverage"],
                                      }),
                                    ],
                                  }),
                                }),

                                /* Department Column */
                                _jsx("td", {
                                  className: `py-4 px-6 whitespace-nowrap text-sm font-semibold ${isDark
                                    ? "text-zinc-200"
                                    : "text-slate-800"
                                    }`,
                                  children: selectedDepartment,
                                }),

                                /* Priority Column */
                                _jsx("td", {
                                  className: "py-4 px-6 whitespace-nowrap",
                                  children: _jsx("span", {
                                    className: `inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${getUrgencyBadge(
                                      urgency,
                                    )}`,
                                    children: urgency,
                                  }),
                                }),

                                /* Confidence Column */
                                _jsx("td", {
                                  className: "py-4 px-6 whitespace-nowrap",
                                  children: _jsx(ConfidenceBadge, {
                                    confidence: confidence,
                                    showBar: true,
                                  }),
                                }),

                                /* SLA Column */
                                _jsx("td", {
                                  className: "py-4 px-6 whitespace-nowrap",
                                  children: _jsx(SLAIndicator, {
                                    slaStatus: t.slaStatus,
                                    slaRemainingMinutes:
                                      t.slaRemainingMinutes,
                                    compact: true,
                                  }),
                                }),

                                /* Status Column */
                                _jsx("td", {
                                  className: "py-4 px-6 whitespace-nowrap",
                                  children: _jsx(StatusBadge, {
                                    status: t.status,
                                  }),
                                }),

                                /* Date Column */
                                _jsx("td", {
                                  className: `py-4 px-6 whitespace-nowrap text-xs ${isDark
                                    ? "text-zinc-400"
                                    : "text-slate-600"
                                    }`,
                                  children:
                                    t.created_at || t.createdAt
                                      ? new Date(
                                        t.created_at || t.createdAt,
                                      ).toLocaleDateString()
                                      : "N/A",
                                }),

                                /* Action Buttons Column */
                                _jsx("td", {
                                  className: "py-4 px-6 whitespace-nowrap",
                                  onClick: (e) => e.stopPropagation(),
                                  children: _jsxs("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                      t.status === "ESCALATED" &&
                                        _jsxs("button", {
                                          type: "button",
                                          onClick: () =>
                                            onEngineerResolution?.(t),
                                          className:
                                            "rounded-lg bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 text-[10px] font-bold text-white flex items-center gap-1 transition-colors",
                                          children: [
                                            _jsx(Wrench, { size: 12 }),
                                            _jsx("span", {
                                              children: "Engineer resolve",
                                            }),
                                          ],
                                        }),
                                      t.status === "FAILED" &&
                                        _jsx("button", {
                                          type: "button",
                                          onClick: (event) =>
                                            handleRetryTicket(t, event),
                                          disabled:
                                            retryingTicketId === ticketId,
                                          className:
                                            "rounded-lg bg-amber-600 hover:bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-white flex items-center gap-1 transition-colors disabled:opacity-60",
                                          children:
                                            retryingTicketId === ticketId
                                              ? "Retrying..."
                                              : "Retry Ticket",
                                        }),
                                      (t.status === "AWAITING HUMAN REVIEW" ||
                                        t.status === "PROCESSED")
                                        ? _jsxs(React.Fragment, {
                                            children: [
                                            _jsx("button", {
                                              onClick: () =>
                                                resolveTicket(t, false),
                                              className:
                                                "rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white transition-colors",
                                              children: "Approve",
                                            }),
                                            _jsxs("button", {
                                              onClick: () =>
                                                setExpandedTicketId(
                                                  isExpanded
                                                    ? null
                                                    : ticketId,
                                                ),
                                              className:
                                                "rounded-lg bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 text-[10px] font-bold text-white flex items-center gap-1 transition-colors",
                                              children: [
                                                _jsx(Edit3, { size: 12 }),
                                                _jsx("span", {
                                                  children: "Edit Draft",
                                                }),
                                                isExpanded
                                                  ? _jsx(ChevronUp, {
                                                    size: 12,
                                                  })
                                                  : _jsx(ChevronDown, {
                                                    size: 12,
                                                  }),
                                              ],
                                            }),
                                            ],
                                          })
                                        : _jsxs("button", {
                                            onClick: () =>
                                              setExpandedTicketId(
                                                isExpanded ? null : ticketId,
                                              ),
                                            className: `px-2 py-1 text-xs rounded-lg border flex items-center gap-1 ${isDark
                                              ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                              : "border-slate-300 text-slate-700 hover:bg-slate-100"
                                              }`,
                                            children: [
                                              _jsx("span", {
                                                children: "Details",
                                              }),
                                              isExpanded
                                                ? _jsx(ChevronUp, {
                                                    size: 12,
                                                  })
                                                : _jsx(ChevronDown, {
                                                    size: 12,
                                                  }),
                                            ],
                                          }),
                                    ],
                                  }),
                                }),
                              ],
                            }),

                            /* Expanded AI Triage Panel */
                            isExpanded &&
                            _jsx("tr", {
                              className: isDark
                                ? "bg-zinc-950/80"
                                : "bg-slate-50",
                              children: _jsx("td", {
                                colSpan: 9,
                                className: "p-6",
                                children: _jsxs("div", {
                                  className: "space-y-5 max-w-5xl",
                                  children: [
                                    /* Original ticket and account details */
                                    _jsxs("div", {
                                      className: `rounded-xl border p-4 space-y-3 ${isDark
                                        ? "border-zinc-800 bg-zinc-900/50"
                                        : "border-slate-200 bg-white"
                                        }`,
                                      children: [
                                        _jsx("p", {
                                          className: "text-[10px] font-bold uppercase tracking-wider text-indigo-400",
                                          children: "Original Ticket Submission",
                                        }),
                                        _jsxs("div", {
                                          className: "grid grid-cols-1 md:grid-cols-2 gap-3 text-xs",
                                          children: [
                                            _jsxs("div", {
                                              children: [
                                                _jsx("span", { className: "text-zinc-500 block", children: "Subject" }),
                                                _jsx("strong", { className: "block mt-1", children: t.subject || "Untitled ticket" }),
                                              ],
                                            }),
                                            _jsxs("div", {
                                              children: [
                                                _jsx("span", { className: "text-zinc-500 block", children: "Customer" }),
                                                _jsx("strong", { className: "block mt-1", children: email }),
                                              ],
                                            }),
                                            _jsxs("div", {
                                              className: "md:col-span-2",
                                              children: [
                                                _jsx("span", { className: "text-zinc-500 block", children: "Ticket body" }),
                                                _jsx("p", {
                                                  className: `mt-1 rounded-lg border p-3 whitespace-pre-line leading-relaxed ${isDark
                                                    ? "border-zinc-800 bg-zinc-950 text-zinc-300"
                                                    : "border-slate-200 bg-slate-50 text-slate-700"
                                                    }`,
                                                  children: t.description || t.body || "No ticket body provided.",
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                        _jsxs("div", {
                                          className: "grid grid-cols-2 md:grid-cols-4 gap-3 text-xs border-t pt-3 border-zinc-800",
                                          children: [
                                            _jsxs("span", { children: ["ID: ", _jsx("strong", { children: ticketId })] }),
                                            _jsxs("span", { children: ["Status: ", _jsx("strong", { children: t.status || "N/A" })] }),
                                            _jsxs("span", { children: ["Created: ", _jsx("strong", { children: t.createdAt ? new Date(t.createdAt).toLocaleString() : "N/A" })] }),
                                            _jsxs("span", { children: ["Updated: ", _jsx("strong", { children: t.updatedAt ? new Date(t.updatedAt).toLocaleString() : "N/A" })] }),
                                          ],
                                        }),
                                      ],
                                    }),
                                    /* AI Response Draft Textarea */
                                    _jsxs("div", {
                                      className: "space-y-2",
                                      children: [
                                        (t.cacheHit || t.semanticCache?.cacheHit) &&
                                          _jsxs("div", {
                                            className: `rounded-xl border p-3 text-xs ${isDark
                                              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200"
                                              : "border-emerald-200 bg-emerald-50 text-emerald-900"
                                              }`,
                                            children: [
                                              _jsx("div", {
                                                className:
                                                  "text-[10px] font-bold uppercase tracking-wider",
                                                children:
                                                  "Semantic Cache Hit",
                                              }),
                                              _jsxs("p", {
                                                className: "mt-1",
                                                children: [
                                                  "Matched resolved ticket: #",
                                                  t.matchedTicketId ??
                                                    t.semanticCache
                                                      ?.matchedTicketId ??
                                                    "N/A",
                                                ],
                                              }),
                                              _jsxs("p", {
                                                className: "mt-0.5",
                                                children: [
                                                  "Similarity: ",
                                                  _jsx("strong", {
                                                    children: `${
                                                      Math.round(
                                                        (t.semanticCache
                                                          ?.similarityScore ??
                                                          t.similarityScore ??
                                                          0) * 1000,
                                                      ) / 10
                                                    }%`,
                                                  }),
                                                ],
                                              }),
                                              _jsx("p", {
                                                className: "mt-0.5",
                                                children:
                                                  t.matchedResolutionText ||
                                                  t.semanticCache?.resolution ||
                                                  t.finalResponseText ||
                                                  "Resolution reused from previous incident.",
                                              }),
                                            ],
                                          }),
                                        _jsxs("div", {
                                          className:
                                            "flex items-center justify-between",
                                          children: [
                                            _jsxs("label", {
                                              className: `text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark
                                                ? "text-indigo-400"
                                                : "text-indigo-600"
                                                }`,
                                              children: [
                                                _jsx(Sparkles, {
                                                  size: 14,
                                                }),
                                                _jsx("span", {
                                                  children:
                                                    "AI Suggested Response Draft",
                                                }),
                                              ],
                                            }),
                                            (t.status ===
                                            "AWAITING HUMAN REVIEW" ||
                                              t.status === "PROCESSED") &&
                                            _jsxs("button", {
                                              onClick: () =>
                                                resolveTicket(t, true),
                                              className:
                                                "inline-flex items-center gap-1 rounded-md bg-indigo-600 hover:bg-indigo-500 px-3 py-1 text-xs font-semibold text-white transition-colors",
                                              children: [
                                                _jsx(CheckCircle, {
                                                  size: 13,
                                                }),
                                                _jsx("span", {
                                                  children:
                                                    "Save & Submit Response",
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                        _jsx("textarea", {
                                          rows: 9,
                                          value: currentDraft,
                                          onChange: (e) =>
                                            handleDraftChange(
                                              ticketId,
                                              e.target.value,
                                            ),
                                          placeholder:
                                            "AI solution draft will appear here...",
                                          className: `w-full p-4 text-sm leading-6 font-sans rounded-xl border shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark
                                            ? "bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-600"
                                            : "bg-white border-slate-300 text-black placeholder-slate-500"
                                            }`,
                                        }),
                                      ],
                                    }),

                                    /* Admin routing correction */
                                    _jsxs("div", {
                                      className: "space-y-1.5 space-x-1 sm:space-x-2",
                                      children: [
                                        _jsx("label", {
                                          className: `text-xs font-bold uppercase tracking-wider ${isDark
                                            ? "text-zinc-300"
                                            : "text-slate-900"
                                            }`,
                                          children: "Reroute Department",
                                        }),
                                        _jsx("select", {
                                          value: selectedDepartment,
                                          onChange: (e) =>
                                            setEditedDepartments(
                                              (prev) => ({
                                                ...prev,
                                                [ticketId]: e.target.value,
                                              }),
                                            ),
                                          className: `w-full max-w-md rounded-xl border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark
                                            ? "bg-zinc-900 border-zinc-700 text-white"
                                            : "bg-white border-slate-300 text-black"
                                            }`,
                                          children: DEPARTMENTS.map(
                                            (dept) =>
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

                                    /* AI Metadata & Telemetry Grid */
                                    _jsxs("div", {
                                      className: `grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t ${isDark
                                        ? "border-zinc-800"
                                        : "border-slate-200"
                                        }`,
                                      children: [
                                        /* Tags & Keywords */
                                        _jsxs("div", {
                                          className: "space-y-3",
                                          children: [
                                            t.searchQuery &&
                                            _jsxs("div", {
                                              children: [
                                                _jsx("span", {
                                                  className: `font-semibold block mb-1 ${isDark
                                                    ? "text-zinc-400"
                                                    : "text-slate-600"
                                                    }`,
                                                  children:
                                                    "RAG Search Query:",
                                                }),
                                                _jsxs("span", {
                                                  className: `inline-block font-mono px-2 py-1 rounded border text-[11px] ${isDark
                                                    ? "bg-zinc-900 border-zinc-800 text-zinc-300"
                                                    : "bg-white border-slate-200 text-slate-700"
                                                    }`,
                                                  children: [
                                                    '"',
                                                    t.searchQuery,
                                                    '"',
                                                  ],
                                                }),
                                              ],
                                            }),
                                            _jsxs("div", {
                                              className: `rounded-lg border p-2.5 ${isDark
                                                ? "bg-zinc-900 border-zinc-800 text-zinc-200"
                                                : "bg-white border-slate-200 text-slate-900"
                                                }`,
                                              children: [
                                                _jsx("span", {
                                                  className:
                                                    "font-semibold",
                                                  children:
                                                    "RAG retrieval attempts: ",
                                                }),
                                                _jsxs("strong", {
                                                  children: [
                                                    t.ragRetries,
                                                    " retries",
                                                  ],
                                                }),
                                                t.evalFeedback &&
                                                _jsxs("p", {
                                                  className: `mt-1 ${isDark
                                                    ? "text-zinc-400"
                                                    : "text-slate-600"
                                                    }`,
                                                  children: [
                                                    "Latest retrieval feedback: ",
                                                    t.evalFeedback,
                                                  ],
                                                }),
                                              ],
                                            }),
                                            _jsxs("div", {
                                              children: [
                                                _jsxs("span", {
                                                  className: `font-semibold flex items-center gap-1 mb-1.5 ${isDark
                                                    ? "text-zinc-400"
                                                    : "text-slate-600"
                                                    }`,
                                                  children: [
                                                    _jsx(TagIcon, {
                                                      size: 12,
                                                    }),
                                                    _jsx("span", {
                                                      children:
                                                        "Triage Tags:",
                                                    }),
                                                  ],
                                                }),
                                                _jsx("div", {
                                                  className:
                                                    "flex flex-wrap gap-1.5",
                                                  children:
                                                    (t.tags || []).length >
                                                      0
                                                      ? t.tags.map(
                                                        (tag, i) =>
                                                          _jsxs(
                                                            "span",
                                                            {
                                                              className:
                                                                "px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
                                                              children: [
                                                                "#",
                                                                tag,
                                                              ],
                                                            },
                                                            i,
                                                          ),
                                                      )
                                                      : _jsx("span", {
                                                        className:
                                                          "text-zinc-500 italic",
                                                        children:
                                                          "No tags assigned",
                                                      }),
                                                }),
                                              ],
                                            }),
                                            _jsxs("div", {
                                              children: [
                                                _jsxs("span", {
                                                  className: `font-semibold flex items-center gap-1 mb-1.5 ${isDark
                                                    ? "text-zinc-400"
                                                    : "text-slate-600"
                                                    }`,
                                                  children: [
                                                    _jsx(KeyIcon, {
                                                      size: 12,
                                                    }),
                                                    _jsx("span", {
                                                      children:
                                                        "Extracted Keywords:",
                                                    }),
                                                  ],
                                                }),
                                                _jsx("div", {
                                                  className:
                                                    "flex flex-wrap gap-1.5",
                                                  children:
                                                    (
                                                      t.extractedKeywords ||
                                                      []
                                                    ).length > 0
                                                      ? t.extractedKeywords.map(
                                                        (kw, i) =>
                                                          _jsx(
                                                            "span",
                                                            {
                                                              className: `px-2 py-0.5 rounded text-[10px] border ${isDark
                                                                ? "bg-zinc-900 border-zinc-800 text-zinc-300"
                                                                : "bg-slate-200 border-slate-300 text-slate-700"
                                                                }`,
                                                              children:
                                                                kw,
                                                            },
                                                            i,
                                                          ),
                                                      )
                                                      : _jsx("span", {
                                                        className:
                                                          "text-zinc-500 italic",
                                                        children:
                                                          "No keywords extracted",
                                                      }),
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),

                                        /* Retrieved Docs & Latency Metrics */
                                        _jsxs("div", {
                                          className: "space-y-3",
                                          children: [
                                            _jsxs("div", {
                                              children: [
                                                _jsxs("span", {
                                                  className: `font-semibold flex items-center gap-1 mb-1.5 ${isDark
                                                    ? "text-zinc-400"
                                                    : "text-slate-600"
                                                    }`,
                                                  children: [
                                                    _jsx(FileText, {
                                                      size: 12,
                                                    }),
                                                    _jsx("span", {
                                                      children:
                                                        "Retrieved Knowledge Docs:",
                                                    }),
                                                  ],
                                                }),
                                                _jsx("div", {
                                                  className: "space-y-1",
                                                  children:
                                                    (
                                                      t.retrievedDocs ||
                                                      t.grounding_source_ids ||
                                                      []
                                                    ).length > 0
                                                      ? (
                                                        t.retrievedDocs ||
                                                        t.grounding_source_ids
                                                      ).map((doc, idx) =>
                                                        _jsx(
                                                          "div",
                                                          {
                                                            className: `p-1.5 rounded text-[11px] font-mono border ${isDark
                                                              ? "bg-zinc-900 border-zinc-800 text-zinc-300"
                                                              : "bg-white border-slate-200 text-slate-700"
                                                              }`,
                                                            children:
                                                              typeof doc ===
                                                                "string"
                                                                ? doc
                                                                : JSON.stringify(
                                                                  doc,
                                                                ),
                                                          },
                                                          idx,
                                                        ),
                                                      )
                                                      : _jsx("span", {
                                                        className:
                                                          "text-zinc-500 italic",
                                                        children:
                                                          "No grounding sources retrieved",
                                                      }),
                                                }),
                                              ],
                                            }),
                                            _jsxs("div", {
                                              children: [
                                                _jsxs("span", {
                                                  className: `font-semibold flex items-center gap-1 mb-1 ${isDark
                                                    ? "text-zinc-400"
                                                    : "text-slate-600"
                                                    }`,
                                                  children: [
                                                    _jsx(Clock, {
                                                      size: 12,
                                                    }),
                                                    _jsx("span", {
                                                      children:
                                                        "Telemetry & Pipeline Latency:",
                                                    }),
                                                  ],
                                                }),
                                                _jsxs("div", {
                                                  className: `flex gap-4 p-2 rounded-lg border text-[11px] font-mono ${isDark
                                                    ? "bg-zinc-900 border-zinc-800 text-zinc-300"
                                                    : "bg-white border-slate-200 text-slate-700"
                                                    }`,
                                                  children: [
                                                    _jsxs("span", {
                                                      children: [
                                                        "Initial Latency: ",
                                                        _jsxs("strong", {
                                                          children: [
                                                            t.initialLatency && Number.isFinite(Number(t.initialLatency))
                                                              ? (() => {
                                                                const secs = Number(t.initialLatency) / 1000;
                                                                return secs >= 60
                                                                  ? `${(secs / 60).toFixed(1)}m`
                                                                  : `${secs.toFixed(2)}s`;
                                                              })()
                                                              : "N/A",
                                                          ],
                                                        }),
                                                      ],
                                                    })
                                                    ,
                                                    _jsxs("span", {
                                                      children: [
                                                        "Total Latency: ",
                                                        _jsxs("strong", {
                                                          children: [
                                                            t.totalLatency ??
                                                            t.latencyMs ??
                                                            "N/A",
                                                            "ms",
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
                                      ],
                                    }),
                                    t.telemetry && Object.keys(t.telemetry).length > 0 &&
                                    _jsxs("div", {
                                      className: `rounded-xl border p-3 text-xs ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-slate-200 bg-white"}`,
                                      children: [
                                        _jsx("p", { className: "font-bold uppercase tracking-wider text-indigo-400 mb-2", children: "Ticket telemetry" }),
                                        _jsx("dl", { className: "grid grid-cols-2 gap-x-4 gap-y-2", children: Object.entries(t.telemetry).map(([key, value]) => _jsxs("div", { children: [_jsx("dt", { className: "text-zinc-500", children: key.replace(/_/g, " ") }), _jsx("dd", { className: "font-medium break-words", children: typeof value === "object" ? JSON.stringify(value) : String(value) })] }, key)) }),
                                      ],
                                    }),
                                  ],
                                }),
                              }),
                            }),
                          ],
                        },
                        ticketId,
                      );
                    }),
                  }),
                ],
              }),
            }),
      }),
    ],
  });
}
