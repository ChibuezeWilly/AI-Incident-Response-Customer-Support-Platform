import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import {
  Filter,
  Search,
  ShieldAlert,
  Cpu,
  RotateCw,
  HelpCircle,
  Layers,
  ArrowUpRight,
} from "lucide-react";
export default function Dashboard({ tickets, onSelectTicket, theme }) {
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedUrgency, setSelectedUrgency] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const isDark = theme === "dark";
  // Dashboard Stats Calculations
  const stats = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter((t) => t.status === "Pending Review").length;
    const routed = tickets.filter((t) => t.status === "Routed").length;
    const resolved = tickets.filter((t) => t.status === "Resolved").length;
    const confidenceSum = tickets.reduce((sum, t) => sum + t.aiConfidence, 0);
    const avgConfidence = total > 0 ? (confidenceSum / total) * 100 : 0;
    const latencySum = tickets.reduce((sum, t) => sum + t.latencyMs, 0);
    const avgLatency = total > 0 ? Math.round(latencySum / total) : 0;
    return { total, pending, routed, resolved, avgConfidence, avgLatency };
  }, [tickets]);
  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesDept =
        selectedDept === "All" || ticket.department === selectedDept;
      const matchesUrgency =
        selectedUrgency === "All" || ticket.urgency === selectedUrgency;
      const matchesStatus =
        selectedStatus === "All" || ticket.status === selectedStatus;
      const matchesSearch =
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesUrgency && matchesStatus && matchesSearch;
    });
  }, [tickets, selectedDept, selectedUrgency, selectedStatus, searchQuery]);
  // Styling helpers
  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending Review":
        return _jsxs("span", {
          className:
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20",
          children: [
            _jsx("span", {
              className: "w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse",
            }),
            "Pending Review",
          ],
        });
      case "Routed":
        return _jsxs("span", {
          className:
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/20",
          children: [
            _jsx("span", {
              className: "w-1.5 h-1.5 rounded-full bg-indigo-550",
            }),
            "Routed",
          ],
        });
      case "Resolved":
        return _jsxs("span", {
          className:
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
          children: [
            _jsx("span", {
              className: "w-1.5 h-1.5 rounded-full bg-emerald-500",
            }),
            "Resolved",
          ],
        });
    }
  };
  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case "Critical":
        return _jsx("span", {
          className:
            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/25 uppercase tracking-wide",
          children: "Critical",
        });
      case "High":
        return _jsx("span", {
          className:
            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/25 uppercase tracking-wide",
          children: "High",
        });
      case "Medium":
        return _jsx("span", {
          className:
            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-600 dark:text-yellow-450 border border-yellow-500/25 uppercase tracking-wide",
          children: "Medium",
        });
      case "Low":
        return _jsx("span", {
          className: `inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${isDark ? "bg-zinc-800 text-zinc-400 border-zinc-700" : "bg-slate-100 text-slate-500 border-slate-200"}`,
          children: "Low",
        });
    }
  };
  const getUserTierStyle = (tier) => {
    switch (tier) {
      case "VIP":
        return "text-rose-500 dark:text-rose-400 font-extrabold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 text-[9px]";
      case "Premium":
        return "text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[9px]";
      default:
        return "text-zinc-500 dark:text-zinc-400 text-[9px]";
    }
  };
  return _jsxs("div", {
    className: "space-y-8 animate-slide-up",
    children: [
      _jsxs("div", {
        className: "grid grid-cols-1 md:grid-cols-4 gap-4",
        children: [
          _jsxs("div", {
            className: `rounded-2xl p-5 flex items-center justify-between border ${isDark ? "glass-panel border-zinc-800/80" : "glass-panel-light border-slate-200/80"}`,
            children: [
              _jsxs("div", {
                className: "space-y-1",
                children: [
                  _jsx("span", {
                    className: `text-[10px] font-bold tracking-wider uppercase ${isDark ? "text-zinc-500" : "text-slate-400"}`,
                    children: "Total Cases",
                  }),
                  _jsx("p", {
                    className: `text-3xl font-extrabold ${isDark ? "text-white" : "text-slate-900"}`,
                    children: stats.total,
                  }),
                ],
              }),
              _jsx("div", {
                className: `p-3 rounded-xl border ${isDark ? "bg-zinc-900 border-zinc-800 text-zinc-450" : "bg-slate-50 border-slate-200/80 text-slate-450"}`,
                children: _jsx(Layers, { size: 18 }),
              }),
            ],
          }),
          _jsxs("div", {
            className: `rounded-2xl p-5 flex items-center justify-between border ${isDark ? "glass-panel border-zinc-800/80" : "glass-panel-light border-slate-200/80"}`,
            children: [
              _jsxs("div", {
                className: "space-y-1",
                children: [
                  _jsx("span", {
                    className: `text-[10px] font-bold tracking-wider uppercase ${isDark ? "text-zinc-500" : "text-slate-400"}`,
                    children: "HITL Pending",
                  }),
                  _jsx("p", {
                    className: "text-3xl font-extrabold text-amber-500",
                    children: stats.pending,
                  }),
                ],
              }),
              _jsx("div", {
                className: `p-3 rounded-xl border ${isDark ? "bg-amber-500/5 border-amber-550/10 text-amber-500" : "bg-amber-500/5 border-amber-500/20 text-amber-600"}`,
                children: _jsx(ShieldAlert, { size: 18 }),
              }),
            ],
          }),
          _jsxs("div", {
            className: `rounded-2xl p-5 flex items-center justify-between border ${isDark ? "glass-panel border-zinc-800/80" : "glass-panel-light border-slate-200/80"}`,
            children: [
              _jsxs("div", {
                className: "space-y-1",
                children: [
                  _jsx("span", {
                    className: `text-[10px] font-bold tracking-wider uppercase ${isDark ? "text-zinc-500" : "text-slate-400"}`,
                    children: "Avg Confidence",
                  }),
                  _jsxs("p", {
                    className: `text-3xl font-extrabold ${isDark ? "text-indigo-400" : "text-indigo-600"}`,
                    children: [stats.avgConfidence.toFixed(0), "%"],
                  }),
                ],
              }),
              _jsx("div", {
                className: `p-3 rounded-xl border ${isDark ? "bg-indigo-500/5 border-indigo-500/10 text-indigo-400" : "bg-indigo-500/5 border-indigo-500/20 text-indigo-600"}`,
                children: _jsx(Cpu, { size: 18 }),
              }),
            ],
          }),
          _jsxs("div", {
            className: `rounded-2xl p-5 flex items-center justify-between border ${isDark ? "glass-panel border-zinc-800/80" : "glass-panel-light border-slate-200/80"}`,
            children: [
              _jsxs("div", {
                className: "space-y-1",
                children: [
                  _jsx("span", {
                    className: `text-[10px] font-bold tracking-wider uppercase ${isDark ? "text-zinc-500" : "text-slate-400"}`,
                    children: "Routing Time",
                  }),
                  _jsxs("p", {
                    className: `text-3xl font-extrabold ${isDark ? "text-emerald-400" : "text-emerald-600"}`,
                    children: [stats.avgLatency, "ms"],
                  }),
                ],
              }),
              _jsx("div", {
                className: `p-3 rounded-xl border ${isDark ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" : "bg-emerald-500/5 border-emerald-500/20 text-emerald-650"}`,
                children: _jsx(RotateCw, {
                  size: 18,
                  className: "animate-pulse-slow",
                }),
              }),
            ],
          }),
        ],
      }),
      _jsxs("div", {
        className: `rounded-2xl p-6 border ${isDark ? "glass-panel border-zinc-800" : "glass-panel-light border-slate-200"}`,
        children: [
          _jsxs("div", {
            className:
              "flex flex-col lg:flex-row lg:items-center justify-between gap-4",
            children: [
              _jsxs("div", {
                children: [
                  _jsx("h2", {
                    className: `text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`,
                    children: "Agent Operations Desk",
                  }),
                  _jsx("p", {
                    className: `text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-slate-500"}`,
                    children:
                      "Filter incoming routing streams and override AI classification tags.",
                  }),
                ],
              }),
              _jsxs("div", {
                className: "relative w-full lg:w-80",
                children: [
                  _jsx(Search, {
                    className: `absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? "text-zinc-500" : "text-slate-400"}`,
                    size: 16,
                  }),
                  _jsx("input", {
                    type: "text",
                    value: searchQuery,
                    onChange: (e) => setSearchQuery(e.target.value),
                    placeholder: "Search Subject, ID, Description...",
                    className: `w-full border rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500"
                        : "bg-white border-slate-300 text-slate-850 placeholder-slate-400 shadow-sm"
                    }`,
                  }),
                ],
              }),
            ],
          }),
          _jsxs("div", {
            className: `grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-4 ${isDark ? "border-zinc-800/60" : "border-slate-200/60"}`,
            children: [
              _jsxs("div", {
                className: "space-y-1.5",
                children: [
                  _jsxs("label", {
                    className: `text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${isDark ? "text-zinc-400" : "text-slate-500"}`,
                    children: [
                      _jsx(Filter, { size: 10 }),
                      _jsx("span", { children: "Department" }),
                    ],
                  }),
                  _jsxs("select", {
                    value: selectedDept,
                    onChange: (e) => setSelectedDept(e.target.value),
                    className: `w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-zinc-300"
                        : "bg-white border-slate-300 text-slate-700 shadow-sm"
                    }`,
                    children: [
                      _jsx("option", {
                        value: "All",
                        children: "All Departments",
                      }),
                      _jsx("option", {
                        value: "IT",
                        children: "IT (Information Technology)",
                      }),
                      _jsx("option", {
                        value: "HR",
                        children: "HR (Human Resources)",
                      }),
                      _jsx("option", {
                        value: "Facilities",
                        children: "Facilities",
                      }),
                      _jsx("option", { value: "Finance", children: "Finance" }),
                    ],
                  }),
                ],
              }),
              _jsxs("div", {
                className: "space-y-1.5",
                children: [
                  _jsxs("label", {
                    className: `text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${isDark ? "text-zinc-400" : "text-slate-500"}`,
                    children: [
                      _jsx(Filter, { size: 10 }),
                      _jsx("span", { children: "Urgency" }),
                    ],
                  }),
                  _jsxs("select", {
                    value: selectedUrgency,
                    onChange: (e) => setSelectedUrgency(e.target.value),
                    className: `w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-zinc-300"
                        : "bg-white border-slate-300 text-slate-700 shadow-sm"
                    }`,
                    children: [
                      _jsx("option", {
                        value: "All",
                        children: "All Urgency Levels",
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
              _jsxs("div", {
                className: "space-y-1.5",
                children: [
                  _jsxs("label", {
                    className: `text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${isDark ? "text-zinc-400" : "text-slate-500"}`,
                    children: [
                      _jsx(Filter, { size: 10 }),
                      _jsx("span", { children: "Routing Status" }),
                    ],
                  }),
                  _jsxs("select", {
                    value: selectedStatus,
                    onChange: (e) => setSelectedStatus(e.target.value),
                    className: `w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-zinc-300"
                        : "bg-white border-slate-300 text-slate-700 shadow-sm"
                    }`,
                    children: [
                      _jsx("option", {
                        value: "All",
                        children: "All Statuses",
                      }),
                      _jsx("option", {
                        value: "Pending Review",
                        children: "Pending Review (HITL)",
                      }),
                      _jsx("option", {
                        value: "Routed",
                        children: "Routed (Approved)",
                      }),
                      _jsx("option", {
                        value: "Resolved",
                        children: "Resolved",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      _jsx("div", {
        className: `rounded-2xl overflow-hidden border ${isDark ? "glass-panel border-zinc-800" : "glass-panel-light border-slate-200"}`,
        children:
          filteredTickets.length === 0
            ? _jsxs("div", {
                className: "py-16 text-center text-zinc-500 space-y-2",
                children: [
                  _jsx(HelpCircle, {
                    className: "mx-auto text-zinc-650 mb-1",
                    size: 24,
                  }),
                  _jsx("p", {
                    className: "text-sm font-semibold",
                    children: "No incidents found",
                  }),
                  _jsx("p", {
                    className: "text-xs text-zinc-650",
                    children:
                      "Try adjusting your filters or search input values.",
                  }),
                ],
              })
            : _jsx("div", {
                className: "overflow-x-auto",
                children: _jsxs("table", {
                  className: "w-full text-left border-collapse",
                  children: [
                    _jsx("thead", {
                      children: _jsxs("tr", {
                        className: `border-b text-[10px] font-bold uppercase tracking-wider ${
                          isDark
                            ? "border-zinc-800 bg-zinc-900/40 text-zinc-400"
                            : "border-slate-200 bg-slate-100/50 text-slate-500"
                        }`,
                        children: [
                          _jsx("th", {
                            className: "py-4 px-6",
                            children: "ID & Sender",
                          }),
                          _jsx("th", {
                            className: "py-4 px-6",
                            children: "Incident Details",
                          }),
                          _jsx("th", {
                            className: "py-4 px-6 text-center",
                            children: "Urgency",
                          }),
                          _jsx("th", {
                            className: "py-4 px-6",
                            children: "Assigned Dept",
                          }),
                          _jsx("th", {
                            className: "py-4 px-6",
                            children: "AI Confidence",
                          }),
                          _jsx("th", {
                            className: "py-4 px-6",
                            children: "Status",
                          }),
                          _jsx("th", {
                            className: "py-4 px-6 text-right",
                            children: "Actions",
                          }),
                        ],
                      }),
                    }),
                    _jsx("tbody", {
                      className: `divide-y ${isDark ? "divide-zinc-900" : "divide-slate-200/50"}`,
                      children: filteredTickets.map((ticket) =>
                        _jsxs(
                          "tr",
                          {
                            className: `transition-colors group cursor-pointer ${isDark ? "hover:bg-zinc-900/30" : "hover:bg-slate-100/30"}`,
                            onClick: () => onSelectTicket(ticket),
                            children: [
                              _jsx("td", {
                                className: "py-4 px-6 whitespace-nowrap",
                                children: _jsxs("div", {
                                  className: "flex flex-col gap-0.5",
                                  children: [
                                    _jsx("span", {
                                      className: `text-xs font-mono font-bold transition-colors ${isDark ? "text-white group-hover:text-indigo-400" : "text-slate-900 group-hover:text-indigo-650"}`,
                                      children: ticket.id,
                                    }),
                                    _jsxs("div", {
                                      className: "flex items-center gap-1.5",
                                      children: [
                                        _jsx("span", {
                                          className: `text-[9px] truncate max-w-[120px] ${isDark ? "text-zinc-500" : "text-slate-400"}`,
                                          children: ticket.userEmail,
                                        }),
                                        _jsx("span", {
                                          className: getUserTierStyle(
                                            ticket.userTier,
                                          ),
                                          children: ticket.userTier,
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              }),
                              _jsx("td", {
                                className: "py-4 px-6 max-w-sm",
                                children: _jsxs("div", {
                                  className: "flex flex-col gap-0.5",
                                  children: [
                                    _jsx("p", {
                                      className: `text-xs font-semibold truncate transition-colors ${isDark ? "text-zinc-200 group-hover:text-white" : "text-slate-800 group-hover:text-slate-950"}`,
                                      children: ticket.subject,
                                    }),
                                    _jsx("p", {
                                      className: `text-[10px] truncate ${isDark ? "text-zinc-500" : "text-slate-400"}`,
                                      children: ticket.description,
                                    }),
                                  ],
                                }),
                              }),
                              _jsx("td", {
                                className:
                                  "py-4 px-6 text-center whitespace-nowrap",
                                children: getUrgencyBadge(ticket.urgency),
                              }),
                              _jsx("td", {
                                className: "py-4 px-6 whitespace-nowrap",
                                children: _jsx("span", {
                                  className: `text-xs font-semibold ${isDark ? "text-zinc-300" : "text-slate-700"}`,
                                  children: ticket.department,
                                }),
                              }),
                              _jsx("td", {
                                className: "py-4 px-6 whitespace-nowrap",
                                children: _jsxs("div", {
                                  className: "flex items-center gap-2",
                                  children: [
                                    _jsxs("span", {
                                      className: `text-xs font-mono font-bold ${isDark ? "text-zinc-400" : "text-slate-500"}`,
                                      children: [
                                        (ticket.aiConfidence * 100).toFixed(0),
                                        "%",
                                      ],
                                    }),
                                    _jsx("div", {
                                      className: `w-12 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-zinc-800" : "bg-slate-200"}`,
                                      children: _jsx("div", {
                                        className: `h-full rounded-full ${
                                          ticket.aiConfidence >= 0.9
                                            ? "bg-indigo-500"
                                            : ticket.aiConfidence >= 0.75
                                              ? "bg-amber-550"
                                              : "bg-rose-500"
                                        }`,
                                        style: {
                                          width: `${ticket.aiConfidence * 100}%`,
                                        },
                                      }),
                                    }),
                                  ],
                                }),
                              }),
                              _jsx("td", {
                                className: "py-4 px-6 whitespace-nowrap",
                                children: getStatusBadge(ticket.status),
                              }),
                              _jsx("td", {
                                className:
                                  "py-4 px-6 text-right whitespace-nowrap",
                                children:
                                  ticket.status === "Pending Review"
                                    ? _jsxs("button", {
                                        onClick: (e) => {
                                          e.stopPropagation();
                                          onSelectTicket(ticket);
                                        },
                                        className: `inline-flex items-center gap-1 py-1.5 px-3 rounded-lg text-[9px] font-extrabold border transition-colors uppercase tracking-wider ${
                                          isDark
                                            ? "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25 text-amber-400"
                                            : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25 text-amber-600"
                                        }`,
                                        children: [
                                          _jsx("span", { children: "Review" }),
                                          _jsx(ArrowUpRight, { size: 11 }),
                                        ],
                                      })
                                    : _jsx("button", {
                                        onClick: (e) => {
                                          e.stopPropagation();
                                          onSelectTicket(ticket);
                                        },
                                        className: `inline-flex items-center gap-1 py-1.5 px-3 rounded-lg text-[9px] font-extrabold border transition-colors uppercase tracking-wider ${
                                          isDark
                                            ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border-zinc-700"
                                            : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 border-slate-200"
                                        }`,
                                        children: _jsx("span", {
                                          children: "Details",
                                        }),
                                      }),
                              }),
                            ],
                          },
                          ticket.id,
                        ),
                      ),
                    }),
                  ],
                }),
              }),
      }),
    ],
  });
}
