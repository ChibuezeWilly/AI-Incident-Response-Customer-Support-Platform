import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, FileWarning } from 'lucide-react';
import { fetchLatestAlert } from '../api';
export default function KnowledgeHealthView({ theme }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const isDark = theme === 'dark';
    useEffect(() => {
        fetchLatestAlert()
            .then((raw) => {
            const response = raw;
            const alert = response.alert;
            setAlerts(Array.isArray(alert) ? alert : alert ? [alert] : []);
        })
            .catch(() => setAlerts([]))
            .finally(() => setLoading(false));
    }, []);
    return _jsxs("div", { className: "space-y-6 animate-slide-up", children: [_jsxs("div", { children: [_jsx("h2", { className: `text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`, children: "Knowledge Health" }), _jsx("p", { className: "text-sm mt-1 text-zinc-500", children: "Documentation drift alerts from the backend." })] }), _jsxs("div", { className: `rounded-2xl border p-5 flex items-center gap-4 ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-slate-200'}`, children: [_jsx("div", { className: `p-3 rounded-xl ${alerts.length ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`, children: alerts.length ? _jsx(FileWarning, {}) : _jsx(CheckCircle2, {}) }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] uppercase font-bold text-zinc-500", children: "Drift alerts" }), _jsx("p", { className: `text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`, children: loading ? '…' : alerts.length })] })] }), loading ? _jsx("p", { className: "text-sm text-zinc-500", children: "Loading latest drift alert\u2026" }) : alerts.length === 0 ? _jsxs("div", { className: "py-16 text-center text-zinc-500", children: [_jsx(BookOpen, { className: "mx-auto mb-3" }), _jsx("p", { className: "font-semibold", children: "No documentation drift detected" })] }) : _jsx("div", { className: "space-y-3", children: alerts.map((alert, index) => _jsx("article", { className: `rounded-2xl border p-5 ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`, children: _jsxs("div", { className: "flex gap-3", children: [_jsx(AlertTriangle, { className: "text-amber-500 shrink-0", size: 18 }), _jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: `font-bold ${isDark ? 'text-amber-200' : 'text-amber-900'}`, children: alert.target_entity || 'Documentation drift' }), _jsx("p", { className: "text-sm mt-1 text-zinc-500", children: alert.message || 'Repeated corrections indicate that this knowledge source needs review.' }), _jsxs("p", { className: "text-xs mt-3 text-zinc-500", children: ["Files/values to change: ", _jsx("strong", { children: alert.old_value || 'not specified' }), alert.new_value ? _jsxs(_Fragment, { children: [" \u2192 ", _jsx("strong", { children: alert.new_value })] }) : null] }), _jsxs("p", { className: "text-xs mt-1 text-zinc-500", children: [alert.agent_count || 0, " matching correction", alert.agent_count === 1 ? '' : 's'] })] })] }) }, `${alert.target_entity}-${index}`)) })] });
}
