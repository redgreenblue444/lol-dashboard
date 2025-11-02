#!/usr/bin/env python3
"""
Fetch Data Dragon Runes Data
Downloads runesReforged.json and creates a mapping for rune lookups.
"""

import json
import urllib.request
from pathlib import Path


def fetch_ddragon_runes(version: str = "15.2.1") -> dict:
    """
    Fetch runes data from Data Dragon CDN.
    
    Args:
        version: Data Dragon version to use
        
    Returns:
        Dictionary mapping rune_id -> rune data
    """
    url = f"https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/runesReforged.json"
    
    print(f"📥 Fetching runes from: {url}")
    
    try:
        with urllib.request.urlopen(url) as response:
            runes_data = json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"❌ Error fetching runes: {e}")
        return {}
    
    print(f"✓ Downloaded runes data")
    
    # Create mapping
    rune_mapping = {}
    
    for tree in runes_data:
        tree_id = tree['id']
        tree_name = tree['name']
        tree_key = tree['key']
        tree_icon = tree['icon']
        
        # Map the tree itself
        rune_mapping[tree_id] = {
            'id': tree_id,
            'name': tree_name,
            'key': tree_key,
            'icon': f"https://ddragon.leagueoflegends.com/cdn/img/{tree_icon}",
            'type': 'tree',
            'tree': tree_name
        }
        
        # Map all slots and runes within the tree
        for slot_idx, slot in enumerate(tree['slots']):
            for rune in slot['runes']:
                rune_id = rune['id']
                rune_mapping[rune_id] = {
                    'id': rune_id,
                    'name': rune['name'],
                    'key': rune['key'],
                    'icon': f"https://ddragon.leagueoflegends.com/cdn/img/{rune['icon']}",
                    'shortDesc': rune['shortDesc'],
                    'longDesc': rune['longDesc'],
                    'tree': tree_name,
                    'tree_id': tree_id,
                    'slot': slot_idx,
                    'type': 'keystone' if slot_idx == 0 else 'rune'
                }
    
    print(f"✓ Created mapping for {len(rune_mapping)} runes and trees")
    
    return rune_mapping


def main():
    """Main function to fetch and save rune data."""
    # Fetch rune data
    rune_mapping = fetch_ddragon_runes()
    
    if not rune_mapping:
        print("❌ Failed to fetch rune data")
        return
    
    # Save to data directory
    output_path = Path(__file__).parent.parent / "data" / "ddragon_runes.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(rune_mapping, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Saved rune mapping to {output_path}")
    
    # Print some sample data
    print("\n📊 Sample rune data:")
    for rune_id, rune_data in list(rune_mapping.items())[:5]:
        print(f"  {rune_id}: {rune_data['name']} ({rune_data['type']})")


if __name__ == "__main__":
    main()



