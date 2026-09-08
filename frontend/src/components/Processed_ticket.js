import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { fetchProcessedTickets, resolveTicket } from '../services/fetch_tickets';
export default function ProcessedTickets() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const loadTickets = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setTickets(await fetchProcessedTickets());
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Failed to load processed tickets.');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void loadTickets(); }, [loadTickets]);
    const sendResolution = async (ticket) => {
        if (!ticket.resolution)
            return;
        try {
            await resolveTicket({ ticket_id: ticket.ticket_id, resolution: ticket.resolution, edited: false });
            setTickets((current) => current.filter(({ ticket_id }) => ticket_id !== ticket.ticket_id));
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Failed to send resolution.');
        }
    };
    if (loading)
        return _jsx("p", { className: "text-sm text-zinc-500", children: "Loading processed tickets\u2026" });
    if (error)
        return _jsxs("div", { className: "text-sm text-rose-500", children: [error, " ", _jsx("button", { className: "underline", onClick: () => void loadTickets(), children: "Retry" })] });
    return _jsxs("section", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "font-bold", children: "Processed Tickets" }), _jsx("span", { children: tickets.length })] }), tickets.map((ticket) => _jsxs("article", { className: "rounded-xl border border-zinc-800 p-3 text-sm", children: [_jsxs("p", { className: "font-semibold", children: ["#", ticket.ticket_id, " \u00B7 ", ticket.subject] }), _jsx("p", { className: "mt-1 text-zinc-500", children: ticket.resolution || 'No generated resolution available.' }), _jsx("button", { disabled: !ticket.resolution, onClick: () => void sendResolution(ticket), className: "mt-2 rounded bg-indigo-600 px-3 py-1 text-xs text-white disabled:opacity-50", children: "Send resolution" })] }, ticket.ticket_id)), !tickets.length && _jsx("p", { className: "text-sm text-zinc-500", children: "No processed tickets are awaiting delivery." })] });
}
