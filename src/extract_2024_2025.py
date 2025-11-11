#!/usr/bin/env python3
"""
League of Legends Match Data Extractor (2024-2025)
Extracts all matches from 2024 and 2025, organized by month
"""

import json
import os
import sys
import time
import requests
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

API_KEY_FILE = Path(__file__).parent.parent / ".env"
PLAYERS_FILE = Path(__file__).parent.parent / "players.json"

# Target queues
TARGET_QUEUES = [400, 420]  # Draft Normal, Ranked Solo/Duo

# Months to extract (Jan 2024 - Nov 2025)
MONTHS = {
    "2024-01": (1704067200000, 1706745599999),  # Jan 1-31, 2024
    "2024-02": (1706745600000, 1709251199999),  # Feb 1-29, 2024 (leap year)
    "2024-03": (1709251200000, 1711929599999),  # Mar 1-31, 2024
    "2024-04": (1711929600000, 1714521599999),  # Apr 1-30, 2024
    "2024-05": (1714521600000, 1717199999999),  # May 1-31, 2024
    "2024-06": (1717200000000, 1719791999999),  # Jun 1-30, 2024
    "2024-07": (1719792000000, 1722470399999),  # Jul 1-31, 2024
    "2024-08": (1722470400000, 1725148799999),  # Aug 1-31, 2024
    "2024-09": (1725148800000, 1727740799999),  # Sep 1-30, 2024
    "2024-10": (1727740800000, 1730419199999),  # Oct 1-31, 2024
    "2024-11": (1730419200000, 1733011199999),  # Nov 1-30, 2024
    "2024-12": (1733011200000, 1735689599999),  # Dec 1-31, 2024
    "2025-01": (1735689600000, 1738367999999),  # Jan 1-31, 2025
    "2025-02": (1738368000000, 1740787199999),  # Feb 1-28, 2025
    "2025-03": (1740787200000, 1743465599999),  # Mar 1-31, 2025
    "2025-04": (1743465600000, 1746057599999),  # Apr 1-30, 2025
    "2025-05": (1746057600000, 1748735999999),  # May 1-31, 2025
    "2025-06": (1748736000000, 1751327999999),  # Jun 1-30, 2025
    "2025-07": (1751328000000, 1754006399999),  # Jul 1-31, 2025
    "2025-08": (1754006400000, 1756684799999),  # Aug 1-31, 2025
    "2025-09": (1756684800000, 1759276799999),  # Sep 1-30, 2025
    "2025-10": (1759276800000, 1761955199999),  # Oct 1-31, 2025
    "2025-11": (1761955200000, 1764547199999),  # Nov 1-30, 2025
}


class RiotAPIClient:
    """Riot API client with con§ative rate limiting"""
    
    def __init__(self, api_key: str, region: str = "americas"):
        self.api_key = api_key
        self.region = region
        self.headers = {"X-Riot-Token": api_key}
        
        # Very conservative rate limiting
        self.calls = []
        self.max_calls = 80  # Conservative buffer
        self.window = 120  # seconds
        self.min_delay = 0.5  # Minimum 500ms between calls
        self.last_call = 0
        
    def _wait_if_needed(self):
        """Enforce rate limiting"""
        now = time.time()
        
        # Minimum delay between calls
        time_since_last = now - self.last_call
        if time_since_last < self.min_delay:
            time.sleep(self.min_delay - time_since_last)
            now = time.time()
        
        # Remove old calls
        self.calls = [t for t in self.calls if now - t < self.window]
        
        # Wait if at limit
        if len(self.calls) >= self.max_calls:
            oldest = self.calls[0]
            wait_time = self.window - (now - oldest) + 5
            if wait_time > 0:
                print(f"  ⏳ Rate limit reached. Waiting {wait_time:.0f}s...")
                time.sleep(wait_time)
                self.calls = []
                now = time.time()
        
        self.calls.append(now)
        self.last_call = now
    
    def get_match_ids(self, puuid: str, start_time: int, end_time: int,
                      start: int = 0, count: int = 100, queue: Optional[int] = None) -> List[str]:
        """Fetch match IDs with retry logic"""
        max_retries = 5
        base_delay = 60
        
        for attempt in range(max_retries):
            self._wait_if_needed()
            
            url = f"https://{self.region}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
            params = {
                "startTime": start_time // 1000,
                "endTime": end_time // 1000,
                "start": start,
                "count": count
            }
            if queue:
                params["queue"] = queue
            
            try:
                response = requests.get(url, headers=self.headers, params=params)
                
                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', base_delay * (attempt + 1)))
                    print(f"  ⚠️  Rate limited! Waiting {retry_after}s...")
                    time.sleep(retry_after)
                    continue
                
                response.raise_for_status()
                return response.json()
                
            except requests.exceptions.RequestException as e:
                if attempt < max_retries - 1:
                    delay = base_delay * (attempt + 1)
                    print(f"  ⚠️  Error: {e}. Retrying in {delay}s...")
                    time.sleep(delay)
                else:
                    print(f"  ❌ Failed after {max_retries} attempts")
                    return []
        
        return []
    
    def get_match_details(self, match_id: str) -> Optional[Dict]:
        """Fetch match details with retry logic"""
        max_retries = 5
        base_delay = 60
        
        for attempt in range(max_retries):
            self._wait_if_needed()
            
            url = f"https://{self.region}.api.riotgames.com/lol/match/v5/matches/{match_id}"
            
            try:
                response = requests.get(url, headers=self.headers)
                
                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', base_delay * (attempt + 1)))
                    print(f"\n  ⚠️  Rate limited! Pausing for {retry_after}s...")
                    time.sleep(retry_after)
                    continue
                
                response.raise_for_status()
                return response.json()
                
            except requests.exceptions.RequestException as e:
                if attempt < max_retries - 1:
                    delay = base_delay * (attempt + 1)
                    print(f"\n  ⚠️  Error: {e}. Retrying in {delay}s...")
                    time.sleep(delay)
                else:
                    print(f"\n  ❌ Failed after {max_retries} attempts")
                    return None
        
        return None


def load_api_key() -> str:
    """Load Riot API key"""
    if not API_KEY_FILE.exists():
        print("Error: .env file not found")
        sys.exit(1)
    
    with open(API_KEY_FILE) as f:
        for line in f:
            if line.startswith('RIOT_API_KEY='):
                return line.strip().split('=', 1)[1]
    
    print("Error: RIOT_API_KEY not found in .env")
    sys.exit(1)


def load_players() -> Dict:
    """Load players configuration"""
    if not PLAYERS_FILE.exists():
        print(f"Error: {PLAYERS_FILE} not found")
        sys.exit(1)
    
    with open(PLAYERS_FILE) as f:
        return json.load(f)


def extract_month(client: RiotAPIClient, puuid: str, player_id: str,
                  month_key: str, start_time: int, end_time: int) -> int:
    """Extract matches for a specific month"""
    data_dir = Path(f"data/{player_id}")
    data_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = data_dir / f"raw_matches_{month_key}.json"
    
    print(f"\n📅 Extracting {month_key}...")
    
    all_matches = []
    
    # Extract for each queue
    for queue in TARGET_QUEUES:
        queue_name = "Draft Normal" if queue == 400 else "Ranked Solo/Duo"
        print(f"  🎮 Queue: {queue_name} ({queue})")
        
        start_index = 0
        while True:
            match_ids = client.get_match_ids(puuid, start_time, end_time, start_index, 100, queue)
            
            if not match_ids:
                break
            
            print(f"    Found {len(match_ids)} match IDs (offset {start_index})")
            
            # Fetch details for each match
            for i, match_id in enumerate(match_ids, 1):
                print(f"    Fetching match {i}/{len(match_ids)}: {match_id}                    ", end='\r')
                
                match_data = client.get_match_details(match_id)
                if match_data:
                    # Verify correct queue and timeframe
                    info = match_data.get('info', {})
                    if info.get('queueId') == queue and start_time <= info.get('gameCreation', 0) <= end_time:
                        all_matches.append(match_data)
                        
                        # Save progress every 20 matches
                        if len(all_matches) % 20 == 0:
                            with open(output_file, 'w') as f:
                                json.dump(all_matches, f, indent=2)
                            print(f"    💾 Progress saved: {len(all_matches)} matches                    ", end='\r')
            
            print()  # New line
            
            # Check if more matches exist
            if len(match_ids) < 100:
                break
            
            start_index += 100
    
    # Save final results
    with open(output_file, 'w') as f:
        json.dump(all_matches, f, indent=2)
    
    print(f"  ✅ Extracted {len(all_matches)} matches")
    return len(all_matches)


def extract_player(player: Dict, api_key: str) -> int:
    """Extract all data for a player"""
    player_id = player['id']
    puuid = player['puuid']
    region = player['region']
    
    print(f"\n{'='*70}")
    print(f"👤 Player: {player['display_name']} ({player['riot_id']})")
    print(f"   ID: {player_id}")
    print(f"   Region: {region}")
    print(f"{'='*70}")
    
    client = RiotAPIClient(api_key, region)
    
    total_matches = 0
    
    # Extract each month
    for month_key, (start_time, end_time) in MONTHS.items():
        try:
            match_count = extract_month(client, puuid, player_id, month_key, start_time, end_time)
            total_matches += match_count
        except Exception as e:
            print(f"  ❌ Error extracting {month_key}: {e}")
            continue
    
    print(f"\n{'='*70}")
    print(f"✅ Extraction complete for {player['display_name']}")
    print(f"   Total matches: {total_matches}")
    print(f"{'='*70}")
    
    return total_matches


def main():
    """Main function"""
    api_key = load_api_key()
    players_data = load_players()
    
    if not players_data['players']:
        print("No players configured.")
        sys.exit(1)
    
    print("="*70)
    print(" League of Legends - Extract 2024-2025 Matches")
    print("="*70)
    print(f"\n📋 Players: {len(players_data['players'])}")
    for p in players_data['players']:
        print(f"   • {p['display_name']} ({p['riot_id']})")
    print()
    
    total_matches = 0
    
    for i, player in enumerate(players_data['players'], 1):
        print(f"\n{'='*70}")
        print(f" Player {i}/{len(players_data['players'])}: {player['display_name']}")
        print(f"{'='*70}")
        
        try:
            count = extract_player(player, api_key)
            total_matches += count
        except Exception as e:
            print(f"❌ Error: {e}")
            continue
    
    print("\n" + "="*70)
    print("🎉 Extraction Complete!")
    print(f"📊 Total matches: {total_matches}")
    print("="*70)
    print("\nNext: Transform data")
    print("  python src/transform_player_data.py")


if __name__ == "__main__":
    main()

