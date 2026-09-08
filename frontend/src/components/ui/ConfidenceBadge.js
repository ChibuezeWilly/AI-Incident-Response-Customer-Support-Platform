import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
export default function ConfidenceBadge({ confidence, showBar = false }) {
    const pct = (confidence * 100).toFixed(0);
    const color = confidence >= 0.9 ? 'text-emerald-500' :
        confidence >= 0.7 ? 'text-amber-500' : 'text-rose-500';
    const barColor = confidence >= 0.9 ? 'bg-indigo-500' :
        confidence >= 0.7 ? 'bg-amber-500' : 'bg-rose-500';
    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: `text-xs font-mono font-bold ${color}`, children: [pct, "%"] }), showBar && (_jsx("div", { className: "w-12 h-1 bg-zinc-800 rounded-full overflow-hidden", "aria-hidden": true, children: _jsx("div", { className: `h-full ${barColor}`, style: { width: `${confidence * 100}%` } }) }))] }));
}
