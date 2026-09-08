"use client";

import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppContext } from "./context/AppContext";
import { getCachedUser, clearCachedUser, cacheUser } from "./utils/auth";
import { AUTH_SESSION_EXPIRED_EVENT, setAuthToken } from "./api/client";
import SubmissionForm from "./components/SubmissionForm";
import HITLWorkspace from "./components/HITLWorkspace";
import AdminOverview from "./components/AdminOverview";
import TicketsManager from "./components/TicketsManager";
import IncidentsManager from "./components/IncidentsManager";
import AnalyticsView from "./components/AnalyticsView";
import KnowledgeHealthView from "./components/KnowledgeHealthView";
import CustomerDetailModal from "./components/CustomerDetailModal";
import EngineerResolutionForm from "./components/EngineerResolutionForm";
import UsersManager from "./components/UsersManager";
import UserTicketsDashboard from "./components/UserTicketsDashboard";
import LoadingSkeleton from "./components/ui/LoadingSkeleton";
import AIStatusIndicator from "./components/ui/AIStatusIndicator";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import AdminLoginPage from "./components/AdminLoginPage";
import AdminSignupPage from "./components/AdminSignupPage";
import {
  LayoutGrid,
  ClipboardList,
  ShieldCheck,
  Sun,
  Moon,
  UserCircle,
  BarChart2,
  BookOpen,
  AlertOctagon,
  Search,
  Bell,
  X,
  Menu,
  Ticket as TicketIcon,
  LogOut,
  LogIn,
  CheckCircle2,
  Users,
  Wrench,
} from "lucide-react";
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "tickets", label: "Tickets", icon: ClipboardList },
  {
    id: "engineer-resolution",
    label: "Eng Resolution",
    icon: Wrench,
  },
  { id: "users", label: "Users", icon: Users },
  { id: "incidents", label: "Incidents", icon: AlertOctagon },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "knowledge", label: "Knowledge Health", icon: BookOpen },
];
export default function App() {
  const pathname = usePathname();
  const router = useRouter();
  const navigate = useCallback(
    (path, options = {}) => {
      if (options.replace) router.replace(path);
      else router.push(path);
    },
    [router],
  );
  const {
    tickets,
    incidents,
    customers,
    knowledgeDocs,
    analytics,
    aiOverview,

    pendingCount,
    aiSystemStatus,
    loading,
    error,
    refreshAll,
    submitTicket,
    approveTicketAction,
    rejectTicketAction,
    deleteTicketAction,
    markAllNotificationsRead,
  } = useAppContext();
  // localStorage is unavailable during the server render. Start with the same
  // auth state on server and client, then restore the session after hydration.
  const [user, setUser] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [adminSubTab, setAdminSubTab] = useState("dashboard");
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const isAdminRoute = normalizedPath === "/admin";
  const isAdminAuthRoute = normalizedPath.startsWith("/admin");
  const isSignupRoute = normalizedPath.endsWith("/signup");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const searchInputRef = useRef(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [engineerResolutionTicket, setEngineerResolutionTicket] =
    useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const isDark = theme === "dark";
  const isAdmin = user?.role === "admin";
  useEffect(() => {
    const cachedUser = getCachedUser();
    setUser(cachedUser);
    setShowWelcome(Boolean(cachedUser));
  }, []);
  useEffect(() => {
    const showSessionExpired = () => setSessionExpired(true);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, showSessionExpired);
    return () =>
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, showSessionExpired);
  }, []);
  useEffect(() => {
    if (!user || !showWelcome) return;
    const timer = window.setTimeout(() => {
      setShowWelcome(false);
      navigate(user.role === "admin" ? "/admin" : "/", { replace: true });
    }, 1300);
    return () => window.clearTimeout(timer);
  }, [navigate, showWelcome, user]);
  // Keep direct navigations and browser refreshes on /admin properly guarded.
  useEffect(() => {
    if (!user || !isAdminRoute) return;
    if (user.role !== "admin") {
      navigate("/", { replace: true });
      setActiveTab("my-tickets");
      return;
    }
    setActiveTab("dashboard");
    setAdminSubTab("dashboard");
  }, [isAdminRoute, navigate, user]);
  const handleAuthSuccess = useCallback(
    (authenticatedUser, token) => {
      // Persist the whole session synchronously before React renders protected data.
      setAuthToken(token);
      cacheUser(authenticatedUser);
      setUser(authenticatedUser);
      setShowWelcome(true);
      if (authenticatedUser.role === "admin") {
        setActiveTab("dashboard");
        setAdminSubTab("dashboard");
        navigate("/admin", { replace: true });
      } else {
        setActiveTab("my-tickets");
        navigate("/", { replace: true });
      }
      void refreshAll();
    },
    [navigate, refreshAll],
  );
  // This is returned after the remaining hooks so login/session changes do not
  // alter App's hook order.
  const authScreen = !user
    ? isAdminAuthRoute
      ? isSignupRoute
        ? _jsx(AdminSignupPage, {
            theme: theme,
            onSignup: handleAuthSuccess,
            onSwitchToLogin: () => navigate("/admin/login"),
          })
        : _jsx(AdminLoginPage, {
            theme: theme,
            onLogin: handleAuthSuccess,
            onSwitchToSignup: () => navigate("/admin/signup"),
          })
      : isSignupRoute
        ? _jsx(SignupPage, {
            theme: theme,
            onSignup: handleAuthSuccess,
            onSwitchToLogin: () => navigate("/login"),
          })
        : _jsx(LoginPage, {
            theme: theme,
            onLogin: handleAuthSuccess,
            onSwitchToSignup: () => navigate("/signup"),
          })
    : showWelcome
      ? _jsx("main", {
          className: `min-h-screen grid place-items-center font-mono ${isDark ? "bg-zinc-950 text-white" : "bg-slate-50 text-slate-900"}`,
          children: _jsxs("div", {
            className: "text-center animate-fade-in",
            children: [
              _jsx(CheckCircle2, {
                size: 70,
                className: "mx-auto text-blue-500",
                strokeWidth: 1.5,
              }),
              _jsx("h1", {
                className: "mt-5 text-3xl font-bold tracking-tight",
                children: "ChurnDesk",
              }),
            ],
          }),
        })
      : null;
  const handleLogout = () => {
    clearCachedUser();
    setAuthToken(null);
    setUser(null);
  };
  const handleLoginAgain = () => {
    const loginPath = user?.role === "admin" ? "/admin/login" : "/login";
    setSessionExpired(false);
    setShowWelcome(false);
    handleLogout();
    navigate(loginPath, { replace: true });
  };
  const navigateAdminTab = useCallback((tab) => {
    setPageLoading(true);
    setAdminSubTab(tab);
    setActiveTab("dashboard");
    setSidebarOpen(false);
    setShowNotifications(false);
    setTimeout(() => setPageLoading(false), 350);
  }, []);
  const openUserProfile = useCallback(
    (id) => {
      if (id == null) return;
      setSelectedUserId(id);
      navigateAdminTab("users");
    },
    [navigateAdminTab],
  );
  const openEngineerResolution = useCallback(
    (ticket) => {
      if (ticket?.id == null && ticket?.ticket_id == null) return;
      setEngineerResolutionTicket(ticket);
      navigateAdminTab("engineer-resolution");
    },
    [navigateAdminTab],
  );
  const closeEngineerResolution = useCallback(() => {
    setEngineerResolutionTicket(null);
    navigateAdminTab("tickets");
  }, [navigateAdminTab]);

  const handleNewTicket = async (newTicketData) => {
    await submitTicket(newTicketData);
    await refreshAll();
    setActiveTab("my-tickets");
  };
  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setActiveTab(isAdmin ? "hitl" : "my-tickets");
    setSidebarOpen(false);
  };
  const handleApproveTicket = async (id, finalDept, finalSolution) => {
    const ticket = tickets.find((t) => t.id === id);
    const updated = await approveTicketAction({
      id,
      department: finalDept,
      solution: finalSolution,
      threadId: ticket?.threadId,
    });
    if (updated) {
      setSelectedTicket(updated);
    }
    return updated;
  };
  const handleRejectTicket = async (id) => {
    const ticket = tickets.find((t) => t.id === id);
    const updated = await rejectTicketAction(id, ticket?.threadId);
    if (updated) {
      setSelectedTicket(updated);
    }
    return updated;
  };
  const handleDeleteTicket = async (id) => {
    return deleteTicketAction(id);
  };
  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return null;
    const query = globalSearch.toLowerCase();
    const matchedTickets = tickets.filter(
      (t) =>
        t.subject.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query),
    );
    const matchedIncidents = incidents.filter(
      (i) =>
        i.title.toLowerCase().includes(query) ||
        i.id.toLowerCase().includes(query),
    );
    const matchedCustomers = customers.filter((c) =>
      c.name.toLowerCase().includes(query),
    );
    const matchedJira = tickets.filter((t) =>
      t.jiraEscalation?.issueKey?.toLowerCase().includes(query),
    );
    const matchedDocs = knowledgeDocs.filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        d.id.toLowerCase().includes(query),
    );
    return {
      tickets: matchedTickets,
      incidents: matchedIncidents,
      customers: matchedCustomers,
      docs: matchedDocs,
      jira: matchedJira,
    };
  }, [globalSearch, tickets, incidents, customers, knowledgeDocs]);
  const markNotificationsRead = () => {
    void markAllNotificationsRead();
  };
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isAdmin) searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setGlobalSearch("");
        setShowNotifications(false);
        setSelectedIncident(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdmin]);
  const adminName = user?.name || "Administrator";
  const firstName = adminName.split(" ")[0];
  const renderAdminContent = () => {
    if (pageLoading)
      return _jsx(LoadingSkeleton, {
        message: "Preparing operational view...",
      });
    switch (adminSubTab) {
      case "dashboard":
        return _jsx(AdminOverview, {
          tickets: tickets || [],
          incidents: incidents || [],
          aiOverview: aiOverview || [],
          onSelectTicket: handleSelectTicket,
          onNavigateTab: (tab) => navigateAdminTab(tab),
          onSelectIncident: (inc) => setSelectedIncident(inc),
          theme: theme,
          onOpenCustomer: (name) => setSelectedCustomerName(name),
          adminName: firstName,
        });
      case "tickets":
        return _jsx(TicketsManager, {
          tickets: tickets || [],
          onSelectTicket: handleSelectTicket,
          theme: theme,
          onOpenCustomer: openUserProfile,
          onEngineerResolution: openEngineerResolution,
          onRefreshTickets: refreshAll,
        });
      case "engineer-resolution":
        return _jsx(EngineerResolutionForm, {
          ticket: engineerResolutionTicket,
          tickets: tickets || [],
          engineerId: user?.id,
          theme: theme,
          onBack: closeEngineerResolution,
          onResolved: refreshAll,
          onSelectTicket: (ticket) => {
            setEngineerResolutionTicket(ticket);
          },
        });
      case "users":
        return _jsx(UsersManager, {
          theme: theme,
          selectedUserId: selectedUserId,
          onSelectTicket: (ticket) => {
            setSelectedUserId(null);
            handleSelectTicket(ticket);
          },
        });
      case "incidents":
        return _jsx(IncidentsManager, {
          tickets: tickets || [],
          incidents: incidents || [],
          onSelectTicket: handleSelectTicket,
          theme: theme,
        });
      case "analytics":
        return _jsx(AnalyticsView, {
          theme: theme,
          analytics: analytics,
          knowledgeDocs: knowledgeDocs,
          tickets: tickets || [],
          incidents: incidents || [],
        });
      case "knowledge":
        return _jsx(KnowledgeHealthView, {
          theme: theme,
          knowledgeDocs: knowledgeDocs,
        });
      default:
        return null;
    }
  };
  const searchBar = _jsxs("div", {
    className: "relative w-full",
    children: [
      _jsxs("div", {
        className: "relative",
        children: [
          _jsx(Search, {
            className: `absolute left-4 top-1/2 -translate-y-1/2  ${isDark ? "text-zinc-500" : "text-slate-400"}`,
            size: 20,
          }),
          _jsx("input", {
            ref: searchInputRef,
            type: "text",
            value: globalSearch,
            onChange: (e) => setGlobalSearch(e.target.value),
            placeholder: "Global search (Ctrl+K)...",
            className: `w-full border rounded-2xl pl-12 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-lg transition-all ${
              isDark
                ? "bg-zinc-900/80 border-zinc-800 text-white placeholder-zinc-500"
                : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-slate-200"
            }`,
          }),
          globalSearch &&
            _jsx("button", {
              onClick: () => setGlobalSearch(""),
              className:
                "absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 z-50",
              children: _jsx(X, { size: 16 }),
            }),
        ],
      }),
      searchResults &&
        _jsxs("div", {
          className: `absolute top-full left-0 right-0 mt-2 rounded-xl border p-4 max-h-80 overflow-y-auto space-y-3.5 shadow-2xl z-[9998] ${isDark ? "bg-zinc-950 border-zinc-800" : "bg-white border-slate-200"}`,
          children: [
            searchResults.tickets.length === 0 &&
              searchResults.incidents.length === 0 &&
              searchResults.customers.length === 0 &&
              searchResults.docs.length === 0 &&
              searchResults.jira.length === 0 &&
              _jsx("p", {
                className: "text-xs text-zinc-500 text-center py-2",
                children: "No matching records found.",
              }),
            searchResults.tickets.length > 0 &&
              _jsxs("div", {
                className: "space-y-1",
                children: [
                  _jsx("span", {
                    className:
                      "text-[9px] font-bold text-zinc-500 uppercase block",
                    children: "Tickets",
                  }),
                  searchResults.tickets.slice(0, 3).map((t) =>
                    _jsxs(
                      "div",
                      {
                        onClick: () => {
                          handleSelectTicket(t);
                          setGlobalSearch("");
                        },
                        className: `p-2 rounded-lg text-xs cursor-pointer ${isDark ? "hover:bg-zinc-900" : "hover:bg-gray-50"}`,
                        children: [
                          _jsx("strong", {
                            className: "text-indigo-400 font-mono pr-1.5",
                            children: t.id,
                          }),
                          " ",
                          t.subject,
                        ],
                      },
                      t.id,
                    ),
                  ),
                ],
              }),
            searchResults.incidents.length > 0 &&
              _jsxs("div", {
                className: "space-y-1",
                children: [
                  _jsx("span", {
                    className:
                      "text-[9px] font-bold text-zinc-500 uppercase block",
                    children: "Incidents",
                  }),
                  searchResults.incidents.map((inc) =>
                    _jsxs(
                      "div",
                      {
                        onClick: () => {
                          setSelectedIncident(inc);
                          setGlobalSearch("");
                        },
                        className: `p-2 rounded-lg text-xs cursor-pointer ${isDark ? "hover:bg-zinc-900" : "hover:bg-gray-50"}`,
                        children: [
                          _jsx("strong", {
                            className: "text-rose-500 font-mono pr-1.5",
                            children: inc.id,
                          }),
                          " ",
                          inc.title,
                        ],
                      },
                      inc.id,
                    ),
                  ),
                ],
              }),
            searchResults.customers.length > 0 &&
              _jsxs("div", {
                className: "space-y-1",
                children: [
                  _jsx("span", {
                    className:
                      "text-[9px] font-bold text-zinc-500 uppercase block",
                    children: "Customers",
                  }),
                  searchResults.customers.map((c) =>
                    _jsxs(
                      "div",
                      {
                        onClick: () => {
                          setSelectedCustomerName(c.name);
                          setGlobalSearch("");
                        },
                        className: `p-2 rounded-lg text-xs cursor-pointer ${isDark ? "hover:bg-zinc-900" : "hover:bg-gray-50"}`,
                        children: [c.name, " (", c.tier, ")"],
                      },
                      c.id,
                    ),
                  ),
                ],
              }),
            searchResults.docs.length > 0 &&
              _jsxs("div", {
                className: "space-y-1",
                children: [
                  _jsx("span", {
                    className:
                      "text-[9px] font-bold text-zinc-500 uppercase block",
                    children: "Knowledge Docs",
                  }),
                  searchResults.docs.slice(0, 3).map((d) =>
                    _jsxs(
                      "div",
                      {
                        className: `p-2 rounded-lg text-xs ${isDark ? "hover:bg-zinc-900" : "hover:bg-gray-50"}`,
                        children: [
                          _jsx("strong", {
                            className: "text-indigo-400 font-mono pr-1.5",
                            children: d.id,
                          }),
                          " ",
                          d.title,
                        ],
                      },
                      d.id,
                    ),
                  ),
                ],
              }),
            searchResults.jira.length > 0 &&
              _jsxs("div", {
                className: "space-y-1",
                children: [
                  _jsx("span", {
                    className:
                      "text-[9px] font-bold text-zinc-500 uppercase block",
                    children: "Jira References",
                  }),
                  searchResults.jira.map((t) =>
                    _jsxs(
                      "div",
                      {
                        onClick: () => {
                          handleSelectTicket(t);
                          setGlobalSearch("");
                        },
                        className: `p-2 rounded-lg text-xs cursor-pointer ${isDark ? "hover:bg-zinc-900" : "hover:bg-gray-50"}`,
                        children: [
                          _jsx("strong", {
                            className: "text-rose-500 font-mono pr-1.5",
                            children: t.jiraEscalation?.issueKey,
                          }),
                          " ",
                          t.subject,
                        ],
                      },
                      t.id,
                    ),
                  ),
                ],
              }),
          ],
        }),
    ],
  });
  const navItems = isAdmin
    ? NAV_ITEMS.map((it) => ({
        ...it,
        badge: it.id === "tickets" ? pendingCount : undefined,
      }))
    : [
        { id: "submit", label: "Submit Ticket", icon: ClipboardList },
        { id: "my-tickets", label: "My Tickets", icon: TicketIcon },
      ];
  const currentTabForNav = isAdmin ? adminSubTab : activeTab;
  const sidebar = _jsxs("aside", {
    className: `fixed inset-y-0 right-0 w-64 flex flex-col transition-transform duration-300 z-100 rounded-l-md border-l
      md:sticky md:h-[calc(100vh-115px)] md:w-full md:translate-x-0 md:rounded-none md:border-l-0 text-zx
      ${sidebarOpen ? "translate-x-0 z-100" : "translate-x-full"}
    } ${isDark ? "bg-zinc-950/98 md:bg-zinc-950/60 border-zinc-800" : "bg-gray-100/95 border-slate-300"}`,
    children: [
      _jsxs("div", {
        className: `flex items-center justify-between p-4 md:hidden border-b ${isDark ? "border-zinc-800" : "border-slate-200"}`,
        children: [
          _jsx("span", {
            className: `text-xs font-bold ${isDark ? "text-white" : "text-slate-800"}`,
            children: "Menu",
          }),
          _jsx("button", {
            onClick: () => setSidebarOpen(false),
            className: `p-2 rounded-lg border transition-colors ${
              isDark
                ? "border-zinc-800 hover:bg-zinc-900 text-zinc-400"
                : "border-slate-200 hover:bg-gray-100 text-slate-600"
            }`,
            "aria-label": "Close navigation",
            children: _jsx(X, { size: 20 }),
          }),
        ],
      }),
      _jsx("nav", {
        className:
          "flex-1 p-4 space-y-1.5 overflow-y-auto pt-4 md:pt-4 text-xs",
        children: navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTabForNav === item.id;
          return _jsxs(
            "button",
            {
              onClick: () => {
                if (isAdmin) navigateAdminTab(item.id);
                else {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }
              },
              className: `w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium uppercase tracking-wide transition-all cursor-pointer ${
                isActive
                  ? isDark
                    ? "bg-gray-200 text-zinc-900 shadow-sm"
                    : "bg-gray-200 text-zinc-900 shadow-sm"
                  : isDark
                    ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                    : "text-slate-600 hover:text-slate-800 hover:bg-gray-100"
              }`,
              children: [
                _jsxs("div", {
                  className: "flex items-center gap-3",
                  children: [
                    _jsx(Icon, { size: 20 }),
                    _jsx("span", { children: item.label }),
                  ],
                }),
                item.badge !== undefined &&
                  item.badge > 0 &&
                  _jsx("span", {
                    className:
                      "px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-extrabold",
                    children: item.badge,
                  }),
              ],
            },
            item.id,
          );
        }),
      }),
      _jsx("div", {
        className: `p-2 space-y-3 border-t ${isDark ? "border-zinc-800" : "border-slate-200"}`,
        children: _jsxs("div", {
          className: "flex items-center md:flex-col gap-2",
          children: [
            _jsxs("button", {
              onClick: () => setTheme(isDark ? "light" : "dark"),
              className: `flex-1 w-[50%] md:w-full py-3 px-1 md:px-0 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold ${
                isDark
                  ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                  : "border-slate-200 text-slate-600 hover:bg-gray-100"
              }`,
              children: [
                isDark
                  ? _jsx(Sun, {
                      size: 14,
                      className: "flex-none text-amber-500",
                    })
                  : _jsx(Moon, {
                      size: 14,
                      className: "flex-none text-slate-400",
                    }),
                _jsx("span", {
                  className:
                    "ml-0 md:ml-2 text-sm font-medium whitespace-nowrap",
                  children: isDark ? "Light Mode" : "Dark Mode",
                }),
              ],
            }),
            _jsxs("button", {
              onClick: handleLogout,
              className: `flex-1 w-[50%] md:w-full py-3 rounded-xl border flex items-center justify-center gap-2 md:gap-3 text-sm font-bold ${
                isDark
                  ? "border-zinc-800 text-rose-400 hover:bg-rose-500/5"
                  : "border-slate-200 text-rose-600 hover:bg-rose-50"
              }`,
              children: [
                _jsx(LogOut, { size: 18 }),
                _jsx("span", { children: "Logout" }),
              ],
            }),
          ],
        }),
      }),
    ],
  });
  if (authScreen) return authScreen;
  return _jsxs("div", {
    className: `h-screen overflow-hidden flex flex-col transition-colors duration-200 relative w-full backdrop-blur-2xl ${
      isDark
        ? "bg-zinc-950 text-zinc-100 bg-grid-pattern dark-theme"
        : "bg-gray-100 text-slate-800 bg-grid-pattern-light light-theme"
    }`,
    children: [
      sessionExpired &&
        _jsx("div", {
          className: "fixed inset-0 z-[200] grid place-items-center bg-slate-950/70 px-4 backdrop-blur-sm",
          role: "dialog",
          "aria-modal": true,
          "aria-labelledby": "session-expired-title",
          children: _jsxs("div", {
            className: `w-full max-w-md rounded-2xl border p-7 text-center shadow-2xl ${
              isDark
                ? "border-zinc-700 bg-zinc-900 text-white"
                : "border-slate-200 bg-white text-slate-900"
            }`,
            children: [
              _jsx("div", {
                className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/15 text-amber-500",
                children: _jsx(AlertOctagon, { size: 30 }),
              }),
              _jsx("h2", {
                id: "session-expired-title",
                className: "mt-5 text-xl font-black tracking-tight",
                children: "Your session has expired",
              }),
              _jsx("p", {
                className: `mt-2 text-sm leading-6 ${isDark ? "text-zinc-400" : "text-slate-600"}`,
                children: "Log in again to continue securely.",
              }),
              _jsxs("button", {
                type: "button",
                onClick: handleLoginAgain,
                className: "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2",
                children: [_jsx(LogIn, { size: 18 }), "Log in again"],
              }),
            ],
          }),
        }),
      _jsx("div", {
        className: " z-[60] md:hidden",
        children: sidebar,
      }),
      _jsx("div", {
        className: `pointer-events-none z-0 ${isDark ? "gradient-glow" : "gradient-glow-light"}`,
      }),
      _jsxs("header", {
        className: `relative z-50 shrink-0 w-full px-4 md:px-6 py-3 flex items-center justify-between gap-4 border-b ${
          isDark
            ? "bg-slate-900/95 backdrop-blur-md border-zinc-800"
            : "bg-gray-200/95 backdrop-blur-md border-slate-200"
        }`,
        children: [
          _jsxs("div", {
            className: "flex items-center gap-2.5 z-10",
            children: [
              _jsx("div", {
                className: `p-2.5 rounded-xl shadow-lg flex items-center justify-center text-white ${isDark ? "bg-indigo-700 shadow-indigo-700/30" : "bg-indigo-600 shadow-indigo-600/20"}`,
                children: _jsx(ShieldCheck, { size: 22 }),
              }),
              _jsxs("div", {
                children: [
                  _jsx("span", {
                    className: `text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-indigo-400" : "text-indigo-600"}`,
                    children: "ChurnDesk",
                  }),
                  _jsx("h1", {
                    className: `text-base font-black tracking-tight leading-none ${isDark ? "text-white" : "text-slate-900"}`,
                    children: isAdmin
                      ? "Admin Operations Control"
                      : "User Portal",
                  }),
                ],
              }),
            ],
          }),
          isAdmin &&
            _jsx("div", {
              className: "hidden lg:flex flex-1 justify-center px-8",
              children: _jsx("div", {
                className: "w-full max-w-xl z-0",
                children: searchBar,
              }),
            }),
          _jsxs("div", {
            className: "hidden lg:flex items-center gap-3 z-100",
            children: [
              isAdmin &&
                _jsx(AIStatusIndicator, {
                  status: aiSystemStatus,
                  compact: true,
                }),
              isAdmin &&
                _jsx("button", {
                  onClick: () => setTheme(isDark ? "light" : "dark"),
                  className: `p-3 rounded-xl border transition-all cursor-pointer ${
                    isDark
                      ? "bg-zinc-900 border-zinc-800 text-amber-400 hover:text-amber-300"
                      : "bg-white border-slate-200 text-zinc-600 hover:bg-gray-50"
                  }`,
                  children: isDark
                    ? _jsx(Sun, { size: 18 })
                    : _jsx(Moon, { size: 18 }),
                }),
              _jsxs("div", {
                className: `flex items-center gap-2 px-3 py-2 rounded-xl border ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`,
                children: [
                  _jsx(UserCircle, { size: 18, className: "text-indigo-400" }),
                  _jsx("span", {
                    className: `text-xs font-bold ${isDark ? "text-white" : "text-slate-800"}`,
                    children: firstName,
                  }),
                  _jsx("button", {
                    onClick: handleLogout,
                    className: `text-zinc-500 hover:text-rose-500 transition-colors`,
                    title: "Logout",
                    children: _jsx(LogOut, { size: 16 }),
                  }),
                ],
              }),
            ],
          }),
          _jsxs("div", {
            className: "lg:hidden flex items-center gap-2 z-10",
            children: [
              _jsx("button", {
                onClick: () => setTheme(isDark ? "light" : "dark"),
                className: `p-3 rounded-xl border transition-all cursor-pointer ${isDark ? "bg-zinc-900 border-zinc-800 text-amber-400" : "bg-white border-slate-200 text-zinc-600"}`,
                children: isDark
                  ? _jsx(Sun, { size: 18 })
                  : _jsx(Moon, { size: 18 }),
              }),
              _jsx("button", {
                onClick: () => setSidebarOpen((open) => !open),
                className: `p-3 rounded-xl shadow-lg border text-white md:hidden ${isDark ? "bg-indigo-700 border-indigo-600" : "bg-indigo-600 border-indigo-500"}`,
                "aria-label": "Open navigation",
                children: _jsx(Menu, { size: 18 }),
              }),
            ],
          }),
        ],
      }),
      isAdmin &&
        _jsxs("div", {
          className: `lg:hidden shrink-0 z-0 px-4 py-2 border-b backdrop-blur-md flex items-center gap-2 ${
            isDark
              ? "bg-zinc-950/95 border-zinc-800"
              : "bg-white/95 border-slate-200"
          }`,
          children: [_jsx("div", { className: "flex-1", children: searchBar })],
        }),
      _jsxs("div", {
        className:
          "flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-[13rem_1fr] relative z-10 w-full",
        children: [
          _jsx("div", {
            className: "hidden md:contents",
            children: sidebar,
          }),
          _jsxs("main", {
            className:
              "w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 lg:py-8 overflow-x-hidden",
            children: [
              !isAdmin &&
                error &&
                _jsxs("div", {
                  className:
                    "mb-6 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm flex items-center justify-between gap-4",
                  children: [
                    _jsxs("span", {
                      children: ["Unable to load data: ", error],
                    }),
                    _jsx("button", {
                      onClick: () => refreshAll(),
                      className:
                        "shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold",
                      children: "Retry",
                    }),
                  ],
                }),

              !isAdmin && loading && tickets?.length === 0
                ? _jsx(LoadingSkeleton, {
                    message: "Loading operational data...",
                  })
                : _jsxs(_Fragment, {
                    children: [
                      activeTab === "submit" &&
                        !isAdmin &&
                        _jsx(SubmissionForm, {
                          onSubmitSuccess: handleNewTicket,
                          theme: theme,
                        }),
                      activeTab === "dashboard" &&
                        !isAdmin &&
                        _jsx(UserTicketsDashboard, {
                          // 2. Added fallback '|| []' just in case
                          tickets: tickets || [],
                          user: user,
                          theme: theme,
                          onSelectTicket: handleSelectTicket,
                        }),
                      activeTab === "my-tickets" &&
                        !isAdmin &&
                        _jsx(UserTicketsDashboard, {
                         
                          tickets: tickets || [],
                          user: user,
                          theme: theme,
                          showProfile: false,
                          onSelectTicket: handleSelectTicket,
                          selectedTicket: selectedTicket,
                          onCloseTicket: () => setSelectedTicket(null),
                        }),
                      isAdmin &&
                        activeTab === "dashboard" &&
                        renderAdminContent(),
                      activeTab === "hitl" &&
                        selectedTicket &&
                        _jsx(HITLWorkspace, {
                          ticket: selectedTicket,
                          onBack: () => {
                            setActiveTab("dashboard");
                            setSelectedTicket(null);
                          },
          onApprove: handleApproveTicket,
          onReject: handleRejectTicket,
          onDelete: handleDeleteTicket,
          theme: theme,
          onOpenCustomer: openUserProfile,
        }),
                    ],
                  }),
            ],
          }),
        ],
      }),
      selectedCustomerName &&
        _jsx(CustomerDetailModal, {
          customerName: selectedCustomerName,
          onClose: () => setSelectedCustomerName(null),
          theme: theme,
          onSelectTicketId: (id) => {
            const ticket = tickets.find((t) => t.id === id);
            if (ticket) {
              setSelectedCustomerName(null);
              handleSelectTicket(ticket);
            }
          },
        }),
      selectedIncident &&
        _jsx(IncidentsManager, {
          tickets: tickets,
          incidents: incidents,
          externalIncident: selectedIncident,
          onCloseExternalIncident: () => setSelectedIncident(null),
          onSelectTicket: (t) => {
            setSelectedIncident(null);
            handleSelectTicket(t);
          },
          theme: theme,
        }),
      _jsxs("footer", {
        className: `w-full text-center py-3 border-t text-sm font-mono z-10 ${
          isDark
            ? "border-zinc-800 bg-zinc-950/60 text-zinc-500"
            : "border-slate-200 bg-gray-200 text-slate-600"
        }`,
        children: [
          _jsx("span", {
            className: "font-bold text-indigo-500",
            children: "churnDesk",
          }),
          " \u00A9",
          " ",
          new Date().getFullYear(),
          " \u2022 Intelligent Incident Routing & AI Operations",
        ],
      }),
    ],
  });
}
