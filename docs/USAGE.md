# Quick Usage Guide

## Option 1: Use Existing Data (Fast Start)

If you already have `match_history.json` with 20 matches:

```bash
# Create a copy as raw_matches.json
cp match_history.json raw_matches.json

# Transform to star schema
python transform_to_star_schema.py

# Open dashboard
open static.html  # or use a web server
```

## Option 2: Fetch Fresh Data (100 Matches)

For a comprehensive analysis with 100 matches:

```bash
# 1. Set your API key
export RIOT_API_KEY="your-api-key-here"

# 2. Fetch 100 filtered matches (Draft Normal + Ranked Solo)
python fetch_100_matches.py
# Enter your Riot ID when prompted (e.g., PlayerName#NA1)
# This creates raw_matches.json

# 3. Transform to star schema
python transform_to_star_schema.py
# This creates CSV files in data/ directory

# 4. Open dashboard
open static.html
```

## Option 3: Use a Web Server (Recommended)

For better CORS handling and performance:

```bash
# After generating CSV files, start a web server
python -m http.server 8000

# Then open in browser:
# http://localhost:8000/static.html
```

## Getting Your Riot API Key

1. Go to https://developer.riotgames.com/
2. Sign in with your Riot account
3. Copy your Development API Key
4. **Note**: Development keys expire after 24 hours

## Finding Your Riot ID

Your Riot ID is in the format `GameName#TAG`:

1. **In League Client**: Look at top-right corner
2. **On OP.GG**: Search for your account
3. **Example**: `Faker#KR1`, `Doublelift#NA1`

## Rate Limits

The scripts automatically handle rate limits:
- Development key: 20 requests/sec, 100 requests/2 minutes
- Fetching 100 matches takes approximately 5-10 minutes
- Progress is displayed in real-time

## Filters in Dashboard

Once the dashboard is open:

- **Time Period**: View last 20, 50, or all matches
- **Queue Type**: Filter by Ranked Solo/Duo or Draft Normal
- **Champion**: Analyze specific champion performance
- **Reset Filters**: Return to full dataset view

## Troubleshooting

### "Cannot read properties of undefined"
- Ensure `data/` directory exists with all CSV files
- Run `transform_to_star_schema.py` after fetching matches

### "Failed to fetch account information"
- Check your Riot ID format (must have `#` symbol)
- Verify API key hasn't expired (regenerate after 24 hours)
- Ensure you're using the correct region

### Charts not loading
- Use a local web server instead of opening HTML directly
- Check browser console (F12) for errors
- Ensure internet connection for CDN resources (Tailwind, Chart.js)

### No data in dashboard
- Verify CSV files exist in `data/` directory
- Check CSV files aren't empty
- Ensure raw_matches.json had data before transformation

## Performance Tips

1. **First time**: Use existing match_history.json (20 matches) for quick test
2. **Full analysis**: Fetch 100 matches for comprehensive insights
3. **Best practice**: Run fetch script overnight to avoid watching rate limit delays
4. **Updates**: Re-fetch weekly to track progress

## What Each Script Does

| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `fetch_match_history.py` | Original fetcher | API key, Riot ID | match_history.json (20 matches) |
| `fetch_100_matches.py` | Enhanced fetcher | API key, Riot ID | raw_matches.json (100 filtered matches) |
| `transform_to_star_schema.py` | ETL processor | raw_matches.json | CSV files in data/ directory |
| `static.html` + `data-loader.js` | Dashboard | CSV files | Interactive analytics |

## Sample Commands

### macOS/Linux
```bash
# Full workflow
export RIOT_API_KEY="RGAPI-xxxxx"
python fetch_100_matches.py
python transform_to_star_schema.py
python -m http.server 8000
# Visit: http://localhost:8000/static.html
```

### Windows (PowerShell)
```powershell
# Full workflow
$env:RIOT_API_KEY="RGAPI-xxxxx"
python fetch_100_matches.py
python transform_to_star_schema.py
python -m http.server 8000
# Visit: http://localhost:8000/static.html
```

## Data Update Frequency

- **Daily**: Track recent performance trends
- **Weekly**: Monitor overall improvement
- **Monthly**: Long-term meta analysis

Each time you re-run the scripts, data files are overwritten with fresh data.

## Next Steps

After viewing your dashboard:

1. **Identify patterns**: Which champions have highest win rate?
2. **Spot weaknesses**: CS/min or vision score low?
3. **Track improvement**: Set goals (e.g., 7 CS/min, 40+ vision)
4. **Optimize builds**: Which items/runes correlate with wins?
5. **Time management**: When do you perform best?

Happy analyzing! 🎮📊

