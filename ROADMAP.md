# Feature Roadmap

## K8S Log Explorer - Future Development Plan

This document outlines planned features to make K8S Log Explorer more Splunk-like and user-friendly.

---

## ✅ Phase 1: Quick Wins (Completed)

| Feature | Status | Description |
|---------|--------|-------------|
| NOT Operator | ✅ Done | `error NOT timeout` - exclude terms from search |
| Search History | ✅ Done | Last 10 searches stored, dropdown on focus |
| Time Presets | ✅ Done | Quick buttons: Last 5m, 15m, 1h, 4h, 24h |
| Keyboard Shortcuts | ✅ Done | `/` search, `R` refresh, `T` theme, `?` help |

---

## 🔄 Phase 2: Valuable Additions (Planned)

### 1. Wildcard Search
**Priority:** High | **Effort:** Medium

Support `*` as a wildcard character in searches.

```
error*              → Matches "error", "errors", "errorCode"
*timeout            → Matches "connectionTimeout", "readTimeout"
pay*error           → Matches "paymentError", "payoutError"
```

**Implementation:** Convert `*` to SQL `%` for LIKE queries.

---

### 2. Saved Searches / Favorites
**Priority:** Medium | **Effort:** Medium

Allow users to save frequently used searches with custom names.

**Features:**
- "Save Search" button (⭐) next to search bar
- Name the search (e.g., "Payment Errors", "Slow DB Queries")
- Dropdown to select saved searches
- Edit/delete saved searches
- Persist in localStorage

---

### 3. Share Search URL
**Priority:** Medium | **Effort:** Low

Encode current search state in URL for sharing.

**Example URL:**
```
http://localhost:5173/?env=sit&service=payment&pod=payment-5c4d&search=error%20AND%20timeout&time=last15m
```

**Features:**
- URL updates as user navigates
- Copy link button
- Opening URL restores exact state

---

### 4. Case Sensitivity Toggle
**Priority:** Low | **Effort:** Low

Toggle between case-sensitive and case-insensitive search.

**UI:** Small `Aa` toggle button next to search bar.

---

### 5. Log Context Expansion
**Priority:** Medium | **Effort:** Medium

When viewing search results, show surrounding log context.

**Features:**
- "Show 5 lines before" / "Show 5 lines after" buttons
- Expandable context panel
- Highlight the matched line in context

---

## 🚀 Phase 3: Advanced Features (Future)

### 1. Field Extraction & Filtering
**Priority:** High | **Effort:** High

Auto-detect and extract fields from structured logs.

**Example log:**
```
2024-01-25 10:00:00 [INFO] level=INFO method=POST status=200 duration=45ms
```

**Extracted Fields Sidebar:**
| Field | Values (click to filter) |
|-------|-------------------------|
| level | INFO (450), ERROR (23), WARN (12) |
| method | POST (300), GET (185) |
| status | 200 (400), 500 (50), 404 (35) |

---

### 2. Log Timeline / Sparkline
**Priority:** Medium | **Effort:** High

Visual timeline showing log density over time.

```
[▁▂▃▅▇▅▃▂▁▂▃▅▇█▇▅▃▂▁] ← Log volume
 8am     10am    12pm   2pm
```

**Features:**
- Click on spike to jump to that time
- Red bars indicate errors
- Zoom in/out of time range

---

### 3. Live Tail Mode
**Priority:** Medium | **Effort:** High

Real-time streaming of new logs (like `tail -f`).

**Features:**
- Toggle "Live Tail" button
- New logs appear at top automatically
- Pause/resume stream
- Auto-scroll with "Jump to latest"

**Implementation:** WebSocket connection for real-time updates.

---

### 4. Multi-Pod Comparison
**Priority:** Low | **Effort:** High

View logs from multiple pods side-by-side.

**Features:**
- Select multiple pods
- Split-screen or tabbed view
- Synchronized scrolling option
- Color-coded by pod

---

### 5. Log Patterns / Clustering
**Priority:** Low | **Effort:** Very High

Automatically group similar log messages.

**Example:**
```
Pattern: "Connection to {host} failed after {n} retries"
  - Connection to db-1 failed after 3 retries (45 occurrences)
  - Connection to db-2 failed after 5 retries (12 occurrences)
```

---

### 6. Regex Search
**Priority:** Medium | **Effort:** Medium

Full regex pattern support in search.

**Examples:**
```
/error.*timeout/i     → Case-insensitive regex
/\d{3}-\d{4}/         → Pattern matching
/^ERROR:/             → Line start matching
```

---

## 📊 Priority Matrix

```
HIGH IMPACT
    │
    │  ┌─────────────────────┐   ┌─────────────────────┐
    │  │ ✅ NOT Operator     │   │ Field Extraction    │
    │  │ ✅ Time Presets     │   │ Timeline Sparkline  │
    │  │ ✅ Search History   │   │                     │
    │  │ Wildcard Search     │   │                     │
    │  └─────────────────────┘   └─────────────────────┘
    │       LOW EFFORT               HIGH EFFORT
    │
    │  ┌─────────────────────┐   ┌─────────────────────┐
    │  │ ✅ Keyboard Shortcuts│   │ Live Tail           │
    │  │ Saved Searches      │   │ Multi-Pod Compare   │
    │  │ Share URL           │   │ Log Patterns        │
    │  │ Case Toggle         │   │                     │
    │  │ Log Context         │   │                     │
    │  └─────────────────────┘   └─────────────────────┘
    │
LOW IMPACT
```

---

## 🎯 Recommended Implementation Order

### Next Up (Phase 2)
1. **Wildcard Search** - Natural extension of current search
2. **Saved Searches** - High user value, moderate effort
3. **Share Search URL** - Easy win, enables collaboration
4. **Case Sensitivity Toggle** - Quick addition

### Future (Phase 3)
5. **Log Context Expansion** - Improves debugging workflow
6. **Field Extraction** - Major feature, high value
7. **Timeline Sparkline** - Visual insight into log patterns
8. **Regex Search** - Power user feature
9. **Live Tail** - Real-time monitoring capability

---

## 💡 Contributing

Want to help implement a feature? Here's how:

1. Check this roadmap for planned features
2. Open an issue to discuss implementation approach
3. Submit a PR with tests and documentation
4. Features should maintain backward compatibility

---

## 📝 Version History

| Version | Features Added |
|---------|---------------|
| 1.0 | Core functionality, themes, search, time navigation |
| 1.1 | AND/OR search, text selection, Excel export, Ask AI |
| 1.2 | NOT operator, search history, time presets, keyboard shortcuts |

---

*Last Updated: January 2026*
