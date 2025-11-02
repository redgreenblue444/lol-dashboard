#!/usr/bin/env python3
"""
League of Legends Match History Fetcher
Retrieves detailed game data for the last 20 matches of a summoner.
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
        if len(self.request_times) >= 100:
            sleep_time = 120 - (current_time - self.request_times[0])
            if sleep_time > 0:
                print(f"Rate limit: Sleeping for {sleep_time:.2f} seconds...")
                time.sleep(sleep_time)
                self.request_times = []
        
        # Check 1-second limit (20 requests)
        recent_requests = [t for t in self.request_times if current_time - t < 1]
        if len(recent_requests) >= 20:
            time.sleep(1.1)
        
        self.request_times.append(current_time)
    
    def _make_request(self, url: str) -> Optional[Dict]:
        """
        Make an API request with rate limiting and error handling.
        
        Args:
            url: Full URL to request
            
        Returns:
            JSON response as dict, or None if error
        """
        self._rate_limit_check()
        
        try:
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:
                # Rate limited
                retry_after = int(response.headers.get('Retry-After', 10))
                print(f"Rate limited. Retrying after {retry_after} seconds...")
                time.sleep(retry_after)
                return self._make_request(url)
            elif response.status_code == 404:
                print(f"Resource not found: {url}")
                return None
            else:
                print(f"Error {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            print(f"Request failed: {e}")
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
    
    def get_match_ids(self, puuid: str, count: int = 20) -> Optional[List[str]]:
        """
        Get list of match IDs for a summoner.
        
        Args:
            puuid: The summoner's PUUID
            count: Number of matches to retrieve (max 100)
            
        Returns:
            List of match IDs or None
        """
        url = f"{self.regional_url}/lol/match/v5/matches/by-puuid/{puuid}/ids?count={count}"
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


def fetch_match_history(api_key: str, game_name: str, tag_line: str, 
                       region: str = 'na1', num_games: int = 20) -> List[Dict]:
    """
    Fetch match history for a summoner.
    
    Args:
        api_key: Your Riot Games API key
        game_name: The account's game name (before the #)
        tag_line: The account's tagline (after the #)
        region: Platform/region code
        num_games: Number of games to fetch (default: 20)
        
    Returns:
        List of match data dictionaries
    """
    client = RiotAPIClient(api_key, region)
    
    print(f"Fetching account information for: {game_name}#{tag_line}")
    account = client.get_account_by_riot_id(game_name, tag_line)
    
    if not account:
        print("Failed to fetch account information.")
        print("Make sure you're using your Riot ID (GameName#TAG)")
        return []
    
    puuid = account['puuid']
    
    # Get additional summoner info
    summoner = client.get_summoner_by_puuid(puuid)
    if summoner:
        print(f"Found summoner: {account['gameName']}#{account['tagLine']} (Level {summoner['summonerLevel']})")
    else:
        print(f"Found account: {account['gameName']}#{account['tagLine']}")
    
    print(f"\nFetching last {num_games} match IDs...")
    match_ids = client.get_match_ids(puuid, num_games)
    
    if not match_ids:
        print("No matches found.")
        return []
    
    print(f"Found {len(match_ids)} matches. Fetching detailed data...")
    
    matches = []
    for i, match_id in enumerate(match_ids, 1):
        print(f"Fetching match {i}/{len(match_ids)}: {match_id}")
        match_data = client.get_match_details(match_id)
        
        if match_data:
            matches.append(match_data)
        else:
            print(f"Failed to fetch match: {match_id}")
    
    return matches


def save_match_data(matches: List[Dict], filename: str = 'match_history.json'):
    """
    Save match data to a JSON file.
    
    Args:
        matches: List of match data dictionaries
        filename: Output filename
    """
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(matches, f, indent=2, ensure_ascii=False)
    print(f"\nMatch data saved to: {filename}")


def print_match_summary(matches: List[Dict], puuid: str):
    """
    Print a summary of the matches.
    
    Args:
        matches: List of match data dictionaries
        puuid: The summoner's PUUID to identify their stats
    """
    print("\n" + "="*80)
    print("MATCH HISTORY SUMMARY")
    print("="*80)
    
    for i, match in enumerate(matches, 1):
        info = match['info']
        
        # Find the player's participant data
        player_data = None
        for participant in info['participants']:
            if participant['puuid'] == puuid:
                player_data = participant
                break
        
        if not player_data:
            continue
        
        game_duration = info['gameDuration']
        game_date = datetime.fromtimestamp(info['gameCreation'] / 1000)
        
        win_status = "WIN" if player_data['win'] else "LOSS"
        kda = f"{player_data['kills']}/{player_data['deaths']}/{player_data['assists']}"
        
        print(f"\nMatch {i}: {match['metadata']['matchId']}")
        print(f"  Date: {game_date.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  Duration: {game_duration // 60}m {game_duration % 60}s")
        print(f"  Champion: {player_data['championName']}")
        print(f"  Result: {win_status}")
        print(f"  KDA: {kda}")
        print(f"  Gold: {player_data['goldEarned']:,}")
        print(f"  Damage to Champions: {player_data['totalDamageDealtToChampions']:,}")


def main():
    """Main function to run the script."""
    print("League of Legends Match History Fetcher")
    print("=" * 50)
    print("\nNote: You need your Riot ID (GameName#TAG)")
    print("You can find this in your League client or on op.gg")
    print("Example: PlayerName#NA1\n")
    
    # Get API key from environment variable or user input
    api_key = os.environ.get('RIOT_API_KEY')
    if not api_key:
        api_key = input("Enter your Riot API key: ").strip()
    
    # Get Riot ID
    riot_id = input("Enter your Riot ID (GameName#TAG): ").strip()
    
    # Parse Riot ID
    if '#' not in riot_id:
        print("\n⚠️  Invalid format! Please use: GameName#TAG")
        print("Example: PlayerName#NA1")
        return
    
    game_name, tag_line = riot_id.split('#', 1)
    
    region_input = input("Enter region (na1/euw1/eun1/kr/br1/jp1/ru/oc1/tr1/la1/la2) [default: na1]: ").strip()
    region = region_input.lower() if region_input else 'na1'
    
    num_games_input = input("Number of games to fetch [default: 20]: ").strip()
    num_games = int(num_games_input) if num_games_input else 20
    
    print("\n" + "="*50)
    
    # Fetch match history
    matches = fetch_match_history(api_key, game_name, tag_line, region, num_games)
    
    if matches:
        # Save to file
        save_match_data(matches, 'match_history.json')
        
        # Print summary
        client = RiotAPIClient(api_key, region)
        account = client.get_account_by_riot_id(game_name, tag_line)
        if account:
            print_match_summary(matches, account['puuid'])
        
        print(f"\n✓ Successfully fetched {len(matches)} matches!")
    else:
        print("\n✗ No matches were fetched.")


if __name__ == "__main__":
    main()

