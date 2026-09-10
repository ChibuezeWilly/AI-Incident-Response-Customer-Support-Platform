import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  XCircle,
  Eye,
  X,
  Mail,
  UserCircle,
  Building2,
  Star,
} from "lucide-react";
import StatusBadge from "./ui/StatusBadge";
import PriorityBadge from "./ui/PriorityBadge";
import { submitTicketReward } from "../api/tickets";

export default function UserTicketsDashboard({
  tickets,
  user,
  theme,
  onSelectTicket,
  selectedTicket,
  onCloseTicket,
}) {
  const isDark = theme === "dark";

  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [rewardStatus, setRewardStatus] = useState("");
  const [submittingReward, setSubmittingReward] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const [selectedTicketId, setSelectedTicketId] = useState(null);

  const normalizeStatus = (status) =>
    String(status ?? "")
      .trim()
      .toUpperCase();

  const uniqueTickets = useMemo(() => {
    const seenIds = new Set();

    return (tickets || []).filter((ticket) => {
      if (!ticket) {
        return false;
      }

      const ticketId = ticket?.id ?? ticket?.ticket_id;

      if (ticketId == null) {
        return true;
      }

      const normalizedId = String(ticketId);

      if (seenIds.has(normalizedId)) {
        return false;
      }

      seenIds.add(normalizedId);

      return true;
    });
  }, [tickets]);

  const isResolvedTicket = (ticket) => {
    if (!ticket) {
      return false;
    }

    const status = normalizeStatus(ticket.status);

    return status === "RESOLVED";
  };

  const getTicketResponse = (ticket) => {
    if (!ticket) {
      return "";
    }

    return (
      ticket.finalResponseText ||
      ticket.humanEditedText ||
      ticket.aiDraftText ||
      ticket.aiDraft?.fullResponseText ||
      ticket.aiDraft?.full_response_text ||
      ""
    );
  };

  const hasSubmittedFeedback = (ticket) =>
    Boolean(
      ticket &&
        ((ticket.userRating != null && Number(ticket.userRating) > 0) ||
          ticket.userFeedback?.trim()),
    );

  const exactSelectedTicket = useMemo(() => {
    if (selectedTicketId == null) {
      return null;
    }

    return (
      uniqueTickets.find((ticket) => {
        const ticketId = ticket?.id ?? ticket?.ticket_id;

        return (
          ticketId != null && String(ticketId) === String(selectedTicketId)
        );
      }) || null
    );
  }, [uniqueTickets, selectedTicketId]);

  const selectedResponse = useMemo(() => {
    if (!exactSelectedTicket) {
      return "";
    }

    if (!isResolvedTicket(exactSelectedTicket)) {
      return "";
    }

    return getTicketResponse(exactSelectedTicket);
  }, [exactSelectedTicket]);

  /*
   * ---------------------------------------------------------
   * RESET / LOAD RATING WHEN TICKET CHANGES
   * ---------------------------------------------------------
   */
  useEffect(() => {
    if (!exactSelectedTicket) {
      setRating(0);
      setFeedback("");
      setRewardStatus("");
      setFeedbackSubmitted(false);
      return;
    }

    setRating(exactSelectedTicket.userRating ?? 0);

    setFeedback(exactSelectedTicket.userFeedback ?? "");

    setRewardStatus("");
    setFeedbackSubmitted(hasSubmittedFeedback(exactSelectedTicket));
  }, [
    exactSelectedTicket,
    exactSelectedTicket?.id,
    exactSelectedTicket?.ticket_id,
    exactSelectedTicket?.userRating,
    exactSelectedTicket?.userFeedback,
  ]);

  const myTickets = useMemo(() => {
    return uniqueTickets
      .filter(
        (t) =>
          String(t.userId ?? "") === String(user?.id ?? "") ||
          t.userEmail === user?.email,
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [uniqueTickets, user?.email, user?.id]);

  const handleSelectTicket = (ticket) => {
    const ticketId = ticket?.id ?? ticket?.ticket_id;

    if (ticketId == null) {
      return;
    }

    setSelectedTicketId(ticketId);

    onSelectTicket?.(ticket);
  };

  const submitReward = async () => {
    if (
      !exactSelectedTicket ||
      !isResolvedTicket(exactSelectedTicket) ||
      rating < 1 ||
      !feedback.trim()
    ) {
      setRewardStatus("Choose a rating and enter feedback before submitting.");

      return;
    }

    setSubmittingReward(true);
    setRewardStatus("");

    try {
      const ticketId = exactSelectedTicket.id ?? exactSelectedTicket.ticket_id;

      await submitTicketReward(ticketId, {
        user_rating: rating,
        user_feedback: feedback.trim(),
      });

      setFeedbackSubmitted(true);
      setRewardStatus("Thanks — your feedback has been saved.");
    } catch (error) {
      setRewardStatus(
        error?.body?.detail ||
          error?.message ||
          "Unable to save feedback. Please try again.",
      );
    } finally {
      setSubmittingReward(false);
    }
  };

  const stats = useMemo(
    () => ({
      open: myTickets.filter((t) => {
        const status = normalizeStatus(t.status);

        return (
          status === "QUEUED" ||
          status === "AWAITING HUMAN REVIEW" ||
          status === "PENDING REVIEW" ||
          status === "ROUTED"
        );
      }).length,

      resolved: myTickets.filter((t) => {
        const status = normalizeStatus(t.status);

        return status === "RESOLVED";
      }).length,

      escalated: myTickets.filter((t) => {
        const status = normalizeStatus(t.status);

        return status === "ESCALATED";
      }).length,

      processed: myTickets.filter((t) => {
        const status = normalizeStatus(t.status);

        return status === "PROCESSED";
      }).length,

      failed: myTickets.filter((t) => {
        const status = normalizeStatus(t.status);

        return status === "FAILED";
      }).length,
    }),
    [myTickets],
  );

  const closeTicketDetails = () => {
    setSelectedTicketId(null);

    onCloseTicket?.();
  };

  return _jsx("div", {
    className:
      "w-full mx-auto space-y-8 animate-slide-up min-h-screen md:h-[calc(100vh-120px)] overflow-hidden text-sm",

    children: _jsxs("div", {
      className: "w-full h-full p-0 m-0 overflow-y-auto",

      children: [
        _jsxs("div", {
          children: [
            _jsx("p", {
              className: "text-sm uppercase tracking-wider text-indigo-400",

              children: "Customer Portal",
            }),

            _jsxs("h1", {
              className: `text-2xl sm:text-3xl font-semibold ${
                isDark ? "text-white" : "text-slate-900"
              }`,

              children: ["Welcome, ", user.name],
            }),

            _jsx("p", {
              className: `text-base mt-1 ${
                isDark ? "text-zinc-400" : "text-slate-600"
              }`,

              children: "Your account details and submitted support tickets.",
            }),
          ],
        }),

        _jsxs("div", {
          className: `grid sm:grid-cols-3 mt-1 rounded-2xl border overflow-hidden ${
            isDark
              ? "glass-panel border-zinc-800"
              : "glass-panel-light border-slate-200"
          }`,

          children: [
            _jsxs("div", {
              className: `p-4 flex items-center gap-3 ${
                isDark ? "border-zinc-800" : "border-gray-400"
              }`,

              children: [
                _jsx(UserCircle, {
                  className: "text-indigo-400",
                }),

                _jsxs("div", {
                  children: [
                    _jsx("p", {
                      className: "text-sm uppercase text-zinc-500",

                      children: "Name",
                    }),

                    _jsx("p", {
                      className: "text-sm font-medium",

                      children: user.name,
                    }),
                  ],
                }),
              ],
            }),

            _jsxs("div", {
              className: `p-4 flex items-center gap-3 border-t sm:border-t-0 sm:border-l ${
                isDark ? "border-zinc-800" : "border-gray-400"
              }`,

              children: [
                _jsx(Mail, {
                  className: "text-indigo-400",
                }),

                _jsxs("div", {
                  className: "min-w-0",

                  children: [
                    _jsx("p", {
                      className: "text-sm uppercase text-zinc-500",

                      children: "Email",
                    }),

                    _jsx("p", {
                      className: "text-sm font-medium truncate",

                      children: user.email,
                    }),
                  ],
                }),
              ],
            }),

            _jsxs("div", {
              className: `p-4 flex items-center gap-3 border-t sm:border-t-0 sm:border-l ${
                isDark ? "border-zinc-800" : "border-gray-400"
              }`,

              children: [
                _jsx(Building2, {
                  className: "text-indigo-400",
                }),

                _jsxs("div", {
                  children: [
                    _jsx("p", {
                      className: "text-sm uppercase text-zinc-500",

                      children: "Account Tier",
                    }),

                    _jsx("p", {
                      className: "text-sm font-medium",

                      children: user.tier || "Standard",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),

        _jsxs("div", {
          children: [
            _jsx("h2", {
              className: `text-xl font-semibold mt-2 sm:mt-1 ${
                isDark ? "text-white" : "text-slate-900"
              }`,

              children: "My Tickets",
            }),

            _jsx("p", {
              className: "text-base text-zinc-500 mt-1",

              children: "Select a ticket to see all of its details.",
            }),
          ],
        }),

        _jsx("div", {
        className: "grid grid-cols-2 gap-4 md:grid-cols-5",

          children: [
            {
              label: "Open",
              value: stats.open,
              icon: Clock,
              color: "text-amber-500",
            },

            {
              label: "Resolved",
              value: stats.resolved,
              icon: CheckCircle,
              color: "text-emerald-500",
            },

            {
              label: "Escalated",
              value: stats.escalated,
              icon: AlertCircle,
              color: "text-rose-500",
            },

            {
              label: "Processed",
              value: stats.processed,
              icon: Activity,
              color: "text-indigo-500",
            },

            {
              label: "Failed",
              value: stats.failed,
              icon: XCircle,
              color: "text-red-500",
            },
          ].map((card) => {
            const Icon = card.icon;

            return _jsx(
              "div",
              {
                className: `p-4 rounded-2xl border mt-2 ${
                  isDark
                    ? "glass-panel border-zinc-800"
                    : "glass-panel-light border-slate-200"
                }`,

                children: _jsxs("div", {
                  className: "flex items-center justify-between",

                  children: [
                    _jsxs("div", {
                      children: [
                        _jsx("span", {
                          className:
                            "text-sm font-bold uppercase text-zinc-500",

                          children: card.label,
                        }),

                        _jsx("p", {
                          className: `text-2xl font-black mt-1 ${
                            isDark ? "text-white" : "text-slate-900"
                          }`,

                          children: card.value,
                        }),
                      ],
                    }),

                    _jsx(Icon, {
                      size: 18,
                      className: card.color,
                    }),
                  ],
                }),
              },

              card.label,
            );
          }),
        }),

        myTickets.length === 0
          ? _jsxs("div", {
              className: `py-16 mt-3 text-center border rounded-2xl border-dashed ${
                isDark
                  ? "border-zinc-800 text-zinc-500"
                  : "border-slate-800 text-slate-800"
              }`,

              children: [
                _jsx("p", {
                  className: "text-base font-semibold",

                  children: "No tickets submitted yet",
                }),

                _jsx("p", {
                  className: "text-base mt-1",

                  children: "Submit a new ticket to get started.",
                }),
              ],
            })
          : _jsx("div", {
              className: "space-y-3 mt-6 md:mt-1",

              children: myTickets.map((ticket) => {
                const ticketId = ticket?.id ?? ticket?.ticket_id;

                const isThisTicketSelected =
                  selectedTicketId != null &&
                  ticketId != null &&
                  String(ticketId) === String(selectedTicketId);

                const ticketResponse =
                  isThisTicketSelected && isResolvedTicket(ticket)
                    ? getTicketResponse(ticket)
                    : "";

                return _jsx(
                  "div",
                  {
                    className: `p-5 rounded-2xl border transition-all mt- ${
                      isDark
                        ? "glass-panel border-zinc-800 hover:border-zinc-700"
                        : "glass-panel-light border-slate-700 hover:border-slate-800"
                    }`,

                    children: _jsxs("div", {
                      className:
                        "flex flex-col sm:flex-row mt-3 sm:items-start justify-between gap-4",

                      children: [
                        _jsxs("div", {
                          className: "space-y-2 flex-1",

                          children: [
                            _jsxs("div", {
                              className: "flex items-center gap-2 flex-wrap",

                              children: [
                                _jsx("span", {
                                  className:
                                    "text-base font-mono font-bold text-indigo-400",

                                  children: ticketId,
                                }),

                                _jsx(PriorityBadge, {
                                  urgency: ticket.urgency,
                                }),

                                _jsx(StatusBadge, {
                                  status: ticket.status,
                                }),
                              ],
                            }),

                            _jsx("h3", {
                              className: `text-base font-bold ${
                                isDark ? "text-zinc-100" : "text-gray-900"
                              }`,

                              children: ticket.subject,
                            }),

                            _jsx("p", {
                              className: `text-[17px] font-serif line-clamp-2 ${
                                isDark ? "text-zinc-450" : "text-gray-800"
                              }`,

                              children: ticket.description,
                            }),

                            normalizeStatus(ticket.status) === "FAILED" &&
                              _jsx("p", {
                                className: `text-xs leading-relaxed ${
                                  isDark ? "text-rose-400" : "text-rose-600"
                                }`,
                                children:
                                  ticket.failureReason ||
                                  ticket.failure_reason ||
                                  "This ticket could not be processed.",
                              }),

                            _jsxs("span", {
                              className: `text-[14px] ${
                                isDark ? "text-zinc-500" : "text-gray-700"
                              }`,

                              children: [
                                "Submitted ",
                                new Date(ticket.createdAt).toLocaleString(),
                              ],
                            }),
                          ],
                        }),

                        ticketResponse &&
                          _jsxs("div", {
                            className: `p-4 rounded-xl border text-sm max-w-md ${
                              isDark
                                ? "bg-emerald-500/5 border-emerald-500/20"
                                : "bg-emerald-50 border-emerald-200"
                            }`,

                            children: [
                              _jsx("span", {
                                className:
                                  "text-[9px] font-bold uppercase text-emerald-500 block mb-2",

                                children: "Final Response",
                              }),

                              _jsx("p", {
                                className: `leading-relaxed line-clamp-4 ${
                                  isDark ? "text-zinc-300" : "text-slate-700"
                                }`,

                                children: ticketResponse,
                              }),
                            ],
                          }),

                        onSelectTicket &&
                          _jsxs("button", {
                            onClick: () => handleSelectTicket(ticket),

                            className: `shrink-0 py-2 px-3 border rounded-xl text-sm font-bold uppercase flex items-center gap-1 ${
                              isDark
                                ? "border-zinc-800 hover:bg-zinc-900 text-zinc-300"
                                : "border-slate-400 hover:bg-slate-50 text-gray-800"
                            }`,

                            children: [
                              _jsx(Eye, {
                                size: 12,
                              }),

                              "Details",
                            ],
                          }),
                      ],
                    }),
                  },


                  String(ticketId),
                );
              }),
            }),

        exactSelectedTicket &&
          _jsxs("div", {
            className:
              " p-4 md:p-0 fixed inset-0 z-50 flex items-center justify-center min-h-screen md:h-[calc(100vh-115px)] overflow-y-auto rounded-sm",

            children: [
              _jsx("button", {
                onClick: closeTicketDetails,

                className: "absolute inset-0 bg-black/50",

                "aria-label": "Close ticket details",
              }),

              _jsxs("section", {
                className: `absolute right-0 top-0 rounded-md h-full w-full max-w-xl overflow-y-auto p-6 border-l shadow-2xl ${
                  isDark
                    ? "bg-zinc-950 border-zinc-800 text-zinc-100"
                    : "bg-gray-200 border-slate-200 text-slate-800"
                }`,

                children: [
                  _jsxs("div", {
                    className: "flex justify-between gap-3",

                    children: [
                      _jsxs("div", {
                        children: [
                          _jsxs("span", {
                            className: "text-sm font-mono text-indigo-400",

                            children: [
                              "#",

                              exactSelectedTicket.id ??
                                exactSelectedTicket.ticket_id,
                            ],
                          }),

                          _jsx("h2", {
                            className: "text-xl font-semibold mt-1",

                            children: exactSelectedTicket.subject,
                          }),
                        ],
                      }),

                      _jsx("button", {
                        onClick: closeTicketDetails,

                        className: `p-2 h-fit rounded-lg ${
                          isDark ? "hover:bg-zinc-800" : "hover:bg-gray-400"
                        }`,

                        children: _jsx(X, {
                          size: 18,
                        }),
                      }),
                    ],
                  }),

                  _jsxs("div", {
                    className: "flex gap-2 mt-4",

                    children: [
                      _jsx(StatusBadge, {
                        status: exactSelectedTicket.status,
                      }),

                      _jsx(PriorityBadge, {
                        urgency: exactSelectedTicket.urgency,
                      }),
                    ],
                  }),

                  _jsxs("dl", {
                    className:
                      "flex flex-col justify-start items-start sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-2 mt-8 text-sm",

                    children: [
                      _jsxs("div", {
                        children: [
                          _jsx("dt", {
                            className: "text-base uppercase text-zinc-500",

                            children: "Department",
                          }),

                          _jsx("dd", {
                            className: "text-base",

                            children: exactSelectedTicket.department,
                          }),
                        ],
                      }),

                      _jsxs("div", {
                        children: [
                          _jsx("dt", {
                            className: "text-base uppercase text-zinc-500",

                            children: "Created",
                          }),

                          _jsx("dd", {
                            className: "text-base",

                            children: new Date(
                              exactSelectedTicket.createdAt,
                            ).toLocaleString(),
                          }),
                        ],
                      }),

                      _jsxs("div", {
                        children: [
                          _jsx("dt", {
                            className: "text-base uppercase text-zinc-500",

                            children: "SLA status",
                          }),

                          _jsx("dd", {
                            className: "text-base",

                            children:
                              exactSelectedTicket.slaStatus || "Tracking",
                          }),
                        ],
                      }),
                    ],
                  }),

                  _jsxs("div", {
                    className: "mt-7",

                    children: [
                      _jsx("p", {
                        className: "text-base uppercase text-zinc-500",

                        children: "Description",
                      }),

                      _jsx("p", {
                        className:
                          "text-base leading-6 mt-2 whitespace-pre-wrap",

                        children: exactSelectedTicket.description,
                      }),
                    ],
                  }),


                  selectedResponse &&
                    _jsxs("div", {
                      className: `mt-7 p-4 rounded-xl border ${
                        isDark
                          ? "border-emerald-500/20 bg-emerald-500/5"
                          : "border-emerald-200 bg-emerald-50"
                      }`,

                      children: [
                        _jsx("p", {
                          className: "text-sm uppercase text-emerald-600",

                          children: "Response",
                        }),

                        _jsx("p", {
                          className:
                            "text-sm leading-6 mt-2 whitespace-pre-wrap",

                          children: selectedResponse,
                        }),
                      ],
                    }),


                  isResolvedTicket(exactSelectedTicket) &&
                    !hasSubmittedFeedback(exactSelectedTicket) &&
                    !feedbackSubmitted &&
                    String(
                      exactSelectedTicket.id ?? exactSelectedTicket.ticket_id,
                    ) === String(selectedTicketId) &&
                    _jsxs("section", {
                      className: `mt-7 p-4 rounded-xl border space-y-3 ${
                        isDark
                          ? "border-indigo-500/20 bg-indigo-500/5"
                          : "border-indigo-200 bg-indigo-50"
                      }`,

                      children: [
                        _jsx("p", {
                          className: "text-sm font-semibold",

                          children: "Rate this resolution",
                        }),

                        _jsx("div", {
                          className: "flex gap-1",

                          children: [1, 2, 3, 4, 5].map((value) =>
                            _jsx(
                              "button",
                              {
                                type: "button",

                                onClick: () => setRating(value),

                                className:
                                  rating >= value
                                    ? "text-amber-400"
                                    : "text-zinc-500",

                                "aria-label": `Rate ${value} out of 5`,

                                children: _jsx(Star, {
                                  size: 22,

                                  fill:
                                    rating >= value ? "currentColor" : "none",
                                }),
                              },

                              value,
                            ),
                          ),
                        }),

                        _jsx("textarea", {
                          value: feedback,

                          onChange: (event) => setFeedback(event.target.value),

                          maxLength: 2000,

                          rows: 4,

                          placeholder:
                            "Tell us what worked or what needs improvement…",

                          className: `w-full rounded-lg border p-3 text-sm ${
                            isDark
                              ? "bg-zinc-900 border-zinc-700 text-zinc-100"
                              : "bg-white border-slate-300 text-slate-900"
                          }`,
                        }),

                        rewardStatus &&
                          _jsx("p", {
                            className: `text-sm ${
                              rewardStatus.startsWith("Thanks")
                                ? "text-emerald-500"
                                : "text-rose-500"
                            }`,

                            children: rewardStatus,
                          }),

                        _jsx("button", {
                          type: "button",

                          disabled: submittingReward,

                          onClick: () => void submitReward(),

                          className:
                            "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60",

                          children: submittingReward
                            ? "Saving…"
                            : "Submit feedback",
                        }),
                      ],
                    }),
                ],
              }),
            ],
          }),
      ],
    }),
  });
}
