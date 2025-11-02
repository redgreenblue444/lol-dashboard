# League of Legends Match History Fetcher

A Python script to fetch and analyze your last 20 (or more) League of Legends games using the Riot Games API.

## Features

- Fetches detailed match data for your recent games
- Supports all major regions (NA, EUW, KR, etc.)
- Handles rate limiting automatically
- Saves complete match data to JSON
- Displays a readable summary of your matches
- Includes KDA, champion played, game duration, and more

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Get Your Riot API Key

1. Visit [Riot Developer Portal](https://developer.riotgames.com/)
2. Sign in with your Riot Games account
3. Generate a Development API Key (valid for 24 hours)
4. For a production key, you'll need to register an application

### 3. Set Your API Key (Optional)

You can set your API key as an environment variable to avoid entering it each time:

**On macOS/Linux:**
```bash
export RIOT_API_KEY="your-api-key-here"
```

**On Windows (PowerShell):**
```powershell
$env:RIOT_API_KEY="your-api-key-here"
```

## Usage

### Basic Usage

Run the script and follow the prompts:

```bash
python fetch_match_history.py
```

You'll be asked for:
- Your Riot API key (if not set as environment variable)
- Your Riot ID in the format `GameName#TAG` (e.g., `PlayerName#NA1`)
- Your region (default: na1)
- Number of games to fetch (default: 20)

### Finding Your Riot ID

Your Riot ID is **NOT** your old summoner name! It consists of:
- **Game Name**: Your display name
- **Tag**: A unique identifier (e.g., NA1, EUW, 1234)

**How to find it:**
1. Open your League of Legends client
2. Look at the top right corner - you'll see `GameName#TAG`
3. Or visit op.gg and search for your account
4. Or check your Riot account settings

### Supported Regions

- `na1` - North America
- `euw1` - Europe West
- `eun1` - Europe Nordic & East
- `kr` - Korea
- `br1` - Brazil
- `jp1` - Japan
- `ru` - Russia
- `oc1` - Oceania
- `tr1` - Turkey
- `la1` - Latin America North
- `la2` - Latin America South

### Example

```bash
$ python fetch_match_history.py
League of Legends Match History Fetcher
==================================================

Note: You need your Riot ID (GameName#TAG)
You can find this in your League client or on op.gg
Example: PlayerName#NA1

Enter your Riot API key: RGAPI-xxxx-xxxx-xxxx
Enter your Riot ID (GameName#TAG): PlayerName#NA1
Enter region (na1/euw1/eun1/kr/br1/jp1/ru/oc1/tr1/la1/la2) [default: na1]: na1
Number of games to fetch [default: 20]: 20
```

## Output

The script generates two types of output:

### 1. JSON File (`match_history.json`)

Complete match data saved in JSON format, including:
- All participant statistics
- Item builds
- Runes and summoner spells
- Timeline data
- Team compositions
- Game metadata

### 2. Console Summary

A readable summary showing:
- Match date and time
- Game duration
- Champion played
- Win/Loss result
- KDA (Kills/Deaths/Assists)
- Gold earned
- Damage to champions

## Using the Script Programmatically

You can also import and use the functions in your own Python scripts:

```python
from fetch_match_history import fetch_match_history, RiotAPIClient

# Fetch match history
api_key = "your-api-key"
game_name = "PlayerName"
tag_line = "NA1"
matches = fetch_match_history(api_key, game_name, tag_line, region='na1', num_games=20)

# Or use the client directly
client = RiotAPIClient(api_key, 'na1')
account = client.get_account_by_riot_id(game_name, tag_line)
match_ids = client.get_match_ids(account['puuid'], count=20)
```

## Rate Limits

The script automatically handles Riot API rate limits:
- **Development Key**: 20 requests/second, 100 requests/2 minutes
- **Production Key**: Higher limits (varies by key type)

The script will automatically pause and retry if rate limits are hit.

## Troubleshooting

### 403 Forbidden Error
This is the most common error! Causes:
- **Using old summoner name instead of Riot ID**: You MUST use `GameName#TAG` format
- **Expired API key**: Development keys expire after 24 hours - get a new one
- **Invalid API key**: Make sure you copied the entire key correctly

### "Failed to fetch account information"
- Check that your Riot ID is in the correct format: `GameName#TAG`
- The tag is case-sensitive (usually uppercase)
- Verify you're using the correct region
- Find your Riot ID in your League client or on op.gg

### "Rate limited"
- The script will automatically handle this and wait
- If you're hitting limits frequently, consider reducing the number of games fetched

### 404 Not Found Error
- Double-check your Riot ID spelling and tag
- Make sure you're in the right region
- Some very new accounts may not have match history yet

## Data Structure

Each match in the JSON file contains:
- `metadata`: Match ID, participants' PUUIDs
- `info`: Detailed game information
  - `participants`: Array of all 10 players with full statistics
  - `teams`: Team-level statistics
  - `gameCreation`, `gameDuration`, `gameMode`, etc.

## License

This project is for educational purposes. Respect Riot Games' API terms of service.

## Notes

- Development API keys expire after 24 hours
- For long-term use, consider applying for a production key
- Be respectful of rate limits
- The script complies with Riot Games API policies

