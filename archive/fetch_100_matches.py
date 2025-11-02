#!/usr/bin/env python3
"""
Enhanced League of Legends Match Fetcher
Fetches 100 matches from specific queue types with rate limiting and filtering.
"""

import requests
import json
import time
import os
from typing import List, Dict, Optional
from datetime import datetime


class RiotAPIClient:
    """Client for interacting with the Riot Games API."""
    
    # API Base URLs by region
    PLATFORM_URLS = {
        'na1': 'https://na1.api.riotgames.com',
        'euw1': 'https://euw1.api.riotgames.com',
        'eun1': 'https://eun1.api.riotgames.com',
        'kr': 'https://kr.api.riotgames.com',
        'br1': 'https://br1.api.riotgames.com',
        'jp1': 'https://jp1.api.riotgames.com',
        'ru': 'https://ru.api.riotgames.com',
        'oc1': 'https://oc1.api.riotgames.com',
        'tr1': 'https://tr1.api.riotgames.com',
        'la1': 'https://la1.api.riotgames.com',
        'la2': 'https://la2.api.riotgames.com',
    }
    
    # Regional routing values for match-v5
    REGIONAL_URLS = {
        'americas': 'https://americas.api.riotgames.com',
        'europe': 'https://europe.api.riotgames.com',
        'asia': 'https://asia.api.riotgames.com',
        'sea': 'https://sea.api.riotgames.com',
    }
    
    # Platform to regional routing mapping
    PLATFORM_TO_REGION = {
        'na1': 'americas',
        'br1': 'americas',
        'la1': 'americas',
        'la2': 'americas',
        'euw1': 'europe',
        'eun1': 'europe',
        'tr1': 'europe',
        'ru': 'europe',
        'kr': 'asia',
        'jp1': 'asia',
        'oc1': 'sea',
    }
    
    def __init__(self, api_key: str, platform: str = 'na1'):
        """
        Initialize the Riot API client.
        
        Args:
            api_key: Your Riot Games API key
            platform: Platform/region code (e.g., 'na1', 'euw1', 'kr')
        """
        self.api_key = api_key
        self.platform = platform.lower()
        self.platform_url = self.PLATFORM_URLS.get(self.platform)
        self.regional_url = self.REGIONAL_URLS.get(
            self.PLATFORM_TO_REGION.get(self.platform)
        )
        
        if not self.platform_url:
            raise ValueError(f"Invalid platform: {platform}")
        
        self.headers = {
            'X-Riot-Token': self.api_key
        }
        
        # Rate limiting tracking
        self.request_times = []
    
    def _rate_limit_check(self):
        """
        Check and enforce rate limits.
        Personal key limits: 20 requests/second, 100 requests/2 minutes
        """
        current_time = time.time()
        
        # Remove requests older than 2 minutes
        self.request_times = [t for t in self.request_times if current_time - t < 120]
        
        # Check 2-minute limit (100 requests)
        if len(self.request_times) >= 95:  # Use 95 to be safe
            sleep_time = 120 - (current_time - self.request_times[0]) + 1
            if sleep_time > 0:
                print(f"⏳ Rate limit: Sleeping for {sleep_time:.1f} seconds...")
                time.sleep(sleep_time)
                self.request_times = []
        
        # Check 1-second limit (20 requests)
        recent_requests = [t for t in self.request_times if current_time - t < 1]
        if len(recent_requests) >= 18:  # Use 18 to be safe
            time.sleep(1.1)
        
        self.request_times.append(current_time)
    
    def _make_request(self, url: str, retry_count: int = 0) -> Optional[Dict]:
        """
        Make an API request with rate limiting and error handling.
        
        Args:
            url: Full URL to request
            retry_count: Current retry attempt
            
        Returns:
            JSON response as dict, or None if error
        """
        self._rate_limit_check()
        
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:
                # Rate limited
                retry_after = int(response.headers.get('Retry-After', 10))
                print(f"⚠️  Rate limited. Retrying after {retry_after} seconds...")
                time.sleep(retry_after + 1)
                return self._make_request(url, retry_count)
            elif response.status_code == 404:
                return None
            elif response.status_code == 503 and retry_count < 3:
                # Service unavailable, retry with exponential backoff
                wait_time = 2 ** retry_count
                print(f"⚠️  Service unavailable. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                return self._make_request(url, retry_count + 1)
            else:
                print(f"❌ Error {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Request failed: {e}")
            if retry_count < 3:
                wait_time = 2 ** retry_count
                print(f"   Retrying in {wait_time}s...")
                time.sleep(wait_time)
                return self._make_request(url, retry_count + 1)
            return None
    
    def get_account_by_riot_id(self, game_name: str, tag_line: str) -> Optional[Dict]:
        """
        Get account information by Riot ID (game name + tagline).
        
        Args:
            game_name: The account's game name (e.g., "PlayerName")
            tag_line: The account's tagline (e.g., "NA1")
            
        Returns:
            Account data dict with puuid or None
        """
        url = f"{self.regional_url}/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
        return self._make_request(url)
    
    def get_summoner_by_puuid(self, puuid: str) -> Optional[Dict]:
        """
        Get summoner information by PUUID.
        
        Args:
            puuid: The account's PUUID
            
        Returns:
            Summoner data dict or None
        """
        url = f"{self.platform_url}/lol/summoner/v4/summoners/by-puuid/{puuid}"
        return self._make_request(url)
    
    def get_match_ids(self, puuid: str, start: int = 0, count: int = 100, 
                      queue: Optional[int] = None) -> Optional[List[str]]:
        """
        Get list of match IDs for a summoner.
        
        Args:
            puuid: The summoner's PUUID
            start: Starting index for pagination
            count: Number of matches to retrieve (max 100)
            queue: Optional queue ID to filter by
            
        Returns:
            List of match IDs or None
        """
        url = f"{self.regional_url}/lol/match/v5/matches/by-puuid/{puuid}/ids?start={start}&count={count}"
        if queue:
            url += f"&queue={queue}"
        return self._make_request(url)
    
    def get_match_details(self, match_id: str) -> Optional[Dict]:
        """
        Get detailed information about a specific match.
        
        Args:
            match_id: The match ID
            
        Returns:
            Match data dict or None
        """
        url = f"{self.regional_url}/lol/match/v5/matches/{match_id}"
        return self._make_request(url)


def fetch_filtered_matches(api_key: str, game_name: str, tag_line: str, 
                           region: str = 'na1', target_count: int = 100,
                           allowed_queues: List[int] = [400, 420]) -> List[Dict]:
    """
    Fetch matches filtered by queue type.
    
    Args:
        api_key: Your Riot Games API key
        game_name: The account's game name (before the #)
        tag_line: The account's tagline (after the #)
        region: Platform/region code
        target_count: Target number of filtered matches to fetch
        allowed_queues: List of queue IDs to include (400=Draft Normal, 420=Ranked Solo)
        
    Returns:
        List of match data dictionaries
    """
    client = RiotAPIClient(api_key, region)
    
    print(f"🔍 Fetching account information for: {game_name}#{tag_line}")
    account = client.get_account_by_riot_id(game_name, tag_line)
    
    if not account:
        print("❌ Failed to fetch account information.")
        print("   Make sure you're using your Riot ID (GameName#TAG)")
        return []
    
    puuid = account['puuid']
    
    # Get additional summoner info
    summoner = client.get_summoner_by_puuid(puuid)
    if summoner:
        print(f"✅ Found summoner: {account['gameName']}#{account['tagLine']} (Level {summoner['summonerLevel']})")
    else:
        print(f"✅ Found account: {account['gameName']}#{account['tagLine']}")
    
    print(f"\n🎯 Target: {target_count} matches from queues {allowed_queues}")
    print(f"   Queue 400 = Draft Normal")
    print(f"   Queue 420 = Ranked Solo/Duo\n")
    
    filtered_matches = []
    start_index = 0
    batch_size = 100
    total_fetched = 0
    
    # Keep fetching until we have enough filtered matches
    while len(filtered_matches) < target_count:
        print(f"📥 Fetching match IDs (batch starting at {start_index})...")
        match_ids = client.get_match_ids(puuid, start=start_index, count=batch_size)
        
        if not match_ids:
            print(f"⚠️  No more matches available. Total found: {len(filtered_matches)}")
            break
        
        print(f"   Retrieved {len(match_ids)} match IDs")
        
        # Fetch details for each match and filter
        for i, match_id in enumerate(match_ids, 1):
            if len(filtered_matches) >= target_count:
                break
            
            total_fetched += 1
            match_data = client.get_match_details(match_id)
            
            if match_data:
                queue_id = match_data['info'].get('queueId')
                
                if queue_id in allowed_queues:
                    filtered_matches.append(match_data)
                    queue_name = "Ranked Solo" if queue_id == 420 else "Draft Normal"
                    print(f"✅ [{len(filtered_matches)}/{target_count}] {match_id} - {queue_name}")
                else:
                    print(f"⏭️  [{total_fetched}] {match_id} - Skipped (queue {queue_id})")
            else:
                print(f"❌ [{total_fetched}] Failed to fetch: {match_id}")
        
        # Move to next batch
        start_index += batch_size
        
        # Safety check to avoid infinite loop
        if start_index > 1000:
            print(f"⚠️  Reached maximum fetch limit (1000 matches checked)")
            break
    
    print(f"\n{'='*60}")
    print(f"✅ Successfully fetched {len(filtered_matches)} filtered matches!")
    print(f"   Total matches checked: {total_fetched}")
    print(f"{'='*60}\n")
    
    return filtered_matches


def save_match_data(matches: List[Dict], filename: str = 'raw_matches.json'):
    """
    Save match data to a JSON file.
    
    Args:
        matches: List of match data dictionaries
        filename: Output filename
    """
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(matches, f, indent=2, ensure_ascii=False)
    print(f"💾 Match data saved to: {filename}")


def print_match_summary(matches: List[Dict], puuid: str):
    """
    Print a summary of the matches.
    
    Args:
        matches: List of match data dictionaries
        puuid: The summoner's PUUID to identify their stats
    """
    print("\n" + "="*80)
    print("MATCH SUMMARY")
    print("="*80)
    
    # Count by queue
    queue_counts = {}
    total_wins = 0
    
    for match in matches:
        info = match['info']
        queue_id = info.get('queueId')
        queue_counts[queue_id] = queue_counts.get(queue_id, 0) + 1
        
        # Find player data
        for participant in info['participants']:
            if participant['puuid'] == puuid:
                if participant['win']:
                    total_wins += 1
                break
    
    print(f"\nTotal matches: {len(matches)}")
    print(f"Win rate: {total_wins}/{len(matches)} ({100*total_wins/len(matches):.1f}%)")
    print(f"\nBy queue type:")
    for queue_id, count in sorted(queue_counts.items()):
        queue_name = "Ranked Solo/Duo" if queue_id == 420 else "Draft Normal"
        print(f"  {queue_name} (ID {queue_id}): {count} matches")


def main():
    """Main function to run the script."""
    print("="*60)
    print("League of Legends Match Fetcher (Filtered)")
    print("="*60)
    print("\n📋 This script fetches 100 matches from:")
    print("   - Queue 400: Draft Normal")
    print("   - Queue 420: Ranked Solo/Duo")
    print("\n🔑 You need your Riot ID (GameName#TAG)")
    print("   Find it in your League client or on op.gg")
    print("   Example: PlayerName#NA1\n")
    
    # Get API key from environment variable or user input
    api_key = os.environ.get('RIOT_API_KEY')
    if not api_key:
        api_key = input("Enter your Riot API key: ").strip()
    
    # Get Riot ID
    riot_id = input("Enter your Riot ID (GameName#TAG): ").strip()
    
    # Parse Riot ID
    if '#' not in riot_id:
        print("\n⚠️  Invalid format! Please use: GameName#TAG")
        print("   Example: PlayerName#NA1")
        return
    
    game_name, tag_line = riot_id.split('#', 1)
    
    region_input = input("Enter region (na1/euw1/eun1/kr/br1/jp1/ru/oc1/tr1/la1/la2) [default: na1]: ").strip()
    region = region_input.lower() if region_input else 'na1'
    
    target_count_input = input("Number of filtered matches to fetch [default: 100]: ").strip()
    target_count = int(target_count_input) if target_count_input else 100
    
    print("\n" + "="*60)
    
    # Fetch filtered match history
    matches = fetch_filtered_matches(api_key, game_name, tag_line, region, target_count)
    
    if matches:
        # Save to file
        save_match_data(matches, 'raw_matches.json')
        
        # Print summary
        client = RiotAPIClient(api_key, region)
        account = client.get_account_by_riot_id(game_name, tag_line)
        if account:
            print_match_summary(matches, account['puuid'])
        
        print(f"\n✅ Done! Ready for transformation to star schema.")
    else:
        print("\n❌ No matches were fetched.")


if __name__ == "__main__":
    main()

