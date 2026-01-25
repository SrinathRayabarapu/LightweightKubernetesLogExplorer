# Architecture Document

## K8S Log Explorer - Technical Architecture

**Version:** 1.0  
**Last Updated:** January 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Architecture Decisions](#3-architecture-decisions)
4. [Component Architecture](#4-component-architecture)
5. [Data Flow](#5-data-flow)
6. [Database Design](#6-database-design)
7. [API Design](#7-api-design)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Security Considerations](#9-security-considerations)
10. [Performance Optimizations](#10-performance-optimizations)
11. [Issues Resolved](#11-issues-resolved)
12. [Testing Strategy](#12-testing-strategy)
13. [Deployment](#13-deployment)
14. [Future Considerations](#14-future-considerations)

---

## 1. Executive Summary

### Purpose

K8S Log Explorer is a lightweight, local web application for exploring Kubernetes logs across multiple environments. It provides developers with quick access to logs without requiring external infrastructure like ELK, Loki, or Splunk.

### Key Design Goals

| Goal | Description |
|------|-------------|
| **Lightweight** | No external dependencies beyond kubectl |
| **Local-First** | Runs entirely on developer's machine |
| **Fast** | Sub-second search across millions of log lines |
| **Simple** | Easy to install, configure, and use |
| **Stable** | Robust error handling and graceful degradation |

### Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| Frontend | React 18 + Vite | Fast development, modern tooling, excellent DX |
| Backend | FastAPI (Python) | Async support, auto-docs, Pydantic validation |
| Database | SQLite + FTS5 | Zero-config, full-text search, single file |
| K8s Access | kubectl subprocess | No SDK dependencies, uses existing auth |

---

## 2. System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              User Browser                                │
│                          (localhost:5173)                               │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ HTTP (REST API)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Frontend (React)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ ThemeContext │  │  React Query │  │  Components  │  │   Filters   │ │
│  │  (22 themes) │  │   (caching)  │  │  (LogTable)  │  │  (patterns) │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ Vite Proxy (/api → :8000)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Backend (FastAPI)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Routers    │  │   Services   │  │   Database   │  │  Scheduler  │ │
│  │ (REST APIs)  │  │  (kubectl)   │  │   (SQLite)   │  │ (auto-refresh)│
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ subprocess
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            kubectl CLI                                  │
│                    (uses ~/.kube/config contexts)                       │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Kubernetes Clusters                                  │
│         ┌─────────┐      ┌─────────┐      ┌─────────┐                  │
│         │   SIT   │      │ REPLICA │      │  PROD   │                  │
│         └─────────┘      └─────────┘      └─────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
User Action          Frontend              Backend                kubectl
    │                   │                     │                      │
    │ Select Pod        │                     │                      │
    ├──────────────────►│                     │                      │
    │                   │ POST /logs/fetch    │                      │
    │                   ├────────────────────►│                      │
    │                   │                     │ kubectl logs         │
    │                   │                     ├─────────────────────►│
    │                   │                     │◄─────────────────────┤
    │                   │                     │ Parse & Store        │
    │                   │◄────────────────────┤                      │
    │                   │ GET /logs           │                      │
    │                   ├────────────────────►│                      │
    │                   │◄────────────────────┤                      │
    │◄──────────────────┤ Display Logs        │                      │
```

---

## 3. Architecture Decisions

### ADR-001: Use kubectl Subprocess Instead of K8s SDK

**Context:** Need to access Kubernetes clusters for log retrieval.

**Decision:** Use kubectl as a subprocess instead of the official Kubernetes Python SDK.

**Rationale:**
- Leverages existing `~/.kube/config` authentication
- No SDK version compatibility issues
- Users already have kubectl configured
- Simpler credential management (no token storage in app)

**Consequences:**
- kubectl must be installed on the system
- Subprocess overhead for each command
- Must handle stdout/stderr parsing

---

### ADR-002: SQLite with FTS5 for Log Storage

**Context:** Need fast full-text search across potentially millions of log lines.

**Decision:** Use SQLite with FTS5 (Full-Text Search) extension.

**Rationale:**
- Zero configuration required
- Single file database (easy backup/cleanup)
- FTS5 provides fast full-text search
- WAL mode enables concurrent reads during writes
- No external database server needed

**Consequences:**
- Single-writer limitation (addressed with asyncio lock)
- 100 MB cap to prevent disk exhaustion
- Need retention policy for old logs

---

### ADR-003: Fetch ALL Logs by Default

**Context:** Users reported seeing fewer logs than expected when selecting a pod.

**Decision:** Fetch ALL available logs from kubectl (no `--tail` limit) on pod selection.

**Rationale:**
- Users expect to see complete log history
- Previous `--tail 500` limit was confusing
- Modern systems can handle large log volumes
- Pagination handles display (1000 logs per page)

**Consequences:**
- Initial fetch may take longer for pods with many logs
- Increased timeout (60s → 120s for fetchAll)
- Database stores complete history (managed by retention)

---

### ADR-004: Serialize All Database Operations

**Context:** Segmentation faults occurred during concurrent database access.

**Decision:** Use a global asyncio.Lock to serialize ALL database operations.

**Rationale:**
- aiosqlite uses SQLite's C extension which is not thread-safe
- Concurrent requests (GET /logs + POST /logs/fetch) caused memory corruption
- Single lock ensures safe access patterns

**Consequences:**
- Slight performance impact on concurrent requests
- Guaranteed stability over raw performance
- Simple solution vs complex connection pooling

**Implementation:**
```python
_db_operation_lock: Optional[asyncio.Lock] = None

def _get_lock() -> asyncio.Lock:
    """Get or create the database operation lock."""
    global _db_operation_lock
    if _db_operation_lock is None:
        _db_operation_lock = asyncio.Lock()
    return _db_operation_lock

async def fetch_all(query: str, params: tuple = ()):
    async with _get_lock():  # Serialize access
        db = await _get_connection()
        cursor = await db.execute(query, params)
        return await cursor.fetchall()
```

---

### ADR-005: Client-Side Log Filtering with Toggle

**Context:** Users wanted to filter out noise (healthchecks) but also see full logs when needed.

**Decision:** Implement client-side filtering with a toggle button.

**Rationale:**
- Filter patterns configured in frontend (easy to modify)
- Toggle allows users to see filtered logs when needed
- No backend changes required for filter updates
- Instant filtering without API calls

**Consequences:**
- All logs fetched from backend (filtering is display-only)
- Filter patterns not shared across users
- Must re-apply filters after each data fetch

---

### ADR-006: Theme System with CSS Variables

**Context:** Users requested multiple themes for different preferences.

**Decision:** Implement 22 themes using CSS variables and React Context.

**Rationale:**
- CSS variables allow instant theme switching
- React Context provides global theme state
- localStorage persists user preference
- Bootstrap integration provides consistent base styles

**Consequences:**
- All components must use theme.colors for styling
- Theme definitions add ~500 lines of code
- Must maintain color consistency across 22 themes

---

## 4. Component Architecture

### Backend Components

```
backend/app/
├── main.py                 # FastAPI app with lifespan management
│   ├── Lifespan events (startup/shutdown)
│   ├── CORS middleware
│   └── Exception handlers
│
├── config.py               # Configuration management
│   ├── Environment YAML loader
│   ├── Settings class (DATABASE_PATH, limits, etc.)
│   └── kubectl context resolver
│
├── database.py             # Thread-safe SQLite operations
│   ├── Connection management with lazy lock
│   ├── Schema initialization (logs, FTS5, hashes)
│   ├── CRUD operations (execute, fetch_one, fetch_all)
│   └── WAL mode, busy_timeout, autocommit
│
├── models.py               # Pydantic models
│   ├── EnvConfig, LogEntry, LogsResponse
│   ├── FetchLogsRequest (with fetchAll flag)
│   └── PodInfo, TimeWindowRequest
│
├── routers/
│   ├── envs.py             # GET /envs
│   ├── logs.py             # GET/POST /logs, /logs/search, /logs/by-time
│   ├── namespaces.py       # GET /namespaces, /services, /pods
│   └── refresh.py          # POST /refresh/subscribe, /unsubscribe
│
└── services/
    ├── kubectl.py          # Subprocess wrapper
    │   ├── run_kubectl() with timeout handling
    │   ├── Graceful termination (SIGTERM → SIGKILL)
    │   └── get_pod_logs(), get_services(), etc.
    │
    ├── log_collector.py    # Log fetching & parsing
    │   ├── Multi-line log handling (stack traces)
    │   ├── Timestamp parsing (ISO 8601, standard)
    │   ├── Hash-based deduplication
    │   └── Batch storage (100 entries at a time)
    │
    ├── log_store.py        # Database queries
    │   ├── get_logs() with pagination
    │   ├── search_logs() with FTS5
    │   ├── FTS5 query escaping
    │   └── Time window queries
    │
    ├── retention.py        # Storage management
    │   ├── Size monitoring (100 MB cap)
    │   ├── Delete oldest logs when exceeded
    │   └── VACUUM for space reclamation
    │
    └── refresh_scheduler.py # Background tasks
        ├── Subscription management
        ├── Periodic log fetching
        └── Graceful cancellation
```

### Frontend Components

```
frontend/src/
├── api/
│   └── client.ts           # API client
│       ├── fetchJson() with error handling
│       ├── All API endpoints (getLogs, fetchLogs, etc.)
│       └── fetchAll parameter support
│
├── components/
│   ├── LogTable.tsx        # Main log display
│   │   ├── Log rendering with severity highlighting
│   │   ├── JSON formatting (requestPayload)
│   │   ├── Multi-term search highlighting (AND/OR)
│   │   ├── Text selection → "Add to Search" popup
│   │   ├── Copy to clipboard (floating button)
│   │   ├── Ask AI (Perplexity integration)
│   │   ├── Excel export (filtered/all logs)
│   │   ├── Font size controls (+/−)
│   │   ├── Filter toggle ("Show All" / "Filtering Off")
│   │   ├── Auto-hiding headers on scroll
│   │   ├── Time navigation integration
│   │   └── Floating "Load More" button
│   │
│   ├── SearchBar.tsx       # Search input
│   ├── TimeNavigation.tsx  # ±5m/±10m buttons
│   ├── EnvSelector.tsx     # Environment dropdown
│   ├── PodSelector.tsx     # Pod dropdown with status
│   ├── SearchableSelect.tsx # Autocomplete dropdown (Enter auto-selects single match)
│   ├── RefreshIndicator.tsx # Refresh button & auto-refresh (10s/30s/1m/2m/5m/10m)
│   │   # LogTable features: font size controls, Copy, Ask AI (Perplexity), Excel export
│   └── ThemeSelector.tsx   # Theme dropdown
│
├── config/
│   ├── themes.ts           # 22 theme definitions
│   │   ├── Theme interface
│   │   ├── Color palettes (dark/light)
│   │   └── getThemeOptions() for dropdown
│   │
│   └── logFilters.ts       # Exclusion patterns
│       ├── Pattern list (healthcheck, probes, etc.)
│       └── filterLogs() function
│
├── context/
│   └── ThemeContext.tsx    # Global theme state
│       ├── Theme persistence (localStorage)
│       ├── CSS variable application
│       └── useTheme() hook
│
├── hooks/
│   └── useLogs.ts          # React Query hooks
│       ├── useLogs(), useSearchLogs(), useLogsByTime()
│       ├── useFetchLogs() mutation
│       ├── useServices(), usePods() (no caching)
│       └── Cache invalidation on fetch
│
├── App.tsx                 # Main component (570 lines)
│   ├── State management (env, service, pod, filters)
│   ├── View modes (logs, search, time-window)
│   ├── Auto-fetch on pod selection (fetchAll: true)
│   ├── Filter toggle state
│   └── Layout & styling
│
├── main.tsx                # Entry point
│   ├── React Query provider
│   ├── Theme provider
│   └── Bootstrap CSS import
│
└── index.css               # Global styles
    ├── CSS variable definitions
    ├── Bootstrap overrides
    └── Custom scrollbar styling
```

---

## 5. Data Flow

### Log Fetching Flow

```
1. User selects pod
        │
        ▼
2. Frontend: fetchLogsMutation({ fetchAll: true })
        │
        ▼
3. Backend: POST /logs/fetch
        │
        ├── Get kubectl context for environment
        ├── Get service selector
        ├── Get pods matching selector
        ├── Clear old logs for pod (if pod_filter)
        │
        ▼
4. For each container:
        │
        ├── kubectl logs <pod> -c <container> [--tail N | all]
        │       │
        │       ▼
        ├── Parse logs (multi-line handling)
        │       │
        │       ▼
        ├── Compute dedup hash
        │       │
        │       ▼
        └── Store in SQLite (batch of 100)
                │
                ▼
5. Backend returns: { success, logs_stored, last_timestamp }
        │
        ▼
6. Frontend: GET /logs (with limit=1000, offset=0)
        │
        ▼
7. Backend queries SQLite (ORDER BY timestamp DESC, id ASC)
        │
        ▼
8. Frontend: Apply filters → Display logs
```

### Search Flow

```
1. User enters search query
        │
        ▼
2. Frontend: GET /logs/search?query=...
        │
        ▼
3. Backend: Escape FTS5 special characters
        │
        ├── Wrap query in quotes: "user query"
        │
        ▼
4. FTS5 JOIN query:
        │
        │   SELECT logs.* FROM logs
        │   JOIN logs_fts ON logs.id = logs_fts.rowid
        │   WHERE logs_fts MATCH ? AND logs.env = ?
        │   ORDER BY timestamp DESC
        │
        ▼
5. Return matched logs with total count
        │
        ▼
6. Frontend: Highlight matches in display
```

---

## 6. Database Design

### Schema

```sql
-- Main logs table
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,          -- ISO 8601 format
    env TEXT NOT NULL,                -- sit, replica, prod
    namespace TEXT NOT NULL,
    service TEXT NOT NULL,
    pod TEXT NOT NULL,
    container TEXT NOT NULL,
    message TEXT NOT NULL,            -- Full log message
    ingested_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX idx_logs_env ON logs(env);
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_logs_env_service ON logs(env, namespace, service);
CREATE INDEX idx_logs_env_timestamp ON logs(env, timestamp DESC);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE logs_fts USING fts5(
    message,
    content='logs',
    content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER logs_ai AFTER INSERT ON logs BEGIN
    INSERT INTO logs_fts(rowid, message) VALUES (new.id, new.message);
END;

CREATE TRIGGER logs_ad AFTER DELETE ON logs BEGIN
    INSERT INTO logs_fts(logs_fts, rowid, message) VALUES('delete', old.id, old.message);
END;

-- Deduplication hashes
CREATE TABLE log_hashes (
    hash TEXT PRIMARY KEY,            -- SHA-256 hash (32 chars)
    log_id INTEGER NOT NULL,
    FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE
);

-- Refresh state tracking
CREATE TABLE refresh_state (
    env TEXT NOT NULL,
    namespace TEXT NOT NULL,
    service TEXT NOT NULL,
    last_refresh TEXT,
    last_log_timestamp TEXT,
    PRIMARY KEY (env, namespace, service)
);
```

### Database Configuration

```python
# WAL mode for concurrent read/write
await db.execute("PRAGMA journal_mode=WAL")

# Faster writes (OS handles sync)
await db.execute("PRAGMA synchronous=NORMAL")

# Wait up to 10s for lock
await db.execute("PRAGMA busy_timeout=10000")

# Autocommit mode for better concurrency
isolation_level=None
```

---

## 7. API Design

### REST Endpoints

| Endpoint | Method | Parameters | Response | Description |
|----------|--------|------------|----------|-------------|
| `/health` | GET | - | `{status, app, version}` | Health check |
| `/envs` | GET | - | `EnvConfig[]` | List environments |
| `/services` | GET | `env, namespace, from_cluster` | `{services[]}` | List services |
| `/pods` | GET | `env, namespace, service` | `{pods[{name, status, containers}]}` | List pods |
| `/logs` | GET | `env, namespace, service, pod, limit, offset` | `{logs[], total, hasMore}` | Get logs |
| `/logs/fetch` | POST | `{env, namespace, service, pod?, fetchAll?}` | `{success, logs_stored}` | Fetch from K8s |
| `/logs/search` | GET | `env, query, namespace?, service?, pod?, limit` | `{logs[], total}` | FTS search |
| `/logs/by-time` | GET | `env, base_timestamp, window_minutes, direction` | `{logs[], total}` | Time window |

### Error Handling

```python
@app.exception_handler(KubectlError)
async def kubectl_error_handler(request, exc):
    return JSONResponse(status_code=500, content={
        "error": "Kubernetes operation failed",
        "detail": exc.message,
    })

@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return JSONResponse(status_code=400, content={
        "error": "Invalid request",
        "detail": str(exc),
    })
```

---

## 8. Frontend Architecture

### State Management

```typescript
// App.tsx - Main state
const [selectedEnv, setSelectedEnv] = useState('');
const [service, setService] = useState('');
const [selectedPod, setSelectedPod] = useState('');
const [applyLogFilters, setApplyLogFilters] = useState(true);
const [viewMode, setViewMode] = useState<'logs' | 'search' | 'time-window'>('logs');

// React Query for server state
const logsQuery = useLogs({ env, namespace, service, pod, limit: 1000 });
const fetchLogsMutation = useFetchLogs();
```

### Theme System

```typescript
// ThemeContext.tsx
interface Theme {
  id: string;
  name: string;
  isDark: boolean;
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    textPrimary: string;
    // ... 30+ color definitions
  };
}

// Apply to document
useEffect(() => {
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
}, [theme]);
```

### Filter Toggle

```typescript
// App.tsx
const rawLogs = currentQuery.data?.logs || [];
const logs = applyLogFilters ? filterLogs(rawLogs) : rawLogs;

// LogTable.tsx
{filteredCount > 0 && onToggleFilters && (
  <button onClick={onToggleFilters}>
    {filtersEnabled ? '👁 Show All' : '🚫 Filtering Off'}
  </button>
)}
```

---

## 9. Security Considerations

### Authentication & Authorization

| Concern | Implementation |
|---------|---------------|
| Cluster auth | Delegated to kubectl contexts |
| Token storage | NOT stored in app (uses ~/.kube/config) |
| API access | Local-only (127.0.0.1) |
| CORS | Restricted to localhost:5173 |

### Data Protection

| Concern | Implementation |
|---------|---------------|
| Sensitive logs | User responsibility (no PII detection) |
| Database | Local file, user-owned |
| Network | No external connections (except K8s clusters) |
| Credentials in logs | Not filtered automatically |

### Production Environment Warning

```typescript
if (env === 'prod') {
  const confirmed = window.confirm(
    '⚠️ WARNING: You are about to view PRODUCTION logs.\n\nAre you sure?'
  );
  if (!confirmed) return;
}
```

---

## 10. Performance Optimizations

### Backend Optimizations

| Optimization | Impact |
|--------------|--------|
| WAL mode | Concurrent reads during writes |
| FTS5 | Sub-second search on millions of rows |
| Batch inserts | 100 logs per commit (reduced I/O) |
| Index on timestamp | Fast ORDER BY queries |
| busy_timeout | Prevents immediate lock failures |

### Frontend Optimizations

| Optimization | Impact |
|--------------|--------|
| React Query caching | Reduced API calls |
| useMemo for highlighting | Avoid re-computation |
| Pagination (1000 per page) | Manageable DOM size |
| Virtual scrolling ready | Architecture supports it |
| Lazy theme loading | Only active theme applied |

### Kubectl Optimizations

| Optimization | Impact |
|--------------|--------|
| Timeout handling | Prevents hung processes |
| Graceful termination | SIGTERM before SIGKILL |
| fetchAll flag | User controls log volume |
| since-time for incremental | Reduced data transfer |

---

## 11. Issues Resolved

### Issue #1: Segmentation Fault on Concurrent Requests

**Symptom:** Backend crashed with "segmentation fault" after successful requests.

**Root Cause:** aiosqlite uses SQLite's C extension which is NOT thread-safe. Concurrent API requests (`GET /logs` and `POST /logs/fetch`) accessed the same connection.

**Solution:** Global asyncio.Lock serializing ALL database operations.

```python
async def fetch_all(query, params):
    async with _get_lock():  # Serialize all access
        db = await _get_connection()
        return await (await db.execute(query, params)).fetchall()
```

**Testing:** 60 concurrent requests without crash.

---

### Issue #2: Only 111 Logs Shown (Expected Thousands)

**Symptom:** Users saw far fewer logs than existed in K8s.

**Root Cause:**
1. `--tail 500` limit on kubectl
2. Logs cleared on pod selection
3. Filters hiding additional logs

**Solution:**
1. `fetchAll=true` by default (no tail limit)
2. Increased batch size to 5000
3. Added filter toggle button

---

### Issue #3: FTS5 Syntax Error on Special Characters

**Symptom:** Search for `com.jio.ngo:logsDisableFor` failed.

**Root Cause:** FTS5 treats `.` and `:` as special characters.

**Solution:** Escape entire query with double quotes.

```python
def escape_fts5_query(query: str) -> str:
    escaped = query.replace('"', '""')
    return f'"{escaped}"'
```

---

### Issue #8: AND/OR Search Not Matching Correctly

**Symptom:** Search like `term1 AND term2` returned no results even when both terms existed.

**Root Cause:** FTS5's boolean operators can be unreliable due to tokenization differences.

**Solution:** Use SQL LIKE for AND/OR queries instead of FTS5.

```python
async def search_logs(query: str, ...):
    # For AND/OR queries, use LIKE-based search for reliability
    if ' OR ' in query or ' AND ' in query:
        return await _search_logs_like(...)
    # Simple queries use FTS5 for performance
    return await _search_logs_fts5(...)
```

**Benefits:**
- 100% reliable matching with LIKE
- FTS5 still used for simple single-term queries (performance)
- Supports complex queries: `term1 AND term2 OR term3`

---

### Issue #4: "Load More" Button Never Appearing

**Symptom:** Button didn't show even with thousands of logs.

**Root Cause:** `hasMore = (offset + logs) < total` was false because total equaled fetched count.

**Solution:** Fetch ALL logs, store in DB, paginate from stored data.

---

### Issue #5: Multi-line Logs Split Into Multiple Entries

**Symptom:** Java stack traces appeared as separate log entries.

**Root Cause:** Simple newline splitting.

**Solution:** Continuation line detection.

```python
def is_continuation_line(line: str) -> bool:
    patterns = [
        r'^\s+at\s+',           # Java stack trace
        r'^\s*Caused by:',      # Exception chaining
        r'^\t',                 # Tab-indented
    ]
    return any(re.match(p, line) for p in patterns)
```

---

### Issue #6: Table Headers Not Hiding Properly

**Symptom:** Timestamp/Pod headers stayed visible while Message hid.

**Solution:** Removed sticky positioning, added scroll listener.

```typescript
useEffect(() => {
  const handleScroll = () => {
    setShowHeaders(tableWrapper.scrollTop === 0);
  };
  tableWrapper.addEventListener('scroll', handleScroll);
}, []);
```

---

### Issue #7: Pod Column Width Shrinking

**Symptom:** Pod column collapsed when loading data.

**Solution:** Fixed widths with `tableLayout: fixed`.

```typescript
const styles = {
  table: { tableLayout: 'fixed' },
  tdPod: { 
    width: '250px', 
    minWidth: '250px', 
    maxWidth: '250px' 
  },
};
```

---

## 12. Testing Strategy

### Manual Testing Checklist

- [ ] Environment switching (sit → replica → prod)
- [ ] Service and pod discovery
- [ ] Automatic log fetching on pod selection
- [ ] "Load More" pagination
- [ ] Full-text search with highlighting
- [ ] Filter toggle (Show All / Filtering Off)
- [ ] Time navigation (±5m, ±10m)
- [ ] Theme switching (all 22 themes)
- [ ] Auto-refresh functionality
- [ ] Copy to clipboard
- [ ] Production warning dialog
- [ ] Backend restart recovery

### Load Testing

```bash
# Concurrent request test
for i in {1..10}; do
  curl -s "http://127.0.0.1:8000/envs" &
  curl -s "http://127.0.0.1:8000/logs?env=sit&limit=100" &
done
wait
curl -s http://127.0.0.1:8000/health
# Should return healthy
```

### Edge Cases Tested

- Empty log response
- Very long log messages (>10KB)
- Special characters in search
- Rapid pod switching
- Network timeout during fetch
- Database locked scenario
- 100+ concurrent requests

---

## 13. Deployment

### Local Development

```bash
# Backend
cd backend && source venv/bin/activate && python run.py

# Frontend
cd frontend && npm run dev
```

### Production Build

```bash
# Frontend
cd frontend && npm run build

# Backend (production)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PATH` | `logs.db` | SQLite file location |
| `LOG_FETCH_BATCH_SIZE` | `5000` | Lines per kubectl call |
| `LOG_FETCH_TIMEOUT` | `60` | Kubectl timeout (seconds) |

---

## 14. Future Considerations

### Potential Enhancements

| Enhancement | Complexity | Value |
|-------------|------------|-------|
| Log streaming (websockets) | High | Real-time logs |
| Multiple DB connections | Medium | Better concurrency |
| Log export (CSV/JSON) | Low | Data portability |
| Saved searches | Low | User productivity |
| Syntax highlighting | Medium | Better readability |
| Container selection | Low | Granular filtering |

### Scalability Limits

| Metric | Current Limit | Mitigation |
|--------|---------------|------------|
| Database size | 100 MB | Automatic retention |
| Concurrent users | 1 | Single-user design |
| Log fetch size | Unlimited | Timeout protection |
| Search result size | 10,000 | Pagination |

### Known Limitations

1. No real-time streaming (polling-based)
2. Single-user (no auth)
3. Local deployment only
4. No log aggregation across pods

---

## Appendix: Configuration Files

### Environment Config Example

```yaml
# backend/app/env-config/sit.yaml
envName: sit
kubectlContext: sit-cluster
defaultNamespace: jio-t2r-ms
allowedNamespaces:
  - jio-t2r-ms
  - default
refreshInterval: 300
```

### Log Filter Config Example

```typescript
// frontend/src/config/logFilters.ts
export const logFilterConfig = {
  enabled: true,
  excludePatterns: [
    'healthcheck',
    'liveness probe',
    'readiness probe',
    '/actuator/health',
    '/actuator/info',
    'HikariPool',
  ],
};
```

---

**Document Revision History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Development Team | Initial architecture document |
