import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from 'react';
import { approveTicket, checkModelHealth, createTicket, deleteTicket, fetchAnalytics, fetchIncidentAnalysis, fetchPendingTickets, fetchTickets, rejectTicket, } from '../api';
import { mapTicket } from '../api/tickets';
import { getCachedUser } from '../utils/auth';
import { getAuthToken } from '../api/client';
const AppContext = createContext(null);
export function AppProvider({ children }) {
    const [tickets, setTickets] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [knowledgeDocs, setKnowledgeDocs] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [aiOverview, setAiOverview] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [aiSystemStatus, setAiSystemStatus] = useState('operational');
    const refreshAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const isAdmin = getCachedUser()?.role === 'admin';
            if (!isAdmin) {
                const t = await fetchTickets();
                setTickets(t);
                setIncidents([]);
                setCustomers([]);
                setKnowledgeDocs([]);
                setNotifications([]);
                setAnalytics(null);
                setAiOverview(null);
                setAiSystemStatus(t.some((x) => x.status === 'QUEUED') ? 'processing' : 'operational');
                return;
            }
            // The ticket list is essential. Keep it visible if an optional
            // operational request (such as checkpoint-backed pending tickets)
            // is temporarily unavailable.
            const [allTicketsResult, pendingTicketsResult, analyticsResult, incidentResult, healthResult] = await Promise.allSettled([
                fetchTickets(),
                fetchPendingTickets(),
                fetchAnalytics(),
                fetchIncidentAnalysis(),
                checkModelHealth(),
            ]);
            if (allTicketsResult.status === 'rejected')
                throw allTicketsResult.reason;
            const allTickets = allTicketsResult.value;
            const pendingTickets = pendingTicketsResult.status === 'fulfilled' ? pendingTicketsResult.value : [];
            const anal = analyticsResult.status === 'fulfilled' ? analyticsResult.value : null;
            const incidentAnalysis = incidentResult.status === 'fulfilled'
                ? incidentResult.value
                : { potential_incidents_detected: false, clusters: [] };
            const health = healthResult.status === 'fulfilled'
                ? healthResult.value
                : { status: 'operational' };
            // Pending payloads carry the graph's RAG trace and AI draft; replace their
            // shallow /tickets entries while retaining every historical ticket.
            const pending = pendingTickets.map(mapTicket);
            const pendingById = new Map(pending.map((ticket) => [ticket.id, ticket]));
            const t = allTickets.map((ticket) => pendingById.get(ticket.id) ?? ticket);
            setTickets(t);
            setIncidents(incidentAnalysis.clusters.map((cluster, index) => ({
                id: `INC-${index + 1}`,
                title: cluster.incident_title,
                severity: cluster.ticket_ids.length >= 5 ? 'P1' : cluster.ticket_ids.length >= 3 ? 'P2' : 'P3',
                status: 'Investigating', relatedTicketCount: cluster.ticket_ids.length,
                relatedTicketIds: cluster.ticket_ids.map(String), affectedCustomersCount: cluster.ticket_ids.length,
                affectedRegions: cluster.affected_regions, service: 'Support platform',
                firstDetected: new Date().toISOString(), lastDetected: new Date().toISOString(), errorRate: 'Under analysis',
                timeline: [], aiAssessment: { likelyCause: cluster.description, confidence: 0.8, evidence: cluster.description, recommendation: 'Review the linked tickets and coordinate mitigation.' },
            })));
            setCustomers([]);
            setKnowledgeDocs([]);
            setAnalytics(anal);
            setNotifications([]);
            setAiOverview(null);
            const hasProcessing = t.some((x) => x.status === 'QUEUED');
            const hasFailed = t.some((x) => x.status === 'FAILED');
            if (health.status === 'unavailable')
                setAiSystemStatus('unavailable');
            else if (hasFailed)
                setAiSystemStatus('degraded');
            else if (hasProcessing)
                setAiSystemStatus('processing');
            else
                setAiSystemStatus('operational');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load data');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        // The login callback invokes refreshAll after persisting the complete session.
        if (getCachedUser() && getAuthToken()) {
            void refreshAll();
        }
        else {
            setLoading(false);
        }
    }, [refreshAll]);
    const submitTicket = useCallback(async (input) => {
        const ticket = await createTicket(input);
        setTickets((prev) => [ticket, ...prev]);
        return ticket;
    }, []);
    const approveTicketAction = useCallback(async (input) => {
        const updated = await approveTicket(input);
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        return updated;
    }, []);
    const rejectTicketAction = useCallback(async (id, threadId) => {
        const updated = await rejectTicket(id, threadId);
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        return updated;
    }, []);
    const deleteTicketAction = useCallback(async (id) => {
        const deleted = await deleteTicket(id);
        setTickets((prev) => prev.filter((t) => t.id !== deleted.id));
        return deleted;
    }, []);
    const search = useCallback(async (query) => {
        if (!query.trim())
            return null;
        const normalized = query.toLowerCase();
        return {
            tickets: tickets.filter((ticket) => ticket.subject.toLowerCase().includes(normalized) || ticket.id.includes(normalized)),
            incidents: [], customers: [], docs: [], jira: [],
        };
    }, [tickets]);
    const markAllNotificationsRead = useCallback(async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, []);
    const pendingCount = useMemo(() => tickets.filter((t) => t.status === 'AWAITING HUMAN REVIEW').length, [tickets]);
    const value = useMemo(() => ({
        tickets,
        incidents,
        customers,
        knowledgeDocs,
        analytics,
        aiOverview,
        notifications,
        loading,
        error,
        aiSystemStatus,
        pendingCount,
        refreshAll,
        submitTicket,
        approveTicketAction,
        rejectTicketAction,
        deleteTicketAction,
        search,
        markAllNotificationsRead,
    }), [
        tickets,
        incidents,
        customers,
        knowledgeDocs,
        analytics,
        aiOverview,
        notifications,
        loading,
        error,
        aiSystemStatus,
        pendingCount,
        refreshAll,
        submitTicket,
        approveTicketAction,
        rejectTicketAction,
        deleteTicketAction,
        search,
        markAllNotificationsRead,
    ]);
    return _jsx(AppContext.Provider, { value: value, children: children });
}
export function useAppContext() {
    const ctx = useContext(AppContext);
    if (!ctx)
        throw new Error('useAppContext must be used within AppProvider');
    return ctx;
}
