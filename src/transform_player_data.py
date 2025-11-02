#!/usr/bin/env python3
"""
Transform Player Data to Star Schema
Converts raw match JSON data to Kimball dimensional model CSVs
"""

import json
import csv
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set
from collections import defaultdict

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))


class StarSchemaBuilder:
    """Builds Kimball star schema from raw match data"""
    
    def __init__(self, player_id: str, puuid: str):
        self.player_id = player_id
        self.puuid = puuid
        self.data_dir = Path(f"data/{player_id}")
        
        # Dimensions
        self.dim_champions = {}
        self.dim_dates = {}
        self.dim_queues = {}
        self.dim_runes = {}
        self.dim_items = {}
        self.dim_match_metadata = {}
        
        # Facts and bridges
        self.fact_matches = []
        self.bridge_match_items = []
        self.bridge_match_participants = []
        
        # Counters for keys
        self.champion_key_counter = 1
        self.date_key_counter = 1
        self.queue_key_counter = 1
        self.rune_key_counter = 1
        self.match_key_counter = 1
        
        # Load Data Dragon rune mapping
        self.ddragon_runes = self._load_ddragon_runes()
    
    def _load_ddragon_runes(self) -> Dict:
        """Load Data Dragon rune mapping from JSON file"""
        runes_path = Path(__file__).parent.parent / "data" / "ddragon_runes.json"
        try:
            with open(runes_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"  Warning: Could not find {runes_path}, rune details will be limited")
            return {}
        except Exception as e:
            print(f"  Warning: Error loading rune data: {e}")
            return {}
        
    def _get_or_create_champion_key(self, champion_id: int, champion_name: str) -> int:
        """Get existing or create new champion dimension key"""
        for key, champ in self.dim_champions.items():
            if champ['champion_id'] == champion_id:
                return key
        
        key = self.champion_key_counter
        self.champion_key_counter += 1
        
        self.dim_champions[key] = {
            'champion_key': key,
            'champion_id': champion_id,
            'champion_name': champion_name,
            'role': 'Unknown',  # Can be enhanced later
            'icon_url': f'https://ddragon.leagueoflegends.com/cdn/15.2.1/img/champion/{champion_name}.png'
        }
        
        return key
    
    def _get_or_create_date_key(self, timestamp: int) -> int:
        """Get existing or create new date dimension key"""
        dt = datetime.fromtimestamp(timestamp / 1000)
        date_str = dt.strftime('%Y-%m-%d')
        
        for key, date_dim in self.dim_dates.items():
            if date_dim['full_date'] == date_str:
                return key
        
        key = self.date_key_counter
        self.date_key_counter += 1
        
        is_weekend = 1 if dt.weekday() >= 5 else 0
        
        self.dim_dates[key] = {
            'date_key': key,
            'full_date': date_str,
            'year': dt.year,
            'month': dt.month,
            'day': dt.day,
            'day_of_week': dt.strftime('%A'),
            'is_weekend': is_weekend,
            'hour_of_day': dt.hour
        }
        
        return key
    
    def _get_or_create_queue_key(self, queue_id: int, queue_name: str) -> int:
        """Get existing or create new queue dimension key"""
        for key, queue in self.dim_queues.items():
            if queue['queue_id'] == queue_id:
                return key
        
        key = self.queue_key_counter
        self.queue_key_counter += 1
        
        is_ranked = 1 if 'Ranked' in queue_name or queue_id == 420 else 0
        
        self.dim_queues[key] = {
            'queue_key': key,
            'queue_id': queue_id,
            'queue_name': queue_name,
            'is_ranked': is_ranked
        }
        
        return key
    
    def _get_or_create_rune_key(self, primary_style: int, sub_style: int, 
                                 primary_runes: List[int], secondary_runes: List[int]) -> int:
        """Get existing or create new rune dimension key with full rune details"""
        # Create signature for deduplication
        rune_signature = (primary_style, sub_style, tuple(primary_runes), tuple(secondary_runes))
        
        for key, rune in self.dim_runes.items():
            existing_sig = (
                rune['rune_primary_id'], 
                rune['rune_secondary_id'],
                tuple([rune.get(f'primary_rune{i}_id', 0) for i in range(1, 5)]),
                tuple([rune.get(f'secondary_rune{i}_id', 0) for i in range(1, 3)])
            )
            if existing_sig == rune_signature:
                return key
        
        key = self.rune_key_counter
        self.rune_key_counter += 1
        
        # Rune names mapping (for trees)
        rune_tree_names = {
            8000: "Precision", 8100: "Domination", 8200: "Sorcery",
            8300: "Inspiration", 8400: "Resolve"
        }
        
        # Helper function to get rune details from Data Dragon
        def get_rune_info(rune_id: int) -> Dict:
            if not rune_id or rune_id == 0:
                return {'name': 'None', 'icon': '', 'id': 0}
            
            rune_data = self.ddragon_runes.get(str(rune_id), {})
            return {
                'name': rune_data.get('name', f'Rune_{rune_id}'),
                'icon': rune_data.get('icon', ''),
                'id': rune_id
            }
        
        # Build rune dimension record
        rune_record = {
            'rune_key': key,
            'rune_primary_id': primary_style,
            'rune_secondary_id': sub_style,
            'primary_style_name': rune_tree_names.get(primary_style, f"Style_{primary_style}"),
            'sub_style_name': rune_tree_names.get(sub_style, "None") if sub_style == 0 else rune_tree_names.get(sub_style, f"Style_{sub_style}")
        }
        
        # Add primary runes (keystone + 3 others)
        for i, rune_id in enumerate(primary_runes[:4], 1):
            rune_info = get_rune_info(rune_id)
            prefix = 'keystone' if i == 1 else f'primary_rune{i}'
            rune_record[f'{prefix}_id'] = rune_info['id']
            rune_record[f'{prefix}_name'] = rune_info['name']
            rune_record[f'{prefix}_icon'] = rune_info['icon']
        
        # Fill in missing primary runes if less than 4
        for i in range(len(primary_runes[:4]) + 1, 5):
            prefix = 'keystone' if i == 1 else f'primary_rune{i}'
            rune_record[f'{prefix}_id'] = 0
            rune_record[f'{prefix}_name'] = 'None'
            rune_record[f'{prefix}_icon'] = ''
        
        # Add secondary runes (2 runes)
        for i, rune_id in enumerate(secondary_runes[:2], 1):
            rune_info = get_rune_info(rune_id)
            rune_record[f'secondary_rune{i}_id'] = rune_info['id']
            rune_record[f'secondary_rune{i}_name'] = rune_info['name']
            rune_record[f'secondary_rune{i}_icon'] = rune_info['icon']
        
        # Fill in missing secondary runes if less than 2
        for i in range(len(secondary_runes[:2]) + 1, 3):
            rune_record[f'secondary_rune{i}_id'] = 0
            rune_record[f'secondary_rune{i}_name'] = 'None'
            rune_record[f'secondary_rune{i}_icon'] = ''
        
        self.dim_runes[key] = rune_record
        
        return key
    
    def _add_items_to_dimensions(self, items: List[int]):
        """Add items to dimension table"""
        for item_id in items:
            if item_id == 0:
                continue
            
            if item_id not in self.dim_items:
                self.dim_items[item_id] = {
                    'item_key': item_id,
                    'item_id': item_id,
                    'item_name': f"Item_{item_id}",
                    'icon_url': f'https://ddragon.leagueoflegends.com/cdn/15.2.1/img/item/{item_id}.png'
                }
    
    def process_match(self, match_data: Dict):
        """Process a single match and add to star schema"""
        info = match_data['info']
        metadata = match_data['metadata']
        
        # Find the player's participant data
        player_participant = None
        for participant in info['participants']:
            if participant['puuid'] == self.puuid:
                player_participant = participant
                break
        
        if not player_participant:
            print(f"  Warning: Player not found in match {metadata['matchId']}")
            return
        
        # Create match key
        match_key = self.match_key_counter
        self.match_key_counter += 1
        
        # Add match metadata
        self.dim_match_metadata[match_key] = {
            'match_key': match_key,
            'match_id': metadata['matchId'],
            'timestamp': info['gameCreation']
        }
        
        # Get dimension keys
        champion_key = self._get_or_create_champion_key(
            player_participant['championId'],
            player_participant['championName']
        )
        
        date_key = self._get_or_create_date_key(info['gameCreation'])
        
        queue_id = info['queueId']
        queue_name = "Ranked Solo/Duo" if queue_id == 420 else "Draft Normal" if queue_id == 400 else f"Queue {queue_id}"
        queue_key = self._get_or_create_queue_key(queue_id, queue_name)
        
        # Get rune key with full rune details
        perks = player_participant.get('perks', {})
        styles = perks.get('styles', [])
        
        # Extract primary style and rune selections
        primary_style = styles[0]['style'] if len(styles) > 0 else 0
        primary_runes = [s['perk'] for s in styles[0].get('selections', [])] if len(styles) > 0 else []
        
        # Extract secondary style and rune selections  
        sub_style = styles[1]['style'] if len(styles) > 1 else 0
        secondary_runes = [s['perk'] for s in styles[1].get('selections', [])] if len(styles) > 1 else []
        
        # Create single rune key with all details
        rune_key = self._get_or_create_rune_key(primary_style, sub_style, primary_runes, secondary_runes)
        
        # Add items
        items = [
            player_participant.get('item0', 0),
            player_participant.get('item1', 0),
            player_participant.get('item2', 0),
            player_participant.get('item3', 0),
            player_participant.get('item4', 0),
            player_participant.get('item5', 0),
            player_participant.get('item6', 0),
        ]
        self._add_items_to_dimensions(items)
        
        # Create fact row
        deaths = player_participant['deaths'] if player_participant['deaths'] > 0 else 1
        kda = (player_participant['kills'] + player_participant['assists']) / deaths
        
        cs_total = player_participant['totalMinionsKilled'] + player_participant['neutralMinionsKilled']
        game_duration_minutes = info['gameDuration'] / 60
        
        self.fact_matches.append({
            'match_key': match_key,
            'champion_key': champion_key,
            'date_key': date_key,
            'queue_key': queue_key,
            'rune_key': rune_key,
            'win': 1 if player_participant['win'] else 0,
            'kills': player_participant['kills'],
            'deaths': player_participant['deaths'],
            'assists': player_participant['assists'],
            'kda': round(kda, 2),
            'cs_total': cs_total,
            'cs_per_minute': round(cs_total / game_duration_minutes, 2),
            'gold_earned': player_participant['goldEarned'],
            'gold_per_minute': round(player_participant['goldEarned'] / game_duration_minutes, 2),
            'damage_dealt': player_participant['totalDamageDealtToChampions'],
            'damage_per_minute': round(player_participant['totalDamageDealtToChampions'] / game_duration_minutes, 2),
            'damage_taken': player_participant['totalDamageTaken'],
            'vision_score': player_participant['visionScore'],
            'wards_placed': player_participant['wardsPlaced'],
            'wards_killed': player_participant['wardsKilled'],
            'control_wards_purchased': player_participant['visionWardsBoughtInGame'],
            'kill_participation': round(player_participant.get('challenges', {}).get('killParticipation', 0), 3),
            'double_kills': player_participant['doubleKills'],
            'triple_kills': player_participant['tripleKills'],
            'quadra_kills': player_participant['quadraKills'],
            'penta_kills': player_participant['pentaKills'],
            'game_duration_minutes': round(game_duration_minutes, 2)
        })
        
        # Create bridge for items
        for position, item_key in enumerate(items):
            if item_key > 0:
                self.bridge_match_items.append({
                    'match_key': match_key,
                    'item_key': item_key,
                    'item_position': position
                })
        
        # Create bridge for all participants
        for participant in info['participants']:
            p_deaths = participant['deaths'] if participant['deaths'] > 0 else 1
            p_kda = (participant['kills'] + participant['assists']) / p_deaths
            p_cs = participant['totalMinionsKilled'] + participant['neutralMinionsKilled']
            
            p_items = [
                participant.get('item0', 0),
                participant.get('item1', 0),
                participant.get('item2', 0),
                participant.get('item3', 0),
                participant.get('item4', 0),
                participant.get('item5', 0),
                participant.get('item6', 0),
            ]
            
            self.bridge_match_participants.append({
                'match_key': match_key,
                'puuid': participant['puuid'],
                'summoner_name': participant.get('summonerName', ''),
                'riot_id_game_name': participant.get('riotIdGameName', ''),
                'riot_id_tag_line': participant.get('riotIdTagLine', ''),
                'champion_id': participant['championId'],
                'champion_name': participant['championName'],
                'team_id': participant['teamId'],
                'team_position': participant['teamPosition'],
                'win': 1 if participant['win'] else 0,
                'kills': participant['kills'],
                'deaths': participant['deaths'],
                'assists': participant['assists'],
                'kda': round(p_kda, 2),
                'cs_total': p_cs,
                'cs_per_minute': round(p_cs / game_duration_minutes, 2),
                'gold_earned': participant['goldEarned'],
                'gold_per_minute': round(participant['goldEarned'] / game_duration_minutes, 2),
                'damage_dealt': participant['totalDamageDealtToChampions'],
                'damage_per_minute': round(participant['totalDamageDealtToChampions'] / game_duration_minutes, 2),
                'vision_score': participant['visionScore'],
                'control_wards_purchased': participant['visionWardsBoughtInGame'],
                'kill_participation': round(participant.get('challenges', {}).get('killParticipation', 0), 3),
                'champion_level': participant['champLevel'],
                'items': json.dumps(p_items)
            })
    
    def load_and_process_all_matches(self):
        """Load all raw match files and process them"""
        # Use monthly files for organization
        raw_files = sorted(self.data_dir.glob("raw_matches_*.json"))
        
        if not raw_files:
            print(f"  No raw match files found for {self.player_id}")
            return
        
        print(f"  Found {len(raw_files)} raw match files")
        
        total_matches = 0
        for raw_file in raw_files:
            print(f"  Processing {raw_file.name}...")
            
            with open(raw_file) as f:
                matches = json.load(f)
            
            for match in matches:
                self.process_match(match)
            
            total_matches += len(matches)
            print(f"    {len(matches)} matches")
        
        print(f"  ✓ Processed {total_matches} total matches")
    
    def export_to_csv(self):
        """Export all data to CSV files"""
        print(f"  Exporting CSVs to {self.data_dir}...")
        
        # Export dimensions
        with open(self.data_dir / 'dim_champion.csv', 'w', newline='') as f:
            if self.dim_champions:
                writer = csv.DictWriter(f, fieldnames=list(self.dim_champions[next(iter(self.dim_champions))].keys()))
                writer.writeheader()
                writer.writerows(self.dim_champions.values())
        
        with open(self.data_dir / 'dim_date.csv', 'w', newline='') as f:
            if self.dim_dates:
                writer = csv.DictWriter(f, fieldnames=list(self.dim_dates[next(iter(self.dim_dates))].keys()))
                writer.writeheader()
                writer.writerows(self.dim_dates.values())
        
        with open(self.data_dir / 'dim_queue.csv', 'w', newline='') as f:
            if self.dim_queues:
                writer = csv.DictWriter(f, fieldnames=list(self.dim_queues[next(iter(self.dim_queues))].keys()))
                writer.writeheader()
                writer.writerows(self.dim_queues.values())
        
        with open(self.data_dir / 'dim_rune.csv', 'w', newline='') as f:
            if self.dim_runes:
                writer = csv.DictWriter(f, fieldnames=list(self.dim_runes[next(iter(self.dim_runes))].keys()))
                writer.writeheader()
                writer.writerows(self.dim_runes.values())
        
        with open(self.data_dir / 'dim_items.csv', 'w', newline='') as f:
            if self.dim_items:
                writer = csv.DictWriter(f, fieldnames=list(self.dim_items[next(iter(self.dim_items))].keys()))
                writer.writeheader()
                writer.writerows(self.dim_items.values())
        
        with open(self.data_dir / 'dim_match_metadata.csv', 'w', newline='') as f:
            if self.dim_match_metadata:
                writer = csv.DictWriter(f, fieldnames=list(self.dim_match_metadata[next(iter(self.dim_match_metadata))].keys()))
                writer.writeheader()
                writer.writerows(self.dim_match_metadata.values())
        
        # Export fact table
        if self.fact_matches:
            with open(self.data_dir / 'fact_matches.csv', 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=list(self.fact_matches[0].keys()))
                writer.writeheader()
                writer.writerows(self.fact_matches)
        
        # Export bridge tables
        if self.bridge_match_items:
            with open(self.data_dir / 'bridge_match_items.csv', 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=list(self.bridge_match_items[0].keys()))
                writer.writeheader()
                writer.writerows(self.bridge_match_items)
        
        if self.bridge_match_participants:
            with open(self.data_dir / 'bridge_match_participants.csv', 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=list(self.bridge_match_participants[0].keys()))
                writer.writeheader()
                writer.writerows(self.bridge_match_participants)
        
        print(f"  ✓ Exported all CSVs")


def transform_player(player_id: str, puuid: str):
    """Transform data for a single player"""
    print(f"\n{'='*60}")
    print(f"🔄 Transforming data for player: {player_id}")
    print(f"{'='*60}")
    
    builder = StarSchemaBuilder(player_id, puuid)
    builder.load_and_process_all_matches()
    builder.export_to_csv()
    
    print(f"\n✓ Transformation complete for {player_id}")
    print(f"  Fact matches: {len(builder.fact_matches)}")
    print(f"  Champions: {len(builder.dim_champions)}")
    print(f"  Dates: {len(builder.dim_dates)}")
    print(f"  Items: {len(builder.dim_items)}")


def main():
    """Main transformation function"""
    players_file = Path("players.json")
    
    if not players_file.exists():
        print("Error: players.json not found")
        sys.exit(1)
    
    with open(players_file) as f:
        players_data = json.load(f)
    
    if not players_data['players']:
        print("No players configured")
        sys.exit(1)
    
    print("🔄 League of Legends Data Transformation")
    print(f"📊 Transforming data for {len(players_data['players'])} player(s)")
    
    for player in players_data['players']:
        transform_player(player['id'], player['puuid'])
    
    print("\n" + "="*60)
    print("🎉 All transformations complete!")
    print("="*60)


if __name__ == "__main__":
    main()

