# Quick Start Guide - Fixed for 403 Error! 🎮

## The 403 Error Fix

The script has been **updated** to fix the 403 error. The issue was that Riot deprecated the old summoner name lookup endpoint.

### What Changed?

**OLD (Broken):** You entered just your summoner name
```
Enter summoner name: PlayerName
```

**NEW (Fixed):** You now need your **Riot ID** (GameName#TAG)
```
Enter your Riot ID (GameName#TAG): PlayerName#NA1
```

## Finding Your Riot ID

Your Riot ID is **NOT** just your summoner name! It has two parts separated by `#`:

### Method 1: League Client
1. Open League of Legends
2. Look at the **top right corner**
3. You'll see something like: `PlayerName#NA1`
4. That's your Riot ID!

### Method 2: op.gg
1. Go to [op.gg](https://www.op.gg)
2. Search for your account
3. Your Riot ID will be displayed at the top

### Method 3: Riot Account Page
1. Go to [account.riotgames.com](https://account.riotgames.com)
2. Sign in
3. Your Riot ID is shown on your profile

## Common Examples

| Region | Example Riot ID |
|--------|----------------|
| North America | `PlayerName#NA1` |
| Europe West | `PlayerName#EUW` |
| Korea | `PlayerName#KR1` |
| With numbers | `PlayerName#1234` |

**Note:** The tag (part after #) can be:
- Regional codes (NA1, EUW, KR1, etc.)
- Numbers (1234, 5678, etc.)
- Mixed (ABC1, XYZ9, etc.)

## Running the Script

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Run the script:**
```bash
python fetch_match_history.py
```

3. **Enter your information:**
```
Enter your Riot API key: RGAPI-xxxxxxxx-xxxx-xxxx
Enter your Riot ID (GameName#TAG): YourName#NA1
Enter region [default: na1]: na1
Number of games to fetch [default: 20]: 20
```

## API Key Issues

### Development Key
- **Get it:** [developer.riotgames.com](https://developer.riotgames.com/)
- **Expires:** After 24 hours
- **Solution:** Generate a new key daily

### If you still get 403:
1. ✅ Check your API key is fresh (< 24 hours old)
2. ✅ Make sure you copied the ENTIRE key
3. ✅ Use your Riot ID format: `GameName#TAG`
4. ✅ Try regenerating a new API key

## Still Having Issues?

### Error: "Failed to fetch account information"
→ Double-check your Riot ID format: must have `#` between name and tag

### Error: "404 Not Found"
→ Your Riot ID spelling or tag is incorrect

### Error: "Rate limited"
→ The script will automatically wait and retry

## Success! 🎉

When it works, you'll see:
```
Found summoner: PlayerName#NA1 (Level 156)

Fetching last 20 match IDs...
Found 20 matches. Fetching detailed data...
Fetching match 1/20: NA1_1234567890
...

✓ Successfully fetched 20 matches!
```

Your data will be saved to `match_history.json`!

