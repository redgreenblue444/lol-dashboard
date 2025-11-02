# Quick Reference Card

## 🚀 Common Commands

### Player Management
```bash
# Add player
python src/manage_players.py add

# List players
python src/manage_players.py list

# Remove player
python src/manage_players.py remove

# Update player
python src/manage_players.py update
```

### Data Pipeline
```bash
# Extract & transform all players (full pipeline)
python src/extract_all_2024_2025.py

# Extract only (no transform)
python src/extract_player_data.py

# Transform only (from existing raw JSON)
python src/transform_player_data.py
```

### Dashboard
```bash
# Start web server
python -m http.server 8000

# Open in browser
# http://localhost:8000/dashboard/static.html
```

---

## 📁 Important Files

```bash
.env                              # Your Riot API key
players.json                      # Player configuration
data/{player_id}/extraction_status.json  # Progress tracking
```

---

## 🔧 Quick Fixes

### Problem: 403 Forbidden
```bash
# Update API key in .env
echo "RIOT_API_KEY=RGAPI-new-key" > .env
```

### Problem: No players
```bash
python src/manage_players.py add
```

### Problem: Missing data
```bash
# Check if CSVs exist
ls -la data/{player_id}/*.csv

# If missing, run pipeline
python src/extract_all_2024_2025.py
```

### Problem: CORS error
```bash
# Don't open as file://, use web server
python -m http.server 8000
```

---

## 📊 Data Locations

```
data/{player_id}/
├── extraction_status.json       # Progress
├── raw_matches_2024_01.json     # Raw data (Jan 2024)
├── raw_matches_2024_02.json     # Raw data (Feb 2024)
├── ...
├── fact_matches.csv             # Main match data
├── dim_champion.csv             # Champions
├── dim_date.csv                 # Dates
├── dim_queue.csv                # Queues
├── dim_rune.csv                 # Runes
├── dim_items.csv                # Items
├── dim_match_metadata.csv       # Match metadata
├── bridge_match_items.csv       # Match-Item links
└── bridge_match_participants.csv # All participants
```

---

## 🎯 Typical Workflow

```bash
# 1. First time setup
python src/manage_players.py add
python src/extract_all_2024_2025.py
python -m http.server 8000
# Open http://localhost:8000/dashboard/static.html

# 2. Add more players
python src/manage_players.py add
python src/extract_all_2024_2025.py
# Refresh dashboard, select new player

# 3. Update data (after playing more games)
python src/extract_all_2024_2025.py
# Refresh dashboard
```

---

## ⚙️ Configuration

### players.json format
```json
{
  "players": [
    {
      "id": "player1",
      "riot_id": "GameName#TAG",
      "puuid": "...",
      "display_name": "My Main",
      "region": "americas"
    }
  ]
}
```

### extraction_status.json format
```json
{
  "2024-01": {
    "status": "complete",
    "match_count": 45,
    "extracted_at": "2025-11-02T23:15:00Z"
  },
  "2024-02": {"status": "pending"}
}
```

---

## 🔍 Debugging

```bash
# Check API key
cat .env

# Check players
cat players.json | python -m json.tool

# Check extraction status
cat data/{player_id}/extraction_status.json | python -m json.tool

# Check CSV counts
wc -l data/{player_id}/*.csv

# Check raw match files
ls -lh data/{player_id}/raw_matches_*.json
```

---

## 📚 Documentation

- **README.md** - Full documentation
- **SETUP_GUIDE.md** - Step-by-step setup
- **IMPLEMENTATION_SUMMARY.md** - Technical details
- **QUICK_REFERENCE.md** - This file

---

## 💡 Tips

- Extraction takes 10-30 min for full year
- Rate limit: 95 API calls per 2 minutes
- Can interrupt and resume extraction
- Raw JSON = backup, can re-transform without re-fetching
- CSVs can be opened in Excel for custom analysis
- Multi-player comparison coming soon

---

## 🆘 Support

Check console output for detailed errors:
- Browser console (F12) for dashboard issues
- Terminal output for Python script errors

Common errors:
- **403**: API key expired
- **404**: Player not found (wrong Riot ID)
- **429**: Rate limit hit (script auto-waits)
- **CORS**: Open via web server, not file://

