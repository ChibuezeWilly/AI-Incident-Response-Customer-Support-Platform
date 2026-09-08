import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bot, Clock, Cpu, RefreshCw, TrendingDown, TrendingUp, BarChart2 } from 'lucide-react';
import EmptyState from './ui/EmptyState';
export default function AnalyticsView({ theme, analytics, knowledgeDocs, tickets, incidents = [] }) {
    const isDark = theme === 'dark';
    if (!analytics) {
        return _jsx(EmptyState, { icon: BarChart2, title: "Analytics Unavailable", description: "Unable to load analytics data. Retry or check API connection." });
    }

    const totalTickets = analytics.totalTickets ?? tickets.length;
    const breached = analytics.slaBreaches ?? tickets.filter(t => t.slaStatus === 'Breached').length;
    const aiResolutionRate = analytics.aiResolutionRate?.toFixed(1) ?? '0';
    const humanEditRate = totalTickets > 0 ? (((analytics.responseDraftEditedByOperator ?? 0) / totalTickets) * 100).toFixed(1) : '0';
    const escalationRate = analytics.escalationRate?.toFixed(1) ?? '0';
    const lowConfRate = totalTickets > 0 ? (((analytics.lowConfidenceTickets ?? 0) / totalTickets) * 100).toFixed(1) : '0';
    const ticketsWithEvaluation = tickets.filter((ticket) => Number.isFinite(ticket.groundingScore) && ticket.groundingScore > 0);
    const groundingAverage = ticketsWithEvaluation.length
        ? ticketsWithEvaluation.reduce((sum, ticket) => sum + ticket.groundingScore, 0) / ticketsWithEvaluation.length
        : null;
    const retryRate = tickets.length
        ? tickets.filter((ticket) => ticket.ragRetries > 0).length / tickets.length
        : null;
    // Department distribution from tickets
    const deptCounts = tickets.reduce((acc, t) => {
        acc[t.department] = (acc[t.department] ?? 0) + 1;
        return acc;
    }, {});
    const departments = Object.entries(deptCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([dept, count]) => ({
        dept,
        count,
        pct: totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0,
    }));
    const liveVolumes = analytics.volumes.length ? analytics.volumes : Object.entries(tickets.reduce((groups, ticket) => {
        const day = new Date(ticket.createdAt).toLocaleDateString();
        groups[day] = (groups[day] ?? 0) + 1;
        return groups;
    }, {})).map(([date, count]) => ({ date, count }));
    const maxVolume = Math.max(...liveVolumes.map(v => v.count), 1);
    const performanceCards = [
        {
            label: 'AI Resolution Rate',
            value: `${aiResolutionRate}%`,
            desc: 'Resolved without human override',
            icon: Bot,
            color: 'text-emerald-500 bg-emerald-500/10',
            trend: 'up',
        },
        {
            label: 'Human Edit Rate',
            value: `${humanEditRate}%`,
            desc: 'Response draft edited by operator',
            icon: Cpu,
            color: 'text-amber-500 bg-amber-500/10',
            trend: 'neutral',
        },
        {
            label: 'Escalation Rate',
            value: `${escalationRate}%`,
            desc: 'Jira engineering escalations',
            icon: RefreshCw,
            color: 'text-rose-500 bg-rose-500/10',
            trend: 'down',
        },
        {
            label: 'SLA Breaches',
            value: `${breached}`,
            desc: 'Tickets missed response windows',
            icon: Clock,
            color: 'text-rose-600 bg-rose-500/10',
            trend: breached > 0 ? 'down' : 'up',
        },
        {
            label: 'Low Confidence',
            value: `${lowConfRate}%`,
            desc: 'AI decisions below 70% threshold',
            icon: TrendingDown,
            color: 'text-amber-500 bg-amber-500/10',
            trend: 'neutral',
        },
        {
            label: 'Routing Accuracy',
            value: `${(analytics.routingAccuracy * 100).toFixed(1)}%`,
            desc: 'BERT classification accuracy',
            icon: TrendingUp,
            color: 'text-emerald-500 bg-emerald-500/10',
            trend: 'up',
        },
        {
            label: 'Detected Incidents',
            value: `${incidents.length}`,
            desc: 'Clusters from ticket analysis',
            icon: BarChart2,
            color: 'text-violet-400 bg-violet-500/10',
            trend: incidents.length > 0 ? 'down' : 'neutral',
        },
    ];
    return (_jsxs("div", { className: "space-y-8 animate-slide-up", children: [_jsxs("div", { children: [_jsx("h2", { className: `text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`, children: "Operational Analytics" }), _jsx("p", { className: `text-sm mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`, children: "AI pipeline metrics, grounding evaluations, latency distributions, and SLA health." })] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4", children: performanceCards.map((card, idx) => {
                    const Icon = card.icon;
                    return (_jsxs("div", { className: `p-4 border rounded-2xl flex flex-col justify-between gap-3 ${isDark ? 'glass-panel border-zinc-800' : 'glass-panel-light border-slate-200'}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: `p-2 rounded-lg ${card.color}`, children: _jsx(Icon, { size: 14 }) }), card.trend === 'up' && _jsx(TrendingUp, { size: 12, className: "text-emerald-500" }), card.trend === 'down' && _jsx(TrendingDown, { size: 12, className: "text-rose-500" })] }), _jsxs("div", { children: [_jsx("span", { className: `text-[9px] text-zinc-500 font-extrabold uppercase tracking-wide block`, children: card.label }), _jsx("p", { className: `text-xl font-black mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`, children: card.value }), _jsx("p", { className: "text-[9px] text-zinc-500 font-medium mt-0.5", children: card.desc })] })] }, idx));
                }) }), _jsxs("div", { className: "grid grid-cols-1 xl:grid-cols-3 gap-6", children: [_jsxs("div", { className: `p-5 border rounded-2xl space-y-4 xl:col-span-2 ${isDark ? 'glass-panel border-zinc-800' : 'glass-panel-light border-slate-200'}`, children: [_jsxs("div", { className: "border-b pb-3 border-zinc-900/40", children: [_jsx("h3", { className: `text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-450' : 'text-slate-500'}`, children: "Ticket Influx Volume" }), _jsx("p", { className: `text-[10px] mt-0.5 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`, children: "Hourly inflow \u2014 overnight window" })] }), _jsxs("div", { className: "h-48 flex items-end gap-1.5 pt-4 relative", children: [_jsxs("div", { className: "flex flex-col justify-between h-full pr-2 text-right", children: [_jsx("span", { className: `text-[9px] font-mono ${isDark ? 'text-zinc-600' : 'text-slate-400'}`, children: maxVolume }), _jsx("span", { className: `text-[9px] font-mono ${isDark ? 'text-zinc-600' : 'text-slate-400'}`, children: Math.round(maxVolume / 2) }), _jsx("span", { className: `text-[9px] font-mono ${isDark ? 'text-zinc-600' : 'text-slate-400'}`, children: "0" })] }), liveVolumes.map((v, idx) => {
                                        const heightPct = (v.count / maxVolume) * 100;
                                        return (_jsxs("div", { className: "flex-1 flex flex-col items-center gap-1 h-full justify-end group", children: [_jsx("div", { className: "text-[9px] font-mono text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold", children: v.count }), _jsx("div", { className: "w-full rounded-t-md bg-indigo-500/20 group-hover:bg-indigo-500 transition-all duration-200 border-t-2 border-indigo-500/60 group-hover:border-indigo-400", style: { height: `${heightPct * 0.8}%` } }), _jsx("span", { className: `text-[8px] font-mono ${isDark ? 'text-zinc-600' : 'text-slate-400'}`, children: v.date })] }, idx));
                                    })] })] }), _jsxs("div", { className: `p-5 border rounded-2xl space-y-4 ${isDark ? 'glass-panel border-zinc-800' : 'glass-panel-light border-slate-200'}`, children: [_jsxs("div", { className: "border-b pb-3 border-zinc-900/40", children: [_jsx("h3", { className: `text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-450' : 'text-slate-500'}`, children: "Department Distribution" }), _jsxs("p", { className: `text-[10px] mt-0.5 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`, children: [totalTickets, " tickets classified"] })] }), _jsxs("div", { className: "space-y-3 pt-1", children: [departments.length > 0 ? departments.map(({ dept, count, pct }) => {
                                        const colors = {
                                            IT: 'bg-indigo-500',
                                            Finance: 'bg-emerald-500',
                                            HR: 'bg-amber-500',
                                            Facilities: 'bg-rose-400',
                                            Engineering: 'bg-violet-500',
                                            Legal: 'bg-sky-500',
                                        };
                                        const color = colors[dept] ?? 'bg-zinc-500';
                                        return (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between text-[10px] mb-1", children: [_jsx("span", { className: isDark ? 'text-zinc-350' : 'text-slate-700', children: dept }), _jsxs("span", { className: `font-mono font-bold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`, children: [count, " ", _jsxs("span", { className: "text-zinc-500", children: ["(", pct, "%)"] })] })] }), _jsx("div", { className: `h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`, children: _jsx("div", { className: `h-full ${color} transition-all duration-500`, style: { width: `${pct}%` } }) })] }, dept));
                                    }) : (_jsx("p", { className: `text-[10px] ${isDark ? 'text-zinc-600' : 'text-slate-400'}`, children: "No ticket data yet." })), _jsxs("div", { className: `pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-slate-100'}`, children: [_jsxs("div", { className: "flex justify-between text-[10px] mb-1", children: [_jsx("span", { className: "text-zinc-450", children: "BERT Routing Accuracy" }), _jsxs("span", { className: "font-mono font-extrabold text-emerald-500", children: [(analytics.routingAccuracy * 100).toFixed(1), "%"] })] }), _jsx("div", { className: `h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`, children: _jsx("div", { className: "h-full bg-emerald-500 transition-all duration-500", style: { width: `${analytics.routingAccuracy * 100}%` } }) })] })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: `p-5 border rounded-2xl space-y-4 ${isDark ? 'glass-panel border-zinc-800' : 'glass-panel-light border-slate-200'}`, children: [_jsx("div", { className: "border-b pb-3 border-zinc-900/40", children: _jsx("h3", { className: `text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-450' : 'text-slate-500'}`, children: "RAG Retrieval & Evaluation" }) }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: `p-4 border rounded-xl text-center ${isDark ? 'bg-zinc-950 border-zinc-900' : 'bg-slate-50 border-slate-150'}`, children: [_jsx("span", { className: "text-[9px] text-zinc-550 font-bold block uppercase tracking-wider", children: "Grounding Avg" }), _jsxs("p", { className: "text-xl font-mono font-extrabold text-indigo-400 mt-1", children: [(analytics.ragGroundingAvg * 100).toFixed(0), "%"] }), _jsx("span", { className: "text-[9px] text-zinc-600 block mt-0.5", children: "Hallucination pass rate" })] }), _jsxs("div", { className: `p-4 border rounded-xl text-center ${isDark ? 'bg-zinc-950 border-zinc-900' : 'bg-slate-50 border-slate-150'}`, children: [_jsx("span", { className: "text-[9px] text-zinc-550 font-bold block uppercase tracking-wider", children: "Retry Rate" }), _jsxs("p", { className: "text-xl font-mono font-extrabold text-amber-500 mt-1", children: [(analytics.ragRetryRate * 100).toFixed(0), "%"] }), _jsx("span", { className: "text-[9px] text-zinc-600 block mt-0.5", children: "Query refinements triggered" })] })] }), knowledgeDocs.filter(d => d.status !== 'Healthy').length > 0 && (_jsxs("div", { className: "space-y-2 pt-1", children: [_jsx("span", { className: `text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-550' : 'text-slate-400'}`, children: "Low-Grounding Documents" }), knowledgeDocs.filter(d => d.status !== 'Healthy').map(d => (_jsxs("div", { className: "flex justify-between items-center text-[10px]", children: [_jsx("span", { className: `truncate max-w-[200px] ${isDark ? 'text-zinc-350' : 'text-slate-600'}`, children: d.title }), _jsxs("span", { className: `font-bold ml-2 shrink-0 ${d.groundingScore < 0.50 ? 'text-rose-500' : 'text-amber-500'}`, children: [(d.groundingScore * 100).toFixed(0), "% grounding"] })] }, d.id)))] }))] }), _jsxs("div", { className: `p-5 border rounded-2xl space-y-4 ${isDark ? 'glass-panel border-zinc-800' : 'glass-panel-light border-slate-200'}`, children: [_jsx("div", { className: "border-b pb-3 border-zinc-900/40", children: _jsx("h3", { className: `text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-450' : 'text-slate-500'}`, children: "Pipeline Latency Distribution" }) }), _jsxs("div", { className: "space-y-4", children: [[
                                        { label: 'P50 Latency (Median)', value: analytics.p50Latency, color: 'bg-indigo-500', textColor: 'text-indigo-400' },
                                        { label: 'P95 Latency', value: analytics.p95Latency, color: 'bg-amber-500', textColor: 'text-amber-500' },
                                        { label: 'P99 Latency (Max spike)', value: analytics.p99Latency, color: 'bg-rose-500', textColor: 'text-rose-500' },
                                    ].map(({ label, value, color, textColor }) => (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between text-xs mb-1", children: [_jsx("span", { className: isDark ? 'text-zinc-350' : 'text-slate-700', children: label }), _jsxs("span", { className: `font-mono font-bold ${textColor}`, children: [value, "ms"] })] }), _jsx("div", { className: `h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-850' : 'bg-slate-200'}`, children: _jsx("div", { className: `h-full ${color} transition-all duration-500`, style: { width: `${Math.min((value / 300) * 100, 100)}%` } }) })] }, label))), _jsx("div", { className: `pt-3 border-t space-y-2 ${isDark ? 'border-zinc-800' : 'border-slate-100'}`, children: _jsxs("div", { className: "flex justify-between text-[10px]", children: [_jsx("span", { className: isDark ? 'text-zinc-500' : 'text-slate-500', children: "Avg SLA Resolution" }), _jsxs("span", { className: `font-mono font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`, children: [analytics.avgSlaResolutionTime, "m"] })] }) })] }), _jsx("p", { className: `text-[10px] leading-relaxed ${isDark ? 'text-zinc-550' : 'text-slate-450'}`, children: "End-to-end includes: Llama Guard \u2192 Vision OCR \u2192 BERT classification \u2192 Dense/BM25 retrieval \u2192 LLM triage \u2192 Grounding check." })] })] })] }));
}
