import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function LoadingSkeleton({ message = 'Loading operational data...', rows = 4 }) {
    return (_jsxs("div", { className: "space-y-4 animate-pulse", role: "status", "aria-live": "polite", children: [_jsx("p", { className: "text-xs text-zinc-500 font-medium", children: message }), _jsx("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4", children: Array.from({ length: 4 }).map((_, i) => (_jsx("div", { className: "h-24 rounded-2xl bg-zinc-900/60 border border-zinc-800" }, i))) }), _jsx("div", { className: "space-y-3", children: Array.from({ length: rows }).map((_, i) => (_jsx("div", { className: "h-16 rounded-xl bg-zinc-900/40 border border-zinc-850" }, i))) })] }));
}
