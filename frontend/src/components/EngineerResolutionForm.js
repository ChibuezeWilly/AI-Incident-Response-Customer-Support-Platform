"use client";

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment as _Fragment, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  LoaderCircle,
  Wrench,
  Ticket,
} from "lucide-react";
import { submitEngineerResolution } from "../api/tickets";

const initialForm = (engineerId) => ({
  troubleshooting_steps: "",
  root_cause: "",
  solution: "",
  engineer_id: engineerId == null ? "" : String(engineerId),
});

export default function EngineerResolutionForm({
  ticket,
  tickets = [],
  engineerId,
  theme = "dark",
  onBack,
  onResolved,
  onSelectTicket,
}) {
  const isDark = theme === "dark";
  const ticketId = ticket?.id ?? ticket?.ticket_id;

  const availableTickets = tickets.filter(
    (item) => String(item?.status || "").toUpperCase() === "ESCALATED",
  );

  const [form, setForm] = useState(() => initialForm(engineerId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setForm(initialForm(engineerId));
    setError("");
    setSuccess("");
  }, [ticketId, engineerId]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!ticketId) {
      setError("Please select a ticket first.");
      return;
    }

    const troubleshootingSteps = form.troubleshooting_steps.trim();
    const rootCause = form.root_cause.trim();
    const solution = form.solution.trim();
    const resolvedBy = Number(form.engineer_id);

    if (!troubleshootingSteps || !rootCause || !solution) {
      setError("Complete the troubleshooting steps, root cause, and solution.");
      return;
    }

    if (!Number.isInteger(resolvedBy) || resolvedBy < 1) {
      setError("Enter a valid engineer ID.");
      return;
    }

    setSubmitting(true);

    try {
      await submitEngineerResolution(ticketId, {
        troubleshooting_steps: troubleshootingSteps,
        root_cause: rootCause,
        solution,
        engineer_id: resolvedBy,
      });

      await onResolved?.();

      setSuccess(`Ticket #${ticketId} has been marked as resolved.`);
    } catch (requestError) {
      const detail = requestError?.body?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : requestError?.message || "Unable to save the engineer resolution.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 ${
    isDark
      ? "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
      : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
  }`;

  const labelClass = `mb-1.5 block text-xs font-bold uppercase tracking-wider ${
    isDark ? "text-zinc-400" : "text-slate-600"
  }`;

  return _jsx("section", {
    className: "w-full min-h-full py-3",
    children: _jsxs(_Fragment, {
      children: [
        _jsxs("div", {
          className: "mb-6 flex items-center justify-between gap-3",
          children: [
            _jsxs("div", {
              children: [
                _jsx("p", {
                  className:
                    "text-xs font-bold uppercase tracking-widest text-indigo-400",
                  children: "Engineer Workspace",
                }),
                _jsx("h1", {
                  className: `mt-1 text-2xl font-black ${
                    isDark ? "text-white" : "text-slate-900"
                  }`,
                  children: "Engineer Resolution",
                }),
              ],
            }),
            _jsxs("button", {
              type: "button",
              onClick: onBack,
              className: `inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                isDark
                  ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`,
              children: [
                _jsx(ArrowLeft, {
                  size: 15,
                }),
                "Tickets",
              ],
            }),
          ],
        }),

        _jsxs("div", {
          className:
            "grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]",
          children: [
            _jsxs("aside", {
              className: `rounded-2xl border p-4 ${
                isDark
                  ? "border-zinc-800 bg-zinc-900/80"
                  : "border-slate-200 bg-white"
              }`,
              children: [
                _jsxs("div", {
                  className: "mb-4 flex items-center justify-between",
                  children: [
                    _jsxs("div", {
                      className: "flex items-center gap-2",
                      children: [
                        _jsx(Ticket, {
                          size: 17,
                          className: "text-indigo-400",
                        }),
                        _jsx("h2", {
                          className: "text-sm font-bold",
                          children: "All escalated tickets",
                        }),
                      ],
                    }),

                    _jsx("span", {
                      className: `rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isDark
                          ? "bg-zinc-800 text-zinc-400"
                          : "bg-slate-100 text-slate-600"
                      }`,
                      children: availableTickets.length,
                    }),
                  ],
                }),

                _jsx("div", {
                  className: "max-h-162.5 space-y-2 overflow-y-auto pr-1",
                  children:
                    availableTickets.length > 0
                      ? availableTickets.map((item) => {
                          const itemId = item?.id ?? item?.ticket_id;

                          const isSelected =
                            String(itemId) === String(ticketId);

                          return _jsxs(
                            "button",
                            {
                              type: "button",
                              onClick: () => {
                                setError("");
                                setSuccess("");
                                onSelectTicket?.(item);
                              },
                              className: `w-full rounded-xl border p-3 text-left transition-all ${
                                isSelected
                                  ? isDark
                                    ? "border-indigo-500/60 bg-indigo-500/10"
                                    : "border-indigo-400 bg-indigo-50"
                                  : isDark
                                    ? "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900"
                                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
                              }`,
                              children: [
                                _jsxs("div", {
                                  className:
                                    "mb-1 flex items-center justify-between gap-2",
                                  children: [
                                    _jsx("span", {
                                      className: `text-[10px] font-bold font-mono ${
                                        isSelected
                                          ? "text-indigo-400"
                                          : isDark
                                            ? "text-zinc-500"
                                            : "text-slate-500"
                                      }`,
                                      children: `#${itemId}`,
                                    }),

                                    item?.status
                                      ? _jsx("span", {
                                          className: `rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                            String(
                                              item.status,
                                            ).toLowerCase() === "resolved"
                                              ? "bg-emerald-500/10 text-emerald-500"
                                              : String(
                                                    item.status,
                                                  ).toLowerCase() ===
                                                  "escalated"
                                                ? "bg-rose-500/10 text-rose-500"
                                                : isDark
                                                  ? "bg-zinc-800 text-zinc-400"
                                                  : "bg-slate-200 text-slate-600"
                                          }`,
                                          children: item.status,
                                        })
                                      : null,
                                  ],
                                }),

                                _jsx("p", {
                                  className: `line-clamp-2 text-xs font-semibold ${
                                    isDark ? "text-zinc-200" : "text-slate-800"
                                  }`,
                                  children:
                                    item?.subject ||
                                    item?.title ||
                                    `Ticket #${itemId}`,
                                }),

                                item?.department
                                  ? _jsx("p", {
                                      className: `mt-1 text-[10px] ${
                                        isDark
                                          ? "text-zinc-500"
                                          : "text-slate-500"
                                      }`,
                                      children: item.department,
                                    })
                                  : null,
                              ],
                            },
                            String(itemId),
                          );
                        })
                      : _jsx("div", {
                          className: `rounded-xl border border-dashed p-6 text-center text-xs ${
                            isDark
                              ? "border-zinc-800 text-zinc-500"
                              : "border-slate-300 text-slate-500"
                          }`,
                          children: "No tickets available.",
                        }),
                }),
              ],
            }),

            _jsx("div", {
              className: `rounded-2xl border p-5 shadow-2xl sm:p-7 ${
                isDark
                  ? "bg-zinc-900/95 border-zinc-800 text-zinc-100"
                  : "bg-white border-slate-200 text-slate-900"
              }`,
              children: ticket
                ? _jsxs(_Fragment, {
                    children: [
                      _jsxs("div", {
                        className: "mb-6 flex items-start gap-3",
                        children: [
                          _jsx("div", {
                            className:
                              "rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400",
                            children: _jsx(Wrench, {
                              size: 20,
                            }),
                          }),

                          _jsxs("div", {
                            children: [
                              _jsx("h2", {
                                className: "text-xl font-bold sm:text-2xl",
                                children: "Resolve escalated ticket",
                              }),

                              _jsx("p", {
                                className: `mt-1 text-sm ${
                                  isDark ? "text-zinc-400" : "text-slate-600"
                                }`,
                                children: `Document the verified fix for ticket #${ticketId}.`,
                              }),
                            ],
                          }),
                        ],
                      }),

                      _jsxs("div", {
                        className: `mb-6 rounded-xl border p-4 ${
                          isDark
                            ? "border-zinc-800 bg-zinc-950/70"
                            : "border-slate-200 bg-slate-50"
                        }`,
                        children: [
                          _jsx("p", {
                            className: "text-sm font-semibold",
                            children:
                              ticket?.subject ||
                              ticket?.title ||
                              `Ticket #${ticketId}`,
                          }),

                          ticket?.description || ticket?.body
                            ? _jsx("p", {
                                className: `mt-1 text-xs leading-5 ${
                                  isDark ? "text-zinc-400" : "text-slate-600"
                                }`,
                                children: ticket.description || ticket.body,
                              })
                            : null,
                        ],
                      }),

                      _jsxs("form", {
                        onSubmit: handleSubmit,
                        className: "space-y-5",
                        children: [
                          _jsxs("div", {
                            children: [
                              _jsx("label", {
                                className: labelClass,
                                htmlFor: "engineer-id",
                                children: "Engineer ID",
                              }),

                              _jsx("input", {
                                id: "engineer-id",
                                type: "number",
                                min: "1",
                                inputMode: "numeric",
                                required: true,
                                readOnly: engineerId != null,
                                value: form.engineer_id,
                                onChange: (event) =>
                                  updateField(
                                    "engineer_id",
                                    event.target.value,
                                  ),
                                className: `${inputClass} ${
                                  engineerId != null
                                    ? "cursor-not-allowed opacity-75"
                                    : ""
                                }`,
                              }),
                            ],
                          }),

                          _jsxs("div", {
                            children: [
                              _jsx("label", {
                                className: labelClass,
                                htmlFor: "troubleshooting-steps",
                                children: "Troubleshooting steps",
                              }),

                              _jsx("textarea", {
                                id: "troubleshooting-steps",
                                rows: 5,
                                required: true,
                                value: form.troubleshooting_steps,
                                onChange: (event) =>
                                  updateField(
                                    "troubleshooting_steps",
                                    event.target.value,
                                  ),
                                placeholder:
                                  "Describe the diagnostic checks and steps taken.",
                                className: `${inputClass} resize-y leading-6`,
                              }),
                            ],
                          }),

                          _jsxs("div", {
                            children: [
                              _jsx("label", {
                                className: labelClass,
                                htmlFor: "root-cause",
                                children: "Root cause",
                              }),

                              _jsx("textarea", {
                                id: "root-cause",
                                rows: 3,
                                required: true,
                                value: form.root_cause,
                                onChange: (event) =>
                                  updateField("root_cause", event.target.value),
                                placeholder:
                                  "State the confirmed underlying cause.",
                                className: `${inputClass} resize-y leading-6`,
                              }),
                            ],
                          }),

                          _jsxs("div", {
                            children: [
                              _jsx("label", {
                                className: labelClass,
                                htmlFor: "engineer-solution",
                                children: "Resolution sent to the customer",
                              }),

                              _jsx("textarea", {
                                id: "engineer-solution",
                                rows: 5,
                                required: true,
                                value: form.solution,
                                onChange: (event) =>
                                  updateField("solution", event.target.value),
                                placeholder:
                                  "Write the completed fix or customer-facing resolution.",
                                className: `${inputClass} resize-y leading-6`,
                              }),
                            ],
                          }),

                          error
                            ? _jsx("p", {
                                role: "alert",
                                className:
                                  "rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-500",
                                children: error,
                              })
                            : null,

                          success
                            ? _jsxs("p", {
                                role: "status",
                                className:
                                  "flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500",
                                children: [
                                  _jsx(CheckCircle2, {
                                    size: 17,
                                  }),
                                  success,
                                ],
                              })
                            : null,

                          _jsx("button", {
                            type: "submit",
                            disabled: submitting || Boolean(success),
                            className:
                              "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60",
                            children: submitting
                              ? _jsxs(_Fragment, {
                                  children: [
                                    _jsx(LoaderCircle, {
                                      size: 17,
                                      className: "animate-spin",
                                    }),
                                    "Saving resolution...",
                                  ],
                                })
                              : _jsxs(_Fragment, {
                                  children: [
                                    _jsx(ClipboardCheck, {
                                      size: 17,
                                    }),
                                    success
                                      ? "Resolution saved"
                                      : "Mark ticket resolved",
                                  ],
                                }),
                          }),
                        ],
                      }),
                    ],
                  })
                : _jsx("div", {
                    className: "grid min-h-125 place-items-center text-center",
                    children: _jsxs("div", {
                      children: [
                        _jsx(Ticket, {
                          size: 42,
                          className: "mx-auto mb-4 text-indigo-400",
                        }),

                        _jsx("h2", {
                          className: "text-lg font-bold",
                          children: "Select a ticket",
                        }),

                        _jsx("p", {
                          className: `mt-2 text-sm ${
                            isDark ? "text-zinc-500" : "text-slate-500"
                          }`,
                          children:
                            "Select a ticket from the list to begin resolving it.",
                        }),
                      ],
                    }),
                  }),
            }),
          ],
        }),
      ],
    }),
  });
}
