import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function SLAIndicator({ slaStatus, slaRemainingMinutes, compact = false }) {
    if (!slaStatus && !slaRemainingMinutes) {
        return _jsx("span", { className: "text-[10px] text-zinc-500", children: "SLA OK" });
    }
    const isUrgent = slaStatus === 'At Risk' || slaStatus === 'Breached' || (slaRemainingMinutes !== undefined && slaRemainingMinutes < 30);
    const label = slaRemainingMinutes !== undefined && slaRemainingMinutes > 0
        ? `${slaRemainingMinutes}m remaining`
        : slaStatus ?? 'SLA OK';
    if (compact) {
        return (_jsx("span", { className: `text-[10px] font-bold ${isUrgent ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`, children: label }));
    }
    return (_jsxs("span", { className: `text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${slaStatus === 'Breached' || slaStatus === 'At Risk'
            ? 'text-rose-500 bg-rose-500/10 border-rose-500/20 animate-pulse'
            : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'}`, children: ["SLA ", label] }));
}
