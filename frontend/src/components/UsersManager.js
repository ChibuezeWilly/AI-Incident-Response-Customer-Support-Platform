import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import {
  Search,
  Users,
  Mail,
  Ticket,
  X,
  LoaderCircle,
  Key,
} from "lucide-react";
import { fetchUserById, fetchUsers, mapTicket } from "../api/tickets";

export default function UsersManager({
  theme = "dark",
  onSelectTicket,
  selectedUserId,
}) {
  const isDark = theme === "dark";

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const loadUsers = async (search = "") => {
    setLoading(true);
    setError("");

    try {
      setUsers(await fetchUsers(search));
    } catch (err) {
      setError(err.body?.detail || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const inspect = async (id) => {
    setLoading(true);
    setError("");

    try {
      setSelected(await fetchUserById(id));
    } catch (err) {
      setError(err.body?.detail || "Unable to load this user profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUserId != null) {
      void inspect(selectedUserId);
    }
  }, [selectedUserId]);

  const field = (key, label, value) =>
    _jsxs(
      "div",
      {
        children: [
          _jsx(
            "dt",
            {
              className:
                "text-[10px] uppercase tracking-wide text-zinc-500",
              children: label,
            },
            `${key}-dt`,
          ),

          _jsx(
            "dd",
            {
              className: "text-sm font-medium break-words",
              children: value || "—",
            },
            `${key}-dd`,
          ),
        ],
      },
      key,
    );

  return _jsxs("section", {
    className: "space-y-5",

    children: [
      _jsxs(
        "div",
        {
          className:
            "flex flex-col sm:flex-row sm:items-end justify-between gap-3",

          children: [
            _jsxs(
              "div",
              {
                children: [
                  _jsxs(
                    "h2",
                    {
                      className:
                        "text-xl font-bold flex items-center gap-2",

                      children: [
                        _jsx(
                          Users,
                          {
                            size: 22,
                            className: "text-indigo-400",
                          },
                          "users-icon",
                        ),

                        "Users",
                      ],
                    },
                    "users-heading",
                  ),

                  _jsx(
                    "p",
                    {
                      className: "text-sm text-zinc-500 mt-1",
                      children:
                        "Search account names or email addresses and inspect their ticket history.",
                    },
                    "users-description",
                  ),
                ],
              },
              "users-header-left",
            ),

            _jsxs(
              "form",
              {
                onSubmit: (e) => {
                  e.preventDefault();
                  void loadUsers(query);
                },

                className: "relative w-full sm:w-80",

                children: [
                  _jsx(
                    Search,
                    {
                      size: 16,
                      className:
                        "absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500",
                    },
                    "search-icon",
                  ),

                  _jsx(
                    "input",
                    {
                      value: query,

                      onChange: (e) => setQuery(e.target.value),

                      placeholder: "Search users…",

                      className: `w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm ${
                        isDark
                          ? "bg-zinc-900 border-zinc-800 text-white"
                          : "bg-white border-slate-200 text-slate-900"
                      }`,
                    },
                    "search-input",
                  ),
                ],
              },
              "users-search-form",
            ),
          ],
        },
        "users-header",
      ),

      error
        ? _jsx(
            "p",
            {
              className:
                "rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400",

              children: error,
            },
            "users-error",
          )
        : null,

      loading
        ? _jsx(
            "div",
            {
              className: "py-12 text-center text-zinc-500",

              children: _jsx(
                LoaderCircle,
                {
                  className: "animate-spin mx-auto",
                  size: 22,
                },
                "users-loader-icon",
              ),
            },
            "users-loader",
          )
        : _jsx(
            "div",
            {
              className: `overflow-hidden rounded-2xl border ${
                isDark ? "border-zinc-800" : "border-slate-200"
              }`,

              children: _jsx(
                "div",
                {
                  className: "divide-y divide-zinc-800/60",

                  children: users.length
                    ? users.map((account, index) =>
                        _jsxs(
                          "button",
                          {
                            onClick: () => void inspect(account.id),

                            className: `w-full text-left p-4 flex items-center justify-between gap-4 transition-colors ${
                              isDark
                                ? "hover:bg-zinc-900"
                                : "hover:bg-slate-50"
                            }`,

                            children: [
                              _jsxs(
                                "div",
                                {
                                  className: "min-w-0",

                                  children: [
                                    _jsx(
                                      "p",
                                      {
                                        className:
                                          "font-semibold truncate",

                                        children:
                                          account.business_name,
                                      },
                                      `user-name-${
                                        account.id ?? index
                                      }`,
                                    ),

                                    _jsxs(
                                      "p",
                                      {
                                        className:
                                          "text-sm text-zinc-500 flex items-center gap-1 mt-1",

                                        children: [
                                          _jsx(
                                            Mail,
                                            {
                                              size: 13,
                                            },
                                            `mail-icon-${
                                              account.id ?? index
                                            }`,
                                          ),

                                          account.email,
                                        ],
                                      },
                                      `user-email-${
                                        account.id ?? index
                                      }`,
                                    ),
                                  ],
                                },
                                `user-info-${account.id ?? index}`,
                              ),

                              _jsx(
                                "span",
                                {
                                  className:
                                    "shrink-0 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-400",

                                  children: account.account_tier,
                                },
                                `user-tier-${account.id ?? index}`,
                              ),
                            ],
                          },
                          account.id ?? `user-${index}`,
                        ),
                      )
                    : _jsx(
                        "p",
                        {
                          className:
                            "p-8 text-center text-sm text-zinc-500",

                          children: "No users match this search.",
                        },
                        "no-users",
                      ),
                },
                "users-list",
              ),
            },
            "users-container",
          ),

      selected
        ? _jsx(
            "div",
            {
              className:
                "fixed inset-0 z-40 bg-black/90 flex justify-end pt-16",

              onClick: () => setSelected(null),

              children: _jsxs(
                "aside",
                {
                  onClick: (e) => e.stopPropagation(),

                  className: `w-full max-w-lg  overflow-y-auto p-6 space-y-6 border-l ${
                    isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-100"
                      : "bg-white border-slate-200 text-slate-900"
                  }`,

                  children: [
                    _jsxs(
                      "header",
                      {
                        className:
                          "flex items-start justify-between",

                        children: [
                          _jsxs(
                            "div",
                            {
                              children: [
                                _jsx(
                                  "p",
                                  {
                                    className:
                                      "text-xs uppercase tracking-widest text-indigo-400",

                                    children: "Account profile",
                                  },
                                  "account-profile-label",
                                ),

                                _jsx(
                                  "h3",
                                  {
                                    className:
                                      "mt-1 text-xl font-bold",

                                    children:
                                      selected.user.business_name,
                                  },
                                  "account-profile-name",
                                ),
                              ],
                            },
                            "account-profile-header",
                          ),

                          _jsx(
                            "button",
                            {
                              onClick: () => setSelected(null),

                              className: "p-2  text-zinc-500",

                              children: _jsx(
                                X,
                                {
                                  size: 20,
                                },
                                "close-icon",
                              ),
                            },
                            "close-profile",
                          ),
                        ],
                      },
                      "profile-header",
                    ),

                    _jsx(
                      "dl",
                      {
                        className:
                          "grid grid-cols-2 gap-4 rounded-xl border border-zinc-800 p-4",

                        children: [
                          field(
                            "email",
                            "Email",
                            selected.user.email,
                          ),

                          field(
                            "tier",
                            "Tier",
                            selected.user.account_tier,
                          ),

                          field(
                            "sla",
                            "SLA",
                            `${selected.user.sla} hours`,
                          ),

                          field(
                            "created",
                            "Created",
                            selected.user.created_at
                              ? new Date(
                                  selected.user.created_at,
                                ).toLocaleDateString()
                              : null,
                          ),
                        ],
                      },
                      "account-fields",
                    ),

                    _jsxs(
                      "div",
                      {
                        children: [
                          _jsxs(
                            "h4",
                            {
                              className:
                                "font-bold flex items-center gap-2",

                              children: [
                                _jsx(
                                  Ticket,
                                  {
                                    size: 17,
                                    className:
                                      "text-indigo-400",
                                  },
                                  "ticket-icon",
                                ),

                                `All tickets (${
                                  selected.tickets?.length || 0
                                })`,
                              ],
                            },
                            "tickets-heading",
                          ),

                          _jsx(
                            "div",
                            {
                              className:
                                "mt-3 space-y-2",

                              children:
                                selected.tickets?.length
                                  ? selected.tickets.map(
                                      (raw, index) => {
                                        const ticket =
                                          mapTicket(raw);

                                        return _jsxs(
                                          "button",
                                          {
                                            onClick: () =>
                                              onSelectTicket?.(
                                                ticket,
                                              ),

                                            className: `w-full rounded-xl border p-3 text-left ${
                                              isDark
                                                ? "border-zinc-800 hover:bg-zinc-900"
                                                : "border-slate-200 hover:bg-slate-50"
                                            }`,

                                            children: [
                                              _jsx(
                                                "p",
                                                {
                                                  className:
                                                    "font-medium",

                                                  children:
                                                    ticket.subject ||
                                                    `Ticket #${ticket.id}`,
                                                },
                                                `ticket-subject-${
                                                  ticket.id ??
                                                  index
                                                }`,
                                              ),

                                              _jsxs(
                                                "p",
                                                {
                                                  className:
                                                    "mt-1 text-xs text-zinc-500",

                                                  children: [
                                                    ticket.status,
                                                    " · ",
                                                    ticket.priority,
                                                  ],
                                                },
                                                `ticket-meta-${
                                                  ticket.id ??
                                                  index
                                                }`,
                                              ),
                                            ],
                                          },
                                          ticket.id ??
                                            `ticket-${index}`,
                                        );
                                      },
                                    )
                                  : _jsx(
                                      "p",
                                      {
                                        className:
                                          "py-5 text-center text-sm text-zinc-500",

                                        children:
                                          "This account has no tickets.",
                                      },
                                      "no-tickets",
                                    ),
                            },
                            "tickets-list",
                          ),
                        ],
                      },
                      "tickets-section",
                    ),
                  ],
                },
                "user-profile-aside",
              ),
            },
            "user-profile-modal",
          )
        : null,
    ],
  });
}
