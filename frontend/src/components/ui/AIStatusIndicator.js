import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const STATUS_CONFIG = {
    operational: { label: 'AI Systems Operational', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', pulse: true },
    processing: { label: 'AI Processing', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', pulse: true },
    degraded: { label: 'Partial Degradation', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', pulse: true },
    unavailable: { label: 'AI Provider Unavailable', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', pulse: false },
    updating: { label: 'Knowledge Base Updating', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', pulse: true },
};
export default function AIStatusIndicator({ status, compact = false }) {
    const config = STATUS_CONFIG[status];
    return (_jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-xl font-bold border ${compact ? 'px-2 py-1 text-[9px]' : 'px-3 py-1.5 text-xs'} ${config.color}`, role: "status", "aria-label": config.label, children: [_jsx("span", { className: `w-1.5 h-1.5 rounded-full bg-current ${config.pulse ? 'animate-pulse' : ''}`, "aria-hidden": true }), config.label] }));
}
