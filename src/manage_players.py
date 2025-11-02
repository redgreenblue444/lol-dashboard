#!/usr/bin/env python3
"""
Player Management CLI for League of Legends Analytics
Manages players.json configuration file
"""

import json
import os
import sys
import requests
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

PLAYERS_FILE = Path(__file__).parent.parent / "players.json"
API_KEY_FILE = Path(__file__).parent.parent / ".env"


def load_api_key():
    """Load Riot API key from .env file"""
    if not API_KEY_FILE.exists():
        print("Error: .env file not found. Please create it with RIOT_API_KEY=your_key")
        sys.exit(1)
    
    with open(API_KEY_FILE) as f:
        for line in f:
            if line.startswith('RIOT_API_KEY='):
                return line.strip().split('=', 1)[1]
    
    print("Error: RIOT_API_KEY not found in .env file")
    sys.exit(1)


def load_players():
    """Load players from JSON file"""
    if not PLAYERS_FILE.exists():
        return {"players": []}
    
    with open(PLAYERS_FILE, 'r') as f:
        return json.load(f)


def save_players(data):
    """Save players to JSON file"""
    with open(PLAYERS_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"✓ Saved to {PLAYERS_FILE}")


def fetch_puuid(riot_id, region, api_key):
    """Fetch PUUID from Riot ID (GameName#TAG)"""
    if '#' not in riot_id:
        print("Error: Riot ID must be in format GameName#TAG")
        return None
    
    game_name, tag_line = riot_id.split('#', 1)
    
    # Use ACCOUNT-V1 endpoint
    url = f"https://{region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
    headers = {"X-Riot-Token": api_key}
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data['puuid']
    except requests.exceptions.RequestException as e:
        print(f"Error fetching PUUID: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        return None


def list_players():
    """List all players"""
    data = load_players()
    
    if not data['players']:
        print("No players configured yet.")
        print("Use 'add' command to add a player.")
        return
    
    print("\n=== Configured Players ===\n")
    for i, player in enumerate(data['players'], 1):
        print(f"{i}. {player['display_name']}")
        print(f"   ID: {player['id']}")
        print(f"   Riot ID: {player['riot_id']}")
        print(f"   PUUID: {player['puuid']}")
        print(f"   Region: {player['region']}")
        print()


def add_player():
    """Add a new player"""
    print("\n=== Add New Player ===\n")
    
    data = load_players()
    api_key = load_api_key()
    
    # Get player info
    riot_id = input("Enter Riot ID (GameName#TAG): ").strip()
    display_name = input("Enter display name: ").strip()
    region = input("Enter region (americas/europe/asia) [americas]: ").strip() or "americas"
    
    # Generate player ID
    player_id = riot_id.split('#')[0].lower().replace(' ', '_')
    
    # Check if player already exists
    for player in data['players']:
        if player['id'] == player_id or player['riot_id'] == riot_id:
            print(f"Error: Player with ID '{player_id}' or Riot ID '{riot_id}' already exists")
            return
    
    # Fetch PUUID
    print(f"\nFetching PUUID for {riot_id}...")
    puuid = fetch_puuid(riot_id, region, api_key)
    
    if not puuid:
        print("Failed to fetch PUUID. Player not added.")
        return
    
    # Add player
    new_player = {
        "id": player_id,
        "riot_id": riot_id,
        "puuid": puuid,
        "display_name": display_name,
        "region": region
    }
    
    data['players'].append(new_player)
    save_players(data)
    
    print(f"\n✓ Added player: {display_name} ({riot_id})")
    print(f"  PUUID: {puuid}")
    
    # Create data directory
    data_dir = Path(__file__).parent.parent / "data" / player_id
    data_dir.mkdir(parents=True, exist_ok=True)
    print(f"✓ Created data directory: {data_dir}")


def remove_player():
    """Remove a player"""
    data = load_players()
    
    if not data['players']:
        print("No players to remove.")
        return
    
    list_players()
    
    try:
        choice = int(input("Enter player number to remove (0 to cancel): "))
        if choice == 0:
            return
        
        if choice < 1 or choice > len(data['players']):
            print("Invalid choice.")
            return
        
        player = data['players'][choice - 1]
        confirm = input(f"Remove player '{player['display_name']}' ({player['riot_id']})? (yes/no): ")
        
        if confirm.lower() in ['yes', 'y']:
            data['players'].pop(choice - 1)
            save_players(data)
            print(f"✓ Removed player: {player['display_name']}")
        else:
            print("Cancelled.")
            
    except ValueError:
        print("Invalid input.")


def update_player():
    """Update player information"""
    data = load_players()
    
    if not data['players']:
        print("No players to update.")
        return
    
    list_players()
    
    try:
        choice = int(input("Enter player number to update (0 to cancel): "))
        if choice == 0:
            return
        
        if choice < 1 or choice > len(data['players']):
            print("Invalid choice.")
            return
        
        player = data['players'][choice - 1]
        
        print(f"\nUpdating: {player['display_name']}")
        print("Press Enter to keep current value\n")
        
        new_display = input(f"Display name [{player['display_name']}]: ").strip()
        new_riot_id = input(f"Riot ID [{player['riot_id']}]: ").strip()
        new_region = input(f"Region [{player['region']}]: ").strip()
        
        if new_display:
            player['display_name'] = new_display
        if new_region:
            player['region'] = new_region
        if new_riot_id and new_riot_id != player['riot_id']:
            # Need to fetch new PUUID
            api_key = load_api_key()
            print(f"\nFetching new PUUID for {new_riot_id}...")
            puuid = fetch_puuid(new_riot_id, player['region'], api_key)
            if puuid:
                player['riot_id'] = new_riot_id
                player['puuid'] = puuid
            else:
                print("Failed to fetch PUUID. Riot ID not updated.")
        
        save_players(data)
        print(f"\n✓ Updated player: {player['display_name']}")
        
    except ValueError:
        print("Invalid input.")


def main():
    """Main CLI interface"""
    if len(sys.argv) < 2:
        print("League of Legends Player Management")
        print("\nUsage: python manage_players.py [command]")
        print("\nCommands:")
        print("  list     - List all configured players")
        print("  add      - Add a new player")
        print("  remove   - Remove a player")
        print("  update   - Update player information")
        print("\nExample:")
        print("  python manage_players.py add")
        sys.exit(0)
    
    command = sys.argv[1].lower()
    
    if command == 'list':
        list_players()
    elif command == 'add':
        add_player()
    elif command == 'remove':
        remove_player()
    elif command == 'update':
        update_player()
    else:
        print(f"Unknown command: {command}")
        print("Valid commands: list, add, remove, update")
        sys.exit(1)


if __name__ == "__main__":
    main()

