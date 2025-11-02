# League of Legends Analytics Dashboard

Multi-player analytics dashboard with segmented 2024-2025 data extraction for League of Legends.

## Features

- **Multi-Player Support**: Manage multiple accounts and analyze each independently
- **Segmented Data Extraction**: Month-by-month extraction (Jan 2024 - present) with resumable downloads
- **Comprehensive Analytics**: Win rates, KDA, champion statistics, combat metrics, economy tracking, vision analysis, item/rune builds
- **Interactive Dashboard**: Filter by date range, time bucket (daily/weekly/monthly/quarterly/yearly), queue type, champion
- **Achievement Badges**: Track in-game achievements and standout performances
- **Data Dragon Integration**: Champion images, item icons, and rune visuals

## Quick Start

### 1. Setup

Ensure you have a `.env` file in the project root with your Riot API key:

```bash
RIOT_API_KEY=your_api_key_here
```

### 2. Add Players

Use the player management CLI to add players:

```bash
# Add a new player
python src/manage_players.py add

# List all configured players
python src/manage_players.py list

# Remove a player
python src/manage_players.py remove

# Update player information
python src/manage_players.py update
```

When adding a player, you'll be prompted for:
- Riot ID (format: `GameName#TAG`)
- Display name (friendly name for the dashboard)
- Region (`americas`, `europe`, or `asia`)

The script will automatically fetch the player's PUUID from the Riot API.

### 3. Extract and Transform Data

Run the main orchestrator to extract all 2024-2025 data:

```bash
python src/extract_all_2024_2025.py
```

This will:
- Extract matches month-by-month for each configured player
- Handle rate limiting automatically (120 calls per 2 minutes)
- Resume from where it left off if interrupted
- Transform raw JSON to star schema CSVs
- Track extraction status in `data/{player_id}/extraction_status.json`

**Data Extracted:**
- Queues: 400 (Draft Normal), 420 (Ranked Solo/Duo)
- Period: January 2024 - Present
- All match details, participant stats, items, runes

### 4. View Dashboard

Start a local web server:

```bash
python -m http.server 8000
```

Open your browser to:
```
http://localhost:8000/dashboard/static.html
```

1. Select player(s) from the dropdown (hold Ctrl/Cmd for multiple)
2. Click "Load Data"
3. Use date range and filters to analyze performance

## Project Structure

```
/Users/x/Projects/Riot/
├── src/
│   ├── manage_players.py           # Player management CLI
│   ├── extract_player_data.py      # Month-by-month data extraction
│   ├── transform_player_data.py    # Star schema transformation
│   └── extract_all_2024_2025.py    # Main orchestrator
├── dashboard/
│   ├── static.html                 # Dashboard UI
│   ├── data-loader.js              # Analytics engine
│   └── badges.js                   # Achievement system
├── data/
│   ├── player1/                    # Per-player data directories
│   │   ├── extraction_status.json  # Extraction progress tracking
│   │   ├── raw_matches_2024_01.json
│   │   ├── raw_matches_2024_02.json
│   │   ├── ...
│   │   ├── fact_matches.csv
│   │   ├── dim_champion.csv
│   │   ├── dim_date.csv
│   │   ├── dim_queue.csv
│   │   ├── dim_rune.csv
│   │   ├── dim_items.csv
│   │   ├── dim_match_metadata.csv
│   │   ├── bridge_match_items.csv
│   │   └── bridge_match_participants.csv
│   └── backup_2024/                # Backup of previous data
├── players.json                    # Player configuration
└── .env                            # Riot API key (not committed)
```

## Data Model

### Star Schema

**Fact Table:**
- `fact_matches.csv`: Core match statistics (kills, deaths, assists, gold, CS, damage, vision, etc.)

**Dimension Tables:**
- `dim_champion.csv`: Champion information
- `dim_date.csv`: Date dimension with year, month, day, day of week, hour
- `dim_queue.csv`: Queue types (Normal, Ranked)
- `dim_rune.csv`: Rune configurations
- `dim_items.csv`: Item details
- `dim_match_metadata.csv`: Match IDs and timestamps

**Bridge Tables:**
- `bridge_match_items.csv`: Many-to-many relationship between matches and items
- `bridge_match_participants.csv`: All 10 participants per match with detailed stats

## Extraction Status

Track extraction progress per player:

```json
{
  "2024-01": {
    "status": "complete",
    "match_count": 45,
    "extracted_at": "2025-11-02T23:15:00Z"
  },
  "2024-02": {
    "status": "complete",
    "match_count": 52,
    "extracted_at": "2025-11-02T23:25:00Z"
  },
  "2024-03": {
    "status": "pending"
  }
}
```

## Rate Limiting

The extraction script automatically handles Riot API rate limits:
- Production Key: 120 calls per 2 minutes
- Buffer: Script uses 95 calls per 2-minute window for safety
- Auto-wait: Script pauses when limit is reached

## Troubleshooting

### "No players configured"
Run `python src/manage_players.py add` to add your first player.

### "Error loading players.json"
Ensure `players.json` exists in the project root. It should be created automatically when you add your first player.

### "403 Forbidden" from Riot API
Check your API key in `.env`. Keys expire after 24 hours for development keys.

### Dashboard shows "No matches"
Ensure you've run the extraction and transformation:
1. `python src/extract_all_2024_2025.py`
2. Check that CSVs exist in `data/{player_id}/`

### CORS errors when loading dashboard
You must serve the dashboard through a web server (not `file://`):
```bash
python -m http.server 8000
```

## Advanced

### Manual Extraction (Single Player)

Extract data for a specific player:
```bash
python src/extract_player_data.py
```

Transform raw data to CSVs:
```bash
python src/transform_player_data.py
```

### Re-extract Specific Months

Delete the month entry from `extraction_status.json`, then rerun the extraction script.

### Multi-Player Comparison

*Coming Soon*: Dashboard will support viewing multiple players side-by-side or overlaid on charts.

## Dashboard Features

### Filters
- **Date Range**: Select start and end dates
- **Time Bucket**: Aggregate by daily, weekly, monthly, quarterly, or yearly
- **Time Period**: Last 7 days, 30 days, 90 days, all time
- **Queue Type**: All, Normal, Ranked
- **Champion**: All or specific champion

### Sections
1. **Overall Performance**: Win rate, KDA, games played, favorite champion
2. **Performance Trends**: Win rate over time, KDA progression
3. **Champion Statistics**: Most played, highest win rate, performance breakdown
4. **Recent Performance**: Last 20 games with trend analysis
5. **Combat Performance**: Kill participation, damage dealt/taken, multi-kills
6. **Economy**: Gold per minute, CS per minute, gold efficiency
7. **Vision**: Vision score, wards placed/killed, control wards
8. **Items & Builds**: Common builds with win rates
9. **Runes Analysis**: Rune setups and effectiveness
10. **Match History**: Detailed match table with expandable rows

### Match Details (Expandable)
- Full team scoreboard (both teams)
- Achievement badges for each player
- Item builds
- Combat stats
- Gold and CS metrics

## API Usage

This project uses the following Riot API endpoints:
- `ACCOUNT-V1`: Fetch PUUID from Riot ID
- `MATCH-V5`: Fetch match IDs and detailed match data

## License

Personal project for educational purposes. Riot API data is subject to Riot Games Terms of Service.

## Support

For issues or questions, check the console output for detailed error messages.
