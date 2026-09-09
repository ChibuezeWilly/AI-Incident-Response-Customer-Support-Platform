import { API_BASE_URL } from '../config';
export class ApiError extends Error {
    status;
    body;
    constructor(message, status, body) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.body = body;
    }
}
const TOKEN_KEY = 'irs_auth_token';
export const AUTH_SESSION_EXPIRED_EVENT = 'irs:auth-session-expired';
export function getAuthToken() {
    if (typeof window === 'undefined')
        return null;
    return localStorage.getItem(TOKEN_KEY);
}
export function setAuthToken(token) {
    if (typeof window === 'undefined')
        return;
    if (token)
        localStorage.setItem(TOKEN_KEY, token);
    else
        localStorage.removeItem(TOKEN_KEY);
}
/**
 * Thin fetch wrapper. Throws ApiError on non-2xx responses.
 * Wire setAuthToken() after login when connecting the backend.
 */
export async function apiRequest(path, options = {}) {
    const { body, auth = true, headers: customHeaders, ...rest } = options;
    const headers = new Headers(customHeaders);
    if (body !== undefined && !(body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    const token = auth ? getAuthToken() : null;
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...rest,
            headers,
            body: body === undefined
                ? undefined
                : body instanceof FormData
                    ? body
                    : JSON.stringify(body),
        });
    }
    catch (error) {
        const reason = error instanceof Error ? `: ${error.message}` : '';
        throw new ApiError(`Unable to reach the API at ${API_BASE_URL}${reason}`, 0, error);
    }
    if (!response.ok) {
        if (response.status === 401 && token && typeof window !== 'undefined') {
            window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
        }
        let errorBody;
        try {
            errorBody = await response.json();
        }
        catch {
            errorBody = await response.text();
        }
        throw new ApiError(`Request failed: ${response.status} ${response.statusText}`, response.status, errorBody);
    }
    if (response.status === 204)
        return undefined;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    return undefined;
}
