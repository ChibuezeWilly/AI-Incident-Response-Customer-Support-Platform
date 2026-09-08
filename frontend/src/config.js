/**
 * Frontend configuration.
 *
 * Set NEXT_PUBLIC_API_BASE_URL in .env.local when your backend is ready.
 * See frontend/README.md for the full integration checklist.
 */
export const API_BASE_URL = process.env.API_BASE_URL?.replace(/\/$/, '') ||
    'http://localhost:8000';
export const USE_MOCK_DATA = false;
