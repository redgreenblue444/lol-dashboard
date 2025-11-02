# Setup Guide - Multi-Player Analytics System

## 🚀 Quick Setup (5 Minutes)

### Step 1: Verify Your Environment

Check that you have the `.env` file with your Riot API key:

```bash
cat .env
```

Should show:
```
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

If missing, create it:
```bash
echo "RIOT_API_KEY=your_key_here" > .env
```

### Step 2: Add Your First Player

Run the player management tool:

```bash
python src/manage_players.py add
```

You'll be prompted for:
- **Riot ID**: Your in-game name in format `GameName#TAG` (e.g., `Doublelift#NA1`)
- **Display Name**: A friendly name (e.g., "My Main Account")
- **Region**: Choose from `americas`, `europe`, or `asia`

The script will automatically:
- Validate your Riot ID
- Fetch your PUUID from Riot's servers
- Create a data directory for you at `data/{player_id}/`
- Save to `players.json`

**Example:**
```
Enter Riot ID (GameName#TAG): Doublelift#NA1
Enter display name: Main Account
Enter region (americas/europe/asia) [americas]: americas

Fetching PUUID for Doublelift#NA1...
✓ Added player: Main Account (Doublelift#NA1)
  PUUID: abc123...
✓ Created data directory: /Users/x/Projects/Riot/data/doublelift
```

### Step 3: Extract Your Match History

Run the data extraction pipeline:

```bash
python src/extract_all_2024_2025.py
```

This will:
1. Extract ALL matches from Jan 2024 to present
2. Process month-by-month (resumable if interrupted)
3. Only fetch queues 400 (Draft Normal) and 420 (Ranked Solo/Duo)
4. Handle rate limiting automatically
5. Transform raw data into analytics-ready CSVs

**What to expect:**
- Initial extraction takes ~10-30 minutes depending on how many games you played
- Rate limit: 95 API calls per 2 minutes (leaves buffer for other API usage)
- Progress is saved - if interrupted, just rerun the script to resume
- Raw match JSONs saved in `data/{player_id}/raw_matches_YYYY_MM.json`
- Transformed CSVs saved in `data/{player_id}/`

**Output:**
```
🚀 League of Legends Data Extraction
📊 Extracting data for 1 player(s)
📅 Period: January 2024 - January 2025
🎮 Queues: [400, 420] (Draft Normal, Ranked Solo/Duo)

============================================================
👤 Player: Main Account (Doublelift#NA1)
   ID: doublelift
   Region: americas
============================================================

📅 Extracting 2024-01...
  🎮 Queue: Draft Normal (400)
    Found 15 match IDs (offset 0)
    Fetching match 15/15: NA1_1234567890
  🎮 Queue: Ranked Solo/Duo (420)
    Found 30 match IDs (offset 0)
    Fetching match 30/30: NA1_9876543210
  ✓ Extracted 45 matches
  💾 Saved to data/doublelift/raw_matches_2024-01.json

... (repeats for each month) ...

============================================================
✓ Extraction complete for Main Account
  Months completed: 13/13
  Total matches: 587
============================================================

🔄 STEP 2: Data Transformation
--------------------------------------------------------------------
🔄 Transforming data for player: doublelift
  Found 13 raw match files
  Processing raw_matches_2024-01.json...
    45 matches
  ... (continues) ...
  ✓ Processed 587 total matches
  Exporting CSVs to data/doublelift...
  ✓ Exported all CSVs

✓ Transformation complete for doublelift
  Fact matches: 587
  Champions: 32
  Dates: 245
  Items: 127

🎉 Pipeline Complete!

Next steps:
  1. Open dashboard: http://localhost:8000/dashboard/static.html
  2. Select players from the dropdown
  3. Analyze your performance!

To start the web server:
  python -m http.server 8000
```

### Step 4: View Your Dashboard

Start the web server:

```bash
python -m http.server 8000
```

Open your browser to:
```
http://localhost:8000/dashboard/static.html
```

1. You'll see "Ready! Select a player and click 'Load Data'"
2. Select your player from the dropdown
3. Click **"Load Data"**
4. Explore your analytics!

---

## 📊 Dashboard Usage

### Player Selection
- **Multi-select**: Hold Ctrl (Windows/Linux) or Cmd (Mac) to select multiple players
- Currently shows first selected player (multi-player comparison coming soon)

### Date Filters
- **Date Range**: Pick start and end dates to focus on specific periods
- **Group By**: Aggregate data by Daily, Weekly, **Monthly** (default), Quarterly, or Yearly
- **Apply Filters**: Updates all charts and metrics
- **Reset**: Returns to default (last 30 days)

### Other Filters
- **Queue Type**: All, Normal (400), Ranked (420)
- **Champion**: View stats for specific champion or all

### Sections
1. **Overall Performance**: High-level metrics (win rate, KDA, total games)
2. **Performance Trends**: Win rate and KDA over time (charts)
3. **Champion Statistics**: Most played, best win rates, per-champion breakdown
4. **Recent Performance**: Last 20 games trend
5. **Combat Performance**: Kill participation, damage, multi-kills
6. **Economy**: Gold per minute, CS efficiency
7. **Vision**: Vision score, ward stats
8. **Items & Builds**: Most common builds and their win rates
9. **Runes Analysis**: Rune setups and effectiveness
10. **Match History**: Detailed table with expandable rows

### Match Details (Click any row)
- Full team scoreboard (all 10 players)
- Achievement badges for each player
- Items, runes, stats
- Click again to collapse

---

## 👥 Adding More Players

### Add Your Alt Account

```bash
python src/manage_players.py add
```

### Add Your Friend's Account

```bash
python src/manage_players.py add
```

Then extract their data:

```bash
python src/extract_all_2024_2025.py
```

The script processes all configured players sequentially.

---

## 🔧 Management Commands

### List All Players
```bash
python src/manage_players.py list
```

### Remove a Player
```bash
python src/manage_players.py remove
```

### Update Player Info
```bash
python src/manage_players.py update
```

---

## 🔍 Extraction Status

Check extraction progress for a player:

```bash
cat data/{player_id}/extraction_status.json
```

Example:
```json
{
  "2024-01": {
    "status": "complete",
    "match_count": 45,
    "extracted_at": "2025-11-02T23:15:00.123456+00:00"
  },
  "2024-02": {
    "status": "complete",
    "match_count": 52,
    "extracted_at": "2025-11-02T23:25:00.123456+00:00"
  },
  "2024-03": {
    "status": "pending"
  }
}
```

### Resume Interrupted Extraction

If extraction was interrupted, just rerun:

```bash
python src/extract_all_2024_2025.py
```

The script automatically skips completed months.

### Re-extract a Specific Month

Edit `data/{player_id}/extraction_status.json` and change the month's status from `"complete"` to `"pending"`, then rerun the extraction.

---

## ⚠️ Troubleshooting

### Problem: "403 Forbidden" from Riot API

**Cause**: API key expired or invalid

**Solution**:
1. Get a new key from https://developer.riotgames.com/
2. Update `.env` file:
   ```bash
   echo "RIOT_API_KEY=RGAPI-new-key-here" > .env
   ```

### Problem: "No players configured"

**Cause**: `players.json` is empty or missing

**Solution**:
```bash
python src/manage_players.py add
```

### Problem: Dashboard shows "Error loading players"

**Cause**: `players.json` not found or invalid

**Solution**:
1. Verify file exists: `cat players.json`
2. Check format (should be valid JSON)
3. If corrupted, delete and recreate:
   ```bash
   rm players.json
   python src/manage_players.py add
   ```

### Problem: "CORS policy" error in browser

**Cause**: Opening dashboard as `file://` instead of through web server

**Solution**:
Always use a web server:
```bash
python -m http.server 8000
# Then open: http://localhost:8000/dashboard/static.html
```

### Problem: Dashboard loads but shows "No matches"

**Cause**: CSVs not generated or in wrong location

**Solution**:
1. Verify CSVs exist:
   ```bash
   ls -la data/{player_id}/*.csv
   ```
2. If missing, rerun transformation:
   ```bash
   python src/transform_player_data.py
   ```

### Problem: Rate limit errors during extraction

**Cause**: Hitting Riot API rate limits

**Solution**:
- **Development Key**: 20 calls per second, 100 per 2 minutes
- **Production Key**: 50 calls per second, 120 per 2 minutes

The script automatically handles this, but if you have other apps using the API:
1. Wait a few minutes
2. Rerun extraction (it will resume)

### Problem: "Player not found in match" warnings

**Cause**: PUUID mismatch (rare, but can happen if name changed)

**Solution**:
```bash
python src/manage_players.py update
# Enter new Riot ID to refresh PUUID
```

---

## 📁 Directory Structure After Setup

```
/Users/x/Projects/Riot/
├── .env                            # Your Riot API key
├── players.json                    # Player configuration
├── README.md                       # Full documentation
├── SETUP_GUIDE.md                  # This file
│
├── src/                            # Python scripts
│   ├── manage_players.py           # Player management CLI
│   ├── extract_player_data.py      # Data extraction
│   ├── transform_player_data.py    # Data transformation
│   └── extract_all_2024_2025.py    # Main orchestrator
│
├── dashboard/                      # Web dashboard
│   ├── static.html                 # Main UI
│   ├── data-loader.js              # Analytics engine
│   └── badges.js                   # Achievement system
│
└── data/                           # Player data
    ├── player1/                    # First player
    │   ├── extraction_status.json  # Progress tracking
    │   ├── raw_matches_2024_01.json
    │   ├── raw_matches_2024_02.json
    │   ├── ...
    │   ├── fact_matches.csv        # Core match data
    │   ├── dim_champion.csv        # Champions
    │   ├── dim_date.csv            # Dates
    │   ├── dim_queue.csv           # Queues
    │   ├── dim_rune.csv            # Runes
    │   ├── dim_items.csv           # Items
    │   ├── dim_match_metadata.csv  # Match metadata
    │   ├── bridge_match_items.csv  # Match-Item relationships
    │   └── bridge_match_participants.csv  # All participants
    │
    ├── player2/                    # Second player (if added)
    │   └── ...
    │
    └── backup_2024/                # Backup of old data
        └── ...
```

---

## 🎯 Next Steps

1. **Explore the dashboard**: Try different filters and date ranges
2. **Add more players**: Your alt accounts or friends
3. **Check match details**: Click any match row to see full breakdown
4. **Track progress**: Revisit after playing more games and re-extract

---

## 💡 Tips

- **Best Time to Extract**: Off-peak hours (late night/early morning) for faster API responses
- **Backup Your Data**: The `data/` directory contains all your match history
- **CSV Files**: You can open these in Excel/Google Sheets for custom analysis
- **Re-transform**: If you modify the transform script, just rerun it (doesn't need to re-fetch from API)

Enjoy your analytics! 🎮📊

