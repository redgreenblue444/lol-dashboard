#!/usr/bin/env python3
"""
Star Schema Transformation Script
Transforms raw match data into Kimball dimensional model CSVs.
Enhanced with Data Dragon integration for champion/item names and image URLs.
"""

import json
import csv
import os
from typing import List, Dict, Set, Tuple, Optional
from datetime import datetime
from collections import defaultdict


class StarSchemaBuilder:
    """Builds a Kimball star schema from League of Legends match data."""
    
    def __init__(self, player_puuid: str, use_ddragon: bool = True):
        """
        Initialize the star schema builder.
        
        Args:
            player_puuid: The PUUID of the player whose data we're analyzing
            use_ddragon: Whether to enrich data with Data Dragon (champion/item names)
        """
        self.player_puuid = player_puuid
        self.use_ddragon = use_ddragon
        
        # Dimension tables
        self.dim_champions = {}  # champion_id -> champion data
        self.dim_dates = {}  # date_key -> date data
        self.dim_queues = {}  # queue_id -> queue data
        self.dim_runes = {}  # rune_key -> rune data
        self.dim_items = {}  # item_id -> item data
        
        # Fact table
        self.fact_matches = []
        
        # Bridge tables
        self.bridge_match_items = []
        self.bridge_match_participants = []  # NEW: All 10 participants per match
        
        # Metadata
        self.dim_match_metadata = []
        
        # Counters for surrogate keys
        self.champion_key_counter = 1
        self.rune_key_counter = 1
        self.match_key_counter = 1
        
        # Mappings for lookups
        self.champion_id_to_key = {}
        self.rune_signature_to_key = {}
        self.match_id_to_key = {}
        
        # Data Dragon mappings
        self.ddragon_champions = {}
        self.ddragon_items = {}
        self.ddragon_runes = {}
        self.ddragon_version = None
        
        if use_ddragon:
            self._load_ddragon_data()
    
    def _load_ddragon_data(self):
        """Load Data Dragon mappings if available."""
        try:
            # Load version
            version_file = 'static/ddragon/version.txt'
            if os.path.exists(version_file):
                with open(version_file, 'r') as f:
                    self.ddragon_version = f.read().strip()
            
            # Load champion mappings
            champ_file = 'static/ddragon/mappings/champions.json'
            if os.path.exists(champ_file):
                with open(champ_file, 'r') as f:
                    data = json.load(f)
                    # Convert keys to int
                    self.ddragon_champions = {int(k): v for k, v in data.items()}
                print(f"✅ Loaded {len(self.ddragon_champions)} champion names from Data Dragon")
            
            # Load item mappings
            item_file = 'static/ddragon/mappings/items.json'
            if os.path.exists(item_file):
                with open(item_file, 'r') as f:
                    data = json.load(f)
                    # Convert keys to int
                    self.ddragon_items = {int(k): v for k, v in data.items()}
                print(f"✅ Loaded {len(self.ddragon_items)} item names from Data Dragon")
            
            # Load rune mappings
            rune_file = 'static/ddragon/mappings/runes.json'
            if os.path.exists(rune_file):
                with open(rune_file, 'r') as f:
                    data = json.load(f)
                    # Convert keys to int
                    self.ddragon_runes = {int(k): v for k, v in data.items()}
                print(f"✅ Loaded {len(self.ddragon_runes)} rune names from Data Dragon")
        
        except Exception as e:
            print(f"⚠️  Could not load Data Dragon data: {e}")
            print("   Run 'python data_dragon.py' to download Data Dragon assets")
            self.use_ddragon = False
    
    def _get_champion_icon_url(self, champion_id: int) -> str:
        """Get champion icon URL from Data Dragon."""
        if champion_id in self.ddragon_champions:
            champ_string_id = self.ddragon_champions[champion_id]['id']
            return f"https://ddragon.leagueoflegends.com/cdn/{self.ddragon_version}/img/champion/{champ_string_id}.png"
        return ""
    
    def _get_item_icon_url(self, item_id: int) -> str:
        """Get item icon URL from Data Dragon."""
        if item_id > 0 and self.ddragon_version:
            return f"https://ddragon.leagueoflegends.com/cdn/{self.ddragon_version}/img/item/{item_id}.png"
        return ""
    
    def _get_or_create_champion_key(self, champion_id: int, champion_name: str, 
                                    role: str) -> int:
        """Get existing champion key or create new one."""
        if champion_id not in self.champion_id_to_key:
            key = self.champion_key_counter
            self.champion_key_counter += 1
            
            # Enrich with Data Dragon if available
            icon_url = self._get_champion_icon_url(champion_id) if self.use_ddragon else ""
            
            self.dim_champions[key] = {
                'champion_key': key,
                'champion_id': champion_id,
                'champion_name': champion_name,
                'role': role,
                'icon_url': icon_url
            }
            self.champion_id_to_key[champion_id] = key
            return key
        return self.champion_id_to_key[champion_id]
    
    def _get_or_create_rune_key(self, primary_style: int, sub_style: int, 
                               perks: List[int]) -> int:
        """Get existing rune key or create new one."""
        # Create signature from rune setup
        signature = f"{primary_style}_{sub_style}_{'_'.join(map(str, sorted(perks)))}"
        
        if signature not in self.rune_signature_to_key:
            key = self.rune_key_counter
            self.rune_key_counter += 1
            
            # Enrich with Data Dragon if available
            primary_name = "Unknown"
            sub_name = "Unknown"
            
            if self.use_ddragon:
                if primary_style in self.ddragon_runes:
                    primary_name = self.ddragon_runes[primary_style]['name']
                if sub_style in self.ddragon_runes:
                    sub_name = self.ddragon_runes[sub_style]['name']
            
            self.dim_runes[key] = {
                'rune_key': key,
                'primary_style_id': primary_style,
                'primary_style_name': primary_name,
                'sub_style_id': sub_style,
                'sub_style_name': sub_name,
                'perk_ids': json.dumps(perks)
            }
            self.rune_signature_to_key[signature] = key
            return key
        return self.rune_signature_to_key[signature]
    
    def _get_or_create_date_key(self, timestamp_ms: int) -> int:
        """Get existing date key or create new one."""
        dt = datetime.fromtimestamp(timestamp_ms / 1000)
        date_key = int(dt.strftime('%Y%m%d'))
        
        if date_key not in self.dim_dates:
            self.dim_dates[date_key] = {
                'date_key': date_key,
                'full_date': dt.strftime('%Y-%m-%d'),
                'year': dt.year,
                'month': dt.month,
                'day': dt.day,
                'day_of_week': dt.strftime('%A'),
                'week_of_year': dt.isocalendar()[1],
                'is_weekend': 1 if dt.weekday() >= 5 else 0,
                'hour_of_day': dt.hour
            }
        return date_key
    
    def _get_or_create_queue_key(self, queue_id: int, game_mode: str) -> int:
        """Get existing queue key or create new one."""
        if queue_id not in self.dim_queues:
            queue_names = {
                400: 'Draft Normal',
                420: 'Ranked Solo/Duo',
            }
            
            self.dim_queues[queue_id] = {
                'queue_key': queue_id,
                'queue_id': queue_id,
                'queue_name': queue_names.get(queue_id, f'Queue {queue_id}'),
                'is_ranked': 1 if queue_id == 420 else 0,
                'game_mode': game_mode
            }
        return queue_id
    
    def _add_items_to_dimensions(self, items: List[int]):
        """Add items to dimension table if not exists."""
        for item_id in items:
            if item_id > 0 and item_id not in self.dim_items:
                # Enrich with Data Dragon if available
                item_name = f'Item_{item_id}'  # Default
                icon_url = ""
                
                if self.use_ddragon and item_id in self.ddragon_items:
                    item_name = self.ddragon_items[item_id]['name']
                    icon_url = self._get_item_icon_url(item_id)
                
                self.dim_items[item_id] = {
                    'item_key': item_id,
                    'item_id': item_id,
                    'item_name': item_name,
                    'icon_url': icon_url
                }
    
    def process_match(self, match_data: Dict):
        """
        Process a single match and add to star schema.
        
        Args:
            match_data: Raw match data from Riot API
        """
        info = match_data['info']
        metadata = match_data['metadata']
        match_id = metadata['matchId']
        
        # Skip if already processed
        if match_id in self.match_id_to_key:
            return
        
        # Find player's participant data
        player_data = None
        for participant in info['participants']:
            if participant['puuid'] == self.player_puuid:
                player_data = participant
                break
        
        if not player_data:
            print(f"⚠️  Player not found in match {match_id}")
            return
        
        # Generate match key
        match_key = self.match_key_counter
        self.match_key_counter += 1
        self.match_id_to_key[match_id] = match_key
        
        # Get dimension keys
        champion_key = self._get_or_create_champion_key(
            player_data['championId'],
            player_data['championName'],
            player_data.get('teamPosition', 'UNKNOWN')
        )
        
        date_key = self._get_or_create_date_key(info['gameCreation'])
        queue_key = self._get_or_create_queue_key(info['queueId'], info['gameMode'])
        
        # Handle runes
        perks = player_data.get('perks', {})
        styles = perks.get('styles', [])
        primary_style = styles[0]['style'] if len(styles) > 0 else 0
        sub_style = styles[1]['style'] if len(styles) > 1 else 0
        
        perk_ids = []
        for style in styles:
            for selection in style.get('selections', []):
                perk_ids.append(selection['perk'])
        
        rune_primary_key = self._get_or_create_rune_key(primary_style, 0, perk_ids[:4])
        rune_secondary_key = self._get_or_create_rune_key(0, sub_style, perk_ids[4:] if len(perk_ids) > 4 else [])
        
        # Process items
        items = [
            player_data.get('item0', 0),
            player_data.get('item1', 0),
            player_data.get('item2', 0),
            player_data.get('item3', 0),
            player_data.get('item4', 0),
            player_data.get('item5', 0),
            player_data.get('item6', 0),  # Trinket
        ]
        self._add_items_to_dimensions(items)
        
        # Add to bridge table
        for position, item_id in enumerate(items):
            if item_id > 0:
                self.bridge_match_items.append({
                    'match_key': match_key,
                    'item_key': item_id,
                    'item_position': position
                })
        
        # Calculate derived metrics
        game_duration_minutes = info['gameDuration'] / 60
        kills = player_data['kills']
        deaths = player_data['deaths']
        assists = player_data['assists']
        kda = ((kills + assists) / deaths) if deaths > 0 else (kills + assists)
        
        cs_total = player_data['totalMinionsKilled'] + player_data.get('neutralMinionsKilled', 0)
        
        # Get team kills for participation
        team_id = player_data['teamId']
        team_kills = 0
        for participant in info['participants']:
            if participant['teamId'] == team_id:
                team_kills += participant['kills']
        
        kill_participation = ((kills + assists) / team_kills) if team_kills > 0 else 0
        
        # Build fact row
        fact_row = {
            'match_key': match_key,
            'champion_key': champion_key,
            'queue_key': queue_key,
            'date_key': date_key,
            'rune_primary_key': rune_primary_key,
            'rune_secondary_key': rune_secondary_key,
            
            # Core stats
            'kills': kills,
            'deaths': deaths,
            'assists': assists,
            'kda': round(kda, 2),
            
            # Economy
            'gold_earned': player_data['goldEarned'],
            'gold_per_minute': round(player_data['goldEarned'] / game_duration_minutes, 2),
            
            # Damage
            'damage_dealt': player_data['totalDamageDealtToChampions'],
            'damage_taken': player_data['totalDamageTaken'],
            'damage_per_minute': round(player_data['totalDamageDealtToChampions'] / game_duration_minutes, 2),
            
            # Farming
            'cs_total': cs_total,
            'cs_per_minute': round(cs_total / game_duration_minutes, 2),
            
            # Vision
            'vision_score': player_data['visionScore'],
            'wards_placed': player_data['wardsPlaced'],
            'wards_killed': player_data['wardsKilled'],
            'control_wards_purchased': player_data.get('visionWardsBoughtInGame', 0),
            
            # Participation
            'kill_participation': round(kill_participation, 3),
            
            # Multi-kills
            'double_kills': player_data.get('doubleKills', 0),
            'triple_kills': player_data.get('tripleKills', 0),
            'quadra_kills': player_data.get('quadraKills', 0),
            'penta_kills': player_data.get('pentaKills', 0),
            
            # Additional metrics
            'largest_killing_spree': player_data.get('largestKillingSpree', 0),
            'turret_kills': player_data.get('turretKills', 0),
            'inhibitor_kills': player_data.get('inhibitorKills', 0),
            
            # Challenges (if available)
            'solo_kills': player_data.get('challenges', {}).get('soloKills', 0),
            'damage_per_minute_challenge': player_data.get('challenges', {}).get('damagePerMinute', 0),
            
            # Result
            'win': 1 if player_data['win'] else 0,
            
            # Match length
            'game_duration_minutes': round(game_duration_minutes, 2)
        }
        
        self.fact_matches.append(fact_row)
        
        # Add match metadata
        self.dim_match_metadata.append({
            'match_key': match_key,
            'match_id': match_id,
            'game_duration_seconds': info['gameDuration'],
            'game_version': info['gameVersion'],
            'timestamp': info['gameCreation']
        })
        
        # Extract all 10 participants for expandable match details
        self._extract_all_participants(match_key, info, player_data['puuid'])
    
    def _extract_all_participants(self, match_key: int, info: Dict, player_puuid: str):
        """
        Extract all 10 participants from a match for expandable details.
        
        Args:
            match_key: Match surrogate key
            info: Match info dict
            player_puuid: Player's PUUID to mark which participant is the player
        """
        game_duration_minutes = info['gameDuration'] / 60
        
        for idx, participant in enumerate(info['participants'], 1):
            # Get team kills for participation
            team_kills = sum(p['kills'] for p in info['participants'] 
                           if p['teamId'] == participant['teamId'])
            
            kill_participation = ((participant['kills'] + participant['assists']) / team_kills) if team_kills > 0 else 0
            
            cs_total = participant['totalMinionsKilled'] + participant.get('neutralMinionsKilled', 0)
            
            # Get items
            items = [
                participant.get(f'item{i}', 0) for i in range(7)
            ]
            
            participant_row = {
                'match_key': match_key,
                'participant_num': idx,
                'summoner_name': participant.get('summonerName', 'Unknown'),
                'riot_id_game_name': participant.get('riotIdGameName', ''),
                'riot_id_tag_line': participant.get('riotIdTagLine', ''),
                'champion_id': participant['championId'],
                'champion_name': participant['championName'],
                'team_id': participant['teamId'],
                'team_position': participant.get('teamPosition', 'UNKNOWN'),
                'is_player': 1 if participant['puuid'] == player_puuid else 0,
                'win': 1 if participant['win'] else 0,
                
                # Combat stats
                'kills': participant['kills'],
                'deaths': participant['deaths'],
                'assists': participant['assists'],
                'kda': round(((participant['kills'] + participant['assists']) / participant['deaths']) 
                            if participant['deaths'] > 0 
                            else (participant['kills'] + participant['assists']), 2),
                
                # Economy
                'gold_earned': participant['goldEarned'],
                'gold_per_minute': round(participant['goldEarned'] / game_duration_minutes, 2),
                
                # Damage
                'damage_dealt': participant['totalDamageDealtToChampions'],
                'damage_taken': participant['totalDamageTaken'],
                'damage_per_minute': round(participant['totalDamageDealtToChampions'] / game_duration_minutes, 2),
                
                # Farm
                'cs_total': cs_total,
                'cs_per_minute': round(cs_total / game_duration_minutes, 2),
                
                # Vision
                'vision_score': participant['visionScore'],
                'wards_placed': participant['wardsPlaced'],
                'wards_killed': participant['wardsKilled'],
                'control_wards_purchased': participant.get('visionWardsBoughtInGame', 0),
                
                # Participation
                'kill_participation': round(kill_participation, 3),
                
                # Multi-kills
                'double_kills': participant.get('doubleKills', 0),
                'triple_kills': participant.get('tripleKills', 0),
                'quadra_kills': participant.get('quadraKills', 0),
                'penta_kills': participant.get('pentaKills', 0),
                
                # Objectives
                'turret_kills': participant.get('turretKills', 0),
                'inhibitor_kills': participant.get('inhibitorKills', 0),
                
                # Items (as JSON string for easy parsing)
                'items': json.dumps(items),
                
                # Level
                'champ_level': participant['champLevel']
            }
            
            self.bridge_match_participants.append(participant_row)
    
    def export_to_csv(self, output_dir: str = 'data'):
        """
        Export all tables to CSV files.
        
        Args:
            output_dir: Directory to save CSV files
        """
        os.makedirs(output_dir, exist_ok=True)
        
        print(f"\n📊 Exporting star schema to {output_dir}/")
        
        # Export fact table
        if self.fact_matches:
            fact_file = os.path.join(output_dir, 'fact_matches.csv')
            keys = self.fact_matches[0].keys()
            with open(fact_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(self.fact_matches)
            print(f"✅ {fact_file} ({len(self.fact_matches)} rows)")
        
        # Export dimension tables
        dimensions = [
            ('dim_champion.csv', self.dim_champions),
            ('dim_date.csv', self.dim_dates),
            ('dim_queue.csv', self.dim_queues),
            ('dim_rune.csv', self.dim_runes),
            ('dim_items.csv', self.dim_items),
        ]
        
        for filename, dimension_dict in dimensions:
            if dimension_dict:
                filepath = os.path.join(output_dir, filename)
                data = list(dimension_dict.values())
                keys = data[0].keys()
                with open(filepath, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=keys)
                    writer.writeheader()
                    writer.writerows(data)
                print(f"✅ {filepath} ({len(data)} rows)")
        
        # Export bridge tables
        if self.bridge_match_items:
            bridge_file = os.path.join(output_dir, 'bridge_match_items.csv')
            keys = ['match_key', 'item_key', 'item_position']
            with open(bridge_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(self.bridge_match_items)
            print(f"✅ {bridge_file} ({len(self.bridge_match_items)} rows)")
        
        if self.bridge_match_participants:
            participants_file = os.path.join(output_dir, 'bridge_match_participants.csv')
            keys = self.bridge_match_participants[0].keys() if self.bridge_match_participants else []
            with open(participants_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(self.bridge_match_participants)
            print(f"✅ {participants_file} ({len(self.bridge_match_participants)} rows)")
        
        # Export metadata
        if self.dim_match_metadata:
            metadata_file = os.path.join(output_dir, 'dim_match_metadata.csv')
            keys = self.dim_match_metadata[0].keys()
            with open(metadata_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(self.dim_match_metadata)
            print(f"✅ {metadata_file} ({len(self.dim_match_metadata)} rows)")
        
        print(f"\n{'='*60}")
        print(f"✅ Star schema export complete!")
        print(f"{'='*60}")


def main():
    """Main function to transform match data."""
    print("="*60)
    print("League of Legends Star Schema Transformer")
    print("="*60)
    print("\n📁 This script transforms raw_matches.json into")
    print("   a Kimball dimensional model (star schema)\n")
    
    # Load raw match data
    raw_file = 'raw_matches.json'
    
    if not os.path.exists(raw_file):
        print(f"❌ Error: {raw_file} not found!")
        print(f"   Please run fetch_100_matches.py first.")
        return
    
    print(f"📖 Loading {raw_file}...")
    with open(raw_file, 'r', encoding='utf-8') as f:
        matches = json.load(f)
    
    print(f"✅ Loaded {len(matches)} matches")
    
    # Get player PUUID from first match
    if not matches:
        print("❌ No matches to process!")
        return
    
    # The player PUUID should be consistent across all matches
    # We need to identify which participant is the player
    # We'll use the account that requested the data
    
    # For now, prompt for PUUID or extract from metadata
    print("\n🔍 Detecting player PUUID from match data...")
    
    # Count PUUID occurrences to find the player
    puuid_counts = defaultdict(int)
    for match in matches:
        for puuid in match['metadata']['participants']:
            puuid_counts[puuid] += 1
    
    # The player should appear in all matches
    player_puuid = max(puuid_counts.items(), key=lambda x: x[1])[0]
    
    print(f"✅ Found player PUUID: {player_puuid[:20]}...")
    print(f"   (appears in {puuid_counts[player_puuid]}/{len(matches)} matches)")
    
    # Build star schema
    print(f"\n🔨 Building star schema...")
    builder = StarSchemaBuilder(player_puuid)
    
    for i, match in enumerate(matches, 1):
        match_id = match['metadata']['matchId']
        print(f"   [{i}/{len(matches)}] Processing {match_id}")
        builder.process_match(match)
    
    # Export to CSV
    builder.export_to_csv('data')
    
    print(f"\n✅ Transformation complete!")
    print(f"   📂 CSV files are in the 'data/' directory")
    print(f"   🚀 Ready to load into static.html dashboard")
    
    # Check if Data Dragon was used
    if not builder.use_ddragon or not builder.ddragon_champions:
        print(f"\n💡 Tip: Run 'python data_dragon.py' to download champion/item names")
        print(f"   Then re-run this script for enriched data with images!")


if __name__ == "__main__":
    main()

