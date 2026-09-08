# Incident Response System — Frontend

AI operations control room UI. Runs **standalone with mock data** by default. Connect to your FastAPI backend when ready.

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

- **Admin** portal: operations dashboard, AI work queue, ticket review
- **User** portal: submit tickets, track status

## Mock mode (default)

No backend required. All data lives in `src/mock/handlers.ts` (in-memory store seeded from `src/mockData.ts`).

```env
# .env (optional — these are the defaults)
VITE_USE_MOCK_DATA=true
VITE_API_BASE_URL=http://localhost:8000
VITE_MOCK_USER_EMAIL=user-submit@acme.com
```

Copy `.env.example` to `.env` to customize.

## Connecting your backend

### 1. Flip mock mode off

```env
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=http://localhost:8000
```

### 2. Auth token

After login, store the JWT:

```ts
import { setAuthToken } from './api/client';
setAuthToken(response.access_token);
```

The HTTP client (`src/api/client.ts`) sends `Authorization: Bearer <token>` on every request.

### 3. Wire API functions

All integration points live in **`src/api/`**:

| File | Purpose |
|------|---------|
| `api/index.ts` | Unified exports — switches mock vs real |
| `api/client.ts` | `fetch` wrapper, auth, errors |
| `api/endpoints.ts` | Route constants matching FastAPI |
| `api/tickets.ts` | Real HTTP calls (stubs with TODOs) |
| `mock/handlers.ts` | Mock implementations |

### 4. Backend endpoints to implement / map

| Frontend function | Backend route | Notes |
|-------------------|---------------|-------|
| `createTicket` | `POST /tickets` | multipart: `subject`, `body`, `image` |
| `fetchTickets` | `GET /admin/tickets` | Returns `GraphState[]` — add mapper |
| `fetchTicketById` | `GET /admin/tickets/{id}` | Admin ticket detail |
| `approveTicket` | `POST /tickets/{thread}/approval` | `ApprovalDecision` body |
| `rejectTicket` | `POST /tickets/{thread}/approval` | `REJECT_AND_ESCALATE` |
| `checkModelHealth` | `GET /models/health` | AI status indicator |
| `fetchAnalytics` | `GET /models/metrics` | Analytics page |
| `fetchCustomers` | `GET /users` | Customer detail modal |

**Not yet on backend** (keep mock or add endpoints):

- Incidents / clusters → `fetchIncidents()`
- Knowledge health → `fetchKnowledgeDocs()`
- Global search → `globalSearch()`

### 5. Map backend types → frontend types

Backend `GraphState` / `HumanReviewPayload` fields differ from frontend `Ticket`. Add a mapper in `src/api/mappers.ts`:

```ts
// Example — implement when connecting
export function graphStateToTicket(state: BackendGraphState): Ticket { ... }
```

Frontend `Ticket` type: `src/types/index.ts`

### 6. App state

`src/context/AppContext.tsx` loads all data on mount and exposes actions. Components use `useAppContext()` — no direct `fetch` in UI code.

## Project structure

```
src/
  api/           # HTTP client + real API stubs
  mock/          # Mock store & handlers
  context/       # AppProvider + useAppContext
  types/         # Shared TypeScript types
  services/      # Business logic (mock triage, etc.)
  components/    # UI pages & widgets
    ui/          # Reusable badges, skeletons, etc.
  mockData.ts    # Seed data (demo only)
  config.ts      # Env configuration
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Oxlint |

## CORS

Ensure your FastAPI app allows the Vite dev origin:

```python
# compose.yaml / main.py
allow_origins=["http://localhost:5173"]
```
