# League of Legends Analytics Dashboard — PRD for Replit Agent

## 1. Executive Summary & Project Overview

- **Vision**: Build a fast, modern, privacy-conscious analytics web app that helps League players understand performance, identify strengths/weaknesses, and improve over time.
- **Problem**: Players struggle to translate raw match stats into actionable insights. Existing tools can be cluttered, slow, or too generic.
- **Solution**: A focused dashboard inspired by Mobalytics, optimized for a single player or a small group of players, using a Kimball star schema for efficient analytics and smooth filtering.
- **High-level features**:
  - Multi-player support and aggregation
  - Date and time bucketing filters
  - Performance summary cards and trends (win rate, KDA, CS/min, vision, gold, damage)
  - Champion analysis (best/worst, most played, table)
  - Combat, economy, and vision analytics
  - Match history with expandable 10-player details, items, and badges
  - Item and runes analysis with Data Dragon assets
- **Success metrics**:
  - < 2s filter response on datasets of 400+ matches per player
  - 95%+ available visual assets (champion, item, runes)
  - 99% successful data extraction with retry/backoff in monthly runs
  - Positive user feedback on clarity, speed, and actionability
- **Inspiration**: Mobalytics-style clarity; dark, high-contrast UI; action-oriented insights.


## 2. User Stories & Use Cases

- **Personas**
  - Casual Player: wants a quick view of win rate and recent trends
  - Ranked Grinder: cares about KP%, KDA, and best champions to climb
  - Analyst/Coach: needs full match breakdowns and consistent metrics across time
- **Core journeys**
  - View performance overview for a chosen date range and queues
  - Compare stats across champions and identify best/worst performers
  - Drill into match details (all 10 players) and see badge-based achievements
  - Track improvement in KDA, CS/min, vision, and win rate over time
- **Needs & pain points**
  - Clear, fast filtering; stable and accurate stats; readable charts
  - Icons and runes that always load; non-flaky extraction under rate limits
- **Scenario examples**
  - “Show my last 50 ranked games, monthly bucket, with best champions sorted by win rate.”
  - “Drill into one match and see all players, items, and badges at a glance.”


## 3. Data Architecture & System Design

- **Architecture overview**

```
+----------------------+        +-----------------------+        +---------------------+
|  Riot Games APIs     |        |  Extract + Transform  |        |  Static Analytics   |
|  (ACCOUNT, MATCH)    |  --->  |  (Python scripts)     |  --->  |  Web App (React/Vite|
|  Data Dragon CDN     |        |  Star schema CSVs     |        |  + Chart.js + Tailwind)
+----------+-----------+        +-----------+-----------+        +----------+----------+
           |                                |                               |
           |                                v                               v
           |                      /data/*.csv, /static/ddragon/*      Browser loads CSVs
           |                                                          + cached assets
           v
   Replit Secrets (RIOT_API_KEY)
```

- **Flow**: Riot API → raw JSON → transform to star schema → CSVs served to client → client joins and renders.
- **Dimensional modeling**: Kimball star schema with `fact_matches` and supporting dimensions (`dim_champion`, `dim_date`, `dim_queue`, `dim_rune`, `dim_items`) plus bridges (`bridge_match_items`, `bridge_match_participants`) and metadata (`dim_match_metadata`).
- **Refresh strategy**: Monthly segmentation; re-extract per month; idempotent match joins; conservative rate limiting and retries; cache Data Dragon version + mappings.


## 4. Riot API Integration Specification

- **Endpoints**
  - ACCOUNT-V1: `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` → PUUID
  - MATCH-V5: `GET /lol/match/v5/matches/by-puuid/{puuid}/ids` → matchId list
  - MATCH-V5: `GET /lol/match/v5/matches/{matchId}` → match detail
  - SUMMONER-V4: optional for supplemental data
- **Auth**
  - Use Replit Secrets: set `RIOT_API_KEY` and read via `os.environ['RIOT_API_KEY']`
- **Rate limiting**
  - Target ≤ 80 calls/120s window; minimum 500ms between calls; backoff with Retry-After, fallback exponential backoff (60s, 120s, ...)
- **Extraction pattern**
  - Iterate by month windows (startTime/endTime) and by queue type: 400 (Draft Normal), 420 (Ranked Solo/Duo)
  - Use pagination (`start`, `count=100`), fetch details per matchId
  - Persist progress periodically and resume safely
- **Sample Python (simplified; based on current implementation)**

```python
import os, time, requests

API_KEY = os.environ['RIOT_API_KEY']
HEADERS = {"X-Riot-Token": API_KEY}
REGION = "americas"

class RiotAPI:
    def __init__(self):
        self.calls = []
        self.window = 120
        self.max_calls = 80
        self.min_delay = 0.5
        self.last_call = 0

    def _budget(self):
        now = time.time()
        time_since = now - self.last_call
        if time_since < self.min_delay:
            time.sleep(self.min_delay - time_since)
        self.calls = [t for t in self.calls if now - t < self.window]
        if len(self.calls) >= self.max_calls:
            wait = self.window - (now - self.calls[0]) + 5
            time.sleep(max(wait, 0))
            self.calls = []
        self.calls.append(time.time())
        self.last_call = time.time()

    def get_match_ids(self, puuid, start_ms, end_ms, start=0, count=100, queue=None):
        url = f"https://{REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
        params = {"startTime": start_ms//1000, "endTime": end_ms//1000, "start": start, "count": count}
        if queue: params["queue"] = queue
        for attempt in range(5):
            self._budget()
            r = requests.get(url, headers=HEADERS, params=params)
            if r.status_code == 429:
                time.sleep(int(r.headers.get('Retry-After', 60 * (attempt + 1))))
                continue
            r.raise_for_status()
            return r.json()
        return []

    def get_match(self, match_id):
        url = f"https://{REGION}.api.riotgames.com/lol/match/v5/matches/{match_id}"
        for attempt in range(5):
            self._budget()
            r = requests.get(url, headers=HEADERS)
            if r.status_code == 429:
                time.sleep(int(r.headers.get('Retry-After', 60 * (attempt + 1))))
                continue
            r.raise_for_status()
            return r.json()
        return None
```

- **Error handling**: Treat 429 with Retry-After; exponential fallback; verify queue/timeframe server-side; write checkpoints to disk.


## 5. Data Model & Schema Design

- **Fact Table: `fact_matches.csv`**
  - Purpose: one row per match for the target player; derived metrics included
  - Fields (example; keys are integers unless stated):
    - `match_key`, `champion_key`, `date_key`, `queue_key`, `rune_primary_key`, `rune_secondary_key`
    - `win` (0/1), `kills`, `deaths`, `assists`, `kda` (float)
    - `cs_total`, `cs_per_minute`, `gold_earned`, `gold_per_minute`
    - `damage_dealt`, `damage_per_minute`, `damage_taken`, `vision_score`
    - `wards_placed`, `wards_killed`, `control_wards_purchased`
    - `kill_participation` (0-1), `double_kills`, `triple_kills`, `quadra_kills`, `penta_kills`
    - `game_duration_minutes`

- **Dimensions**
  - `dim_champion.csv`: `champion_key`, `champion_id`, `champion_name`, `role`, `icon_url`
  - `dim_date.csv`: `date_key`, `full_date`, `year`, `month`, `day`, `day_of_week`, `is_weekend`, `hour_of_day`, plus optional `week_of_year`
  - `dim_queue.csv`: `queue_key`, `queue_id`, `queue_name`, `is_ranked`, optional `game_mode`
  - `dim_rune.csv`: `rune_key`, `primary_style_id`, `primary_style_name`, `sub_style_id`, `sub_style_name`, `perk_ids` (JSON)
  - `dim_items.csv`: `item_key`, `item_id`, `item_name`, `icon_url`

- **Bridges & Metadata**
  - `bridge_match_items.csv`: `match_key`, `item_key`, `item_position` (0..6 trinket)
  - `bridge_match_participants.csv` (all 10 players): includes `summoner_name`, `riot_id_game_name`, `team_id`, `team_position`, `is_player`, KDA, CS, gold, damage, vision, KP, items JSON, etc.
  - `dim_match_metadata.csv`: `match_key`, `match_id`, `game_duration_seconds`, `game_version`, `timestamp`

- **Sample structures**

```csv
# fact_matches.csv (sample)
match_key,champion_key,date_key,queue_key,rune_primary_key,rune_secondary_key,win,kills,deaths,assists,kda,cs_total,cs_per_minute,gold_earned,gold_per_minute,damage_dealt,damage_per_minute,damage_taken,vision_score,wards_placed,wards_killed,control_wards_purchased,kill_participation,double_kills,triple_kills,quadra_kills,penta_kills,game_duration_minutes
1,101,20250126,400,1,2,1,7,3,8,5.0,210,7.2,11234,380.0,18500,625.0,13200,28,10,3,2,0.62,1,0,0,0,29.6
```

```csv
# dim_champion.csv (sample)
champion_key,champion_id,champion_name,role,icon_url
101,90,Malzahar,MIDDLE,https://ddragon.leagueoflegends.com/cdn/<VERSION>/img/champion/Malzahar.png
```

```csv
# bridge_match_participants.csv (sample)
match_key,participant_num,summoner_name,riot_id_game_name,riot_id_tag_line,champion_id,champion_name,team_id,team_position,is_player,win,kills,deaths,assists,kda,cs_total,cs_per_minute,gold_earned,gold_per_minute,damage_dealt,damage_per_minute,vision_score,control_wards_purchased,kill_participation,double_kills,triple_kills,quadra_kills,penta_kills,turret_kills,inhibitor_kills,items,champ_level
1,1,PlayerOne,PlayerOne,NA1,90,Malzahar,100,MIDDLE,1,1,7,3,8,5.0,210,7.2,11234,380.0,18500,625.0,28,2,0.62,1,0,0,0,2,0,"[6653, 3157, 3020, 4636, 1058, 3363, 0]",16
```

- **Joins**: client-side joins by foreign keys; pre-enriched icon URLs via Data Dragon; stable, repeatable keying strategy (surrogates for champion/runes).


## 6. Dashboard UI/UX Design Specification

- **Layout**: Header → Filters row (players, date range, time bucket, queue, champion) → Summary cards → Performance charts → Champion analysis → Combat → Economy → Vision → Items → Runes → Match history → Insights → Footer.
- **Design system**: Dark theme; Tailwind; high contrast for wins/losses; greens for positive, reds for negative, blues/purples for neutrals.
- **Component hierarchy**: App → Filters → SummaryCards → Charts (WinRate, KDA, Radar, Damage, KP, Gold, CS, Vision, Ward, DayOfWeek, HourOfDay) → ChampionStats → MatchHistory (table + expandable rows) → Insights.
- **Responsive**: Stacked sections on mobile; tables horizontally scrollable; chart containers responsive.
- **Accessibility**: Semantic headings; sufficient color contrast; focus states; alt text on icons; keyboard-expandable rows.


## 7. Core Features & Functionality Breakdown

### 7a. Player Selection & Management
- Store multiple players’ `puuid` in `players.json` (managed by a CLI) or a simple UI settings pane.
- Multi-select player dropdown; aggregate across chosen players when building views.

### 7b. Date Filtering & Time Bucketing
- Date range (start/end) with presets; default `2024-01-01` to today.
- Grouping options: daily, weekly, monthly, quarterly, yearly (compute on client for charts).

### 7c. Performance Summary Cards
- Show total games, win rate, W-L, KDA average, CS/min, Vision average.
- KDA formula: (Kills + Assists) / max(1, Deaths).
- Color cues: green for ≥ 50% win rate, red otherwise.


## 8. Analytics & Visualizations Specification

### 8a. Charts & Graphs (Chart.js examples)

```javascript
const ctx = document.getElementById('winRateChart').getContext('2d');
new Chart(ctx, {
  type: 'line',
  data: { labels, datasets: [{ label: 'Rolling Win Rate (10 games)', data, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.1)', tension: 0.4, fill: true }] },
  options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
});
```

- Include KDA line, Kill Participation line, Gold/CS per minute lines, Damage dealt/taken bars, Vision line, Wards doughnut, Day/Hour bar charts. X-axis time-based when bucketing by date; otherwise game index.

### 8b. Champion Statistics
- Table with games, win rate, KDA, CS/min, gold/min, damage/min. Top 5 best/worst lists (min 3 games).
- Champion icons via DDragon.

### 8c. Combat Metrics
- Multi-kill totals; damage dealt vs taken; KP% trend.

### 8d. Economy Tracking
- Gold/min trend; CS/min trend; efficiency insights.

### 8e. Vision Analysis
- Vision score trend; ward stats breakdown.

### 8f. Item Build Analysis
- Most frequent 6-item builds and their win rates; item icons via DDragon.

### 8g. Runes Analysis
- Keystone (40x40), primary/secondary runes (24x24); most used setups and win rates.


## 9. Match History Table & Details

### 9a. Match History Table
- Sortable by date, champion, KDA, result. Color-coded win/loss row accents. Champion icon + items.
- Pagination/infinite scroll optional; default show recent N (e.g., 50).

### 9b. Expandable Match Details
- On row click: slide-down 10-player scoreboard, grouped blue (100) then red (200), each row with core stats, items, and badges (top 5 prioritized badges).
- Badge categories: positive (MVP, Carry, Pentakill), negative (Inting, Most Deaths), neutral (First Blood), objectives (Baron/Dragon), economy (Most Gold), “meme” badges for fun.
- Tooltip on hover; maximum two visual rows of badges.


## 10. Advanced Filtering System
- Filters: queue (400, 420), champion name, time presets (last 20/50/100/all), plus date range and time bucketing.
- Combined filter logic applied to enriched dataset before chart/table render.
- Persistence: store last-used filters in `localStorage`.


## 11. Data Dragon Integration

- **Assets**: Champion images, item icons, rune icons + metadata.
- **Versioning**:
  - Keep a cached `static/ddragon/version.txt` and mappings for champions/items/runes.
  - Current cached version in repo: `15.21.1`.
  - On first run or by command, fetch latest version from `https://ddragon.leagueoflegends.com/api/versions.json` and update cache.
- **Paths**:
  - Champion icon: `https://ddragon.leagueoflegends.com/cdn/<VERSION>/img/champion/<ChampionId>.png`
  - Item icon: `https://ddragon.leagueoflegends.com/cdn/<VERSION>/img/item/<ItemId>.png`
  - Runes: `https://ddragon.leagueoflegends.com/cdn/<VERSION>/data/en_US/runesReforged.json` then map IDs to icons in `cdn/img/<icon>`
- **Fallbacks**: If an icon 404s, display a styled placeholder (initial letter or empty box) and log once.


## 12. Technical Requirements

### 12a. Performance
- Load 400+ matches per player across 3+ players without stutter.
- All filter actions complete < 2s on modern laptops.
- Use pre-joined enriched arrays and simple maps for O(1) lookups.

### 12b. Browser Compatibility
- Chrome, Firefox, Safari, Edge; responsive; progressive enhancement if JS disabled (basic message).

### 12c. Security & Privacy
- `RIOT_API_KEY` stored in Replit Secrets only; never commit keys.
- Avoid exposing PUUIDs directly in public builds; mask where possible in screenshots/docs.
- Client-side code loads static CSVs; no server secrets leaked.


## 13. Implementation Guidance

- **Tech stack**: React + Vite + TailwindCSS + Chart.js. Alternative: SvelteKit + Tailwind + Chart.js. Keep it static-hosting friendly.
- **State management**: Light state via React Context or Zustand. Avoid heavy Redux unless needed.
- **File structure** (example):
  - `src/components/*` (filters, cards, charts, tables)
  - `src/lib/data/*` (CSV loaders, joins, aggregations)
  - `public/data/*.csv` (build copies from `/data`)
  - `public/ddragon/*` cache folder (optional)
- **Testing**:
  - Unit tests for aggregations and KPIs
  - Snapshot tests for chart config generation
  - Integration test: end-to-end CSV load → render smoke test
- **Deployment**: Static hosting on Replit; pre-copy `/data/*.csv` and `/static/ddragon/*` to public; ensure cache headers for CDN images.


## 14. Edge Cases & Error Handling

- No matches for filter: show empty state and suggestions (reset filters).
- API rate limited: honor Retry-After; backoff and resume later; persist partial results.
- Missing DDragon assets: render placeholder; schedule re-fetch of mappings.
- Network failures: retry with exponential backoff; skip and continue.
- Invalid player data: validate Riot ID format; show actionable errors; skip bad rows.
- Empty results: guard all aggregations and charts for zero-length arrays.


## 15. Success Criteria & Validation

- **Functional**
  - Multi-player selection and aggregation works
  - All listed charts render with correct scales and tooltips
  - Match history expands to 10-player details with badges
  - Item/rune icons load for ≥95% of cases with graceful fallbacks
- **Visual**
  - Dark theme consistent; accessible color contrast; responsive layout looks good from 360px to desktop
- **Performance**
  - Cold load < 4s on broadband; filter actions < 2s
- **User acceptance**
  - Users can answer: best champions, trends, KP, economy/vision strengths, and drill into matches easily


## 16. PRD Review & Improvement

- **Potential failure points**: rate limits; changes in Riot API; DDragon version drift; unexpected CSV fields.
- **Clarifications to maintain**: exact badge logic definitions; filter precedence; bucketing rules.
- **Continuous improvement**: add QA checklist per release; track “unknown/missing icon” rates; add guided insights.
- **Troubleshooting**
  - Icons missing: verify `static/ddragon/version.txt` and network; re-run Data Dragon fetch
  - Empty charts: confirm CSV presence and headers; check browser console for parsing errors
  - API errors: print full response text; verify API key; test a single match call manually


---

## Implementation Appendix

### A. Data Extraction Commands (Replit)

```bash
# Set secret in Replit (GUI → Secrets): RIOT_API_KEY=<your_key>

# Manage players
python src/manage_players.py add   # add Riot ID → PUUID
python src/manage_players.py list

# Extract monthly matches (2024-2025 with queues 400, 420)
python src/extract_2024_2025.py

# Download Data Dragon and create mappings
python src/data_dragon.py

# Transform to star schema CSVs
python src/transform_to_star_schema.py
```

### B. Client Data Loading (pattern)

```javascript
// Load CSVs with PapaParse and map dimensions by key for O(1) joins
const fact = await loadCSV('data/fact_matches.csv');
const champions = indexBy(await loadCSV('data/dim_champion.csv'), 'champion_key');
// ... queues, dates, items, runes, bridges, metadata
// Enrich fact rows prior to rendering
```

### C. Badge System (outline)
- Inputs per participant: KDA, KP, damage/min, gold/min, deaths, CS/min, wards, objectives, multi-kills
- Examples:
  - MVP: top KP + damage/min + win
  - Pentakill: penta_kills > 0
  - Carry: kill_participation ≥ 0.65 and damage_per_minute ≥ 75th percentile
  - Feeder: deaths ≥ 10 and kda < 1.0
  - Visionary: vision_score ≥ 40, control_wards_purchased ≥ 3

### D. Versioning Strategy for Data Dragon
- Cache `version.txt` currently `15.21.1` and refresh periodically.
- Never hardcode version in code paths; always read from cache or latest fetch.
- If CDN returns 404 on a specific asset, fallback to placeholder and consider re-fetching version.

