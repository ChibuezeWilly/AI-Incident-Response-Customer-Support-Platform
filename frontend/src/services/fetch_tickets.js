import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
export function fetchProcessedTickets() {
    return apiRequest(ENDPOINTS.adminTickets.processed);
}
export function resolveTicket(payload) {
    return apiRequest(ENDPOINTS.adminTickets.resolve(payload.ticket_id), { method: 'POST', body: payload });
}
