# Comprehensive PRD: League of Legends Analytics Dashboard

## 1. Executive Summary & Project Overview

### Project Vision and Goals

The League of Legends Analytics Dashboard is a modern web application that provides comprehensive performance analysis for League of Legends players. The dashboard transforms raw match data from Riot Games API into actionable insights, enabling players to track their improvement, identify strengths and weaknesses, and optimize their gameplay.

### Problem Statement

League of Legends players currently face several challenges:
- **Limited visibility**: In-game statistics provide only basic metrics per match
- **No historical tracking**: Difficult to identify trends and improvement over time
- **Lack of comparative analysis**: No easy way to compare performance across champions, queues, or time periods
- **Scattered data**: Performance data is spread across multiple matches without aggregation
- **No multi-account support**: Players with multiple accounts cannot easily analyze combined performance

This dashboard solves these problems by:
- Aggregating match history from 2024-2025 across multiple accounts
- Providing time-series analysis and trend identification
- Enabling deep-dive analysis into champion performance, item builds, rune setups
- Offering visual analytics comparable to professional analytics tools like Mobalytics

### High-Level Feature Summary

1. **Multi-Player Support**: Track and aggregate data across multiple Riot accounts
2. **Comprehensive Analytics**: Win rate trends, KDA progression, economy tracking, vision analysis
3. **Champion Analysis**: Performance metrics per champion, best/worst champions identification
4. **Match History**: Detailed match-by-match breakdown with expandable participant details
5. **Achievement Badge System**: 30-40 unique badges highlighting notable performances
6. **Advanced Filtering**: Date ranges, time buckets, queue types, champions, game counts
7. **Item & Rune Analysis**: Most common builds, win rates by setup
8. **Visual Dashboards**: Charts using Chart.js for trend visualization

### Success Metrics

- **Data Coverage**: Successfully extract and process 400+ matches per player
- **Performance**: Sub-2-second filter application with 1000+ matches loaded
- **User Engagement**: Support 3+ simultaneous players with real-time filtering
- **Accuracy**: 100% data integrity from Riot API through to visualization
- **Completeness**: All match participants (10 players) visible in expandable details

### Reference: Mobalytics Inspiration

Similar to Mobalytics, this dashboard provides:
- Performance tracking over time
- Champion-specific analytics
- Build and rune recommendations based on historical data
- Visual trend analysis
- Achievement recognition for standout performances

However, this implementation focuses on:
- Self-hosted data control
- Historical data from 2024-2025
- CSV-based storage (Kimball star schema)
- Multi-account aggregation
- Complete match detail transparency

---

## 2. User Stories & Use Cases

### Primary User Personas

1. **The Competitive Player (Alex)**
   - Rank: Gold-Platinum
   - Goal: Improve rank through data-driven decisions
   - Needs: Identify weak champions, optimal build paths, performance trends

2. **The Multi-Account Player (Sam)**
   - Manages 3 different Riot accounts
   - Goal: Track combined performance across all accounts
   - Needs: Aggregated statistics, unified view of all accounts

3. **The Champion Specialist (Jordan)**
   - Mains 2-3 champions
   - Goal: Master champions through detailed analysis
   - Needs: Champion-specific metrics, build optimization, matchup insights

4. **The Casual Analyzer (Casey)**
   - Plays regularly but not competitively
   - Goal: Understand personal trends and have fun with data
   - Needs: Easy-to-understand visualizations, achievement badges, win rate tracking

### Core User Journeys

#### Journey 1: View Overall Performance

**Narrative**: Alex wants to see their overall win rate and performance trends for the past month.

1. Opens dashboard → Loading screen displays
2. Dashboard automatically loads all configured players
3. Sees summary cards showing:
   - Total Games: 156
   - Win Rate: 52.3% (82W - 74L)
   - Avg KDA: 2.14 (5.2 / 6.1 / 7.8)
   - Avg CS/min: 6.8
   - Avg Vision: 28.3
4. Scrolls to charts section:
   - Win Rate Over Time (Monthly): Sees upward trend from 48% to 55%
   - KDA Progression: Identifies improvement in late 2024
5. Reviews "Current Form" section: 4-game win streak

**Outcome**: Alex identifies they're in good form and decides to continue ranked play.

#### Journey 2: Identify Weak Champions

**Narrative**: Jordan wants to know which champions they should stop playing.

1. Navigates to "Champion Analysis" section
2. Reviews "Needs Improvement" panel:
   - Yasuo: 35% WR (20 games)
   - Irelia: 40% WR (15 games)
   - Zed: 42% WR (18 games)
3. Opens "Detailed Champion Statistics" table
4. Sorts by Win Rate (ascending)
5. Sees detailed metrics for underperforming champions:
   - Low KDA (< 1.5)
   - Poor CS/min (< 5.0)
   - High deaths (> 8 average)

**Outcome**: Jordan decides to stop playing Yasuo in ranked and focus on their 60%+ win rate champions.

#### Journey 3: Analyze Match Details

**Narrative**: Casey wants to see what happened in a specific game where they got a Pentakill.

1. Scrolls to "Match History" table
2. Filters to "Last 20" games for recent matches
3. Finds match with Pentakill badge visible
4. Clicks match row to expand details
5. Sees all 10 players:
   - Their stats highlighted with blue border
   - Pentakill badge with gold highlighting
   - All participants' items, KDA, vision scores
   - Team composition breakdown
6. Hovers over badges to see descriptions

**Outcome**: Casey shares the match details with friends, showing off the achievement.

#### Journey 4: Multi-Account Analysis

**Narrative**: Sam wants to see combined stats across 3 accounts.

1. Opens player dropdown (checkbox selector)
2. All 3 players are selected by default
3. Dashboard shows aggregated data:
   - Total Games: 487 (across all accounts)
   - Combined Win Rate: 54.2%
   - All champions from all accounts appear
4. Filters to "Ranked Solo/Duo" queue only
5. Sees combined ranked performance: 245 games, 56% WR

**Outcome**: Sam understands their overall ranked performance is strong across all accounts.

### User Needs and Pain Points

**Needs:**
- Quick access to performance trends
- Ability to filter by multiple criteria simultaneously
- Visual confirmation of improvement (charts, badges)
- Detailed match context when needed
- Multi-account unified view

**Pain Points Addressed:**
- Manual calculation of statistics → Automated aggregation
- No historical comparison → Time-series charts
- Can't see other players' stats → Expandable match details
- Hard to identify patterns → Badge system highlights notable games
- Multiple accounts fragmented → Unified multi-player view

---

## 3. Data Architecture & System Design

### Overall System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Riot Games API                           │
│  - ACCOUNT-V1: Get PUUID from Riot ID                       │
│  - MATCH-V5: Get match IDs and details                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (Python Extraction Scripts)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Extraction Layer                           │
│  - extract_2024_2025.py: Fetch matches by month             │
│  - transform_to_star_schema.py: Transform to dimensional model│
│  - Rate limiting: 80 calls / 120 seconds                      │
│  - Monthly segmentation for efficient extraction             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (CSV Export)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           Kimball Star Schema (CSV Files)                    │
│                                                               │
│  FACT TABLE:                                                 │
│  ┌─────────────────────────────────────────────┐             │
│  │ fact_matches.csv                            │             │
│  │ - match_key (PK)                            │             │
│  │ - champion_key (FK)                        │             │
│  │ - date_key (FK)                             │             │
│  │ - queue_key (FK)                            │             │
│  │ - rune_key (FK)                             │             │
│  │ - Metrics: KDA, CS, Gold, Damage, Vision   │             │
│  └─────────────────────────────────────────────┘             │
│                                                               │
│  DIMENSION TABLES:                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │dim_champion  │ │ dim_date     │ │ dim_queue    │         │
│  │dim_items     │ │ dim_rune     │ │dim_match_    │         │
│  │              │ │              │ │ metadata     │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                               │
│  BRIDGE TABLES:                                               │
│  ┌─────────────────────────┐ ┌──────────────────────────┐ │
│  │bridge_match_items        │ │bridge_match_participants   │ │
│  └─────────────────────────┘ └──────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (PapaParse CSV Loading)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend Dashboard (Browser)                    │
│  - static.html: Main UI                                      │
│  - data-loader.js: Data loading & analytics engine           │
│  - badges.js: Badge system                                    │
│  - Chart.js: Visualizations                                  │
│  - Tailwind CSS: Styling                                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Riot API → Storage → Dashboard

1. **Extraction Phase** (`extract_2024_2025.py`):
   - Load API key from `.env` file (Replit Secrets)
   - Load player configuration from `players.json`
   - For each player:
     - Fetch match IDs by month (2024-01 through 2025-11)
     - Filter by queues: 400 (Draft Normal), 420 (Ranked Solo/Duo)
     - Fetch match details for each match ID
     - Save to `data/{player_id}/raw_matches_{month}.json`

2. **Transformation Phase** (`transform_to_star_schema.py`):
   - Load raw match JSON files
   - Extract player's participant data from each match
   - Build star schema:
     - Create dimension entries (champions, dates, queues, runes, items)
     - Create fact table rows with metrics
     - Create bridge tables (items, all 10 participants)
   - Enrich with Data Dragon data (champion/item names, icon URLs)
   - Export to CSV files in `data/{player_id}/`

3. **Loading Phase** (`data-loader.js`):
   - Load CSV files using PapaParse
   - Join fact table with dimensions
   - Create `enrichedMatches` array with all denormalized data
   - Store in-memory for fast filtering and analysis

4. **Visualization Phase** (Dashboard):
   - Apply filters to `enrichedMatches`
   - Calculate aggregate statistics
   - Update charts with Chart.js
   - Render match history table
   - Calculate badges for match participants

### Dimensional Modeling Approach (Kimball Star Schema)

The star schema consists of:

**Center (Fact Table)**: `fact_matches.csv`
- One row per match for the tracked player
- Contains all measurable metrics
- Foreign keys to dimension tables
- Surrogate keys for performance

**Dimensions (Lookup Tables)**:
- `dim_champion.csv`: Champion information
- `dim_date.csv`: Date attributes (year, month, day, day of week, etc.)
- `dim_queue.csv`: Queue type information
- `dim_rune.csv`: Rune setup details
- `dim_items.csv`: Item information
- `dim_match_metadata.csv`: Match metadata (match ID, version, etc.)

**Bridge Tables**:
- `bridge_match_items.csv`: Many-to-many relationship between matches and items
- `bridge_match_participants.csv`: All 10 participants per match (for expandable details)

### Entity Relationships

```
fact_matches (1) ──→ (N) dim_champion
fact_matches (1) ──→ (N) dim_date
fact_matches (1) ──→ (N) dim_queue
fact_matches (1) ──→ (N) dim_rune
fact_matches (1) ──→ (N) dim_match_metadata

fact_matches (1) ──→ (N) bridge_match_items ──→ (N) dim_items
fact_matches (1) ──→ (N) bridge_match_participants
```

### Data Refresh Strategy

1. **Initial Extraction**: One-time extraction of all 2024-2025 matches
2. **Incremental Updates**: Future updates would fetch only new matches since last extraction
3. **Version Control**: Data Dragon version cached in `static/ddragon/version.txt`
4. **Storage**: CSV files per player in `data/{player_id}/` directory

---

## 4. Riot API Integration Specification

### Required API Endpoints

#### ACCOUNT-V1: Get PUUID from Riot ID
```
GET https://{region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
Headers: X-Riot-Token: {api_key}
Response: { "puuid": "...", "gameName": "...", "tagLine": "..." }
```

**Purpose**: Convert Riot ID (GameName#TAG) to PUUID for match fetching.

#### MATCH-V5: Get Match IDs by PUUID
```
GET https://{region}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids
Headers: X-Riot-Token: {api_key}
Query Parameters:
  - startTime: Unix timestamp (seconds)
  - endTime: Unix timestamp (seconds)
  - start: Pagination offset (default: 0)
  - count: Results per page (max: 100)
  - queue: Queue ID (optional, 400 or 420)
Response: ["NA1_1234567890", "NA1_1234567891", ...]
```

**Purpose**: Fetch list of match IDs for a player within a time range.

#### MATCH-V5: Get Match Details
```
GET https://{region}.api.riotgames.com/lol/match/v5/matches/{matchId}
Headers: X-Riot-Token: {api_key}
Response: Complete match data including all 10 participants
```

**Purpose**: Fetch detailed match information including all participants' statistics.

### Authentication and API Key Management

**Replit Secrets Configuration**:
```python
# .env file (stored as Replit Secret)
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Loading API Key**:
```python
def load_api_key() -> str:
    """Load Riot API key from .env file."""
    api_key_file = Path('.env')
    if not api_key_file.exists():
        raise Exception(".env file not found. Create it with RIOT_API_KEY=...")
    
    with open(api_key_file) as f:
        for line in f:
            if line.startswith('RIOT_API_KEY='):
                return line.strip().split('=', 1)[1]
    
    raise Exception("RIOT_API_KEY not found in .env")
```

**Security Best Practices**:
- Never commit `.env` file to version control
- Use Replit Secrets for production
- Rotate API keys regularly (development keys expire in 24 hours)
- Store keys server-side only, never expose in client code

### Rate Limiting Strategy

**Riot API Limits**:
- Development Key: 20 requests/second, 100 requests/2 minutes
- Production Key: Varies by tier (higher limits)

**Implementation**:
```python
class RiotAPIClient:
    def __init__(self, api_key: str, region: str = "americas"):
        self.api_key = api_key
        self.region = region
        self.headers = {"X-Riot-Token": api_key}
        
        # Conservative rate limiting
        self.calls = []  # Timestamp queue
        self.max_calls = 80  # Buffer below actual limit
        self.window = 120  # seconds
        self.min_delay = 0.5  # Minimum 500ms between calls
        self.last_call = 0
    
    def _wait_if_needed(self):
        """Enforce rate limiting."""
        now = time.time()
        
        # Minimum delay between calls
        time_since_last = now - self.last_call
        if time_since_last < self.min_delay:
            time.sleep(self.min_delay - time_since_last)
            now = time.time()
        
        # Remove old calls outside window
        self.calls = [t for t in self.calls if now - t < self.window]
        
        # Wait if at limit
        if len(self.calls) >= self.max_calls:
            oldest = self.calls[0]
            wait_time = self.window - (now - oldest) + 5
            if wait_time > 0:
                print(f"⏳ Rate limit reached. Waiting {wait_time:.0f}s...")
                time.sleep(wait_time)
                self.calls = []
                now = time.time()
        
        self.calls.append(now)
        self.last_call = now
```

### Data Extraction Patterns

**Monthly Segmentation**:
```python
MONTHS = {
    "2024-01": (1704067200000, 1706745599999),  # Jan 1-31, 2024
    "2024-02": (1706745600000, 1709251199999),  # Feb 1-29, 2024
    # ... through 2025-11
}

def extract_month(client, puuid, player_id, month_key, start_time, end_time):
    """Extract matches for a specific month."""
    all_matches = []
    
    # Extract for each queue type
    for queue in [400, 420]:  # Draft Normal, Ranked Solo/Duo
        start_index = 0
        while True:
            match_ids = client.get_match_ids(puuid, start_time, end_time, 
                                            start_index, 100, queue)
            
            if not match_ids:
                break
            
            # Fetch details for each match
            for match_id in match_ids:
                match_data = client.get_match_details(match_id)
                if match_data:
                    all_matches.append(match_data)
            
            # Check if more matches exist
            if len(match_ids) < 100:
                break
            start_index += 100
    
    # Save to file
    output_file = f"data/{player_id}/raw_matches_{month_key}.json"
    with open(output_file, 'w') as f:
        json.dump(all_matches, f, indent=2)
    
    return len(all_matches)
```

**Benefits of Monthly Segmentation**:
- Easier error recovery (re-run single month if failed)
- Progress tracking (see which months completed)
- Reduced memory usage (process one month at a time)
- Parallel processing potential (future enhancement)

### Error Handling and Retry Logic

```python
def get_match_details(self, match_id: str) -> Optional[Dict]:
    """Fetch match details with retry logic."""
    max_retries = 5
    base_delay = 60
    
    for attempt in range(max_retries):
        self._wait_if_needed()
        
        url = f"https://{self.region}.api.riotgames.com/lol/match/v5/matches/{match_id}"
        
        try:
            response = requests.get(url, headers=self.headers)
            
            # Handle rate limiting (429)
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', base_delay * (attempt + 1)))
                print(f"⚠️  Rate limited! Waiting {retry_after}s...")
                time.sleep(retry_after)
                continue
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                delay = base_delay * (attempt + 1)  # Exponential backoff
                print(f"⚠️  Error: {e}. Retrying in {delay}s...")
                time.sleep(delay)
            else:
                print(f"❌ Failed after {max_retries} attempts")
                return None
    
    return None
```

**Error Types Handled**:
- 429 (Rate Limited): Wait for Retry-After header
- 403 (Forbidden): Invalid/expired API key
- 404 (Not Found): Match ID doesn't exist
- Network errors: Retry with exponential backoff
- Timeout: Increase timeout or retry

---

## 5. Data Model & Schema Design

### Fact Tables

#### fact_matches.csv

**Purpose**: One row per match for the tracked player, containing all measurable metrics.

**Schema**:
```csv
match_key,champion_key,date_key,queue_key,rune_primary_key,rune_secondary_key,
win,kills,deaths,assists,kda,cs_total,cs_per_minute,
gold_earned,gold_per_minute,damage_dealt,damage_per_minute,damage_taken,
vision_score,wards_placed,wards_killed,control_wards_purchased,
kill_participation,double_kills,triple_kills,quadra_kills,penta_kills,
game_duration_minutes
```

**Field Definitions**:
- `match_key` (int): Surrogate key, primary key
- `champion_key` (int): Foreign key to dim_champion
- `date_key` (int): Foreign key to dim_date (YYYYMMDD format)
- `queue_key` (int): Foreign key to dim_queue
- `rune_primary_key` (int): Foreign key to dim_rune (primary rune tree)
- `rune_secondary_key` (int): Foreign key to dim_rune (secondary rune tree)
- `win` (int): 1 if won, 0 if lost
- `kills`, `deaths`, `assists` (int): Combat statistics
- `kda` (float): Calculated as (kills + assists) / deaths (or kills + assists if deaths = 0)
- `cs_total` (int): Total minions + neutral minions killed
- `cs_per_minute` (float): cs_total / game_duration_minutes
- `gold_earned` (int): Total gold earned
- `gold_per_minute` (float): gold_earned / game_duration_minutes
- `damage_dealt` (int): Total damage to champions
- `damage_per_minute` (float): damage_dealt / game_duration_minutes
- `damage_taken` (int): Total damage taken
- `vision_score` (int): Vision score
- `wards_placed` (int): Wards placed
- `wards_killed` (int): Wards destroyed
- `control_wards_purchased` (int): Control wards bought
- `kill_participation` (float): (kills + assists) / team_kills
- `double_kills`, `triple_kills`, `quadra_kills`, `penta_kills` (int): Multi-kill counts
- `game_duration_minutes` (float): Match duration in minutes

**Sample Row**:
```csv
1,1,20240101,420,1,2,1,11,5,3,2.8,173,7.05,11496,468.59,15488,631.3,15391,23,9,2,4,0.359,1,0,0,0,24.53
```

### Dimension Tables

#### dim_champion.csv

**Schema**:
```csv
champion_key,champion_id,champion_name,role,icon_url
```

**Field Definitions**:
- `champion_key` (int): Surrogate key, primary key
- `champion_id` (int): Riot's champion ID (e.g., 18 for Tristana)
- `champion_name` (string): Champion name (e.g., "Tristana")
- `role` (string): Team position (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY, UNKNOWN)
- `icon_url` (string): Data Dragon CDN URL for champion icon

**Sample Rows**:
```csv
1,18,Tristana,Unknown,https://ddragon.leagueoflegends.com/cdn/15.2.1/img/champion/Tristana.png
2,15,Sivir,Unknown,https://ddragon.leagueoflegends.com/cdn/15.2.1/img/champion/Sivir.png
```

#### dim_date.csv

**Schema**:
```csv
date_key,full_date,year,month,day,day_of_week,week_of_year,is_weekend,hour_of_day
```

**Field Definitions**:
- `date_key` (int): Primary key, format YYYYMMDD (e.g., 20240101)
- `full_date` (string): ISO format date (YYYY-MM-DD)
- `year`, `month`, `day` (int): Date components
- `day_of_week` (string): Full day name (Monday, Tuesday, etc.)
- `week_of_year` (int): ISO week number
- `is_weekend` (int): 1 if Saturday/Sunday, 0 otherwise
- `hour_of_day` (int): Hour (0-23)

**Sample Row**:
```csv
20240101,2024-01-01,2024,1,1,Monday,1,0,14
```

#### dim_queue.csv

**Schema**:
```csv
queue_key,queue_id,queue_name,is_ranked,game_mode
```

**Field Definitions**:
- `queue_key` (int): Primary key (same as queue_id)
- `queue_id` (int): Riot queue ID (400 = Draft Normal, 420 = Ranked Solo/Duo)
- `queue_name` (string): Human-readable name
- `is_ranked` (int): 1 if ranked, 0 otherwise
- `game_mode` (string): Game mode from API

**Sample Rows**:
```csv
400,400,Draft Normal,0,CLASSIC
420,420,Ranked Solo/Duo,1,CLASSIC
```

#### dim_rune.csv

**Schema**:
```csv
rune_key,primary_style_id,primary_style_name,sub_style_id,sub_style_name,
keystone_id,keystone_name,keystone_icon,
primary_rune2_id,primary_rune2_name,primary_rune2_icon,
primary_rune3_id,primary_rune3_name,primary_rune3_icon,
primary_rune4_id,primary_rune4_name,primary_rune4_icon,
secondary_rune1_id,secondary_rune1_name,secondary_rune1_icon,
secondary_rune2_id,secondary_rune2_name,secondary_rune2_icon
```

**Field Definitions**:
- `rune_key` (int): Surrogate key, primary key
- `primary_style_id`, `sub_style_id` (int): Rune tree IDs
- `primary_style_name`, `sub_style_name` (string): Rune tree names (Precision, Domination, etc.)
- `keystone_id` (int): Keystone rune ID
- `keystone_name` (string): Keystone name (e.g., "Press the Attack")
- `keystone_icon` (string): Data Dragon URL for keystone icon
- `primary_rune2_id` through `primary_rune4_id`: Primary tree runes (3 total)
- `secondary_rune1_id`, `secondary_rune2_id`: Secondary tree runes (2 total)

**Sample Row**:
```csv
1,8000,Precision,8100,Domination,8005,Press the Attack,https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Precision/PressTheAttack/PressTheAttack.png,9111,Triumph,https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Precision/Triumph.png,...
```

#### dim_items.csv

**Schema**:
```csv
item_key,item_id,item_name,icon_url
```

**Field Definitions**:
- `item_key` (int): Primary key (same as item_id)
- `item_id` (int): Riot item ID
- `item_name` (string): Item name from Data Dragon
- `icon_url` (string): Data Dragon CDN URL for item icon

**Sample Rows**:
```csv
1001,1001,Boots,https://ddragon.leagueoflegends.com/cdn/15.2.1/img/item/1001.png
3072,3072,The Bloodthirster,https://ddragon.leagueoflegends.com/cdn/15.2.1/img/item/3072.png
```

#### dim_match_metadata.csv

**Schema**:
```csv
match_key,match_id,game_duration_seconds,game_version,timestamp
```

**Field Definitions**:
- `match_key` (int): Foreign key to fact_matches
- `match_id` (string): Riot match ID (e.g., "NA1_1234567890")
- `game_duration_seconds` (int): Match duration in seconds
- `game_version` (string): Game patch version
- `timestamp` (int): Match creation timestamp (milliseconds since epoch)

### Bridge Tables

#### bridge_match_items.csv

**Purpose**: Many-to-many relationship between matches and items (player's 7 item slots).

**Schema**:
```csv
match_key,item_key,item_position
```

**Field Definitions**:
- `match_key` (int): Foreign key to fact_matches
- `item_key` (int): Foreign key to dim_items
- `item_position` (int): Item slot (0-6, where 6 is trinket)

**Sample Rows** (for one match):
```csv
1,3072,0
1,3006,1
1,3031,2
1,3035,3
1,3033,4
1,3071,5
1,3364,6
```

#### bridge_match_participants.csv

**Purpose**: Store all 10 participants from each match for expandable match details.

**Schema**:
```csv
match_key,participant_num,summoner_name,riot_id_game_name,riot_id_tag_line,
champion_id,champion_name,team_id,team_position,is_player,win,
kills,deaths,assists,kda,gold_earned,gold_per_minute,
damage_dealt,damage_taken,damage_per_minute,
cs_total,cs_per_minute,vision_score,wards_placed,wards_killed,
control_wards_purchased,kill_participation,
double_kills,triple_kills,quadra_kills,penta_kills,
turret_kills,inhibitor_kills,items,champ_level
```

**Field Definitions**:
- `match_key` (int): Foreign key to fact_matches
- `participant_num` (int): Participant number (1-10)
- `summoner_name` (string): Legacy summoner name
- `riot_id_game_name`, `riot_id_tag_line` (string): Riot ID components
- `champion_id`, `champion_name` (int/string): Champion information
- `team_id` (int): 100 (Blue) or 200 (Red)
- `team_position` (string): TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY
- `is_player` (int): 1 if this is the tracked player, 0 otherwise
- `win` (int): 1 if team won, 0 otherwise
- `items` (string): JSON array of item IDs: "[3072,3006,3031,...]"
- All other fields same as fact_matches metrics

**Sample Rows** (showing player and one opponent):
```csv
1,1,PlayerName,PlayerName,NA1,18,Tristana,100,BOTTOM,1,1,11,5,3,2.8,11496,468.59,15488,631.3,15391,173,7.05,23,9,2,4,0.359,1,0,0,0,2,0,"[3072,3006,3031,3035,3033,3071,3364]",18
1,2,OpponentName,OpponentName,EUW,15,Sivir,200,BOTTOM,0,0,8,7,4,1.71,10500,428.57,12000,489.8,18000,150,6.12,18,7,1,2,0.5,0,0,0,0,1,0,"[6673,3006,3072,3031,3033,3026,3364]",17
```

---

## 6. Dashboard UI/UX Design Specification

### Overall Layout and Navigation

**Single-Page Application Structure**:
```
┌────────────────────────────────────────────────────────┐
│ Header: "League of Legends Performance Analytics"       │
│         Gradient: blue-900 to purple-900                │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│ Filter Bar (Sticky Top)                                │
│ - Player Multi-Select Dropdown                          │
│ - Date Range Picker (Start/End)                        │
│ - Time Bucket Selector (Daily/Weekly/Monthly/...)      │
│ - Period Filter (All/Last 20/Last 50)                  │
│ - Queue Filter (All/Ranked/Normal)                     │
│ - Champion Filter (All/[Champion List])               │
│ - Apply Filters Button                                  │
│ - Reset Button                                          │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│ Main Content (Scrollable)                               │
│                                                         │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Section 1: Performance Overview                    │  │
│ │ - 5 Summary Cards (Total Games, Win Rate, KDA,   │  │
│ │   CS/min, Vision)                                 │  │
│ └──────────────────────────────────────────────────┘  │
│                                                         │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Section 2: Performance Trends                     │  │
│ │ - Win Rate Over Time (Line Chart)                 │  │
│ │ - KDA Progression (Line Chart)                     │  │
│ │ - Overall Performance Profile (Radar Chart)       │  │
│ └──────────────────────────────────────────────────┘  │
│                                                         │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Section 3: Champion Analysis                       │  │
│ │ - Best Performing (Top 5 by Win Rate)              │  │
│ │ - Most Played (Top 5 by Games)                     │  │
│ │ - Needs Improvement (Bottom 5 by Win Rate)          │  │
│ │ - Detailed Champion Statistics Table               │  │
│ └──────────────────────────────────────────────────┘  │
│                                                         │
│ ... (Additional sections continue)                      │
└────────────────────────────────────────────────────────┘
```

### Color Scheme and Design System

**Dark Theme Palette** (Tailwind CSS):
- **Background**: `bg-gray-900` (#111827)
- **Cards**: `bg-gray-800` (#1f2937)
- **Borders**: `border-gray-700` (#374151)
- **Text Primary**: `text-gray-100` (#f3f4f6)
- **Text Secondary**: `text-gray-400` (#9ca3af)
- **Accent Colors**:
  - Win/Green: `text-green-400` (#34d399) / `bg-green-500`
  - Loss/Red: `text-red-400` (#f87171) / `bg-red-500`
  - Blue (Header/Charts): `text-blue-400` (#60a5fa)
  - Purple (KDA): `text-purple-400` (#a78bfa)
  - Yellow (Gold): `text-yellow-400` (#facc15)

**Component Styling**:
- **Cards**: Rounded corners (`rounded-lg`), padding (`p-6`), border (`border border-gray-700`)
- **Hover Effects**: Cards lift on hover (`hover:transform hover:translateY(-4px)`)
- **Loading States**: Spinner animation, status text
- **Tables**: Alternating row colors, hover highlight

### Component Hierarchy

```
App
├── Header (Gradient background, title)
├── FilterBar (Sticky, all filter controls)
└── MainContent
    ├── SummarySection (5 stat cards)
    ├── PerformanceSection (Charts)
    ├── ChampionSection (Best/Most/Worst + Table)
    ├── CombatSection (Damage charts, multi-kills)
    ├── EconomySection (Gold/CS trends)
    ├── VisionSection (Vision score, ward stats)
    ├── ItemsSection (Top builds)
    ├── RunesSection (Top rune setups)
    ├── MatchHistorySection (Sortable table)
    └── InsightsSection (Streaks, key insights)
```

### Responsive Design Requirements

**Breakpoints** (Tailwind):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

**Responsive Behaviors**:
- **Mobile (< 768px)**:
  - Filter bar stacks vertically
  - Summary cards: 2 columns → 1 column
  - Charts: Full width, smaller height
  - Tables: Horizontal scroll with sticky header
  - Match history: Simplified columns

- **Tablet (768px - 1024px)**:
  - Filter bar: 2 rows, flexible wrapping
  - Summary cards: 3 columns
  - Charts: 1 column (stacked)

- **Desktop (> 1024px)**:
  - Filter bar: Single row, all controls visible
  - Summary cards: 5 columns
  - Charts: 2 columns side-by-side
  - Tables: Full width with all columns

### Accessibility Considerations

1. **Keyboard Navigation**:
   - All interactive elements focusable
   - Tab order follows visual flow
   - Enter/Space activate buttons

2. **Screen Readers**:
   - Semantic HTML (`<table>`, `<header>`, `<section>`)
   - ARIA labels on icons and buttons
   - Alt text on champion/item images
   - Table headers properly associated

3. **Color Contrast**:
   - All text meets WCAG AA (4.5:1 for normal text)
   - Win/Loss indicators have both color and text
   - Charts use patterns/textures in addition to color

4. **Focus Indicators**:
   - Visible focus rings on all interactive elements
   - Focus states match hover states

---

## 7. Core Features & Functionality Breakdown

### 7a. Player Selection & Management

#### Multi-Player Support with PUUID Storage

**Configuration File** (`players.json`):
```json
{
  "players": [
    {
      "id": "malzahar",
      "display_name": "Malzahar Main",
      "riot_id": "PlayerName#NA1",
      "puuid": "abc123...",
      "region": "americas"
    },
    {
      "id": "nautilus",
      "display_name": "Nautilus Support",
      "riot_id": "AnotherName#EUW",
      "puuid": "def456...",
      "region": "europe"
    }
  ]
}
```

**PUUID Storage**:
- Stored in `players.json` after initial lookup
- PUUID is permanent (doesn't change like summoner names)
- Used for fetching match history

#### Player Selection UI

**Checkbox Dropdown Component**:
```html
<div class="player-selector-wrapper">
  <button id="playerDropdownBtn" class="dropdown-button">
    <span id="playerDropdownText">All Players (3)</span>
    <svg>...</svg> <!-- Dropdown arrow -->
  </button>
  <div id="playerDropdown" class="hidden dropdown-menu">
    <div class="player-dropdown-item">
      <input type="checkbox" id="selectAllPlayers" checked>
      <label>Select All</label>
    </div>
    <div class="player-dropdown-divider"></div>
    <div class="player-dropdown-item">
      <input type="checkbox" id="player-malzahar" value="malzahar" checked>
      <label>Malzahar Main</label>
    </div>
    <!-- More players... -->
  </div>
</div>
```

**Behavior**:
- Click dropdown button to open/close
- "Select All" checkbox toggles all players
- Individual checkboxes update "Select All" state (checked/indeterminate/unchecked)
- Dropdown text updates: "All Players (3)", "2 of 3 players", "No players selected"
- Click outside to close dropdown

**JavaScript Implementation**:
```javascript
function getSelectedPlayers() {
  const checkboxes = document.querySelectorAll('.player-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

async function loadAllData(playerIds) {
  // Normalize to array
  const playerIdArray = Array.isArray(playerIds) ? playerIds : [playerIds];
  
  // Reset data structures
  AppData.factMatches = [];
  AppData.dimChampions = {};
  // ... reset other dimensions
  
  // Load and merge data from all selected players
  for (const playerId of playerIdArray) {
    const dataPath = `../data/${playerId}`;
    
    // Load fact matches
    const factMatches = await loadCSV(`${dataPath}/fact_matches.csv`);
    AppData.factMatches = AppData.factMatches.concat(factMatches);
    
    // Load and merge dimensions (avoid duplicates by key)
    const champions = await loadCSV(`${dataPath}/dim_champion.csv`);
    champions.forEach(c => {
      if (!AppData.dimChampions[c.champion_key]) {
        AppData.dimChampions[c.champion_key] = c;
      }
    });
    
    // ... merge other dimensions
  }
  
  enrichMatchData(); // Join fact with dimensions
}
```

#### Data Aggregation Across Multiple Accounts

**Aggregation Rules**:
- **Matches**: Concatenate all fact_matches from selected players
- **Dimensions**: Merge by key (e.g., champion_key), avoid duplicates
- **Metrics**: Calculate across all matches regardless of player
- **Champions**: Show all champions played across all accounts
- **Date Range**: Use earliest start date and latest end date

**Example**: 3 players, 150 matches each → 450 total matches in dashboard

---

### 7b. Date Filtering & Time Bucketing

#### Date Range Picker

**HTML**:
```html
<div class="date-range-picker">
  <label>📅 Date Range</label>
  <div class="flex gap-1">
    <input type="date" id="startDate" class="date-input">
    <span>to</span>
    <input type="date" id="endDate" class="date-input">
  </div>
</div>
```

**Default Values**:
- **Start Date**: 2024-01-01 (beginning of data collection)
- **End Date**: Today's date

**Behavior**:
- User selects start and end dates
- Click "Apply Filters" to update dashboard
- Filters apply to timestamp field in matches
- Inclusive range: matches on start date and end date included

**Implementation**:
```javascript
function applyDateFilters() {
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  
  AppData.dateFilters.startDate = startInput.valueAsDate;
  AppData.dateFilters.endDate = endInput.valueAsDate;
  AppData.dateFilters.timeBucket = document.getElementById('timeBucket').value;
  
  refreshDashboard(); // Update all visualizations
}

function getFilteredMatches() {
  let matches = [...AppData.enrichedMatches];
  
  // Apply date range filter
  if (AppData.dateFilters.startDate && AppData.dateFilters.endDate) {
    const startTime = AppData.dateFilters.startDate.getTime();
    const endTime = AppData.dateFilters.endDate.getTime() + (24 * 60 * 60 * 1000);
    
    matches = matches.filter(m => {
      const matchTime = m.timestamp;
      return matchTime >= startTime && matchTime < endTime;
    });
  }
  
  // ... apply other filters
  
  return matches;
}
```

#### Time Bucket Options

**Options**:
- **Daily**: Group by day (YYYY-MM-DD)
- **Weekly**: Group by week start (Monday)
- **Monthly**: Group by month (YYYY-MM)
- **Quarterly**: Group by quarter (YYYY-Q1, YYYY-Q2, etc.)
- **Yearly**: Group by year (YYYY)

**Default**: Monthly

**Usage in Charts**:
```javascript
function aggregateMatchesByTimeBucket(matches, bucket) {
  const bucketMap = new Map();
  
  matches.forEach(match => {
    const date = new Date(match.timestamp);
    let bucketKey;
    
    switch(bucket) {
      case 'daily':
        bucketKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        bucketKey = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        bucketKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarterly':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        bucketKey = `${date.getFullYear()}-Q${quarter}`;
        break;
      case 'yearly':
        bucketKey = `${date.getFullYear()}`;
        break;
    }
    
    if (!bucketMap.has(bucketKey)) {
      bucketMap.set(bucketKey, []);
    }
    bucketMap.get(bucketKey).push(match);
  });
  
  // Calculate aggregated metrics for each bucket
  const buckets = Array.from(bucketMap.entries()).map(([key, matches]) => {
    return {
      date: key,
      timestamp: matches[0].timestamp,
      games: matches.length,
      winRate: (matches.filter(m => m.win).length / matches.length * 100).toFixed(1),
      avgKDA: (matches.reduce((sum, m) => sum + m.kda, 0) / matches.length).toFixed(2),
      // ... more aggregated metrics
    };
  });
  
  return { buckets, individual: sorted };
}
```

#### Filter Application Logic

**Filter Order** (applied sequentially):
1. **Date Range Filter**: Filter by timestamp first (most restrictive)
2. **Time Period Filter**: Limit to last N games (after date filter)
3. **Queue Filter**: Filter by queue_id (400 or 420)
4. **Champion Filter**: Filter by champion_name

**Example**:
- Date Range: 2024-06-01 to 2024-08-31
- Time Period: Last 50
- Queue: Ranked (420)
- Champion: Jhin

Result: Last 50 ranked Jhin matches between June and August 2024

---

### 7c. Performance Summary Cards

#### Overall Win Rate

**Card Display**:
```
┌─────────────────────────┐
│ Win Rate                │
│ 52.3%                   │
│ 82W - 74L               │
└─────────────────────────┘
```

**Calculation**:
```javascript
function calculateSummaryStats(matches) {
  const wins = matches.filter(m => m.win === 1).length;
  const losses = matches.length - wins;
  const winRate = (wins / matches.length * 100).toFixed(1);
  
  return {
    wins,
    losses,
    winRate
  };
}
```

**Visual Design**:
- Large percentage in green (if > 50%) or red (if < 50%)
- Win/Loss count in smaller text below
- Card background: `bg-gray-800`
- Border: `border-gray-700`
- Hover effect: Slight lift

#### KDA Ratio Calculation

**Formula**: `KDA = (Kills + Assists) / Deaths`

**Special Case**: If deaths = 0, `KDA = Kills + Assists` (perfect KDA)

**Implementation**:
```javascript
// In fact table transformation
const kills = player_data['kills'];
const deaths = player_data['deaths'];
const assists = player_data['assists'];
const kda = ((kills + assists) / deaths) if deaths > 0 else (kills + assists);

// In dashboard display
function calculateSummaryStats(matches) {
  const avgKDA = matches.reduce((sum, m) => sum + m.kda, 0) / matches.length;
  const avgKills = matches.reduce((sum, m) => sum + m.kills, 0) / matches.length;
  const avgDeaths = matches.reduce((sum, m) => sum + m.deaths, 0) / matches.length;
  const avgAssists = matches.reduce((sum, m) => sum + m.assists, 0) / matches.length;
  
  return {
    avgKDA: avgKDA.toFixed(2),
    avgKills: avgKills.toFixed(1),
    avgDeaths: avgDeaths.toFixed(1),
    avgAssists: avgAssists.toFixed(1)
  };
}
```

**Card Display**:
```
┌─────────────────────────┐
│ Avg KDA                 │
│ 2.14                    │
│ 5.2 / 6.1 / 7.8         │
└─────────────────────────┘
```

#### Average CS per Minute

**Calculation**: Average of `cs_per_minute` field across all matches

**Card Display**:
```
┌─────────────────────────┐
│ Avg CS/min              │
│ 6.8                     │
└─────────────────────────┘
```

#### Total Games Played

**Calculation**: Count of filtered matches

**Card Display**:
```
┌─────────────────────────┐
│ Total Games             │
│ 156                     │
└─────────────────────────┘
```

#### Visual Design with Color Coding

**Color Scheme**:
- **Win Rate**: Green if ≥ 50%, Red if < 50%
- **KDA**: Yellow/Purple (neutral)
- **CS/min**: Purple (economy metric)
- **Vision**: Pink (vision metric)
- **Total Games**: White (neutral)

**Card Styling**:
- Border radius: `rounded-lg`
- Padding: `p-6`
- Background: `bg-gray-800`
- Border: `border border-gray-700`
- Hover: `transform translateY(-4px)` with shadow

---

## 8. Analytics & Visualizations Specification

### 8a. Charts & Graphs

All charts use Chart.js v4.4.0 with date-fns adapter for time-based axes.

#### Win Rate Trend Over Time (Line Chart)

**Configuration**:
```javascript
AppData.charts.winRate = new Chart(ctx, {
  type: 'line',
  data: {
    datasets: [{
      label: 'Win Rate (monthly)',
      data: trendPoints, // [{x: Date, y: 52.3, bucket: {...}}]
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      tension: 0.4,
      fill: true
    }]
  },
  options: {
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (value) => value + '%' }
      },
      x: {
        type: 'time',
        time: { unit: 'month' }
      }
    }
  }
});
```

**Data Aggregation**: Uses `aggregateMatchesByTimeBucket()` to group matches by selected time bucket (daily/weekly/monthly/etc.) and calculate win rate per bucket.

#### KDA Progression (Single Line Chart)

**Configuration**: Similar to win rate chart but shows single KDA ratio line (not separate K/D/A).

**Data**: Average KDA per time bucket.

**Color**: Purple (`#a855f7`)

#### Kill Participation Percentage

**Chart Type**: Line chart showing kill participation over time.

**Calculation**: `kill_participation = (kills + assists) / team_kills`

**Display**: Percentage (0-100%)

#### Gold Earned per Minute

**Chart Type**: Line chart showing gold/min trend.

**Color**: Yellow/Gold (`#fbbf24`)

#### CS per Minute Trends

**Chart Type**: Line chart showing CS/min trend.

**Color**: Purple (`#a78bfa`)

#### Vision Score Tracking

**Chart Type**: Line chart showing vision score over time.

**Color**: Pink (`#ec4899`)

#### Chart.js Configuration Examples

**Common Chart Options**:
```javascript
{
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { labels: { color: '#fff' } },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      titleColor: '#fff',
      bodyColor: '#fff',
      callbacks: {
        title: (context) => new Date(context[0].raw.x).toLocaleDateString(),
        label: (context) => `${context.dataset.label}: ${context.raw.y}`
      }
    }
  },
  scales: {
    y: {
      ticks: { color: '#9ca3af' },
      grid: { color: '#374151' }
    },
    x: {
      ticks: { color: '#9ca3af' },
      grid: { color: '#374151' }
    }
  }
}
```

#### Time-Based X-Axis with Date Aggregation

**Chart.js Date Adapter**:
- Library: `chartjs-adapter-date-fns@3.0.0`
- Enables native date handling on X-axis

**Time Unit Mapping**:
```javascript
function getTimeUnit(bucket) {
  const units = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
    quarterly: 'quarter',
    yearly: 'year'
  };
  return units[bucket] || 'day';
}
```

---

### 8b. Champion Statistics

#### Champion Performance Table

**Columns**:
- Champion (with icon)
- Games
- Win Rate (color-coded: green ≥ 50%, red < 50%)
- KDA
- K/D/A (averages)
- CS/min
- Gold/min
- DMG/min

**Sorting**: Click column headers to sort (ascending/descending toggle).

**Implementation**:
```javascript
function updateChampionSection() {
  const matches = getFilteredMatches();
  const championStats = getChampionStats(matches);
  
  // Sort and display
  const tbody = document.getElementById('championTableBody');
  tbody.innerHTML = championStats.map(c => `
    <tr>
      <td>${createChampionIcon(c.champion_key)} ${c.name}</td>
      <td>${c.games}</td>
      <td class="${parseFloat(c.winRate) >= 50 ? 'text-green-400' : 'text-red-400'}">
        ${c.winRate}%
      </td>
      <td>${c.avgKDA}</td>
      <td>${c.avgKills} / ${c.avgDeaths} / ${c.avgAssists}</td>
      <td>${c.avgCS}</td>
      <td>${c.avgGold}</td>
      <td>${c.avgDamage}</td>
    </tr>
  `).join('');
}
```

#### Top 5 Best/Worst Champions

**Best Performing**:
- Filter: Minimum 3 games
- Sort: Win rate descending
- Display: Top 5 with green highlighting

**Worst Performing**:
- Filter: Minimum 3 games
- Sort: Win rate ascending
- Display: Bottom 5 with red highlighting

#### Champion-Specific Metrics

For each champion, calculate:
- Win rate, games played
- Average KDA, K/D/A
- Average CS/min, Gold/min, Damage/min
- Champion icon from Data Dragon

#### Champion Icons from Data Dragon CDN

**URL Format**:
```
https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{championName}.png
```

**Example**: `https://ddragon.leagueoflegends.com/cdn/15.2.1/img/champion/Tristana.png`

**Fallback**: If icon fails to load, show initial letter in circle.

---

### 8c. Combat Metrics

#### Damage Dealt/Taken Analysis

**Chart**: Bar chart showing damage dealt vs damage taken for last 20 matches.

**Colors**:
- Damage Dealt: Red (`#ef4444`)
- Damage Taken: Orange (`#f59e0b`)

#### Multi-kill Tracking

**Display**: 4 stat cards showing totals:
- Double Kills: Blue (`text-blue-400`)
- Triple Kills: Purple (`text-purple-400`)
- Quadra Kills: Orange (`text-orange-400`)
- Penta Kills: Red (`text-red-400`)

**Source**: Fields `double_kills`, `triple_kills`, `quadra_kills`, `penta_kills` from fact table.

#### Kill Participation Calculations

**Formula**: `(kills + assists) / team_kills`

**Storage**: Stored as `kill_participation` (float, 0.0-1.0) in fact table.

**Display**: Percentage (0-100%) in charts and tables.

#### Combat Efficiency Metrics

**Metrics Tracked**:
- KDA ratio
- Kill participation
- Damage per minute
- Damage dealt vs taken ratio
- Multi-kill frequency

---

### 8d. Economy Tracking

#### Gold per Minute Trends

**Chart**: Line chart over time showing gold/min trend.

**Aggregation**: Average gold/min per time bucket.

**Color**: Gold/Yellow (`#fbbf24`)

#### CS Tracking

**Metrics**:
- Total CS: `cs_total` (minions + neutral minions)
- CS per minute: `cs_per_minute`

**Display**: 
- In match history: Total CS
- In charts: CS/min trend
- In champion stats: Average CS/min per champion

#### Economy Efficiency Analysis

**Derived Metrics**:
- Gold efficiency: Damage dealt per gold earned
- CS consistency: Standard deviation of CS/min
- Gold curve: Early/mid/late game gold differences

---

### 8e. Vision Analysis

#### Vision Score Over Time

**Chart**: Line chart showing vision score trend.

**Color**: Pink (`#ec4899`)

#### Wards Placed/Killed Statistics

**Chart**: Doughnut chart showing:
- Wards Placed (Green)
- Wards Destroyed (Red)
- Control Wards (Orange)

**Data**: Totals across all filtered matches.

#### Control Ward Purchases

**Tracking**: `control_wards_purchased` field from fact table.

**Display**: 
- In match details: Count per match
- In vision section: Total and average

---

### 8f. Item Build Analysis

#### Most Common Item Builds

**Grouping**: Items 0-5 (excluding trinket/slot 6) sorted by ID, joined with "-".

**Example Build Key**: `3072-3006-3031-3035-3033-3071` (sorted item IDs)

**Display**:
- Top 5 builds by frequency
- Item icons (6 items per build)
- Champion name (for context)
- Win rate for that build
- Game count

**Implementation**:
```javascript
function updateItemSection() {
  const matches = getFilteredMatches();
  const itemCombos = {};
  
  matches.forEach(m => {
    const build = m.items.filter(item => item !== 0).slice(0, 6);
    if (build.length >= 3) {
      const buildKey = build.sort((a, b) => a - b).join('-');
      if (!itemCombos[buildKey]) {
        itemCombos[buildKey] = { items: build, count: 0, wins: 0, champion: m.champion_name };
      }
      itemCombos[buildKey].count++;
      if (m.win) itemCombos[buildKey].wins++;
    }
  });
  
  // Sort by frequency and display top 5
  const topBuilds = Object.values(itemCombos)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
```

#### Item Win Rates

**Calculation**: For each build, `win_rate = wins / count * 100`

**Display**: Win rate percentage next to build icon set.

#### Item Icons from Data Dragon

**URL Format**:
```
https://ddragon.leagueoflegends.com/cdn/{version}/img/item/{itemId}.png
```

**Fallback**: If item icon fails, show item ID in small box.

#### Build Frequency Analysis

**Metrics**:
- Most common build (highest count)
- Win rate by build
- Champion-specific builds
- Build diversity (number of unique builds)

---

### 8g. Runes Analysis

#### Rune Setup Display with Icons

**Layout**:
```
┌─────────────────────────────────┐
│ [Keystone Icon 40x40px]         │
│ Keystone Name                    │
│ Primary Tree Name                │
│                                  │
│ [Rune2] [Rune3] [Rune4] (24x24) │
│                                  │
│ Secondary Tree Name              │
│ [Sec1] [Sec2] (24x24)           │
│                                  │
│ X games | Y% WR                  │
└─────────────────────────────────┘
```

#### Keystone Prominently Shown

**Size**: 40x40px

**Position**: Top-left, larger than other runes.

**Icon Source**: `keystone_icon` field from dim_rune.

#### Primary Runes (4 Total, 24x24px)

**Runes**:
1. Keystone (40x40px)
2. Primary Rune 2 (24x24px)
3. Primary Rune 3 (24x24px)
4. Primary Rune 4 (24x24px)

**Source**: `primary_rune2_icon`, `primary_rune3_icon`, `primary_rune4_icon` from dim_rune.

#### Secondary Runes (2 Total, 24x24px)

**Runes**:
1. Secondary Rune 1 (24x24px)
2. Secondary Rune 2 (24x24px)

**Source**: `secondary_rune1_icon`, `secondary_rune2_icon` from dim_rune.

#### Rune Tree Names

**Display**: 
- Primary tree name: `primary_style_name` (e.g., "Precision")
- Secondary tree name: `sub_style_name` (e.g., "Domination")

#### Win Rate by Rune Setup

**Grouping**: Group matches by unique rune combination (keystone + primary tree + secondary tree).

**Calculation**: `win_rate = wins / count * 100` for each setup.

**Display**: Top 6 rune setups by frequency, sorted descending.

#### Data Dragon Rune Data Integration

**Rune Icon URLs**: From Data Dragon CDN:
```
https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/{Tree}/{Rune}/{Rune}.png
```

**Storage**: Icon URLs stored in `dim_rune.csv` for each rune.

---

## 9. Match History Table & Details

### 9a. Match History Table

#### Sortable Columns

**Columns**:
- Result (Win/Loss)
- Champion (with icon)
- Queue
- Date
- Duration
- K/D/A
- KDA
- CS (total)
- Gold (total)
- Damage (total)
- Items (icons)

**Sorting Implementation**:
```javascript
let sortColumn = null;
let sortDirection = 'desc'; // Default: newest first

function sortMatchHistory(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = column;
    sortDirection = 'asc';
  }
  
  const matches = getFilteredMatches();
  matches.sort((a, b) => {
    let aVal = a[column];
    let bVal = b[column];
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
  
  renderMatchHistory(matches);
}
```

#### Color-Coded Win/Loss

**Styling**:
- Win: Green background (`win-bg`: `rgba(34, 197, 94, 0.1)`)
- Loss: Red background (`loss-bg`: `rgba(239, 68, 68, 0.1)`)

**Implementation**:
```javascript
const resultClass = m.win ? 'win-bg' : 'loss-bg';
const resultText = m.win ? 'WIN' : 'LOSS';
const resultColor = m.win ? 'win-text' : 'loss-text';
```

#### Champion Icons

**Display**: 40px circular champion icon next to champion name.

**Source**: `icon_url` from dim_champion, or generated from champion name.

#### Item Display

**Display**: 6-7 item icons in row (items 0-5 plus trinket).

**Size**: Small icons (24px or smaller).

**Fallback**: Empty slot shown as gray box if item ID is 0.

#### Pagination/Infinite Scroll

**Current Implementation**: Shows all filtered matches (can be many).

**Future Enhancement**: Implement pagination (50 matches per page) or infinite scroll.

---

### 9b. Expandable Match Details

#### Click to Expand Row

**Interaction**: Click anywhere on match row to expand/collapse details.

**Visual Indicator**: Arrow icon (▶) rotates 90° when expanded.

**Implementation**:
```javascript
function toggleMatchDetails(matchKey) {
  const detailsRow = document.getElementById(`details-${matchKey}`);
  const arrow = document.getElementById(`arrow-${matchKey}`);
  
  if (detailsRow.classList.contains('hidden')) {
    detailsRow.classList.remove('hidden');
    arrow.classList.add('expanded');
  } else {
    detailsRow.classList.add('hidden');
    arrow.classList.remove('expanded');
  }
}
```

#### All 10 Players' Stats

**Layout**: Two team sections (Blue Team and Red Team).

**For Each Player**:
- Champion icon and name
- Summoner name / Riot ID
- Team position
- KDA breakdown
- CS (total and per minute)
- Gold (total and per minute)
- Damage (total and per minute)
- Vision score and control wards
- Kill participation
- Items (6-7 icons)
- Badges (top 5)

**Player Highlighting**: Tracked player has blue border and "(YOU)" label.

#### Achievement Badges (30-40 Different Badges)

**Badge Categories**:

1. **Positive Badges** (Gold/Silver):
   - MVP, Pentakill, Carry, Flawless, Untouchable, Hard Carry, Efficiency, etc.

2. **Negative Badges** (Red):
   - Feeder, AFK, Inting, Wardless Wonder, Blind Spot, etc.

3. **Neutral Badges** (Gray):
   - First Blood, Most Deaths, Balanced, etc.

4. **Objective Badges**:
   - Baron Stealer, Dragon Slayer, Tower Destroyer, etc.

5. **Gold Badges**:
   - Most Gold, Poorest Player, Gold Rush, etc.

6. **Meme Badges** (Community Humor):
   - Better Jungle Wins, AFK Farming, KS Stealer, Int to Win, etc.

**Badge Display**:
- Maximum 2 rows (max-height: 48px)
- Top 5 badges by priority
- Badge colors: gold, silver, bronze, negative (red), neutral (gray)
- Hover tooltip shows badge description

#### Badge Tooltips on Hover

**Implementation**:
```javascript
BadgeSystem.showTooltip(event, description, badgeElement) {
  // Create tooltip element
  tooltip.textContent = description;
  
  // Position above badge
  tooltip.style.left = `${rect.left + rect.width/2 - tooltipWidth/2}px`;
  tooltip.style.top = `${rect.top - tooltipHeight - 10}px`;
  
  tooltip.classList.add('show');
}
```

**Tooltip Content**: Badge name and description (e.g., "Pentakill: Pentakill achieved").

#### Badge Layout (Max 2 Rows)

**CSS**:
```css
.badge-container {
  display: flex;
  flex-wrap: wrap;
  max-height: 48px; /* 2 rows max */
  overflow: hidden;
  gap: 2px;
}
```

**Priority System**: Badges sorted by priority, top 5 displayed.

#### Column Alignment

**Participant Row Layout** (Grid):
```
[Champion + Name] | [Stats Grid] | [Items] | [Badges]
     180px             1fr         120px      300-400px
```

**Stats Grid**: 6 columns (KDA, CS, Gold, Damage, Vision, KP)

---

## 10. Advanced Filtering System

### Queue Type Filter

**Options**:
- All Queues
- Ranked (420)
- Normal (400)

**Implementation**:
```javascript
if (AppData.filters.queueType !== 'all') {
  const queueKey = parseInt(AppData.filters.queueType);
  matches = matches.filter(m => m.queue_key === queueKey);
}
```

### Champion Filter

**Options**:
- All Champions
- [Dynamic list of all champions played]

**Population**: Extracted from `enrichedMatches`:
```javascript
function updateChampionFilter() {
  const championSet = new Set(AppData.enrichedMatches.map(m => m.champion_name));
  const select = document.getElementById('championFilter');
  
  select.innerHTML = '<option value="all">All Champions</option>';
  
  Array.from(championSet).sort().forEach(champ => {
    const option = document.createElement('option');
    option.value = champ;
    option.textContent = champ;
    select.appendChild(option);
  });
}
```

### Time Period Presets

**Options**:
- All Matches
- Last 10
- Last 20
- Last 50
- Last 100

**Implementation**:
```javascript
if (AppData.filters.timePeriod !== 'all') {
  const limit = parseInt(AppData.filters.timePeriod);
  matches = matches.slice(0, limit); // Already sorted by timestamp desc
}
```

### Combined Filter Application

**Filter Order**:
1. Date range (timestamp filter)
2. Time period (slice first N matches)
3. Queue type
4. Champion

**All filters applied together**:
```javascript
function getFilteredMatches() {
  let matches = [...AppData.enrichedMatches];
  
  // 1. Date range
  if (AppData.dateFilters.startDate && AppData.dateFilters.endDate) {
    const startTime = AppData.dateFilters.startDate.getTime();
    const endTime = AppData.dateFilters.endDate.getTime() + (24 * 60 * 60 * 1000);
    matches = matches.filter(m => {
      const matchTime = m.timestamp;
      return matchTime >= startTime && matchTime < endTime;
    });
  }
  
  // 2. Time period
  if (AppData.filters.timePeriod !== 'all') {
    const limit = parseInt(AppData.filters.timePeriod);
    matches = matches.slice(0, limit);
  }
  
  // 3. Queue type
  if (AppData.filters.queueType !== 'all') {
    const queueKey = parseInt(AppData.filters.queueType);
    matches = matches.filter(m => m.queue_key === queueKey);
  }
  
  // 4. Champion
  if (AppData.filters.champion !== 'all') {
    matches = matches.filter(m => m.champion_name === AppData.filters.champion);
  }
  
  return matches;
}
```

### Filter Persistence

**Current**: Filters reset on page reload.

**Future Enhancement**: Store filters in `localStorage`:
```javascript
// Save filters
localStorage.setItem('lol_dashboard_filters', JSON.stringify(AppData.filters));

// Load filters
const saved = localStorage.getItem('lol_dashboard_filters');
if (saved) {
  AppData.filters = JSON.parse(saved);
  // Apply saved filter values to UI
}
```

---

## 11. Data Dragon Integration

### Champion Images/Icons

**CDN URL Pattern**:
```
https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{championName}.png
```

**Version Management**: Stored in `static/ddragon/version.txt` (e.g., "15.2.1")

**Enrichment**: During star schema transformation, champion icon URLs added to `dim_champion.csv`.

**Fallback**: If image fails to load, show champion initial in circle.

### Item Icons

**CDN URL Pattern**:
```
https://ddragon.leagueoflegends.com/cdn/{version}/img/item/{itemId}.png
```

**Storage**: Icon URLs in `dim_items.csv`.

**Fallback**: Show item ID in small gray box.

### Rune Icons and Data

**Rune Tree Icons**: From Data Dragon runesReforged.json

**Keystone/Perk Icons**: 
```
https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/{Tree}/{Rune}/{Rune}.png
```

**Storage**: Full rune setup (keystone, primary runes 2-4, secondary runes 1-2) stored in `dim_rune.csv` with icon URLs.

### CDN Version Management (15.2.1)

**Current Version**: 15.2.1 (hardcoded in codebase)

**Version Detection**:
```python
def get_latest_version(self) -> str:
    # Check cache first
    version_file = 'static/ddragon/version.txt'
    if os.path.exists(version_file):
        with open(version_file, 'r') as f:
            return f.read().strip()
    
    # Fetch from API
    url = "https://ddragon.leagueoflegends.com/api/versions.json"
    response = requests.get(url)
    versions = response.json()
    latest = versions[0]  # First item is latest
    
    # Cache version
    with open(version_file, 'w') as f:
        f.write(latest)
    
    return latest
```

**Updating Version**: Run `python src/data_dragon.py` to download latest assets and update version.

### Fallback Handling for Missing Assets

**Champion Icons**:
```javascript
<img src="{iconUrl}" 
     onerror="this.src='data:image/svg+xml,...[fallback SVG with initial]...'">
```

**Item Icons**:
```javascript
<img src="{iconUrl}" 
     onerror="this.onerror=null; this.src='data:image/svg+xml,...[fallback with item ID]...'">
```

**Rune Icons**: If rune icon fails, show rune name as text.

---

## 12. Technical Requirements

### 12a. Performance Requirements

#### Handle 400+ Matches per Player

**Memory Usage**: 
- Fact table: ~400 rows × ~30 columns = ~12KB CSV
- Dimensions: ~200KB total (champions, items, runes, dates)
- Bridge tables: ~400 × 7 items + 400 × 10 participants = ~6.8KB + ~400KB
- **Total per player**: ~1MB CSV data
- **Loaded in memory**: ~5-10MB after enrichment

**Performance**: Loading 3 players (1200 matches) should complete in < 3 seconds.

#### Support 3+ Simultaneous Players

**Aggregation**: Concatenate matches, merge dimensions.

**Performance**: Filtering 1000+ matches should complete in < 2 seconds.

#### Sub-2-Second Filter Application

**Optimization Strategies**:
1. Pre-enrich data on load (denormalize once)
2. Store enriched matches in memory (no CSV re-parsing)
3. Use efficient array filtering (native JavaScript)
4. Debounce rapid filter changes

**Implementation**:
```javascript
// Pre-enrich on load
function enrichMatchData() {
  AppData.enrichedMatches = AppData.factMatches.map(fact => {
    // Join with dimensions once
    const champion = AppData.dimChampions[fact.champion_key];
    const date = AppData.dimDates[fact.date_key];
    // ... join all dimensions
    return { ...fact, champion_name, date, ... };
  });
}

// Fast filtering
function getFilteredMatches() {
  let matches = [...AppData.enrichedMatches]; // Shallow copy
  
  // Fast array operations
  if (dateFilter) matches = matches.filter(m => /* condition */);
  if (queueFilter) matches = matches.filter(m => /* condition */);
  
  return matches;
}
```

#### Efficient CSV Parsing and Data Joins

**Library**: PapaParse (handles large CSV files efficiently)

**Join Strategy**: Load all CSVs, create hash maps for dimensions, enrich fact table in memory.

**Example**:
```javascript
// Load dimensions into objects keyed by surrogate key
AppData.dimChampions = {};
champions.forEach(c => {
  AppData.dimChampions[c.champion_key] = c;
});

// Join during enrichment
const champion = AppData.dimChampions[fact.champion_key]; // O(1) lookup
```

---

### 12b. Browser Compatibility

#### Modern Browsers

**Supported**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Features Used**:
- ES6+ (arrow functions, destructuring, template literals)
- Fetch API
- CSS Grid
- CSS Custom Properties (limited)
- Chart.js 4.x

#### Mobile-Responsive Design

**Breakpoints**:
- Mobile: < 768px (single column, stacked filters)
- Tablet: 768px - 1024px (2-3 columns)
- Desktop: > 1024px (full layout)

**Touch Support**:
- Touch-friendly filter buttons
- Swipeable tables (future)
- Responsive charts (Chart.js responsive mode)

#### Progressive Enhancement

**Core Functionality**: Works without JavaScript (static CSV display) - future enhancement.

**Current**: Requires JavaScript enabled (PapaParse, Chart.js, dynamic filtering).

---

### 12c. Security & Privacy

#### API Key Storage in Replit Secrets

**Replit Secrets Setup**:
1. Go to Replit Secrets tab
2. Add secret: `RIOT_API_KEY` = `RGAPI-...`
3. Secret accessible via `.env` file in Replit

**Never**:
- Commit `.env` to version control
- Expose API key in client-side code
- Log API key in console

#### No Sensitive Data in Client Code

**Server-Side Only**:
- API key (`.env` file)
- API calls (Python scripts)

**Client-Side Safe**:
- CSV files (public match data)
- PUUIDs (can be public)
- Match IDs (can be public)

**Note**: Match data from Riot API is public information (no PII beyond summoner names).

#### Secure Data Handling

**Best Practices**:
1. Validate API responses before processing
2. Sanitize user inputs (filter values)
3. Rate limit API calls (prevent abuse)
4. Handle errors gracefully (don't expose internals)

---

## 13. Implementation Guidance

### Recommended Tech Stack Considerations

**Current Stack**:
- **Frontend**: Vanilla JavaScript (no framework)
- **Styling**: Tailwind CSS (CDN)
- **Charts**: Chart.js (CDN)
- **CSV Parsing**: PapaParse (CDN)
- **Backend**: Python 3.x

**Alternative Considerations**:

1. **If Using a Framework**:
   - React: Better state management, component reusability
   - Vue: Simpler learning curve, similar benefits
   - Svelte: Smaller bundle, reactive by default

2. **If Using a Build Tool**:
   - Vite: Fast development, optimized production builds
   - Webpack: More configuration, but more control

3. **If Adding a Backend**:
   - FastAPI: Python async API server
   - Express.js: Node.js backend
   - Purpose: Dynamic data fetching, caching, API proxy

**Current Approach Advantages**:
- Simple deployment (static files)
- No build step required
- Easy to understand and modify
- Works on any static hosting

### State Management Patterns

**Current**: Global `AppData` object.

**Structure**:
```javascript
const AppData = {
  factMatches: [],
  dimChampions: {},
  enrichedMatches: [],
  filters: { timePeriod: 'all', queueType: 'all', champion: 'all' },
  dateFilters: { startDate: null, endDate: null, timeBucket: 'monthly' },
  players: [],
  charts: {}
};
```

**Alternative**: State management library (Redux, Zustand) if complexity grows.

### Component Architecture Suggestions

**Current**: Monolithic JavaScript file (`data-loader.js`).

**Recommended Refactoring** (if project grows):
```
src/
  ├── data/
  │   ├── loader.js (CSV loading)
  │   ├── enricher.js (dimension joins)
  │   └── filter.js (filtering logic)
  ├── analytics/
  │   ├── stats.js (summary calculations)
  │   ├── champion.js (champion stats)
  │   └── badges.js (badge calculations)
  ├── charts/
  │   ├── winRate.js
  │   ├── kda.js
  │   └── ...
  └── ui/
      ├── filters.js (filter UI)
      ├── tables.js (table rendering)
      └── cards.js (summary cards)
```

### Testing Strategy

**Unit Tests** (Future):
- Data filtering functions
- Stat calculations
- Badge logic
- Date bucketing

**Integration Tests**:
- CSV loading and enrichment
- Chart rendering
- Filter application

**Manual Testing Checklist**:
- [ ] Load data for 1 player
- [ ] Load data for 3 players (aggregation)
- [ ] Apply date filter
- [ ] Apply queue filter
- [ ] Apply champion filter
- [ ] Change time bucket (daily/weekly/monthly)
- [ ] Expand match details
- [ ] View badges on participants
- [ ] Sort match history table
- [ ] Check all charts render correctly

### Deployment Considerations

**Static Hosting Options**:
1. **Replit**: Current platform, simple deployment
2. **GitHub Pages**: Free, easy CI/CD
3. **Netlify**: Free tier, automatic deployments
4. **Vercel**: Free tier, optimized for static sites

**Required Files**:
- `static.html` (or `index.html`)
- `data-loader.js`
- `badges.js`
- `data/` directory with CSV files
- `players.json`

**Configuration**:
- No server-side code needed (pure static)
- CORS: If loading from different domain, ensure CORS headers on CSV files
- Base path: Update CSV paths if deploying to subdirectory

---

## 14. Edge Cases & Error Handling

### No Matches Found

**Scenario**: Player has no matches in selected date range/filters.

**Handling**:
```javascript
const matches = getFilteredMatches();
if (matches.length === 0) {
  // Show empty state message
  document.getElementById('summarySection').innerHTML = `
    <div class="text-center py-12 text-gray-400">
      <p class="text-xl mb-2">No matches found</p>
      <p class="text-sm">Try adjusting your filters or date range</p>
    </div>
  `;
  
  // Hide or disable charts
  // Show helpful message
}
```

**User Experience**: Friendly message, suggestion to adjust filters.

### API Rate Limiting

**Scenario**: Riot API returns 429 (Rate Limited).

**Handling** (in extraction script):
```python
if response.status_code == 429:
    retry_after = int(response.headers.get('Retry-After', 60))
    print(f"⚠️  Rate limited! Waiting {retry_after}s...")
    time.sleep(retry_after)
    continue  # Retry request
```

**User Experience**: Extraction script pauses automatically, resumes after wait time.

### Missing Data Dragon Assets

**Scenario**: Champion/item/rune icon URLs fail to load.

**Handling**:
```javascript
// HTML
<img src="{iconUrl}" 
     alt="{name}"
     onerror="this.src='data:image/svg+xml,...[fallback]...'">

// Or in code
function createChampionIcon(championKey, size) {
  const iconUrl = getChampionIconUrl(championKey);
  if (iconUrl) {
    return `<img src="${iconUrl}" onerror="handleImageError(this, '${championName}')">`;
  }
  // Fallback: show initial
  return `<div class="champion-initial">${championName.charAt(0)}</div>`;
}
```

**User Experience**: Fallback icon shown (initial letter or item ID).

### Network Failures

**Scenario**: CSV file fails to load (network error, 404).

**Handling**:
```javascript
async function loadCSV(filepath) {
  return new Promise((resolve, reject) => {
    Papa.parse(filepath, {
      download: true,
      header: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parse errors: ${results.errors.map(e => e.message).join(', ')}`));
        } else {
          resolve(results.data);
        }
      },
      error: (error) => {
        reject(new Error(`Failed to load CSV: ${error.message}`));
      }
    });
  });
}

// Usage with try-catch
try {
  const matches = await loadCSV('data/player1/fact_matches.csv');
} catch (error) {
  console.error('Error loading data:', error);
  updateLoadingStatus('Error: ' + error.message);
  // Show error to user
}
```

**User Experience**: Error message displayed, dashboard shows partial data if some files loaded.

### Invalid Player Data

**Scenario**: `players.json` has invalid format or missing PUUID.

**Handling**:
```javascript
function loadPlayerList() {
  try {
    const data = await fetch('../players.json');
    const json = await data.json();
    
    if (!json.players || !Array.isArray(json.players)) {
      throw new Error('Invalid players.json format');
    }
    
    // Validate each player
    json.players.forEach((player, index) => {
      if (!player.id || !player.puuid) {
        throw new Error(`Player ${index} missing required fields (id, puuid)`);
      }
    });
    
    AppData.players = json.players;
  } catch (error) {
    console.error('Error loading players:', error);
    // Show error message
    document.getElementById('playerDropdownText').textContent = 'Error loading players';
  }
}
```

**User Experience**: Error message, players not loaded.

### Empty Result Sets

**Scenario**: Filter combination returns 0 matches.

**Handling**: 
- Show "No matches found" message
- Disable charts (or show empty state)
- Suggest adjusting filters
- Keep filter values visible (so user knows what filtered to)

---

## 15. Success Criteria & Validation

### Functional Requirements Checklist

**Data Extraction**:
- [ ] Successfully extract matches from Riot API
- [ ] Handle rate limiting gracefully
- [ ] Extract matches for all months (2024-01 through 2025-11)
- [ ] Filter by queues 400 and 420 only

**Data Transformation**:
- [ ] Transform raw matches to star schema
- [ ] Create all dimension tables correctly
- [ ] Create fact table with accurate metrics
- [ ] Create bridge tables (items, participants)
- [ ] Enrich with Data Dragon data (icons, names)

**Dashboard Loading**:
- [ ] Load CSV files successfully
- [ ] Join fact table with dimensions
- [ ] Handle multiple players (aggregation)
- [ ] Load in < 5 seconds for 3 players

**Filtering**:
- [ ] Date range filter works correctly
- [ ] Time period filter (Last 10/20/50) works
- [ ] Queue filter works
- [ ] Champion filter works
- [ ] Combined filters work together
- [ ] Filters apply in < 2 seconds

**Visualizations**:
- [ ] Summary cards show correct values
- [ ] Win rate chart renders with correct data
- [ ] KDA chart renders with correct data
- [ ] All charts update when filters change
- [ ] Charts use correct time bucket (daily/weekly/monthly)

**Match History**:
- [ ] Table displays all filtered matches
- [ ] Sorting works on all columns
- [ ] Expandable details show all 10 players
- [ ] Badges display correctly
- [ ] Items display correctly

**Champion Analysis**:
- [ ] Best performing champions calculated correctly
- [ ] Worst performing champions calculated correctly
- [ ] Champion table shows all champions
- [ ] Champion icons load correctly

**Badges**:
- [ ] Badges calculate correctly for all participants
- [ ] Top 5 badges display per participant
- [ ] Badge tooltips show on hover
- [ ] Badge colors display correctly (gold/silver/bronze/negative/neutral)

### Visual Design Validation

**Design System**:
- [ ] Consistent color scheme (dark theme)
- [ ] Consistent spacing and padding
- [ ] Consistent typography
- [ ] Consistent border radius and shadows

**Responsive Design**:
- [ ] Mobile layout works (< 768px)
- [ ] Tablet layout works (768px - 1024px)
- [ ] Desktop layout works (> 1024px)
- [ ] Charts resize correctly
- [ ] Tables scroll horizontally on mobile

**Accessibility**:
- [ ] All interactive elements keyboard accessible
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader friendly (semantic HTML, ARIA labels)
- [ ] Focus indicators visible

### Performance Benchmarks

**Load Time**:
- [ ] 1 player (400 matches): < 2 seconds
- [ ] 3 players (1200 matches): < 5 seconds

**Filter Application**:
- [ ] Single filter: < 500ms
- [ ] Combined filters: < 2 seconds
- [ ] 1000+ matches: < 2 seconds

**Chart Rendering**:
- [ ] Initial render: < 1 second
- [ ] Chart update on filter: < 500ms

**Memory Usage**:
- [ ] 3 players loaded: < 50MB memory
- [ ] No memory leaks (check with DevTools)

### User Acceptance Criteria

**User Story 1: View Overall Performance**
- [ ] User can see win rate, KDA, CS/min, vision at a glance
- [ ] User can see trends over time in charts
- [ ] User understands their current form (streaks)

**User Story 2: Identify Weak Champions**
- [ ] User can see worst performing champions
- [ ] User can see detailed stats per champion
- [ ] User can identify which champions to stop playing

**User Story 3: Analyze Match Details**
- [ ] User can expand match to see all 10 players
- [ ] User can see badges earned in match
- [ ] User can see items, KDA, stats for all players

**User Story 4: Multi-Account Analysis**
- [ ] User can select multiple players
- [ ] User can see aggregated stats across accounts
- [ ] User can see combined champion pool

---

## 16. PRD Review & Improvement

### Analyze Potential Failure Points

**Data Extraction**:
- **Risk**: API key expiration (24 hours for dev keys)
- **Mitigation**: Use production key for long-term use, implement key rotation

**Data Transformation**:
- **Risk**: Missing Data Dragon files cause errors
- **Mitigation**: Graceful fallback, run Data Dragon download before transformation

**Dashboard Loading**:
- **Risk**: Large CSV files slow down loading
- **Mitigation**: Optimize CSV size, consider compression, lazy load charts

**Filtering**:
- **Risk**: Complex filters cause performance issues
- **Mitigation**: Optimize filter order, use efficient array methods, debounce

**Charts**:
- **Risk**: Too many data points cause slow rendering
- **Mitigation**: Aggregate data by time bucket, limit chart data points

### Add Missing Clarifications

**Data Refresh**:
- **Q**: How to add new matches after initial extraction?
- **A**: Run extraction script with updated date range, append to existing CSVs or regenerate.

**Player Management**:
- **Q**: How to add new players?
- **A**: Add to `players.json`, ensure PUUID is correct, run extraction script.

**Version Updates**:
- **Q**: What happens when Data Dragon version updates?
- **A**: Run `python src/data_dragon.py` to download latest, re-run transformation if needed for new assets.

### Strengthen Ambiguous Sections

**Badge Priority System**:
- **Clarification**: Badges sorted by `priority` field (1-10, higher = more important), top 5 displayed.

**Time Bucket Aggregation**:
- **Clarification**: Aggregation calculates average metrics per bucket (win rate, KDA, etc.), not sum.

**Multi-Player Aggregation**:
- **Clarification**: Matches concatenated, dimensions merged by key (no duplicates), metrics calculated across all matches.

### Add Implementation Tips

**Performance Optimization**:
1. Pre-enrich data once on load (don't re-join on every filter)
2. Use `Map` for dimension lookups (O(1) vs O(n) with arrays)
3. Debounce rapid filter changes
4. Lazy load charts (only render visible charts)

**Code Organization**:
1. Separate concerns (data loading, filtering, rendering)
2. Use functions for reusable logic
3. Comment complex calculations
4. Keep CSV parsing separate from UI logic

**Debugging**:
1. Use `console.log` for filter results
2. Check `AppData.enrichedMatches.length` after loading
3. Verify dimension joins in browser DevTools
4. Test with small dataset first (10 matches)

### Create Troubleshooting Guide

#### Common Issues

**Issue**: "No matches found" error
- **Cause**: Filters too restrictive, no data for date range
- **Solution**: Reset filters, check date range, verify CSV files exist

**Issue**: Charts not updating
- **Cause**: Chart not destroyed before recreation, filter not applied
- **Solution**: Call `chart.destroy()` before creating new chart, verify `refreshDashboard()` called

**Issue**: Icons not loading
- **Cause**: Data Dragon version mismatch, network issue
- **Solution**: Check `static/ddragon/version.txt`, verify CDN URLs, check browser console for 404s

**Issue**: Performance slow with many matches
- **Cause**: Too many matches loaded, inefficient filtering
- **Solution**: Use time period filter (Last 20/50), optimize filter order, check for memory leaks

**Issue**: Badges not showing
- **Cause**: `badges.js` not loaded before `data-loader.js`, BadgeSystem not defined
- **Solution**: Ensure script order in HTML: `<script src="badges.js"></script>` before `<script src="data-loader.js"></script>`

---

## Appendix A: Quick Reference

### File Structure
```
/workspace/
├── dashboard/
│   ├── static.html          # Main dashboard UI
│   ├── data-loader.js       # Data loading & analytics
│   └── badges.js            # Badge system
├── src/
│   ├── extract_2024_2025.py # Match extraction
│   ├── transform_to_star_schema.py # Data transformation
│   └── data_dragon.py       # Data Dragon client
├── data/
│   └── {player_id}/
│       ├── fact_matches.csv
│       ├── dim_*.csv
│       └── bridge_*.csv
├── static/
│   └── ddragon/
│       ├── version.txt
│       └── mappings/
├── players.json             # Player configuration
├── .env                     # API key (Replit Secret)
└── REPLIT_PRD.md           # This document
```

### Key Metrics Formulas

**KDA**: `(Kills + Assists) / Deaths` (or `Kills + Assists` if deaths = 0)

**Kill Participation**: `(Kills + Assists) / Team_Kills`

**Win Rate**: `Wins / Total_Games * 100`

**CS per Minute**: `CS_Total / Game_Duration_Minutes`

**Gold per Minute**: `Gold_Earned / Game_Duration_Minutes`

### API Endpoints Summary

**Get PUUID**: `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}`

**Get Match IDs**: `GET /lol/match/v5/matches/by-puuid/{puuid}/ids?startTime={start}&endTime={end}&queue={queue}`

**Get Match Details**: `GET /lol/match/v5/matches/{matchId}`

---

**End of PRD**