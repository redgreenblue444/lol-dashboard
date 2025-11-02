# Next Steps - Getting Your Analytics Running

## ✅ What's Done

All code is implemented and ready to use! Here's what you now have:

1. **Multi-player system** supporting unlimited accounts
2. **Segmented 2024-2025 extraction** with month-by-month tracking
3. **Interactive dashboard** with player selection
4. **Complete CLI tools** for player management
5. **Comprehensive documentation**

---

## 🎯 What YOU Need to Do Next

### Step 1: Add Your First Player (2 minutes)

```bash
python src/manage_players.py add
```

When prompted, enter:
- **Riot ID**: Your in-game name (format: `YourName#TAG`)
  - Example: `Doublelift#NA1`, `Faker#KR1`, `YourName#0000`
  - Find it in-game: Profile → Settings → "Riot ID"
- **Display Name**: Any friendly name (e.g., "My Main Account")
- **Region**: `americas` (for NA, BR, LAN, LAS), `europe` (for EUW, EUNE, TR, RU), or `asia` (for KR, JP, OCE, SEA)

The script will automatically fetch your PUUID from Riot's servers.

### Step 2: Extract Your Match History (15-30 minutes)

```bash
python src/extract_all_2024_2025.py
```

This will:
- Fetch all your matches from Jan 2024 to present
- Only Draft Normal (queue 400) and Ranked Solo/Duo (queue 420)
- Save progress as it goes (resumable if interrupted)
- Transform data into analytics-ready CSVs

**What to expect:**
- Initial output shows which months it's extracting
- You'll see match counts for each month
- Script automatically handles rate limiting
- When done, you'll see "🎉 Pipeline Complete!"

**Time estimate:**
- ~50 matches = 5 minutes
- ~200 matches = 15 minutes
- ~500 matches = 30 minutes

### Step 3: View Your Dashboard (30 seconds)

```bash
# Start web server
python -m http.server 8000
```

Then open your browser to:
```
http://localhost:8000/dashboard/static.html
```

1. You'll see the player dropdown with your player
2. Select your player
3. Click **"Load Data"**
4. Explore your analytics!

---

## 🎮 Using the Dashboard

### Filters
- **Date Range**: Focus on specific time periods
- **Group By**: View trends daily, weekly, monthly, etc.
- **Queue Type**: Separate Normal vs Ranked
- **Champion**: Filter by specific champion

### Key Sections
1. **Overall Performance** - Your summary stats
2. **Performance Trends** - Win rate and KDA over time
3. **Champion Stats** - Which champs you play and perform best on
4. **Combat Performance** - Damage, kills, participation
5. **Economy** - Gold and CS efficiency
6. **Vision** - Ward stats
7. **Items & Builds** - Common builds and their win rates
8. **Runes** - Rune setups and effectiveness
9. **Match History** - Detailed table (click rows for full breakdown!)

### Pro Tips
- Click any match row to see full 10-player breakdown
- Hover badges to see achievement descriptions
- Try different time bucketing (weekly, monthly) for clearer trends
- Use champion filter to analyze specific champion performance

---

## 👥 Adding More Players

Want to track multiple accounts or compare with friends?

```bash
# Add another player
python src/manage_players.py add

# Extract their data
python src/extract_all_2024_2025.py

# Refresh dashboard and select new player
```

The extraction script is smart - it only processes new/missing data.

---

## 🔄 Updating Data

After playing more games:

```bash
python src/extract_all_2024_2025.py
```

It will:
- Check existing extraction status
- Only fetch new months (e.g., if you run it next month)
- Update your CSVs

Then refresh the dashboard to see new data!

---

## 📚 Documentation Reference

- **SETUP_GUIDE.md** - Detailed step-by-step instructions
- **README.md** - Complete feature documentation
- **QUICK_REFERENCE.md** - Command cheat sheet
- **IMPLEMENTATION_SUMMARY.md** - Technical details

---

## 🐛 Troubleshooting

### "403 Forbidden" error
Your API key might be expired (dev keys last 24 hours).

Get new key: https://developer.riotgames.com/

Update `.env`:
```bash
echo "RIOT_API_KEY=RGAPI-your-new-key" > .env
```

### "Player not found"
Check your Riot ID format: `GameName#TAG`
- Include the `#` and tag line
- No spaces before/after `#`
- Case sensitive

### Dashboard shows "No matches"
1. Verify extraction completed successfully
2. Check CSVs exist: `ls data/{player_id}/*.csv`
3. If missing, rerun: `python src/extract_all_2024_2025.py`

### Browser shows "CORS policy" error
You must use a web server, not open the file directly.

Always use:
```bash
python -m http.server 8000
# Then open http://localhost:8000/dashboard/static.html
```

### Script seems stuck
It's probably waiting for rate limits. Check output for "⏳ Rate limit reached" messages.

This is normal - script will auto-resume after waiting.

---

## 🎉 You're Ready!

Everything is set up. Now you just need to:

1. **Add your player**: `python src/manage_players.py add`
2. **Extract data**: `python src/extract_all_2024_2025.py`
3. **View dashboard**: `python -m http.server 8000`

That's it! Enjoy your analytics. 📊🎮

---

## 💬 Questions?

Check the documentation files listed above. Each covers different aspects:
- New user? → **SETUP_GUIDE.md**
- Quick commands? → **QUICK_REFERENCE.md**
- Full features? → **README.md**
- Technical details? → **IMPLEMENTATION_SUMMARY.md**

Happy analyzing! 🚀

