import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BellRing, ShieldAlert } from "lucide-react";
import { fetchLatestAlert } from "../api";
export default function AdminOverview({
  tickets,
  incidents,
  onSelectTicket,
  onNavigateTab,
  onSelectIncident,
  theme,
  adminName = "Administrator",
}) {
  const isDark = theme === "dark";
  const [alert, setAlert] = useState(null);
  useEffect(() => {
    fetchLatestAlert()
      .then((result) => {
        const response = result;
        const value = response.alert;
        setAlert(
          typeof value === "string"
            ? value
            : value
              ? JSON.stringify(value)
              : (response.message ?? null),
        );
      })
      .catch(() => setAlert(null));
  }, []);
  const pending = tickets.filter(
    (ticket) => ticket.status === "AWAITING HUMAN REVIEW",
  );
  const processed = tickets.filter(
    (ticket) => ticket.status === "PROCESSED",
  );
  const attention = useMemo(
    () =>
      pending
        .filter((ticket) => {
          const tier = ticket.userTier.toLowerCase();
          return (
            tier === "enterprise" ||
            (tier === "team" && ticket.urgency === "High") ||
            ticket.urgency === "High" ||
            ticket.urgency === "Critical"
          );
        })
        .sort((a, b) => {
          const enterprise = (ticket) =>
            ticket.userTier.toLowerCase() === "enterprise" ? 1 : 0;
          return (
            enterprise(b) - enterprise(a) || b.aiConfidence - a.aiConfidence
          );
        }),
    [pending],
  );
  const card = (label, value, detail, action) =>
    _jsxs("button", {
      onClick: action,
      className: `rounded-2xl border z-0 p-5 text-left transition hover:-translate-y-0.5 ${isDark ? "glass-panel border-zinc-800 hover:border-indigo-500/60" : "glass-panel-light border-slate-200"}`,
      children: [
        _jsx("p", {
          className: "text-xs font-mono text-zinc-500",
          children: label,
        }),
        _jsx("p", {
          className: `mt-2 text-4xl font-bold font-mono ${isDark ? "text-white" : "text-slate-900"}`,
          children: value,
        }),
        _jsx("p", {
          className: "mt-2 text-sm text-zinc-500",
          children: detail,
        }),
      ],
    });
  return _jsxs("div", {
    className: "space-y-7 animate-slide-up font-mono",
    children: [
      _jsxs("header", {
        children: [
          _jsx("p", {
            className: "text-sm text-indigo-400",
            children: "Operations dashboard",
          }),
          _jsxs("h1", {
            className: `mt-1 text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`,
            children: ["Good morning, ", adminName],
          }),
          _jsx("p", {
            className: "mt-2 text-base text-zinc-500",
            children:
              "Review AI-assisted customer support decisions and highest-risk accounts.",
          }),
        ],
      }),
      _jsxs("section", {
        className: "grid gap-4 md:grid-cols-3",
        children: [
          card(
            "Tickets received",
            tickets.length,
            "All tickets received",
            () => onNavigateTab("tickets"),
          ),
          card("Processed", processed.length, "Tickets ready for review", () =>
            onNavigateTab("tickets"),
          ),
          card(
            "Awaiting review",
            pending.length,
            "All tickets awaiting review",
            () => onNavigateTab("tickets"),
          ),
        ],
      }),
      _jsxs("section", {
        className: `rounded-2xl border p-6 ${isDark ? "glass-panel border-zinc-800" : "glass-panel-light border-slate-200"}`,
        children: [
          _jsxs("div", {
            className: "flex items-center gap-2",
            children: [
              _jsx(BellRing, { className: "text-indigo-400", size: 19 }),
              _jsx("h2", {
                className: "text-lg font-bold",
                children: "AI morning brief",
              }),
            ],
          }),
          _jsx("p", {
            className: "mt-3 text-base leading-relaxed text-zinc-400",
            children: alert ?? "No documentation drift alerts yet.",
          }),
        ],
      }),
      _jsxs("section", {
        className: "grid gap-6 xl:grid-cols-[1.5fr_1fr]",
        children: [
          _jsxs("div", {
            className: `rounded-2xl border p-6 ${isDark ? "glass-panel border-zinc-800" : "glass-panel-light border-slate-200"}`,
            children: [
              _jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  _jsx(AlertTriangle, { className: "text-rose-400" }),
                  _jsx("h2", {
                    className: "text-lg font-bold",
                    children: "Needs your attention",
                  }),
                ],
              }),
              _jsx("p", {
                className: "mt-2 text-sm text-zinc-500",
                children:
                  "Enterprise accounts are prioritized, followed by high-priority and Team Account tickets.",
              }),
              _jsx("div", {
                className: "mt-5 space-y-3",
                children: attention.length
                  ? attention.slice(0, 6).map((ticket) =>
                      _jsxs(
                        "button",
                        {
                          onClick: () => onSelectTicket(ticket),
                          className: `flex w-full items-center justify-between rounded-xl border p-4 text-left ${isDark ? "border-zinc-800 hover:bg-zinc-900" : "border-slate-200 hover:bg-slate-50"}`,
                          children: [
                            _jsxs("div", {
                              children: [
                                _jsx("p", {
                                  className: "font-bold",
                                  children: ticket.subject,
                                }),
                                _jsxs("p", {
                                  className: "mt-1 text-sm text-zinc-500",
                                  children: [
                                    ticket.id,
                                    " \u00B7 ",
                                    ticket.userTier,
                                    " \u00B7 ",
                                    ticket.urgency,
                                    " priority",
                                  ],
                                }),
                              ],
                            }),
                            _jsxs("span", {
                              className: "font-mono text-indigo-400",
                              children: [
                                Math.round(ticket.aiConfidence * 100),
                                "% ",
                                _jsx(ArrowRight, {
                                  className: "inline",
                                  size: 15,
                                }),
                              ],
                            }),
                          ],
                        },
                        ticket.id,
                      ),
                    )
                  : _jsx("p", {
                      className: "py-8 text-center text-zinc-500",
                      children: "No pending high-priority tickets.",
                    }),
              }),
            ],
          }),
          _jsxs("div", {
            className: `rounded-2xl border p-6 ${isDark ? "glass-panel border-zinc-800" : "glass-panel-light border-slate-200"}`,
            children: [
              _jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  _jsx(ShieldAlert, { className: "text-amber-400" }),
                  _jsx("h2", {
                    className: "text-lg font-bold",
                    children: "Incident signals",
                  }),
                ],
              }),
              _jsx("div", {
                className: "mt-5 space-y-3",
                children: incidents.length
                  ? incidents.map((incident) =>
                      _jsxs(
                        "button",
                        {
                          onClick: () => onSelectIncident(incident),
                          className:
                            "w-full rounded-xl border border-zinc-800 p-4 text-left hover:bg-zinc-900",
                          children: [
                            _jsx("p", {
                              className: "font-bold",
                              children: incident.title,
                            }),
                            _jsxs("p", {
                              className: "mt-1 text-sm text-zinc-500",
                              children: [
                                incident.relatedTicketCount,
                                " linked tickets \u00B7 ",
                                incident.affectedRegions.join(", "),
                              ],
                            }),
                          ],
                        },
                        incident.id,
                      ),
                    )
                  : _jsx("p", {
                      className: "py-8 text-center text-zinc-500",
                      children: "No incident clusters detected.",
                    }),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
