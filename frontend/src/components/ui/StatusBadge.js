import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function StatusBadge({ status, size = 'sm' }) {
    const sizeClass = size === 'sm' ? 'text-[13px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
    switch (status) {
        case 'AWAITING HUMAN REVIEW':
        case 'QUEUED':
            return (_jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-full font-bold border ${sizeClass} bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20`, children: [_jsx("span", { className: "w-1 h-1 rounded-full bg-amber-500 animate-pulse", "aria-hidden": true }), "Awaiting Review"] }));
        case 'PROCESSED':
            return (_jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-full font-bold border ${sizeClass} bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border-indigo-500/20`, children: [_jsx("span", { className: "w-1 h-1 rounded-full bg-indigo-550", "aria-hidden": true }), "Routed"] }));
        case 'RESOLVED':
            return (_jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-full font-bold border ${sizeClass} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20`, children: [_jsx("span", { className: "w-1 h-1 rounded-full bg-emerald-500", "aria-hidden": true }), "Resolved"] }));
        case 'ESCALATED':
            return (_jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-full font-bold border ${sizeClass} bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20`, children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse", "aria-hidden": true }), "Escalated"] }));
        case 'ESCALATION_PENDING':
            return (_jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-full font-bold border ${sizeClass} bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20`, children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse", "aria-hidden": true }), "Jira Syncing"] }));
        default:
            return (_jsx("span", { className: `inline-flex items-center gap-1.5 rounded-full font-bold border ${sizeClass} bg-zinc-500/10 text-zinc-550 dark:text-zinc-400 border-zinc-550/20`, children: "Failed" }));
    }
}
