#!/usr/bin/env python3
"""
Data Dragon Client
Downloads and caches champion, item, rune, and summoner spell data from Riot's Data Dragon CDN.
"""

import requests
import json
import os
from typing import Dict, Optional


class DataDragonClient:
    """Client for fetching and caching Data Dragon static data."""
    
    BASE_URL = "https://ddragon.leagueoflegends.com"
    
    def __init__(self, cache_dir: str = "static/ddragon"):
        """
        Initialize Data Dragon client.
        
        Args:
            cache_dir: Directory to cache downloaded data
        """
        self.cache_dir = cache_dir
        self.version = None
        os.makedirs(cache_dir, exist_ok=True)
    
    def get_latest_version(self) -> str:
        """
        Get the latest Data Dragon version.
        
        Returns:
            Version string (e.g., "13.24.1")
        """
        if self.version:
            return self.version
        
        # Check cache first
        version_file = os.path.join(self.cache_dir, 'version.txt')
        if os.path.exists(version_file):
            with open(version_file, 'r') as f:
                self.version = f.read().strip()
                print(f"✅ Using cached version: {self.version}")
                return self.version
        
        # Fetch from API
        print("🔍 Fetching latest Data Dragon version...")
        url = f"{self.BASE_URL}/api/versions.json"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            versions = response.json()
            self.version = versions[0]  # Latest version is first
            
            # Cache version
            with open(version_file, 'w') as f:
                f.write(self.version)
            
            print(f"✅ Latest version: {self.version}")
            return self.version
        else:
            raise Exception(f"Failed to fetch versions: {response.status_code}")
    
    def download_champions(self) -> Dict:
        """
        Download champion data.
        
        Returns:
            Dictionary of champion data
        """
        cache_file = os.path.join(self.cache_dir, 'champion.json')
        
        # Check cache
        if os.path.exists(cache_file):
            print("✅ Loading champions from cache...")
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        # Download
        version = self.get_latest_version()
        url = f"{self.BASE_URL}/cdn/{version}/data/en_US/champion.json"
        
        print("📥 Downloading champion data...")
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            # Cache data
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            
            print(f"✅ Downloaded {len(data['data'])} champions")
            return data
        else:
            raise Exception(f"Failed to download champions: {response.status_code}")
    
    def download_items(self) -> Dict:
        """
        Download item data.
        
        Returns:
            Dictionary of item data
        """
        cache_file = os.path.join(self.cache_dir, 'item.json')
        
        # Check cache
        if os.path.exists(cache_file):
            print("✅ Loading items from cache...")
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        # Download
        version = self.get_latest_version()
        url = f"{self.BASE_URL}/cdn/{version}/data/en_US/item.json"
        
        print("📥 Downloading item data...")
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            # Cache data
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            
            print(f"✅ Downloaded {len(data['data'])} items")
            return data
        else:
            raise Exception(f"Failed to download items: {response.status_code}")
    
    def download_runes(self) -> Dict:
        """
        Download runes reforged data.
        
        Returns:
            Dictionary of rune data
        """
        cache_file = os.path.join(self.cache_dir, 'runesReforged.json')
        
        # Check cache
        if os.path.exists(cache_file):
            print("✅ Loading runes from cache...")
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        # Download
        version = self.get_latest_version()
        url = f"{self.BASE_URL}/cdn/{version}/data/en_US/runesReforged.json"
        
        print("📥 Downloading rune data...")
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            # Cache data
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            
            print(f"✅ Downloaded {len(data)} rune trees")
            return data
        else:
            raise Exception(f"Failed to download runes: {response.status_code}")
    
    def download_summoner_spells(self) -> Dict:
        """
        Download summoner spell data.
        
        Returns:
            Dictionary of summoner spell data
        """
        cache_file = os.path.join(self.cache_dir, 'summoner.json')
        
        # Check cache
        if os.path.exists(cache_file):
            print("✅ Loading summoner spells from cache...")
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        # Download
        version = self.get_latest_version()
        url = f"{self.BASE_URL}/cdn/{version}/data/en_US/summoner.json"
        
        print("📥 Downloading summoner spell data...")
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            # Cache data
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            
            print(f"✅ Downloaded {len(data['data'])} summoner spells")
            return data
        else:
            raise Exception(f"Failed to download summoner spells: {response.status_code}")
    
    def get_champion_icon_url(self, champion_name: str) -> str:
        """
        Get CDN URL for champion icon.
        
        Args:
            champion_name: Champion name (e.g., "Malzahar")
            
        Returns:
            URL to champion icon
        """
        version = self.get_latest_version()
        return f"{self.BASE_URL}/cdn/{version}/img/champion/{champion_name}.png"
    
    def get_item_icon_url(self, item_id: int) -> str:
        """
        Get CDN URL for item icon.
        
        Args:
            item_id: Item ID
            
        Returns:
            URL to item icon
        """
        version = self.get_latest_version()
        return f"{self.BASE_URL}/cdn/{version}/img/item/{item_id}.png"
    
    def get_rune_icon_url(self, rune_id: int) -> str:
        """
        Get CDN URL for rune icon.
        
        Args:
            rune_id: Rune/perk ID
            
        Returns:
            URL to rune icon (uses perk style images)
        """
        # Rune icons are stored differently - we'll use a mapping
        # For now, return a generic path that can be enhanced
        version = self.get_latest_version()
        return f"{self.BASE_URL}/cdn/img/{rune_id}.png"
    
    def get_summoner_spell_icon_url(self, spell_name: str) -> str:
        """
        Get CDN URL for summoner spell icon.
        
        Args:
            spell_name: Spell name (e.g., "Flash")
            
        Returns:
            URL to spell icon
        """
        version = self.get_latest_version()
        return f"{self.BASE_URL}/cdn/{version}/img/spell/{spell_name}.png"
    
    def download_all(self):
        """Download all Data Dragon assets."""
        print("="*60)
        print("Data Dragon Asset Downloader")
        print("="*60)
        print()
        
        try:
            # Get version first
            self.get_latest_version()
            print()
            
            # Download all data
            self.download_champions()
            self.download_items()
            self.download_runes()
            self.download_summoner_spells()
            
            print()
            print("="*60)
            print("✅ All Data Dragon assets downloaded successfully!")
            print(f"📂 Cached in: {self.cache_dir}/")
            print("="*60)
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            raise


def create_champion_id_mapping(champions_data: Dict) -> Dict[int, Dict]:
    """
    Create a mapping from champion ID (int) to champion data.
    
    Args:
        champions_data: Champions data from Data Dragon
        
    Returns:
        Dictionary mapping champion_id -> champion info
    """
    mapping = {}
    
    for champ_key, champ_data in champions_data['data'].items():
        champion_id = int(champ_data['key'])
        mapping[champion_id] = {
            'name': champ_data['name'],
            'id': champ_data['id'],  # String ID like "Malzahar"
            'title': champ_data['title'],
            'tags': champ_data['tags']  # Roles like ["Mage", "Assassin"]
        }
    
    return mapping


def create_item_id_mapping(items_data: Dict) -> Dict[int, Dict]:
    """
    Create a mapping from item ID to item data.
    
    Args:
        items_data: Items data from Data Dragon
        
    Returns:
        Dictionary mapping item_id -> item info
    """
    mapping = {}
    
    for item_id_str, item_data in items_data['data'].items():
        item_id = int(item_id_str)
        mapping[item_id] = {
            'name': item_data['name'],
            'description': item_data.get('plaintext', ''),
            'gold': item_data.get('gold', {}).get('total', 0)
        }
    
    return mapping


def create_rune_id_mapping(runes_data: list) -> Dict[int, Dict]:
    """
    Create a mapping from perk ID to rune data.
    
    Args:
        runes_data: Runes data from Data Dragon
        
    Returns:
        Dictionary mapping perk_id -> rune info
    """
    mapping = {}
    
    for tree in runes_data:
        # Map tree itself
        tree_id = tree['id']
        mapping[tree_id] = {
            'name': tree['name'],
            'key': tree['key'],
            'icon': tree['icon'],
            'type': 'tree'
        }
        
        # Map all slots and runes
        for slot in tree['slots']:
            for rune in slot['runes']:
                rune_id = rune['id']
                mapping[rune_id] = {
                    'name': rune['name'],
                    'key': rune['key'],
                    'icon': rune['icon'],
                    'shortDesc': rune['shortDesc'],
                    'tree': tree['name'],
                    'type': 'rune'
                }
    
    return mapping


def main():
    """Main function to download Data Dragon assets."""
    client = DataDragonClient()
    client.download_all()
    
    print("\n📊 Creating ID mappings...")
    
    # Load cached data
    with open('static/ddragon/champion.json', 'r') as f:
        champions = json.load(f)
    with open('static/ddragon/item.json', 'r') as f:
        items = json.load(f)
    with open('static/ddragon/runesReforged.json', 'r') as f:
        runes = json.load(f)
    
    # Create mappings
    champ_map = create_champion_id_mapping(champions)
    item_map = create_item_id_mapping(items)
    rune_map = create_rune_id_mapping(runes)
    
    # Save mappings for easy lookup
    mappings_dir = 'static/ddragon/mappings'
    os.makedirs(mappings_dir, exist_ok=True)
    
    with open(f'{mappings_dir}/champions.json', 'w') as f:
        json.dump(champ_map, f, indent=2)
    with open(f'{mappings_dir}/items.json', 'w') as f:
        json.dump(item_map, f, indent=2)
    with open(f'{mappings_dir}/runes.json', 'w') as f:
        json.dump(rune_map, f, indent=2)
    
    print(f"✅ Champion mapping: {len(champ_map)} champions")
    print(f"✅ Item mapping: {len(item_map)} items")
    print(f"✅ Rune mapping: {len(rune_map)} runes/perks")
    print(f"📂 Mappings saved to: {mappings_dir}/")
    
    print("\n🎉 Data Dragon setup complete!")
    print("\n💡 Next steps:")
    print("   1. Run transform_to_star_schema.py to enrich dimension tables")
    print("   2. Update dashboard to use champion/item images")


if __name__ == "__main__":
    main()

