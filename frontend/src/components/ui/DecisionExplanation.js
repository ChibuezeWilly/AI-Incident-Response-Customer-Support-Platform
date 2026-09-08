import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
export default function DecisionExplanation({ title = 'Why this decision?', explanation, signals = [], confidence, recommendedAction, }) {
    const [open, setOpen] = useState(false);
    if (!explanation && signals.length === 0)
        return null;
    return (_jsxs("div", { className: "space-y-1", children: [_jsxs("button", { type: "button", onClick: () => setOpen(!open), className: "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:underline focus:outline-none text-zinc-400", "aria-expanded": open, children: [_jsx("span", { children: title }), open ? _jsx(ChevronUp, { size: 11 }) : _jsx(ChevronDown, { size: 11 })] }), open && (_jsxs("div", { className: "p-3.5 border rounded-xl text-[10px] leading-relaxed bg-zinc-950 border-zinc-900 text-zinc-400 space-y-2", children: [explanation && _jsx("p", { children: explanation }), signals.length > 0 && (_jsxs("div", { children: [_jsx("span", { className: "font-bold text-zinc-500 uppercase tracking-wide block mb-1", children: "Signals used" }), _jsx("ul", { className: "list-disc pl-4 space-y-0.5", children: signals.map(s => _jsx("li", { children: s }, s)) })] })), confidence !== undefined && (_jsxs("p", { children: ["Confidence: ", _jsxs("strong", { className: "text-indigo-400", children: [(confidence * 100).toFixed(0), "%"] })] })), recommendedAction && (_jsxs("p", { className: "text-indigo-300", children: [_jsx("span", { className: "font-bold text-indigo-400", children: "Recommended: " }), recommendedAction] }))] }))] }));
}
