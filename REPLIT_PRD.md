# REPLIT League of Legends Analytics Dashboard PRD

## 1. Executive Summary & Project Overview
- **Vision**: Deliver a modern, data-rich League of Legends analytics experience—comparable to Mobalytics—that runs seamlessly in Replit as a full-stack, self-refreshing web application.
- **Problem Statement**: Competitive and casual players lack a unified view of personal performance, champion mastery, and item/rune effectiveness across multiple accounts. Manual stat tracking and fragmented tooling make it hard to diagnose improvement areas.
- **Goals**:
  - Automate Riot data ingestion, transformation, and visualization for 3+ players simultaneously.
  - Provide actionable insights into performance trends, champion mastery, and gameplay habits.
  - Maintain sub-2-second filter response for responsive analysis.
- **High-Level Features**:
  - Multi-player profile management with persistent PUUID storage.
  - Rich analytics suite (win rate, KDA, gold/CS trends, vision control, item/rune evaluations).
  - Interactive dashboards with advanced filtering, responsive layout, and accessible design.
  - Detailed match history with expandable badge-driven insights.
- **Success Metrics**:
  - Time-to-refresh <15 minutes for 400+ matches/player during scheduled updates.
  - Filter interactions return results in <2 seconds on modern browsers and <3 seconds on mobile.
  - 90%+ of UX screens achieve Lighthouse accessibility score ≥ 90.
  - User testing confirms players can identify at least three actionable insights per session.
- **Inspiration**: Emulate Mobalytics' depth of insights and polish while prioritizing Replit-friendly deployment and maintenance automation.

## 2. User Stories & Use Cases
- **Primary Personas**:
  - *Climber Carla*: Platinum-ranked player targeting specific improvement goals across two accounts.
  - *Coach Ken*: Community coach comparing trainees' trends week over week.
  - *Data-Driven Dan*: Analyst-style player who enjoys deep dives into builds, runes, and meta efficiency.
- **Key Journeys**:
  - View aggregate performance summary per player or combined roster.
  - Compare champion win rates and KDA across selected time buckets.
  - Investigate match-level details with badge-driven highlights.
  - Filter data by queue, champion, and time frames to isolate trends.
- **Needs & Pain Points**:
  - Reliable, up-to-date data without manual CSV manipulation.
  - Quick visualization of improvement areas (e.g., early-game CS, vision score).
  - Confidence in data accuracy and coverage across multiple accounts.
- **Scenario Example**: Carla selects two of her smurf accounts via multi-select dropdown, filters to Ranked Solo queue over the last 50 matches, and reviews KDA progression plus champion table to choose her focus champions for the week.

## 3. Data Architecture & System Design
- **High-Level Architecture**:

```
                   +--------------------+
                   |  Replit Scheduler  |
                   +----------+---------+
                              |
                              v
+---------------------+   Fetch batch jobs   +--------------------------+
| Riot Games API (REST)|-------------------->|  ETL Workers (Python)    |
+---------------------+    (MATCH-V5 etc.)   |  fetch_100_matches.py    |
                                              |  transform_to_star_schema.py |
                                              +--------------+-----------+
                                                             |
                                                             v
                                            +----------------------------------+
                                            |  Object Storage (Replit FS)      |
                                            |  data/*.csv  static/ddragon/*    |
                                            +----------------+-----------------+
                                                             |
                                                             v
                                       +--------------------------------------------+
                                       |  Replit Web Server (FastAPI / Flask)       |
                                       |  API endpoints serve pre-aggregated JSON   |
                                       +----------------+---------------------------+
                                                        |
                                                        v
                                   +--------------------------------------------+
                                   |  Frontend (React/Vite or Vanilla JS)       |
                                   |  data-loader.js & Chart.js visualizations  |
                                   +--------------------------------------------+
```

- **Data Flow**: Scheduled job triggers Riot API extraction → interim JSON stored → ETL transforms into Kimball star schema CSVs → backend exposes aggregated JSON endpoints → frontend visualizes via Chart.js.
- **Dimensional Modeling**: Maintain `fact_matches` at granularity of one row per player per match, with bridging tables for items and participants.
- **Entity Relationships**:
  - `fact_matches.match_id` links to `dim_match_metadata.match_id`.
  - `fact_matches.champion_id` ↔ `dim_champion.champion_id`.
  - `fact_matches.queue_id` ↔ `dim_queue.queue_id`.
  - `bridge_match_items` joins `match_id` + `participant_id` to `dim_items.item_id`.
- **Application Components**:
  - Serverless-friendly ETL scripts (Python) for extraction/transformation.
  - REST API or static JSON for front-end consumption.
- **Data Refresh Strategy**:
  - Run ETL daily at 03:00 UTC via Replit schedulers; fallback manual run available through dashboard button.
  - Use monthly segment pulls (grouped by `startTime` month) to stay within rate limits.
  - Maintain `last_refresh` log; skip already ingested matches via `match_id` dedupe.

## 4. Riot API Integration Specification
- **Endpoints**:
  - `ACCOUNT-V1`: `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` to resolve PUUID.
  - `SUMMONER-V4`: `GET /lol/summoner/v4/summoners/by-puuid/{puuid}` for profile metadata.
  - `MATCH-V5`: `GET /lol/match/v5/matches/by-puuid/{puuid}/ids` (paginated) and `GET /lol/match/v5/matches/{matchId}` for detailed payloads.
- **Authentication**: Store `RIOT_API_KEY` in Replit Secrets. Inject into Python runtime via `os.environ`. Rotate keys proactively (dev keys expire every 24h).
- **Rate Limiting**:
  - Respect 80 calls / 120 seconds (match data). Implement token bucket tracking with 5-second buffer, exponential backoff starting at 2s.
  - Batch match detail requests in groups of 15 with async throttling to maximize throughput.
- **Data Extraction Pattern**:
  - Partition fetch by month using `startTime` query parameters (where supported) or by counting matches in rolling windows.
  - Persist `sync_state` (last fetched timestamp per player) in `data/metadata/sync_state.json`.
- **Sample Python (adapted from `archive/fetch_100_matches.py`)**:

```python
import os
import time
import requests

API_KEY = os.environ["RIOT_API_KEY"]
HEADERS = {"X-Riot-Token": API_KEY}

def request_with_backoff(url, params=None, retries=3, backoff=2):
    for attempt in range(retries):
        resp = requests.get(url, headers=HEADERS, params=params, timeout=10)
        if resp.status_code == 429:
            wait = int(resp.headers.get("Retry-After", backoff * (attempt + 1)))
            time.sleep(wait)
            continue
        resp.raise_for_status()
        return resp.json()
    raise RuntimeError(f"Failed after {retries} retries: {url}")

def fetch_match_ids(puuid, count=100, start=0):
    base = "https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid"
    return request_with_backoff(f"{base}/{puuid}/ids", params={"start": start, "count": count})
```

- **Error Handling**:
  - Retry on HTTP 429/503 with capped exponential backoff (max 60s).
  - Log failures to `logs/extraction_log.txt` with timestamp, player, match.
  - Gracefully skip matches with missing timeline data, flag for re-fetch.

## 5. Data Model & Schema Design
- **Fact Tables**:
  - `fact_matches`: Core player-match metrics (one row per player per match).
  - `fact_participants` (optional enhancement) for team-wide stats if multi-player comparisons needed.
- **Dimension & Bridge Tables**:
  - `dim_champion`, `dim_date`, `dim_queue`, `dim_rune`, `dim_items`, `dim_match_metadata`, `bridge_match_items`, `bridge_match_participants`.
- **Schema Summary**:

| Table | Grain | Key Columns | Notable Fields |
|-------|-------|-------------|----------------|
| `fact_matches` | Player-match | `match_id`, `participant_id` | `kills`, `deaths`, `assists`, `gold_earned`, `cs_total`, `vision_score`, `damage_dealt`, `win` |
| `bridge_match_items` | Player-item occurrence | `match_id`, `participant_id`, `slot` | `item_id` |
| `dim_items` | Item | `item_id` | `item_name`, `item_cost`, `item_description`, `item_icon` |
| `dim_rune` | Rune setup | `rune_style_id`, `keystone_id` | `primary_runes`, `secondary_runes`, `stat_shards` |
| `dim_date` | Date/time | `date_key` | `calendar_date`, `day_of_week`, `hour`, `patch_version` |
| `dim_queue` | Queue descriptor | `queue_id` | `queue_name`, `description`, `is_ranked` |
| `dim_champion` | Champion | `champion_id` | `champion_name`, `role`, `icon_url` |
- **Sample CSV Snippets**:

```
match_id,participant_id,champion_id,win,kills,deaths,assists,gold_earned,cs_total,vision_score
NA1_1234567890,3,99,true,12,3,8,14500,210,45
NA1_1234567891,7,40,false,4,7,12,10200,180,28
```

```
champion_id,champion_name,role,icon_url
99,Lux,Mage,https://ddragon.leagueoflegends.com/cdn/15.2.1/img/champion/Lux.png
40,Janna,Support,https://ddragon.leagueoflegends.com/cdn/15.2.1/img/champion/Janna.png
```

- **Validation Rules**:
  - Enforce referential integrity when loading into in-memory store (e.g., foreign key checks before publish).
  - Normalize enumerations (runes, items) using Data Dragon metadata with version pinning to `15.2.1`.

## 6. Dashboard UI/UX Design Specification
- **Layout**:
  - Header: player selector, global filters, last refresh indicator.
  - Main grid: Performance summary row, analytics tabs (Performance, Champions, Combat, Economy, Vision, Items, Runes).
  - Sidebar (collapsible): Filter presets, queue/champion toggles.
  - Footer: Summaries, data source attribution.
- **Color System** (dark theme inspired by Mobalytics):
  - Background `#0f172a`, card `#1e293b`, accent `#38bdf8`, positive `#22c55e`, negative `#ef4444`, neutral text `#e2e8f0`.
- **Typography**: Use `Inter` or `Roboto` from Google Fonts; ensure 16px base size with responsive scaling.
- **Component Hierarchy**: Modular card components (summary, chart, table). Use skeleton loaders for async data.
- **Responsive Behavior**:
  - Breakpoints at 1280px (desktop), 1024px (tablet landscape), 768px (tablet portrait), 480px (mobile).
  - Collapse multi-column layouts into vertical stacks under 768px.
- **Accessibility**:
  - Provide ARIA labels and descriptions for charts.
  - Ensure 4.5:1 contrast ratio minimum.
  - Keyboard navigable filters and tables.
  - Tooltip content accessible via focus/keyboard activation.

## 7. Core Features & Functionality Breakdown
### 7a. Player Selection & Management
- Persist PUUIDs in `players.json`; allow nickname labeling.
- Multi-select dropdown with checkboxes; default to most recently viewed players.
- Combine stats by aggregating across selected PUUIDs (weighted by match count).
### 7b. Date Filtering & Time Bucketing
- Dual calendar picker with default `2024-01-01` → today.
- Time buckets: daily, weekly, monthly, quarterly, yearly. Provide toggles for smoothing (moving average).
- Filter logic executed server-side for performance; send aggregated bins to frontend.
### 7c. Performance Summary Cards
- Cards for Win Rate, KDA, CS/min, Gold/min, Vision Score, Total Games.
- KDA formula `(kills + assists) / max(1, deaths)` to avoid division by zero.
- Color-coded thresholds (e.g., Win Rate >55% = green, <45% = red).

## 8. Analytics & Visualizations Specification
### 8a. Charts & Graphs
- Implement with Chart.js 4.x using time-series scales.
- Provide line chart for win rate trend with 7-game rolling average.
- KDA progression single-line, include tooltip breakdown per component.
- Kill participation, gold/min, CS/min, vision score, damage per minute charts.
- Example config:

```javascript
const winRateChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: timelineDates,
    datasets: [{
      label: "Win Rate %",
      data: winRateValues,
      borderColor: "#38bdf8",
      fill: false,
      tension: 0.3,
    }],
  },
  options: {
    scales: {
      x: { type: "time", time: { unit: selectedBucket } },
      y: { beginAtZero: true, suggestedMax: 100 },
    },
    plugins: { legend: { display: false } },
  },
});
```

### 8b. Champion Statistics
- Tabular view with sortable columns: games, win rate, KDA, CS/min, gold/min.
- Highlight top 5 performing champions and bottom 5 (min 5 games).
- Include clickable rows to open champion detail modal with rune/item breakdown.

### 8c. Combat Metrics
- Use stacked bar chart for damage dealt vs taken.
- Track multi-kills per match; display sparkline showing distribution.
- Derive combat efficiency metric = `(damage_dealt_to_champions + kill_participation*100) / deaths`.

### 8d. Economy Tracking
- Gold/min and CS/min dual-axis chart.
- Farm efficiency metrics (e.g., CS@10, CS variance) in table.

### 8e. Vision Analysis
- Line chart for vision score/time.
- Bar chart for wards placed vs destroyed.
- Control ward purchase count; flag matches without control wards.

### 8f. Item Build Analysis
- Frequency heatmap of item slots vs items.
- Item win rate table (min 10 usages) with inline icon via Data Dragon.
- Provide quick links to patch notes if item win rate shifts >10% between months.

### 8g. Runes Analysis
- Display rune trees with icons sized per spec (keystone 40x40, others 24x24).
- Show win rate per rune setup and pick rate.
- Provide radar comparing primary vs secondary tree metrics (e.g., sustain vs burst).

## 9. Match History Table & Details
### 9a. Match History Table
- Paginated (50 rows) with infinite scroll fallback.
- Sortable columns: date, champion, KDA, result, game duration, CS, role, queue.
- Include champion avatar, item thumbnails, rune keystone icon.
- Color-coded result pill (green for wins, red for losses).
### 9b. Expandable Match Details
- Expanding row reveals full 10-player stats (use accordion or modal for mobile).
- Badge system: maintain library of 30-40 badges with tooltip definitions, grouped by category (positive, negative, neutral, objective, gold, meme).
- Display items in two rows with responsive wrap; ensure icons have alt text.
- Provide timeline snippet (gold advantage graph) if timeline data available.

## 10. Advanced Filtering System
- Filters: queue type (400, 420, ARAM optional), champion multi-select, date presets (Last 10/20/50/100/All), role lane filter.
- Persist selections in `localStorage` and optionally to backend per user.
- Apply combined filters server-side to avoid over-fetch; respond with aggregated dataset.
- Provide "Compare vs Previous Period" toggle to show delta metrics.

## 11. Data Dragon Integration
- Fetch champion/item/rune metadata from Data Dragon pinned to version `15.2.1` (configurable via `static/ddragon/version.txt`).
- Cache assets in `static/ddragon/{type}`; refresh when version file updates.
- Provide fallback icons (generic silhouettes) if asset missing.
- Map rune tree names using `fetch_ddragon_runes.py`; store in `dim_rune`.

## 12. Technical Requirements
### 12a. Performance Requirements
- Handle 400+ matches per player; pre-aggregate queries for summary metrics.
- Support 3 concurrent players without exceeding 500MB RAM on Replit.
- Target <2s filter application via memoized selectors and Web Workers for heavy aggregations.
- Lazy load chart modules to reduce initial bundle size < 300KB gzipped.
### 12b. Browser Compatibility
- Support latest versions of Chrome, Firefox, Safari, Edge.
- Provide responsive mobile experience (tested on iPhone 13, Pixel 7 viewport sizes).
- Use progressive enhancement: core tables render without JS; charts enhance when JS available.
### 12c. Security & Privacy
- Store API keys in Replit Secrets; never commit.
- Avoid exposing PUUIDs publicly—obscure in client by hashing when possible.
- Serve data over HTTPS; enforce CORS policy limited to dashboard domain.
- Implement request throttling/logging for backend endpoints.

## 13. Implementation Guidance
- **Recommended Stack**: Python FastAPI backend + PostgreSQL (optional) or CSV-backed data layer, React (Vite) frontend with Tailwind CSS, Chart.js, TanStack Query for data fetching.
- **State Management**: Use TanStack Query for server state, Zustand/Redux Toolkit for UI state (filters, theme).
- **Component Architecture**: Feature-oriented folder structure (`/features/performance`, `/features/champions`). Each feature exports container component + hooks + service.
- **Testing Strategy**:
  - Backend: pytest + responses for API mocks, contract tests for ETL outputs.
  - Frontend: Vitest + Testing Library for components; Playwright for end-to-end scenarios (filtering, match drill-down).
- **Deployment**:
  - Use Replit Deployments with auto-build.
  - Configure `replit.nix` for Python + Node toolchains.
  - Schedule ETL via Replit cron; monitor using Replit Logs.
- **Observability**: Emit structured logs (`jsonlines`) for ETL stages; integrate simple status page in dashboard.

## 14. Edge Cases & Error Handling
- **No Matches Found**: Show empty state with instructions to run ETL; allow manual refresh trigger.
- **Rate Limited**: Display banner indicating retry schedule; keep partial cached data available.
- **Missing Data Dragon Assets**: Swap to fallback icon; queue background job to re-download.
- **Network Failures**: Retry with exponential backoff; surface error toast with "Retry" option.
- **Invalid Player Data**: Validate Riot ID format on input; show actionable error message.
- **Empty Result Sets**: Provide friendly copy and suggestions to broaden filters.

## 15. Success Criteria & Validation
- **Functional Checklist**:
  - [ ] Multi-player selection persists and aggregates correctly.
  - [ ] Filters update all charts/tables consistently.
  - [ ] Match detail expansions show 10 players with badges.
  - [ ] ETL deduplicates matches and maintains star schema integrity.
- **Visual Validation**:
  - Run accessibility audits (Lighthouse, axe) per page.
  - Verify color contrast meets WCAG AA.
- **Performance Benchmarks**:
  - Lighthouse performance score ≥ 85 on desktop.
  - API responses for filtered queries < 1.5s (95th percentile).
- **User Acceptance**:
  - Conduct sessions with target personas; capture ability to find insights, compare champions, and understand badges.

## 16. PRD Review & Improvement
- **Potential Failure Points**: API key expiration, Riot schema changes, Data Dragon version drift, large CSV memory usage.
- **Mitigations**:
  - Automated key validity checks, patch version monitor, incremental loading.
- **Clarifications to Add**: Document new badge definitions and scoring algorithms in `/docs/BADGE_SYSTEM.md`.
- **Implementation Tips**:
  - Wrap CSV reads with caching layer; consider migrating to SQLite if dataset grows beyond Replit memory budgets.
  - Provide CLI command `python manage_players.py add --riot-id Game#TAG` to maintain player roster.
- **Troubleshooting Guide**:
  - Include flowchart in docs for diagnosing data freshness issues.
  - Maintain FAQ in dashboard (help modal) covering common errors and resolution steps.

