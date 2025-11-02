# Quick Start Guide

## 🎮 View Your Dashboard Now

### Step 1: Start Web Server
```bash
python -m http.server 8000
```

### Step 2: Open Dashboard
Visit: **http://localhost:8000/dashboard/static.html**

### Step 3: Explore Features
- **Click any match row** in the Match History table to expand
- See all 10 players with stats, items, and achievement badges
- Look for the **(YOU)** marker to find yourself
- Hover over badges to see descriptions

---

## 🆕 What's New in Phase 2

### ✨ Expandable Match Details
Click any match in the history table to reveal:
- **Blue Team** (5 players)
- **Red Team** (5 players)
- Full stats for each player
- 3-5 achievement badges per player
- Champion and item icons

### 🏆 Achievement Badges
15+ badge types automatically calculated:
- **Flawless Victory** - Win with 0 deaths
- **Pentakill** - Achieved a pentakill
- **Solo Carry** - Dealt >40% of team's damage
- **Team Player** - High kill participation
- **Vision Master** - Excellent vision score
- **Farming God** - Great CS numbers
- And many more!

Badges are color-coded:
- **Gold** - Rare/important achievements
- **Silver** - Notable achievements
- **Bronze** - Common achievements

---

## 📁 Project Structure

```
/Riot/
├── dashboard/          # Open static.html here
│   ├── static.html
│   ├── data-loader.js
│   └── badges.js
├── data/              # Generated CSV files
├── src/               # Python scripts
├── docs/              # Full documentation
└── archive/           # Old data files
```

---

## 🔄 Need Fresh Data?

### Option 1: Use Existing Data
If you already have match data:
```bash
cd src
python quick_test_dashboard.py
```

### Option 2: Fetch New Matches
```bash
cd src
python fetch_100_matches.py
python transform_to_star_schema.py --player-puuid YOUR_PUUID
```

---

## 📖 Full Documentation

See `docs/` for detailed information:
- **README.md** - Main project overview
- **USAGE.md** - Detailed usage instructions
- **PHASE2_COMPLETE.md** - Latest features
- **IMPLEMENTATION_SUMMARY.md** - Technical details

---

## 💡 Tips

### Performance
- Dashboard loads ~100 matches in 2-3 seconds
- Expandable rows animate smoothly
- Badge calculation is instant

### Navigation
- Use the filters at the top to focus on specific:
  - Time periods (Last 20, Last 50, All)
  - Queue types (All, Ranked, Normal)
  - Champions

### Understanding Your Stats
- **KDA** - Kill-Death-Assist ratio (higher is better)
- **CS/min** - Creep Score per minute (>7 is good)
- **Gold/min** - Gold per minute (>350 is solid)
- **Vision Score** - Ward coverage (>1.5x game length is good)
- **Kill Participation (KP)** - % of team kills you were involved in

---

## 🐛 Troubleshooting

### "Cannot load CSV files" or "No matches showing"
- Make sure you're using `http://localhost:8000` not `file://`
- Check that `data/*.csv` files exist (should have 9 CSV files)
- Verify you're accessing `http://localhost:8000/dashboard/static.html`
- Run `python src/transform_to_star_schema.py` if CSV files are missing
- Check browser console (F12) for specific error messages

### "No expandable details"
- Ensure `data/bridge_match_participants.csv` exists
- Re-run transformation script with latest version
- Check browser console for errors

### "Badge system not working"
- Verify `dashboard/badges.js` is loaded in HTML
- Check browser console for JavaScript errors
- Refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

---

## 🚀 Next Steps

1. **Explore the dashboard** - Click around, expand matches, compare stats
2. **Read documentation** - Check out `docs/README_ANALYTICS.md` for details
3. **Fetch more data** - Get additional matches for better insights
4. **Customize** - Edit badge definitions in `dashboard/badges.js`

---

## 🎉 Enjoy Your Analytics!

You now have a comprehensive, Mobalytics-style analytics dashboard running locally. All your match data, champion stats, and performance insights at your fingertips!

**Questions?** Check the docs folder or review the code comments.

