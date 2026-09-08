import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function EmptyState({ icon: Icon, title, description, action }) {
    return (_jsxs("div", { className: "py-16 text-center border rounded-2xl border-dashed border-zinc-800 text-zinc-500 space-y-2", children: [_jsx(Icon, { className: "mx-auto mb-2 text-zinc-600", size: 24, "aria-hidden": true }), _jsx("p", { className: "text-sm font-semibold text-zinc-400", children: title }), _jsx("p", { className: "text-xs max-w-sm mx-auto", children: description }), action && (_jsx("button", { onClick: action.onClick, className: "mt-3 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider", children: action.label }))] }));
}
