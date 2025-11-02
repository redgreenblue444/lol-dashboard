# REPLIT PRD: League of Legends Analytics Dashboard

This Product Requirements Document equips a Replit Agent with everything needed to rebuild the League of Legends analytics dashboard as a modern, data-rich web application. It captures product vision, user journeys, data contracts, integration patterns, UI/UX expectations, implementation guidance, and validation criteria so the agent can move from zero to production with minimal ambiguity.

---

## 1. Executive Summary & Project Overview

- **Vision**: Deliver a Mobalytics-inspired League of Legends practice companion that aggregates match data, surfaces meaningful trends, and motivates player improvement through actionable insights, rich visuals, and achievement-driven storytelling.
- **Problem Statement**: League players juggle multiple third-party tools, CSV exports, and spreadsheets to understand their performance. Raw post-game data lacks aggregation, cross-player comparison, and contextual recommendations. The current dashboard prototype is fragmented and requires manual upkeep.
- **High-Level Feature Summary**: Multi-player management, automated Riot API ingestion, Kimball-modeled analytics warehouse, chart-rich dashboards, badge-based match storytelling, advanced filtering, Data Dragon-powered visuals, responsive UI, and shareable summaries.
- **Success Metrics**:
  - <60 minutes to onboard a new summoner and hydrate 400+ matches with valid analytics.
  - Daily active user (DAU) retention ≥35% for early adopters through sticky insights.
  - Filter interactions respond in <2 seconds at P95 with 3 simultaneous players selected.
  - ≥90% parity with top-tier benchmark (Mobalytics) across core stat categories.
  - Zero exposure of sensitive credentials in client bundle; all secrets stay server-side.
- **Competitive Inspiration**: Mobalytics sets the bar with performance grades, champion deep dives, and motivational UX. This dashboard differentiates with badge storytelling, CSV portability, and Replit-first deployment while matching core analytics depth.

---

## 2. User Stories & Use Cases

### 2.1 Primary Personas

| Persona | Description | Primary Goals | Pain Points |
| --- | --- | --- | --- |
| Ranked Grinder | Diamond+ solo queue player seeking consistency | Track win rate trends, champion pool strength, identify slumps quickly | Manual stat tracking, lack of cross-patch context |
| Returning Player | Casual user coming back after a break | Understand meta shifts, pick optimal champions, measure progress | Overwhelmed by data dumps, unclear actionable next steps |
| Team Analyst | Clash captain/coach managing small team | Compare teammates, spot role gaps, prep for scrims | Spreadsheets break, compiling multi-player data is slow |

### 2.2 Core Journeys

- **View Stats**: Player logs in → selects date range → sees summary cards + trend charts → drills into champion table → exports filtered CSV.
- **Compare Performance**: Analyst selects multiple players → applies queue + champion filters → toggles comparison view → shares insights link with team.
- **Track Improvement**: Returning player views weekly buckets → reviews KDA and vision trends → checks badge history for motivation → bookmarks progress timeline.

### 2.3 User Needs & Pain Points

- **Clarity**: Stats must be contextual (per-minute, percentile, vs. role averages) to prevent misinterpretation.
- **Speed**: Filters, chart updates, and match drilldowns must feel instantaneous (<2 seconds).
- **Motivation**: Achievement badges and streak indicators incentivize iteration.
- **Portability**: Easy export to CSV/JSON for further analysis.
- **Trust**: Transparent data lineage from Riot API to dashboard builds user confidence.

### 2.4 Narrative Scenarios

- **Elena (Ranked Grinder)** wraps a scrim block, opens the dashboard, compares her jungle pool’s recent win rates, notices Nidalee underperforming with weak vision control, and sets a practice goal for wards placed ≥20.
- **Marcus (Returning Player)** loads the app on mobile, applies the “Last 20” preset, and sees a positive badge streak for support games, reinforcing his role switch.
- **Rin (Team Analyst)** imports three PUUIDs, runs a weekly recap, snapshots the champion matchup table, and posts it in Discord before their next Clash session.

---

## 3. Data Architecture & System Design

### 3.1 System Overview Diagram

```
                         +---------------------+
                         |    Riot Games API   |
                         | (ACCOUNT, SUMMONER, |
                         |      MATCH-V5)      |
                         +----------+----------+
                                    |
                                    v
                       +------------+-------------+
                       |  Extraction Workers      |
                       |  (Python, scheduled)     |
                       +------------+-------------+
                                    |
             +----------------------+-----------------------+
             |                                              |
             v                                              v
   +---------------------+                      +-----------------------+
   | Raw JSON Storage    |                      | Metadata Tracking     |
   | (Replit FS / S3)    |                      | (Job logs, checkpoints)|
   +---------+-----------+                      +-----------+-----------+
             |                                              |
             +----------------------+-----------------------+
                                    |
                                    v
                      +-------------+--------------+
                      |   ETL / Star Schema        |
                      | (transform_to_star_schema) |
                      +-------------+--------------+
                                    |
                                    v
                 +------------------+------------------+
                 |  Analytics Warehouse (CSV / SQLite) |
                 +------------------+------------------+
                                    |
                       +------------+-------------+
                       |  Data Loader / API Tier  |
                       |  (FastAPI or Node)       |
                       +------------+-------------+
                                    |
                                    v
                         +----------+----------+
                         |   Web Dashboard    |
                         | (React/Vite)       |
                         +--------------------+
```

### 3.2 Data Flow

| Step | Description | Tooling | Owner |
| --- | --- | --- | --- |
| 1 | Fetch account, summoner, and match IDs per PUUID in monthly batches | Python scripts (`fetch_100_matches.py`) | Extraction worker |
| 2 | Persist raw match JSON for audit | Local FS or object storage | Extraction worker |
| 3 | Transform JSON into Kimball star schema CSVs | `transform_to_star_schema.py` | ETL job |
| 4 | Load CSVs into analytics-friendly store (DuckDB, SQLite) | `data-loader.js` or Python | Analytics loader |
| 5 | Serve aggregated views to dashboard via REST/GraphQL | FastAPI/Node | Backend |
| 6 | Frontend consumes API, renders charts, tables, and badges | React/Chart.js | Frontend |

### 3.3 Dimensional Modeling Approach

- Kimball star schema centered on `fact_matches` (one row per match per tracked summoner).
- Surrogate keys for dimensions (champion, queue, rune, date) enable consistent joins across players.
- Bridge tables (`bridge_match_items`, `bridge_match_participants`) provide many-to-many relationships for items equipped and all match participants.
- Slowly Changing Dimensions handled via full refresh on date/champion metadata; match facts remain append-only.

### 3.4 Entity Relationships

```
dim_champions (champion_key)      dim_dates (date_key)
           \                         /
            \                       /
             +---- fact_matches ----+
            /   (match_key)         \
           /                         \
dim_runes (rune_key)        dim_queues (queue_key)
             |
             v
   bridge_match_items (match_key, item_key)
             |
             v
        dim_items (item_key)

fact_matches (match_key) --- bridge_match_participants (match_key, participant_puuid)
                                   |
                                   v
                          participant snapshot fields
```

### 3.5 Data Refresh Strategy

- **Frequency**: Nightly full refresh + on-demand sync button per player. Supports incremental updates by fetching new matches since last timestamp.
- **Segmentation**: Chunk pulls by month (`startTime`/`endTime` parameters) to stay within rate limits and simplify replays.
- **Checkpoints**: Persist last processed game creation timestamp per PUUID (in Redis/JSON) to resume gracefully.
- **Quality Controls**: Validate row counts, checksum sample matches, and compare aggregated KDA vs. Riot-supplied stats to detect drift.
- **Recovery**: Failed loads retry up to 3x with exponential backoff. If still failing, mark player state as “stale” and alert via dashboard toast.

---

## 4. Riot API Integration Specification

### 4.1 Required Endpoints

| API | Endpoint | Purpose | Notes |
| --- | --- | --- | --- |
| ACCOUNT-V1 | `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` | Resolve Riot ID to PUUID | Use regional routing (americas/europe/asia/sea) |
| SUMMONER-V4 | `GET /lol/summoner/v4/summoners/by-puuid/{puuid}` | Fetch summoner level/profile data | Platform routing (na1, euw1, etc.) |
| MATCH-V5 | `GET /lol/match/v5/matches/by-puuid/{puuid}/ids` | List match IDs | Supports `start`, `count`, `startTime`, `endTime` |
| MATCH-V5 | `GET /lol/match/v5/matches/{matchId}` | Retrieve match payload | Used to populate fact/bridge tables |

### 4.2 Authentication & API Key Management

- Store Riot API key as `RIOT_API_KEY` in Replit Secrets; never commit to repository.
- Provide helper to surface key to Python runtime via `os.environ`.
- Audit logs for key usage to detect accidental key expiration (Riot keys expire every 24 hours for personal keys—build a renewal reminder).

### 4.3 Rate Limiting Strategy

- Riot personal key limits: 20 requests/second, 100 requests/120 seconds.
- Implement sliding window tracking + exponential backoff on HTTP 429 responses.
- Queue requests per region to avoid cross-player spikes; consider asyncio and `asyncio.Semaphore` for concurrency control.
- Cache match IDs per player to avoid re-fetching unchanged history.

### 4.4 Data Extraction Patterns

1. Resolve Riot ID → PUUID once, cache in persistent storage.
2. For each player, request match IDs in descending order, chunked by month using `startTime`/`endTime` (UNIX ms).
3. Persist raw match list and detect new IDs by diffing against stored keys.
4. Fetch match details in batches of 5–10 with controlled concurrency.
5. After each match fetch, append to raw storage and enqueue for ETL.

### 4.5 Sample Implementation

Portions of the existing extraction client demonstrate rate limiting and endpoint usage:

```118:204:archive/fetch_match_history.py
    def _make_request(self, url: str) -> Optional[Dict]:
        """
        Make an API request with rate limiting and error handling.
        """
        self._rate_limit_check()

        try:
            response = requests.get(url, headers=self.headers)

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 10))
                time.sleep(retry_after)
                return self._make_request(url)
            elif response.status_code == 404:
                return None
            else:
                return None
        except Exception as e:
            print(f"Request failed: {e}")
            return None

    def get_match_ids(self, puuid: str, count: int = 20) -> Optional[List[str]]:
        url = f"{self.regional_url}/lol/match/v5/matches/by-puuid/{puuid}/ids?count={count}"
        return self._make_request(url)
```

Augment this baseline with:

- Structured logging (player, endpoint, response time).
- Retries with jitter for transient failures.
- Circuit breaker to pause a player after repeated 5xx responses.

### 4.6 Error Handling & Monitoring

- Classify errors: authentication (403), not found (404), rate limited (429), server (5xx).
- Persist failure metadata (timestamp, endpoint, payload snippet) for debugging.
- Provide extraction dashboard panel with latest sync status per player.
- Trigger alert/toast in UI when data is stale >24h or last run failed.

---

## 5. Data Model & Schema Design

### 5.1 Table Inventory

| Table | Type | Grain | Purpose |
| --- | --- | --- | --- |
| `fact_matches` | Fact | One row per tracked player per match | Core performance metrics |
| `dim_champion` | Dimension | One row per champion-role combo | Champion metadata + icons |
| `dim_date` | Dimension | One row per calendar day | Temporal slicing |
| `dim_queue` | Dimension | One row per queue type | Queue metadata |
| `dim_rune` | Dimension | One row per rune setup | Rune tree info |
| `dim_item` | Dimension | One row per item | Item metadata + icons |
| `dim_match_metadata` | Dimension | One row per match | Versioning + timestamps |
| `bridge_match_items` | Bridge | Match ↔ item (7 per match) | Item build reconstruction |
| `bridge_match_participants` | Bridge | Match ↔ participant | Full lobby stats |

### 5.2 Fact Table (`fact_matches`)

| Column | Type | Description |
| --- | --- | --- |
| `match_key` | INT (PK) | Surrogate key |
| `champion_key` | INT (FK) | Links to `dim_champion` |
| `queue_key` | INT (FK) | Links to `dim_queue` |
| `date_key` | INT (FK) | YYYYMMDD |
| `rune_primary_key` | INT (FK) | Primary rune setup |
| `rune_secondary_key` | INT (FK) | Secondary rune setup |
| `kills`, `deaths`, `assists` | INT | Core KDA stats |
| `kda` | DECIMAL(5,2) | (Kills + Assists) / max(1, Deaths) |
| `gold_earned`, `gold_per_minute` | INT, DECIMAL | Economy metrics |
| `damage_dealt`, `damage_taken`, `damage_per_minute` | INT, INT, DECIMAL | Combat metrics |
| `cs_total`, `cs_per_minute` | INT, DECIMAL | Farming |
| `vision_score`, `wards_placed`, `wards_killed`, `control_wards_purchased` | INT | Vision |
| `kill_participation` | DECIMAL(5,3) | (Kills + Assists)/Team Kills |
| `double_kills` … `penta_kills` | INT | Multi-kill counts |
| `win` | TINYINT | Binary outcome |
| `game_duration_minutes` | DECIMAL(5,2) | Match length |

Sample rows:

```
match_key,champion_key,date_key,queue_key,rune_primary_key,rune_secondary_key,win,kills,deaths,assists,kda,cs_total,cs_per_minute,gold_earned
1,1,20240103,400,11,5,1,10,2,15,12.5,210,6.2,14500
```

### 5.3 Dimension Tables

- **`dim_champion`**: includes `champion_key`, `champion_id`, `champion_name`, `role`, `icon_url`.
- **`dim_date`**: `date_key`, `full_date`, `year`, `month`, `day`, `day_of_week`, `week_of_year`, `is_weekend`, `hour_of_day`.
- **`dim_queue`**: `queue_key`, `queue_id`, `queue_name`, `is_ranked`, `game_mode`.
- **`dim_rune`**: `rune_key`, `primary_style_id`, `primary_style_name`, `sub_style_id`, `sub_style_name`, `perk_ids` (JSON array).
- **`dim_item`**: `item_key`, `item_id`, `item_name`, `icon_url`.
- **`dim_match_metadata`**: `match_key`, `match_id`, `game_version`, `game_duration_seconds`, `timestamp`.

### 5.4 Bridge Tables

- **`bridge_match_items`**: `match_key`, `item_key`, `item_position` (0–6). Supports item build visualizations.
- **`bridge_match_participants`**: `match_key`, `participant_puuid`, `summoner_name`, `team_id`, `champion_id`, `kills`, `deaths`, `assists`, `gold_earned`, `damage_dealt`, `vision_score`, `badges_awarded`. Enables full lobby comparisons and badge assignments.

### 5.5 CSV Contracts

- All CSVs use UTF-8 encoding with header row and comma delimiter.
- Values normalized (lowercase slug) where applicable for consistent joins.
- Provide schema JSON file alongside CSV exports for dynamic loaders (column name, data type, description).

### 5.6 Data Validation Rules

- Enforce non-null for keys and critical metrics (`kills`, `game_duration_minutes`).
- Assert `kill_participation` ≤ 1; if >1 due to rounding, clamp after aggregation.
- Ensure rune/icon URLs resolve (HTTP 200) during nightly validation.
- Cross-check `win` flag with Riot metadata to detect mismatched participant mapping.

---

## 6. Dashboard UI/UX Design Specification

### 6.1 Layout & Navigation

```
+--------------------------------------------------------------------------------+
| Top Navigation Bar (Logo, Player Selector, Date Filter, Queue Filter, Profile) |
|--------------------------------------------------------------------------------|
| Left Sidebar (Filters, Presets, Export) | Main Content Area                     |
|                                         | ------------------------------------ |
|                                         |  Summary Cards (Win Rate, KDA, etc.)  |
|                                         | ------------------------------------ |
|                                         |  Analytics Tabs:                      |
|                                         |   - Trends (Charts)                   |
|                                         |   - Champion Stats                    |
|                                         |   - Combat/Economy/Vision/Items       |
|                                         | ------------------------------------ |
|                                         |  Match History Table                  |
|                                         |   - Expandable Rows w/ Badges         |
|--------------------------------------------------------------------------------|
| Footer (Data Freshness, Version, Support)                                      |
--------------------------------------------------------------------------------+
```

- Primary navigation uses tabbed interface (`Overview`, `Champion Insights`, `Match History`).
- Breadcrumb or segmentation chips show active filters and allow quick clearing.

### 6.2 Color Scheme & Design System

| Token | Hex | Usage |
| --- | --- | --- |
| `bg-primary` | `#0F172A` | Page background (dark slate) |
| `bg-panel` | `#1E293B` | Panels, cards |
| `accent-primary` | `#38BDF8` | Primary buttons, highlights |
| `accent-positive` | `#22C55E` | Positive stats/badges |
| `accent-negative` | `#EF4444` | Loss states, negative badges |
| `text-primary` | `#F8FAFC` | Headings |
| `text-secondary` | `#CBD5F5` | Body text |
| `chart-palette` | Muted blues/purples | Chart.js datasets |

- Typography: `Inter`/`Roboto` for body, `Oxanium` optional for headings to echo esports feel.
- Badges use emoji + color-coded pill backgrounds for quick recognition.

### 6.3 Component Hierarchy

- **Global**: `AppShell`, `TopNav`, `SidebarFilters`, `ContentTabs`, `Footer`.
- **Overview Tab**: `SummaryCardGrid`, `TrendChartRail`, `ChampionQuickStats`.
- **Match History**: `MatchTable`, `MatchRow`, `MatchDetailsPanel`, `BadgeCarousel`.
- **Filters**: `PlayerMultiSelect`, `DateRangePicker`, `QueueSelector`, `ChampionFilter`, `PresetChips`.
- **Utility**: `LoadingSkeleton`, `EmptyState`, `ErrorBanner`, `DataFreshnessIndicator`.

### 6.4 Responsive Requirements

- Breakpoints at 1280px (desktop), 960px (tablet), 640px (mobile).
- On mobile, collapse sidebar into slide-out drawer and stack summary cards horizontally scrollable.
- Charts switch to simplified sparkline representations under 480px width.
- Table uses sticky headers on desktop; converts to accordion list on mobile.

### 6.5 Accessibility

- WCAG 2.1 AA contrast compliance (≥4.5:1).
- Keyboard navigation: focus states for filter controls, table rows, and chart tooltips.
- Provide aria labels for charts (summary description) and badges (tooltip content accessible via screen readers).
- Offer colorblind-friendly palette toggle (deuteranopia-safe hues) in settings.

---

## 7. Core Features & Functionality Breakdown

### 7a. Player Selection & Management

- Support storing ≥10 PUUIDs per user with friendly display names and roles.
- UI: Checkbox-enabled multi-select with search + recent players. Avatar uses champion mastery icon if available.
- Persist selections in browser `localStorage` and sync to backend for multi-device continuity.
- Aggregation rules: When multiple players selected, aggregate stats sum or average per metric; highlight per-player deltas via stacked bars.
- Provide player management modal to add/remove PUUID (validate via ACCOUNT-V1 endpoint) and assign color-coded tags.

### 7b. Date Filtering & Time Bucketing

- Default range: `2024-01-01` → current date. Provide quick presets (Last 7, Last 30, Season 14, Custom).
- Buckets: daily, weekly (ISO week), monthly, quarterly, yearly; compute using `dim_date` rollups.
- Show active bucket in chart subtitles; allow toggling `per-game` vs. bucket aggregate.
- Filter logic cascades to API queries (SQL `GROUP BY date_trunc`) to avoid client-side heavy lifting.

### 7c. Performance Summary Cards

- Metrics: Win Rate (%), KDA ((K+A)/max(1,D)), Average CS/min, Total Games Played.
- Visual: 2x2 grid on desktop, animated count-up, sparkline trend indicator, color-coded delta vs prior period.
- Provide tooltip with formula, sample calculation, and percentile vs same role (if available).
- Cards clickable to deep-link into relevant chart section.

---

## 8. Analytics & Visualizations Specification

### 8a. Charts & Graphs

- **Win Rate Trend**: Line chart, x-axis = date bucket, y-axis = win %; gradient fill for positive >50%.
- **KDA Progression**: Single line (player average) with threshold marker at 3.0.
- **Kill Participation**: Area chart with 50% reference line; hover shows team kills.
- **Gold Earned per Minute**: Bar + target line vs. role benchmark.
- **CS per Minute Trends**: Dual-axis (CS/min vs. game duration) or scatter plot.
- **Vision Score Tracking**: Line chart with combined wards placed/killed stacked bars.
- Chart interactions: hover tooltips, toggle players via legend, download PNG/CSV.

Sample Chart.js config for Win Rate Trend:

```javascript
const winRateChartConfig = {
  type: 'line',
  data: {
    labels: bucketLabels,
    datasets: players.map((player, idx) => ({
      label: player.displayName,
      data: player.winRateSeries,
      borderColor: palette[idx],
      backgroundColor: tinycolor(palette[idx]).setAlpha(0.2).toRgbString(),
      tension: 0.35,
      fill: true,
      pointRadius: 3
    }))
  },
  options: {
    responsive: true,
    plugins: {
      tooltip: { mode: 'index', intersect: false },
      legend: { position: 'bottom' }
    },
    scales: {
      x: { type: 'time', time: { unit: activeBucket } },
      y: { min: 0, max: 100, ticks: { callback: v => `${v}%` } }
    }
  }
};
```

### 8b. Champion Statistics

- Table columns: Champion (icon + name), Games Played, Win %, KDA, CS/min, Gold/min, Vision Score, Badge Count.
- Provide sorting, top/bottom 5 toggles, role filter chips.
- Include heatmap highlighting outperforming metrics vs. player average.

### 8c. Combat Metrics

- Metrics: Damage dealt/taken ratio, multi-kill frequency, kill participation, combat score (custom weighted index).
- Provide radial chart per player summarizing combat profile.
- Highlight spike games for review with quick link to match details.

### 8d. Economy Tracking

- Show gold per minute trend, CS total vs. lane average, item completion timings.
- Include histogram for CS/min distribution with quartile markers.
- Suggest focus areas (e.g., “Aim for 7 CS/min at 15 minutes”).

### 8e. Vision Analysis

- Vision score timeline, wards placed vs. killed bars, control ward purchases scatter.
- Provide “Vision MVP” badge per bucket.

### 8f. Item Build Analysis

- Display most common builds as sequences (item icons + build order).
- Show win rate per build, frequency magnitude via horizontal bars.
- Allow filter by champion/role.

### 8g. Runes Analysis

- Grid layout showing rune trees with icons (fetch from Data Dragon, 40x40 keystone, 24x24 others).
- Provide win rate, pick rate, and recommended alternatives.
- Tooltips include rune descriptions and synergy notes.

---

## 9. Match History Table & Details

### 9a. Match History Table

| Column | Type | Behavior |
| --- | --- | --- |
| Date | Date badge | Sortable descending default |
| Champion | Icon + name | Click for champion-specific overlay |
| Queue | Badge (`Ranked Solo`, `Normal`) | Filter pill |
| Result | Win/Loss pill | Color-coded, accessible text |
| K/D/A | Text | Highlight best streak |
| CS/min | Numeric | Sparkline optional |
| Vision | Vision score | Tooltip breakdown |
| Items | Icon strip (7 slots) | Hover reveals stats |
| Badges | Count + icon preview | Opens detail modal |

- Pagination where match count >100 (25/page) with infinite scroll option.
- Sticky header, zebra striping, loading skeleton.

### 9b. Expandable Match Details

- Expands inline to show two-column layout: Player summary on left, team comparison on right.
- Include timeline of badges earned (positive/negative/neutral) capped at two rows of icons with tooltips.
- Display all 10 participants with essential stats (role, KDA, CS, gold, vision).
- Integrate badge definitions from `dashboard/badges.js` to ensure parity with historical logic.
- Provide “Share” button to copy match permalink and summary image (optional future work).

---

## 10. Advanced Filtering System

- **Queue Filter**: Multi-select (400 Draft, 420 Solo/Duo, support for ARAM/URF toggle via backlog). Filters propagate to API query.
- **Champion Filter**: Searchable multi-select with roles; pre-populate recent champions.
- **Time Presets**: Last 10/20/50/100 matches, All. Works alongside date range; clicking preset overrides range.
- **Combined Filters**: Compose queue + champion + rune + item; update query params for shareable URLs.
- **Persistence**: Store active filters in URL hash (`?players=...&queue=420&range=30d`) and local storage fallback.
- **Reset UX**: Provide “Clear All” + “Revert to default” actions.

---

## 11. Data Dragon Integration

- Fetch latest version from `https://ddragon.leagueoflegends.com/api/versions.json` and store in `static/ddragon/version.txt`.
- Download champion, item, and rune metadata JSON; persist under `static/ddragon/mappings/`.
- Serve icons via CDN URLs (champion: `/cdn/{version}/img/champion/{id}.png`).
- Cache responses in CDN-aware service worker to minimize load times.
- Fallback strategy: If asset missing, show placeholder silhouette + tooltip “Asset unavailable.”
- Expose version management panel for manual override (e.g., lock to 15.2.1 when large updates break data).

---

## 12. Technical Requirements

### 12a. Performance

- Support datasets with ≥400 matches/player, aggregated across ≥3 players simultaneously.
- Precompute aggregates (win rate per bucket, champion stats) in backend to avoid client CPU spikes.
- Use indexed data store (SQLite/DuckDB/SurrealDB) with caching layer (Redis) for hot queries.
- Ensure API endpoints respond in ≤1.5s under load; implement HTTP caching headers for static assets.

### 12b. Browser Compatibility

- Target latest versions of Chrome, Firefox, Safari, Edge.
- Mobile Safari support with touch gestures for charts.
- Progressive enhancement: core stats accessible even if charts fail (fallback tables).

### 12c. Security & Privacy

- Keep API key server-side; proxies sign outgoing Riot requests.
- Sanitize user-supplied Riot IDs and champion filters to prevent injection.
- Enforce HTTPS, secure cookies, and CSRF protection if authenticated endpoints introduced.
- Provide GDPR-friendly data deletion workflow (remove stored PUUID upon request).

---

## 13. Implementation Guidance

- **Frontend Stack**: React + Vite, Tailwind CSS for rapid theming, Chart.js (with `react-chartjs-2`). Alternative: SvelteKit if team prefers minimal boilerplate.
- **State Management**: React Query (server state) + Zustand/Redux Toolkit (UI state). Persist filter state via URL synchronization.
- **Backend**: FastAPI (Python) or Express (Node) for synergy with existing Python ETL; expose `/players`, `/matches`, `/analytics/{metric}` endpoints.
- **Data Layer**: DuckDB/SQLite loaded from CSV nightly; consider migrating to PostgreSQL for concurrent writes.
- **ETL Orchestration**: Prefect or simple cron + Python scripts. Log to Replit console + store JSON run metadata.
- **Testing Strategy**:
  - Unit tests for extraction (mock Riot API) and transformations (validate star schema rows).
  - Integration tests hitting staging API with fixture data.
  - Cypress/Playwright end-to-end tests for filter interactions and match expansion.
  - Performance tests measuring filter response under synthetic load.
- **Deployment**:
  - Replit-hosted backend with scheduled jobs.
  - Frontend served via Replit static hosting or Vercel for CDN edge caching.
  - Use GitHub Actions to lint, test, and deploy on merge to main.
- **Observability**: Structured logs, OpenTelemetry tracing for API calls, uptime pings.

---

## 14. Edge Cases & Error Handling

| Scenario | Detection | UX Response | Backend Handling |
| --- | --- | --- | --- |
| No matches found | Match list empty after call | Show empty state with tips to queue more games | Mark sync complete, schedule recheck in 24h |
| API rate limited | HTTP 429 | Toast “Sync paused, retrying shortly” | Exponential backoff, queue retry |
| Missing Data Dragon asset | 404 on asset fetch | Placeholder icon + tooltip | Log missing asset, queue re-download |
| Network failure | Fetch error | Inline error card with retry button | Retry with circuit breaker |
| Invalid player data | Riot API 404 | Modal explaining Riot ID validation | Remove pending player record |
| Empty result after filters | Query returns 0 rows | Encourage filter adjustment, show quick reset | No-op |

---

## 15. Success Criteria & Validation

- **Functional Checklist**
  - [ ] Add/remove players, fetch data, and see aggregate stats.
  - [ ] All charts update with filters applied.
  - [ ] Match table expands with badges for all 10 players.
  - [ ] Data export (CSV/PNG) works for charts and tables.
- **Visual Validation**
  - [ ] Dark theme consistent across screens.
  - [ ] Icons/rendered assets load within 1s on broadband.
  - [ ] Responsive layout verified on desktop/tablet/mobile.
- **Performance Benchmarks**
  - [ ] Filter operations P95 <2s.
  - [ ] Initial data sync <10 min for 400 matches.
- **User Acceptance**
  - Pilot testers confirm insights helped adjust gameplay (qualitative feedback).
  - Compare metrics vs. Mobalytics baseline to ensure parity.

---

## 16. PRD Review & Improvement

- **Failure Point Analysis**: Maintain risk register (API downtime, schema drift, badge inflation). Re-evaluate every sprint.
- **Clarifications**: Document assumptions (e.g., personal API key usage) and revisit as scopes change.
- **Ambiguity Reduction**: Add concrete examples whenever new metrics are introduced; attach wireframe sketches in future iterations.
- **Implementation Tips**: Keep extraction scripts isolated behind service layer, leverage caching for repeated analytics queries, and provide feature flags for experimental visuals.
- **Troubleshooting Guide**:
  - Data not updating → Check extraction logs, verify Riot key validity, re-run sync.
  - Charts blank → Inspect API response, confirm filters, fallback to table view.
  - Badges missing → Ensure badge definitions loaded from `dashboard/badges.js`, validate participant payload.
  - Slow filters → Review pre-aggregation indexes, enable query caching.
- **Continuous Improvement Loop**: After each release, run a PRD review session to update outdated specs, capture new edge cases, and adjust success metrics.

---

This PRD supplies the Replit Agent with the narrative, contracts, and technical scaffolding necessary to deliver a production-grade League of Legends analytics dashboard that delights players and scales with future feature expansions.
