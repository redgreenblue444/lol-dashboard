# League of Legends Performance Analytics Dashboard

An in-depth analytics dashboard for League of Legends performance analysis using a Kimball dimensional model and static HTML visualization.

## 🎯 Overview

This system provides comprehensive performance analytics by:
- Fetching match data from Riot Games API
- Transforming it into a Kimball star schema (dimensional model)
- Presenting interactive visualizations in a static HTML dashboard

## 📊 Features

### Data Collection
- Fetches 100 matches from Queue IDs 400 (Draft Normal) and 420 (Ranked Solo/Duo)
- Automatic rate limiting and pagination handling
- Filters to only relevant game modes
- Progress tracking with resume capability

### Data Architecture
Uses a **Kimball Dimensional Model (Star Schema)**:

**Fact Table:**
- `fact_matches.csv` - Core performance metrics (kills, deaths, assists, gold, damage, CS, vision, etc.)

**Dimension Tables:**
- `dim_champion.csv` - Champion information
- `dim_date.csv` - Date/time dimensions with day of week, hour, etc.
- `dim_queue.csv` - Queue type information
- `dim_rune.csv` - Rune configurations
- `dim_items.csv` - Item catalog
- `bridge_match_items.csv` - Many-to-many relationship between matches and items
- `dim_match_metadata.csv` - Additional match information

### Dashboard Sections

#### 1. **Performance Overview**
- Total games, win rate, average KDA
- Average CS/min and vision score
- Win rate trend over time
- KDA progression chart
- Overall performance radar chart

#### 2. **Champion Analysis**
- Best performing champions (by win rate)
- Most played champions
- Champions needing improvement
- Detailed champion statistics table (sortable)
- Per-champion KDA, CS, gold, and damage metrics

#### 3. **Combat Performance**
- Damage dealt and taken trends
- Kill participation rate over time
- Multi-kill statistics (double, triple, quadra, penta)
- Solo kills tracking

#### 4. **Economy & Farming**
- Gold per minute trends
- CS per minute progression
- Farm efficiency analysis

#### 5. **Vision & Map Control**
- Vision score trends
- Wards placed, destroyed, and control wards purchased
- Vision contribution analysis

#### 6. **Items & Builds**
- Most common item builds by champion
- Win rate correlations with builds
- Build path analysis

#### 7. **Runes Analysis**
- Most used rune setups
- Rune effectiveness by champion
- Win rate by rune configuration

#### 8. **Match History**
- Detailed match-by-match breakdown
- Sortable columns
- Color-coded win/loss
- Complete statistics per game

#### 9. **Trends & Insights**
- Current win/loss streaks
- Longest streaks identification
- Performance by day of week
- Performance by hour of day
- Automated insights (strengths & weaknesses)

### Filters
- **Time Period**: All / Last 20 / Last 50 matches
- **Queue Type**: All / Ranked Solo/Duo / Draft Normal
- **Champion**: Filter by specific champion

## 🚀 Quick Start

### Step 1: Fetch Match Data

```bash
# Set your API key (optional)
export RIOT_API_KEY="your-api-key"

# Fetch 100 filtered matches
python fetch_100_matches.py
```

You'll be prompted for:
- Your Riot API key (if not set as environment variable)
- Your Riot ID (GameName#TAG)
- Region (default: na1)
- Number of matches (default: 100)

This creates `raw_matches.json` with 100 matches from queues 400 and 420.

### Step 2: Transform to Star Schema

```bash
python transform_to_star_schema.py
```

This processes `raw_matches.json` and generates:
- `data/fact_matches.csv`
- `data/dim_champion.csv`
- `data/dim_date.csv`
- `data/dim_queue.csv`
- `data/dim_rune.csv`
- `data/dim_items.csv`
- `data/bridge_match_items.csv`
- `data/dim_match_metadata.csv`

### Step 3: View Dashboard

Open `static.html` in your web browser:

```bash
# On macOS
open static.html

# On Linux
xdg-open static.html

# On Windows
start static.html
```

Or use a local web server (recommended for better CORS handling):

```bash
# Python 3
python -m http.server 8000

# Then visit: http://localhost:8000/static.html
```

## 📁 File Structure

```
/Users/x/Projects/Riot/
├── fetch_match_history.py        # Original 20-match fetcher
├── fetch_100_matches.py          # Enhanced fetcher (100 matches, filtered)
├── transform_to_star_schema.py   # ETL script for star schema
├── static.html                   # Dashboard UI
├── data-loader.js                # Analytics engine
├── match_history.json            # Original match data (20 matches)
├── raw_matches.json              # Filtered match data (100 matches)
├── data/
│   ├── fact_matches.csv          # Fact table
│   ├── dim_champion.csv          # Champion dimension
│   ├── dim_date.csv              # Date dimension
│   ├── dim_queue.csv             # Queue dimension
│   ├── dim_rune.csv              # Rune dimension
│   ├── dim_items.csv             # Item dimension
│   ├── bridge_match_items.csv    # Match-Items bridge
│   └── dim_match_metadata.csv    # Match metadata
├── requirements.txt              # Python dependencies
├── README.md                     # General documentation
└── README_ANALYTICS.md           # This file
```

## 🔧 Technical Details

### Data Architecture: Kimball Star Schema

The star schema provides:
- **Clean separation** of facts (measurements) and dimensions (attributes)
- **Easy slicing** by any dimension (champion, date, queue)
- **Efficient aggregations** for analytics
- **Extensibility** without modifying existing tables
- **Industry-standard** analytics pattern

**Grain:** One row per match played by the player

### Technology Stack

**Backend:**
- Python 3.x
- Riot Games API
- PapaParse (CSV parsing)

**Frontend:**
- HTML5
- Tailwind CSS (via CDN)
- Vanilla JavaScript (no frameworks)
- Chart.js (visualizations)
- PapaParse (CSV parsing)

### Key Metrics Tracked

| Category | Metrics |
|----------|---------|
| **Combat** | Kills, Deaths, Assists, KDA, Kill Participation, Multi-kills |
| **Economy** | Gold Earned, Gold/min, Gold Efficiency |
| **Farming** | Total CS, CS/min, CS @10min, CS @20min |
| **Damage** | Damage Dealt, Damage Taken, Damage/min |
| **Vision** | Vision Score, Wards Placed, Wards Destroyed, Control Wards |
| **Objectives** | Turret Kills, Inhibitor Kills, Solo Kills |
| **Meta** | Game Duration, Queue Type, Champion, Role, Date/Time |

## 🎨 Dashboard Features

### Interactive Filters
- Real-time filtering across all sections
- Multiple filter combinations
- Maintains data consistency across charts

### Responsive Design
- Mobile-friendly layout
- Collapsible sections
- Touch-optimized charts
- Smooth scrolling

### Performance
- Lazy loading for charts
- Efficient data aggregation
- Client-side only (no backend required)
- Fast CSV parsing with PapaParse

### Visualizations
- 11+ interactive charts
- Rolling averages
- Trend analysis
- Performance distributions
- Comparative metrics

## 📈 Use Cases

1. **Performance Tracking**: Monitor improvement over time
2. **Champion Analysis**: Identify strongest/weakest champions
3. **Meta Insights**: Understand when you perform best
4. **Build Optimization**: Analyze item/rune effectiveness
5. **Habit Formation**: Recognize patterns in wins vs losses
6. **Goal Setting**: Track specific metrics (CS, vision, KDA)

## 🔒 Data Privacy

- All data is stored locally
- No external data transmission (except Riot API)
- Static dashboard runs entirely in browser
- Your match data never leaves your machine

## 🐛 Troubleshooting

### "Failed to load data"
- Ensure CSV files exist in `data/` directory
- Run `transform_to_star_schema.py` first
- Check browser console for errors

### Charts not rendering
- Use a local web server instead of opening file directly
- Check browser supports ES6 JavaScript
- Ensure CDN scripts (Chart.js, PapaParse) can load

### No matches found
- Verify queue IDs 400 or 420 in your match history
- Try increasing fetch count
- Check API key validity

### Rate limiting
- Script automatically handles rate limits
- Wait times are normal for large datasets
- Consider running overnight for 100+ matches

## 📝 Future Enhancements

Potential additions:
- Historical comparison (month-over-month)
- Lane opponent analysis
- Team composition insights
- Live game predictions
- Export reports to PDF
- Data Dragon integration for item/champion names
- Rank progression tracking (requires LEAGUE-V4 API)

## 🙏 Credits

- **Riot Games API**: Match data source
- **Chart.js**: Visualization library
- **Tailwind CSS**: UI framework
- **PapaParse**: CSV parsing

## 📜 License

This project is for educational and personal use. Please respect Riot Games' API Terms of Service.

---

**Note**: Development API keys expire after 24 hours. For long-term use, consider applying for a production API key from Riot Games.

