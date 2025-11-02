// ============================================================================
// League of Legends Analytics Dashboard - Data Loader & Analytics Engine
// ============================================================================

// Global data store
const AppData = {
    factMatches: [],
    dimChampions: {},
    dimDates: {},
    dimQueues: {},
    dimRunes: {},
    dimItems: {},
    bridgeMatchItems: [],
    dimMatchMetadata: {},
    matchParticipants: {},  // NEW: Store by match_key
    
    // Enriched data (fact joined with dimensions)
    enrichedMatches: [],
    
    // Current filters
    filters: {
        timePeriod: 'all',
        queueType: 'all',
        champion: 'all'
    },
    
    // Date filters
    dateFilters: {
        startDate: null,
        endDate: null,
        timeBucket: 'monthly'
    },
    
    // Player management
    players: [],
    currentPlayerId: null,
    
    // Charts
    charts: {},
    
    // Data Dragon version (loaded from data)
    ddragonVersion: null
};

// ============================================================================
// Player Management
// ============================================================================

async function loadPlayerList() {
    // Load list of players from players.json
    try {
        const response = await fetch('../players.json');
        if (!response.ok) {
            throw new Error('Failed to load players.json');
        }
        const data = await response.json();
        AppData.players = data.players || [];
        
        // Populate custom checkbox dropdown
        const dropdown = document.getElementById('playerDropdown');
        dropdown.innerHTML = '';
        
        if (AppData.players.length === 0) {
            dropdown.innerHTML = '<div class="player-dropdown-item">No players configured</div>';
            document.getElementById('playerDropdownText').textContent = 'No players';
            return false;
        }
        
        // Add "Select All" checkbox
        const selectAllDiv = document.createElement('div');
        selectAllDiv.className = 'player-dropdown-item';
        selectAllDiv.innerHTML = `
            <input type="checkbox" id="selectAllPlayers" checked>
            <label for="selectAllPlayers" class="cursor-pointer">Select All</label>
        `;
        dropdown.appendChild(selectAllDiv);
        
        // Add divider
        const divider = document.createElement('div');
        divider.className = 'player-dropdown-divider';
        dropdown.appendChild(divider);
        
        // Add player checkboxes
        AppData.players.forEach(player => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'player-dropdown-item';
            itemDiv.innerHTML = `
                <input type="checkbox" id="player-${player.id}" value="${player.id}" class="player-checkbox" checked>
                <label for="player-${player.id}" class="cursor-pointer">${player.display_name}</label>
            `;
            dropdown.appendChild(itemDiv);
        });
        
        // Setup dropdown toggle
        const dropdownBtn = document.getElementById('playerDropdownBtn');
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== dropdownBtn) {
                dropdown.classList.add('hidden');
            }
        });
        
        // Setup Select All functionality
        const selectAllCheckbox = document.getElementById('selectAllPlayers');
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.player-checkbox');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            updatePlayerDropdownText();
        });
        
        // Update text when individual checkboxes change
        const playerCheckboxes = document.querySelectorAll('.player-checkbox');
        playerCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                updatePlayerDropdownText();
                // Update Select All state
                const allChecked = Array.from(playerCheckboxes).every(c => c.checked);
                const noneChecked = Array.from(playerCheckboxes).every(c => !c.checked);
                selectAllCheckbox.checked = allChecked;
                selectAllCheckbox.indeterminate = !allChecked && !noneChecked;
            });
        });
        
        // Set initial text
        updatePlayerDropdownText();
        
        return true;
    } catch (error) {
        console.error('Error loading player list:', error);
        document.getElementById('playerDropdownText').textContent = 'Error loading players';
        return false;
    }
}

function updatePlayerDropdownText() {
    const selected = getSelectedPlayers();
    const total = AppData.players.length;
    const text = selected.length === total 
        ? `All Players (${total})` 
        : selected.length === 0
            ? 'No players selected'
            : `${selected.length} of ${total} players`;
    document.getElementById('playerDropdownText').textContent = text;
}

function getSelectedPlayers() {
    // Get array of selected player IDs from checkboxes
    const checkboxes = document.querySelectorAll('.player-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// ============================================================================
// Data Dragon Helper Functions
// ============================================================================

function getChampionIconUrl(championKey) {
    const champion = AppData.dimChampions[championKey];
    if (champion && champion.icon_url) {
        return champion.icon_url;
    }
    return '';  // Fallback to placeholder
}

function getChampionIconUrlById(championId, championName) {
    // First try to find in our dimension table
    const champion = Object.values(AppData.dimChampions).find(c => c.champion_id == championId);
    if (champion && champion.icon_url) {
        return champion.icon_url;
    }
    
    // If not found, generate URL directly from champion name
    // Data Dragon URL format: https://ddragon.leagueoflegends.com/cdn/VERSION/img/champion/CHAMPION_NAME.png
    if (championName) {
        // Use the latest version from any champion in our data
        const sampleChamp = Object.values(AppData.dimChampions)[0];
        if (sampleChamp && sampleChamp.icon_url) {
            // Extract version from existing URL (e.g., "15.21.1" from the URL)
            const versionMatch = sampleChamp.icon_url.match(/cdn\/([\d.]+)\//);
            if (versionMatch) {
                const version = versionMatch[1];
                return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championName}.png`;
            }
        }
    }
    
    return '';  // Fallback to placeholder
}

function getItemIconUrl(itemKey) {
    const item = AppData.dimItems[itemKey];
    if (item && item.icon_url) {
        return item.icon_url;
    }
    
    // If not found, try to generate URL directly
    if (itemKey && itemKey !== 0) {
        const sampleItem = Object.values(AppData.dimItems)[0];
        if (sampleItem && sampleItem.icon_url) {
            const versionMatch = sampleItem.icon_url.match(/cdn\/([\d.]+)\//);
            if (versionMatch) {
                const version = versionMatch[1];
                return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemKey}.png`;
            }
        }
    }
    
    return '';  // Fallback to placeholder
}

function createChampionIcon(championKey, size = 40) {
    const iconUrl = getChampionIconUrl(championKey);
    const champion = AppData.dimChampions[championKey];
    const name = champion ? champion.champion_name : 'Unknown';
    
    if (iconUrl) {
        return `<img src="${iconUrl}" alt="${name}" 
                     class="w-${size} h-${size} rounded-full border-2 border-gray-600" 
                     title="${name}" 
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2240%22 fill=%22%234b5563%22/%3E%3Ctext x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2220%22%3E${name.charAt(0)}%3C/text%3E%3C/svg%3E'">`;
    }
    
    // Fallback: text initial
    return `<div class="w-${size} h-${size} rounded-full bg-gray-600 flex items-center justify-center text-white font-bold" title="${name}">
        ${name.charAt(0)}
    </div>`;
}

function createChampionIconById(championId, championName, size = 40) {
    const iconUrl = getChampionIconUrlById(championId, championName);
    const name = championName || 'Unknown';
    
    if (iconUrl) {
        return `<img src="${iconUrl}" alt="${name}" 
                     class="w-${size} h-${size} rounded-full border-2 border-gray-600" 
                     title="${name}" 
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2240%22 fill=%22%234b5563%22/%3E%3Ctext x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2220%22%3E${name.charAt(0)}%3C/text%3E%3C/svg%3E'">`;
    }
    
    // Fallback: text initial
    return `<div class="w-${size} h-${size} rounded-full bg-gray-600 flex items-center justify-center text-white font-bold" title="${name}">
        ${name.charAt(0)}
    </div>`;
}

function createItemIcon(itemKey, size = 8) {
    if (!itemKey || itemKey === 0) {
        return `<div class="w-${size} h-${size} bg-gray-700 rounded border border-gray-600"></div>`;
    }
    
    const iconUrl = getItemIconUrl(itemKey);
    const item = AppData.dimItems[itemKey];
    const name = item ? item.item_name : `Item ${itemKey}`;
    
    if (iconUrl) {
        // Use data URI fallback that shows item ID if image fails
        const fallbackSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect fill='%23374151' width='32' height='32'/%3E%3Ctext x='16' y='18' text-anchor='middle' fill='white' font-size='10'%3E${itemKey}%3C/text%3E%3C/svg%3E`;
        return `<img src="${iconUrl}" alt="${name}" 
                     class="w-${size} h-${size} rounded border border-gray-600" 
                     title="${name}"
                     onerror="this.onerror=null; this.src='${fallbackSvg}'">`;
    }
    
    // Fallback: box with item ID
    return `<div class="w-${size} h-${size} bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-xs text-white" title="${name}" style="font-size: 8px;">${itemKey}</div>`;
}

// ============================================================================
// Data Loading Functions
// ============================================================================

async function loadCSV(filepath) {
    return new Promise((resolve, reject) => {
        Papa.parse(filepath, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error)
        });
    });
}

async function loadAllData(playerIds) {
    // Accept single player ID or array of player IDs
    if (!playerIds || (Array.isArray(playerIds) && playerIds.length === 0)) {
        throw new Error('At least one player ID is required');
    }
    
    // Normalize to array
    const playerIdArray = Array.isArray(playerIds) ? playerIds : [playerIds];
    AppData.currentPlayerId = playerIdArray.join(',');
    
    // Reset data structures
    AppData.factMatches = [];
    AppData.dimChampions = {};
    AppData.dimDates = {};
    AppData.dimQueues = {};
    AppData.dimRunes = {};
    AppData.dimItems = {};
    AppData.bridgeMatchItems = [];
    AppData.dimMatchMetadata = {};
    AppData.matchParticipants = {};
    
    try {
        // Load data from all selected players
        for (const playerId of playerIdArray) {
            const dataPath = `../data/${playerId}`;
            
            updateLoadingStatus(`Loading data for ${playerId}...`);
            
            // Load fact matches
            const factMatches = await loadCSV(`${dataPath}/fact_matches.csv`);
            AppData.factMatches = AppData.factMatches.concat(factMatches);
            
            // Load and merge champions (avoid duplicates)
            const champions = await loadCSV(`${dataPath}/dim_champion.csv`);
            champions.forEach(c => {
                if (!AppData.dimChampions[c.champion_key]) {
                    AppData.dimChampions[c.champion_key] = c;
                }
            });
            
            // Load and merge dates
            const dates = await loadCSV(`${dataPath}/dim_date.csv`);
            dates.forEach(d => {
                if (!AppData.dimDates[d.date_key]) {
                    AppData.dimDates[d.date_key] = d;
                }
            });
            
            // Load and merge queues
            const queues = await loadCSV(`${dataPath}/dim_queue.csv`);
            queues.forEach(q => {
                if (!AppData.dimQueues[q.queue_key]) {
                    AppData.dimQueues[q.queue_key] = q;
                }
            });
            
            // Load and merge runes
            const runes = await loadCSV(`${dataPath}/dim_rune.csv`);
            runes.forEach(r => {
                if (!AppData.dimRunes[r.rune_key]) {
                    AppData.dimRunes[r.rune_key] = r;
                }
            });
            
            // Load and merge items
            const items = await loadCSV(`${dataPath}/dim_items.csv`);
            items.forEach(i => {
                if (!AppData.dimItems[i.item_key]) {
                    AppData.dimItems[i.item_key] = i;
                }
            });
            
            // Load and concat bridge match items
            const bridgeItems = await loadCSV(`${dataPath}/bridge_match_items.csv`);
            AppData.bridgeMatchItems = AppData.bridgeMatchItems.concat(bridgeItems);
            
            // Load and merge match metadata
            const metadata = await loadCSV(`${dataPath}/dim_match_metadata.csv`);
            metadata.forEach(m => {
                if (!AppData.dimMatchMetadata[m.match_key]) {
                    AppData.dimMatchMetadata[m.match_key] = m;
                }
            });
            
            // Load and process participants
            const participants = await loadCSV(`${dataPath}/bridge_match_participants.csv`);
            participants.forEach(p => {
                if (!AppData.matchParticipants[p.match_key]) {
                    AppData.matchParticipants[p.match_key] = [];
                }
                // Parse items JSON string
                if (p.items && typeof p.items === 'string') {
                    p.items = JSON.parse(p.items);
                }
                AppData.matchParticipants[p.match_key].push(p);
            });
        }
        
        // Validate that we have match data
        if (!AppData.factMatches || AppData.factMatches.length === 0) {
            throw new Error(`No matches found for selected player(s). Players may not have any games in queues 400 (Draft Normal) or 420 (Ranked Solo/Duo) during 2024-2025, or extraction may have failed.`);
        }
        
        updateLoadingStatus(`Loaded ${AppData.factMatches.length} total matches from ${playerIdArray.length} player(s)...`);
        
        updateLoadingStatus('Joining data...');
        enrichMatchData();
        
        updateLoadingStatus('Complete!');
        initializeDateFilters(); // Initialize date filters with default 30-day range
        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        updateLoadingStatus('Error loading data: ' + error.message);
        return false;
    }
}

function enrichMatchData() {
    AppData.enrichedMatches = AppData.factMatches.map(fact => {
        const champion = AppData.dimChampions[fact.champion_key] || {};
        const date = AppData.dimDates[fact.date_key] || {};
        const queue = AppData.dimQueues[fact.queue_key] || {};
        const metadata = AppData.dimMatchMetadata[fact.match_key] || {};
        
        // Get rune information with full details
        const runes = AppData.dimRunes[fact.rune_key] || {};
        
        // Build combined rune names
        const primaryStyle = runes.primary_style_name || 'Unknown';
        const secondaryStyle = runes.sub_style_name || 'Unknown';
        
        // Get items for this match
        const matchItems = AppData.bridgeMatchItems
            .filter(b => b.match_key === fact.match_key)
            .sort((a, b) => a.item_position - b.item_position)
            .map(b => b.item_key);
        
        // Recalculate KDA with correct formula: (Kills + Assists) / Deaths (use 1 if deaths is 0)
        const deaths = fact.deaths === 0 ? 1 : fact.deaths;
        const kda = ((fact.kills + fact.assists) / deaths).toFixed(2);
        
        return {
            ...fact,
            kda: parseFloat(kda), // Override KDA with correct calculation
            champion_name: champion.champion_name,
            champion_id: champion.champion_id,
            role: champion.role,
            queue_name: queue.queue_name,
            is_ranked: queue.is_ranked,
            date: date.full_date,
            day_of_week: date.day_of_week,
            is_weekend: date.is_weekend,
            hour_of_day: date.hour_of_day,
            match_id: metadata.match_id,
            timestamp: metadata.timestamp,
            items: matchItems,
            // Add rune information
            rune_primary: primaryStyle,
            rune_secondary: secondaryStyle,
            rune_combo: `${primaryStyle} / ${secondaryStyle}`,
            // Add detailed rune data
            keystone_id: runes.keystone_id,
            keystone_name: runes.keystone_name,
            keystone_icon: runes.keystone_icon,
            primary_rune2_id: runes.primary_rune2_id,
            primary_rune2_name: runes.primary_rune2_name,
            primary_rune2_icon: runes.primary_rune2_icon,
            primary_rune3_id: runes.primary_rune3_id,
            primary_rune3_name: runes.primary_rune3_name,
            primary_rune3_icon: runes.primary_rune3_icon,
            primary_rune4_id: runes.primary_rune4_id,
            primary_rune4_name: runes.primary_rune4_name,
            primary_rune4_icon: runes.primary_rune4_icon,
            secondary_rune1_id: runes.secondary_rune1_id,
            secondary_rune1_name: runes.secondary_rune1_name,
            secondary_rune1_icon: runes.secondary_rune1_icon,
            secondary_rune2_id: runes.secondary_rune2_id,
            secondary_rune2_name: runes.secondary_rune2_name,
            secondary_rune2_icon: runes.secondary_rune2_icon
        };
    });
    
    // Sort by timestamp descending (most recent first)
    AppData.enrichedMatches.sort((a, b) => b.timestamp - a.timestamp);
}

function updateLoadingStatus(message) {
    const statusEl = document.getElementById('loadingStatus');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

// ============================================================================
// Data Filtering
// ============================================================================

function getFilteredMatches() {
    let matches = [...AppData.enrichedMatches];
    
    // Apply date range filter FIRST (before time period filter)
    if (AppData.dateFilters.startDate && AppData.dateFilters.endDate) {
        const startTime = AppData.dateFilters.startDate.getTime();
        const endTime = AppData.dateFilters.endDate.getTime() + (24 * 60 * 60 * 1000); // Include end date
        
        matches = matches.filter(m => {
            const matchTime = m.timestamp;
            return matchTime >= startTime && matchTime < endTime;
        });
    }
    
    // Apply time period filter
    if (AppData.filters.timePeriod !== 'all') {
        const limit = parseInt(AppData.filters.timePeriod);
        matches = matches.slice(0, limit);
    }
    
    // Apply queue filter
    if (AppData.filters.queueType !== 'all') {
        const queueKey = parseInt(AppData.filters.queueType);
        matches = matches.filter(m => m.queue_key === queueKey);
    }
    
    // Apply champion filter
    if (AppData.filters.champion !== 'all') {
        matches = matches.filter(m => m.champion_name === AppData.filters.champion);
    }
    
    return matches;
}

// ============================================================================
// Date Filter Functions
// ============================================================================

function initializeDateFilters() {
    // Set default: 2024-01-01 to today
    const endDate = new Date();
    const startDate = new Date('2024-01-01');
    
    document.getElementById('startDate').valueAsDate = startDate;
    document.getElementById('endDate').valueAsDate = endDate;
    document.getElementById('timeBucket').value = 'monthly';
    
    AppData.dateFilters.startDate = startDate;
    AppData.dateFilters.endDate = endDate;
    AppData.dateFilters.timeBucket = 'monthly';
    
    // Attach event listeners
    document.getElementById('applyDateFilters').addEventListener('click', applyDateFilters);
    document.getElementById('resetDateFilters').addEventListener('click', resetDateFilters);
}

function applyDateFilters() {
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    
    AppData.dateFilters.startDate = startInput.valueAsDate;
    AppData.dateFilters.endDate = endInput.valueAsDate;
    AppData.dateFilters.timeBucket = document.getElementById('timeBucket').value;
    
    // Refresh all visualizations
    refreshDashboard();
}

function resetDateFilters() {
    const endDate = new Date();
    const startDate = new Date('2024-01-01');
    
    document.getElementById('startDate').valueAsDate = startDate;
    document.getElementById('endDate').valueAsDate = endDate;
    document.getElementById('timeBucket').value = 'monthly';
    
    applyDateFilters();
}

// Time bucketing aggregation function
function aggregateMatchesByTimeBucket(matches, bucket) {
    if (matches.length === 0) return { buckets: [], individual: [] };
    
    // Sort by timestamp
    const sorted = [...matches].sort((a, b) => a.timestamp - b.timestamp);
    
    // Create buckets
    const bucketMap = new Map();
    
    sorted.forEach(match => {
        const date = new Date(match.timestamp);
        let bucketKey;
        
        switch(bucket) {
            case 'daily':
                bucketKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
                break;
            case 'weekly':
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                bucketKey = weekStart.toISOString().split('T')[0];
                break;
            case 'monthly':
                bucketKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                break;
            case 'quarterly':
                const quarter = Math.floor(date.getMonth() / 3) + 1;
                bucketKey = `${date.getFullYear()}-Q${quarter}`;
                break;
            case 'yearly':
                bucketKey = `${date.getFullYear()}`;
                break;
            default:
                bucketKey = date.toISOString().split('T')[0];
        }
        
        if (!bucketMap.has(bucketKey)) {
            bucketMap.set(bucketKey, []);
        }
        bucketMap.get(bucketKey).push(match);
    });
    
    // Calculate aggregated metrics for each bucket
    const buckets = Array.from(bucketMap.entries()).map(([key, matches]) => {
        const totalGames = matches.length;
        const wins = matches.filter(m => m.win).length;
        
        return {
            date: key,
            timestamp: matches[0].timestamp, // Use first match timestamp
            games: totalGames,
            winRate: (wins / totalGames * 100).toFixed(1),
            avgKDA: (matches.reduce((sum, m) => sum + m.kda, 0) / totalGames).toFixed(2),
            avgKills: (matches.reduce((sum, m) => sum + m.kills, 0) / totalGames).toFixed(1),
            avgDeaths: (matches.reduce((sum, m) => sum + m.deaths, 0) / totalGames).toFixed(1),
            avgAssists: (matches.reduce((sum, m) => sum + m.assists, 0) / totalGames).toFixed(1),
            avgKP: (matches.reduce((sum, m) => sum + (m.kill_participation * 100), 0) / totalGames).toFixed(1),
            avgGoldPerMin: (matches.reduce((sum, m) => sum + m.gold_per_minute, 0) / totalGames).toFixed(0),
            avgCSPerMin: (matches.reduce((sum, m) => sum + m.cs_per_minute, 0) / totalGames).toFixed(1),
            avgVision: (matches.reduce((sum, m) => sum + m.vision_score, 0) / totalGames).toFixed(0),
            matches: matches // Keep individual matches for tooltip
        };
    });
    
    return {
        buckets: buckets,
        individual: sorted
    };
}

function getTimeUnit(bucket) {
    const units = {
        daily: 'day',
        weekly: 'week',
        monthly: 'month',
        quarterly: 'quarter',
        yearly: 'year'
    };
    return units[bucket] || 'day';
}

// ============================================================================
// Analytics Functions
// ============================================================================

function calculateSummaryStats(matches) {
    if (matches.length === 0) {
        return {
            totalGames: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            avgKills: 0,
            avgDeaths: 0,
            avgAssists: 0,
            avgKDA: 0,
            avgCS: 0,
            avgVision: 0,
            avgGold: 0,
            avgDamage: 0
        };
    }
    
    const wins = matches.filter(m => m.win === 1).length;
    const losses = matches.length - wins;
    
    const sum = matches.reduce((acc, m) => ({
        kills: acc.kills + m.kills,
        deaths: acc.deaths + m.deaths,
        assists: acc.assists + m.assists,
        kda: acc.kda + m.kda,
        cs: acc.cs + m.cs_per_minute,
        vision: acc.vision + m.vision_score,
        gold: acc.gold + m.gold_per_minute,
        damage: acc.damage + m.damage_per_minute
    }), { kills: 0, deaths: 0, assists: 0, kda: 0, cs: 0, vision: 0, gold: 0, damage: 0 });
    
    return {
        totalGames: matches.length,
        wins,
        losses,
        winRate: (wins / matches.length * 100).toFixed(1),
        avgKills: (sum.kills / matches.length).toFixed(1),
        avgDeaths: (sum.deaths / matches.length).toFixed(1),
        avgAssists: (sum.assists / matches.length).toFixed(1),
        avgKDA: (sum.kda / matches.length).toFixed(2),
        avgCS: (sum.cs / matches.length).toFixed(1),
        avgVision: (sum.vision / matches.length).toFixed(1),
        avgGold: (sum.gold / matches.length).toFixed(0),
        avgDamage: (sum.damage / matches.length).toFixed(0)
    };
}

function getChampionStats(matches) {
    const championMap = {};
    
    matches.forEach(match => {
        const champ = match.champion_name;
        if (!championMap[champ]) {
            championMap[champ] = {
                name: champ,
                games: 0,
                wins: 0,
                kills: 0,
                deaths: 0,
                assists: 0,
                cs: 0,
                gold: 0,
                damage: 0
            };
        }
        
        const stats = championMap[champ];
        stats.games++;
        stats.wins += match.win;
        stats.kills += match.kills;
        stats.deaths += match.deaths;
        stats.assists += match.assists;
        stats.cs += match.cs_per_minute;
        stats.gold += match.gold_per_minute;
        stats.damage += match.damage_per_minute;
    });
    
    // Calculate averages
    return Object.values(championMap).map(stats => ({
        ...stats,
        winRate: (stats.wins / stats.games * 100).toFixed(1),
        avgKDA: stats.deaths > 0 ? ((stats.kills + stats.assists) / stats.deaths / stats.games).toFixed(2) : stats.games,
        avgKills: (stats.kills / stats.games).toFixed(1),
        avgDeaths: (stats.deaths / stats.games).toFixed(1),
        avgAssists: (stats.assists / stats.games).toFixed(1),
        avgCS: (stats.cs / stats.games).toFixed(1),
        avgGold: (stats.gold / stats.games).toFixed(0),
        avgDamage: (stats.damage / stats.games).toFixed(0)
    })).sort((a, b) => b.games - a.games);
}

function detectStreaks(matches) {
    if (matches.length === 0) return { current: 'None', longest: 'None' };
    
    // Current streak (most recent games)
    let currentStreak = 0;
    let currentType = matches[0].win ? 'W' : 'L';
    
    for (const match of matches) {
        if ((match.win && currentType === 'W') || (!match.win && currentType === 'L')) {
            currentStreak++;
        } else {
            break;
        }
    }
    
    // Longest streak
    let longestWin = 0, currentWin = 0;
    let longestLoss = 0, currentLoss = 0;
    
    matches.forEach(match => {
        if (match.win) {
            currentWin++;
            currentLoss = 0;
            longestWin = Math.max(longestWin, currentWin);
        } else {
            currentLoss++;
            currentWin = 0;
            longestLoss = Math.max(longestLoss, currentLoss);
        }
    });
    
    return {
        current: `${currentStreak} game ${currentType === 'W' ? 'win' : 'loss'} streak`,
        longestWin: `${longestWin} games`,
        longestLoss: `${longestLoss} games`
    };
}

// ============================================================================
// UI Update Functions
// ============================================================================

function updateSummaryCards() {
    const matches = getFilteredMatches();
    const stats = calculateSummaryStats(matches);
    
    document.getElementById('totalGames').textContent = stats.totalGames;
    document.getElementById('winRate').textContent = stats.winRate + '%';
    document.getElementById('winLoss').textContent = `${stats.wins}W - ${stats.losses}L`;
    document.getElementById('avgKDA').textContent = stats.avgKDA;
    document.getElementById('avgKills').textContent = `${stats.avgKills} / ${stats.avgDeaths} / ${stats.avgAssists}`;
    document.getElementById('avgCS').textContent = stats.avgCS;
    document.getElementById('avgVision').textContent = stats.avgVision;
}

function updateChampionFilter() {
    const championSet = new Set(AppData.enrichedMatches.map(m => m.champion_name));
    const select = document.getElementById('championFilter');
    
    // Clear existing options except "All Champions"
    select.innerHTML = '<option value="all">All Champions</option>';
    
    // Add champion options
    Array.from(championSet).sort().forEach(champ => {
        const option = document.createElement('option');
        option.value = champ;
        option.textContent = champ;
        select.appendChild(option);
    });
}

function updateChampionSection() {
    const matches = getFilteredMatches();
    const championStats = getChampionStats(matches);
    
    // Best performing (by win rate, min 3 games)
    const best = championStats
        .filter(c => c.games >= 3)
        .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))
        .slice(0, 5);
    
    document.getElementById('bestChampions').innerHTML = best.map(c => {
        // Find first match with this champion to get the key
        const match = matches.find(m => m.champion_name === c.name);
        const championKey = match ? match.champion_key : null;
        
        return `
            <div class="flex justify-between items-center p-2 bg-gray-700 rounded hover:bg-gray-600 transition">
                <div class="flex items-center gap-2">
                    ${championKey ? createChampionIcon(championKey, 8) : ''}
                    <span class="font-medium">${c.name}</span>
                </div>
                <span class="text-green-400">${c.winRate}% (${c.games}G)</span>
            </div>
        `;
    }).join('');
    
    // Most played
    const mostPlayed = championStats.slice(0, 5);
    
    document.getElementById('mostPlayedChampions').innerHTML = mostPlayed.map(c => {
        const match = matches.find(m => m.champion_name === c.name);
        const championKey = match ? match.champion_key : null;
        
        return `
            <div class="flex justify-between items-center p-2 bg-gray-700 rounded hover:bg-gray-600 transition">
                <div class="flex items-center gap-2">
                    ${championKey ? createChampionIcon(championKey, 8) : ''}
                    <span class="font-medium">${c.name}</span>
                </div>
                <span class="text-blue-400">${c.games} games</span>
            </div>
        `;
    }).join('');
    
    // Worst performing (by win rate, min 3 games)
    const worst = championStats
        .filter(c => c.games >= 3)
        .sort((a, b) => parseFloat(a.winRate) - parseFloat(b.winRate))
        .slice(0, 5);
    
    document.getElementById('worstChampions').innerHTML = worst.map(c => {
        const match = matches.find(m => m.champion_name === c.name);
        const championKey = match ? match.champion_key : null;
        
        return `
            <div class="flex justify-between items-center p-2 bg-gray-700 rounded hover:bg-gray-600 transition">
                <div class="flex items-center gap-2">
                    ${championKey ? createChampionIcon(championKey, 8) : ''}
                    <span class="font-medium">${c.name}</span>
                </div>
                <span class="text-red-400">${c.winRate}% (${c.games}G)</span>
            </div>
        `;
    }).join('');
    
    // Champion table
    const tbody = document.getElementById('championTableBody');
    tbody.innerHTML = championStats.map(c => `
        <tr class="border-b border-gray-700 hover:bg-gray-700">
            <td class="px-4 py-3 font-medium">${c.name}</td>
            <td class="px-4 py-3">${c.games}</td>
            <td class="px-4 py-3 ${parseFloat(c.winRate) >= 50 ? 'text-green-400' : 'text-red-400'}">${c.winRate}%</td>
            <td class="px-4 py-3 font-semibold">${c.avgKDA}</td>
            <td class="px-4 py-3 text-sm">${c.avgKills} / ${c.avgDeaths} / ${c.avgAssists}</td>
            <td class="px-4 py-3">${c.avgCS}</td>
            <td class="px-4 py-3">${c.avgGold}</td>
            <td class="px-4 py-3">${c.avgDamage}</td>
        </tr>
    `).join('');
}

function updateCombatSection() {
    const matches = getFilteredMatches();
    
    // Multi-kills totals
    const totals = matches.reduce((acc, m) => ({
        double: acc.double + m.double_kills,
        triple: acc.triple + m.triple_kills,
        quadra: acc.quadra + m.quadra_kills,
        penta: acc.penta + m.penta_kills
    }), { double: 0, triple: 0, quadra: 0, penta: 0 });
    
    document.getElementById('doubleKills').textContent = totals.double;
    document.getElementById('tripleKills').textContent = totals.triple;
    document.getElementById('quadraKills').textContent = totals.quadra;
    document.getElementById('pentaKills').textContent = totals.penta;
}

function updateMatchHistoryTable() {
    const matches = getFilteredMatches();
    const tbody = document.getElementById('matchHistoryBody');
    
    tbody.innerHTML = matches.map(m => {
        const resultClass = m.win ? 'win-bg' : 'loss-bg';
        const resultText = m.win ? 'WIN' : 'LOSS';
        const resultColor = m.win ? 'win-text' : 'loss-text';
        
        // Get items for this match
        const itemIcons = (m.items || []).slice(0, 7).map(itemKey => 
            createItemIcon(itemKey, 6)
        ).join('');
        
        // Build expandable details row
        const detailsRow = createMatchDetailsRow(m);
        
        return `
            <tr class="match-row ${resultClass} border-b border-gray-700" data-match-key="${m.match_key}" onclick="toggleMatchDetails(${m.match_key})">
                <td class="px-4 py-3">
                    <span class="expand-arrow" id="arrow-${m.match_key}">▶</span>
                    <span class="font-bold ${resultColor}">${resultText}</span>
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        ${createChampionIcon(m.champion_key, 10)}
                        <span class="font-medium">${m.champion_name}</span>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm">${m.queue_name || 'Unknown'}</td>
                <td class="px-4 py-3 text-sm">${m.date || 'N/A'}</td>
                <td class="px-4 py-3 text-sm">${Math.floor(m.game_duration_minutes)}m</td>
                <td class="px-4 py-3">${m.kills}/${m.deaths}/${m.assists}</td>
                <td class="px-4 py-3 font-semibold">${m.kda}</td>
                <td class="px-4 py-3">${m.cs_total}</td>
                <td class="px-4 py-3">${m.gold_earned.toLocaleString()}</td>
                <td class="px-4 py-3">${m.damage_dealt.toLocaleString()}</td>
                <td class="px-4 py-3">
                    <div class="flex gap-0.5">
                        ${itemIcons}
                    </div>
                </td>
            </tr>
            ${detailsRow}
        `;
    }).join('');
}

function toggleMatchDetails(matchKey) {
    const detailsRow = document.getElementById(`details-${matchKey}`);
    const arrow = document.getElementById(`arrow-${matchKey}`);
    
    if (detailsRow.classList.contains('hidden')) {
        detailsRow.classList.remove('hidden');
        arrow.classList.add('expanded');
    } else {
        detailsRow.classList.add('hidden');
        arrow.classList.remove('expanded');
    }
}

function createMatchDetailsRow(match) {
    const participants = AppData.matchParticipants[match.match_key];
    
    if (!participants || participants.length === 0) {
        return `
            <tr class="match-details hidden" id="details-${match.match_key}">
                <td colspan="11" class="px-4 py-4 text-center text-gray-500">
                    No detailed participant data available
                </td>
            </tr>
        `;
    }
    
    // Sort participants: Blue team (100) first, then Red team (200)
    const sortedParticipants = [...participants].sort((a, b) => {
        if (a.team_id !== b.team_id) return a.team_id - b.team_id;
        // Within team, sort by team position
        const positions = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
        return positions.indexOf(a.team_position) - positions.indexOf(b.team_position);
    });
    
    const blueTeam = sortedParticipants.filter(p => p.team_id === 100);
    const redTeam = sortedParticipants.filter(p => p.team_id === 200);
    
    return `
        <tr class="match-details hidden" id="details-${match.match_key}">
            <td colspan="11" class="px-0 py-0">
                <div class="p-4 bg-gray-800">
                    ${renderTeamScoreboard(blueTeam, 'BLUE TEAM', match, participants)}
                    <div class="my-3 border-t border-gray-600"></div>
                    ${renderTeamScoreboard(redTeam, 'RED TEAM', match, participants)}
                </div>
            </td>
        </tr>
    `;
}

function renderTeamScoreboard(team, teamName, match, allParticipants) {
    const teamWon = team[0].win === 1;
    const teamColor = teamName.startsWith('BLUE') ? 'text-blue-400' : 'text-red-400';
    
    return `
        <div class="mb-3">
            <div class="team-header ${teamColor}">
                ${teamName} ${teamWon ? '(VICTORY)' : '(DEFEAT)'}
            </div>
            ${team.map(p => renderParticipantRow(p, match, allParticipants)).join('')}
        </div>
    `;
}

function renderParticipantRow(participant, match, allParticipants) {
    const isPlayer = participant.is_player === 1;
    const playerClass = isPlayer ? 'player' : '';
    
    // Calculate badges (with safety check)
    let badgeHTML = '';
    if (typeof BadgeSystem !== 'undefined') {
        const badgeKeys = BadgeSystem.calculateBadges(participant, allParticipants);
        const topBadges = BadgeSystem.getTopBadges(badgeKeys, 5); // Get top 5 badge objects
        
        // Use BadgeSystem.renderBadge() for consistent tooltip behavior
        badgeHTML = topBadges.map(badge => BadgeSystem.renderBadge(badge)).join('');
    } else {
        console.error('BadgeSystem is not defined! Make sure badges.js loads before data-loader.js');
        badgeHTML = '<span class="text-gray-500 text-xs">Badges unavailable</span>';
    }
    
    // Get item icons
    const itemIcons = (participant.items || []).slice(0, 7).map(itemKey => 
        createItemIcon(itemKey, 6)
    ).join('');
    
    return `
        <div class="participant-row ${playerClass}">
            <div class="flex items-center gap-2">
                ${createChampionIconById(participant.champion_id, participant.champion_name, 8)}
                <div>
                    <div class="font-medium text-sm">
                        ${participant.summoner_name || participant.riot_id_game_name || 'Unknown'}
                        ${isPlayer ? '<span class="text-blue-400 font-bold ml-2">(YOU)</span>' : ''}
                    </div>
                    <div class="text-xs text-gray-400">${participant.team_position}</div>
                </div>
            </div>
            
            <div class="participant-stats">
                <div>
                    <div class="stat-label">KDA</div>
                    <div class="font-semibold">${participant.kills}/${participant.deaths}/${participant.assists}</div>
                    <div class="text-xs text-gray-400">${participant.kda}</div>
                </div>
                
                <div>
                    <div class="stat-label">CS</div>
                    <div>${participant.cs_total}</div>
                    <div class="text-xs text-gray-400">${participant.cs_per_minute}/min</div>
                </div>
                
                <div>
                    <div class="stat-label">Gold</div>
                    <div>${(participant.gold_earned / 1000).toFixed(1)}k</div>
                    <div class="text-xs text-gray-400">${Math.round(participant.gold_per_minute)}/min</div>
                </div>
                
                <div>
                    <div class="stat-label">Damage</div>
                    <div>${(participant.damage_dealt / 1000).toFixed(1)}k</div>
                    <div class="text-xs text-gray-400">${Math.round(participant.damage_per_minute)}/min</div>
                </div>
                
                <div>
                    <div class="stat-label">Vision</div>
                    <div>${participant.vision_score}</div>
                    <div class="text-xs text-gray-400">${participant.control_wards_purchased} pinks</div>
                </div>
                
                <div>
                    <div class="stat-label">KP</div>
                    <div>${(participant.kill_participation * 100).toFixed(0)}%</div>
                </div>
            </div>
            
            <div class="item-container">
                ${itemIcons}
            </div>
            
            <div class="badge-container">
                ${badgeHTML || '<span class="text-gray-500 text-xs">No badges</span>'}
            </div>
        </div>
    `;
}

function updateInsightsSection() {
    const matches = getFilteredMatches();
    const streaks = detectStreaks(matches);
    
    document.getElementById('streakInfo').innerHTML = `
        <div class="flex justify-between p-3 bg-gray-700 rounded">
            <span class="text-gray-300">Current Streak:</span>
            <span class="font-bold text-white">${streaks.current}</span>
        </div>
        <div class="flex justify-between p-3 bg-gray-700 rounded">
            <span class="text-gray-300">Longest Win Streak:</span>
            <span class="font-bold text-green-400">${streaks.longestWin}</span>
        </div>
        <div class="flex justify-between p-3 bg-gray-700 rounded">
            <span class="text-gray-300">Longest Loss Streak:</span>
            <span class="font-bold text-red-400">${streaks.longestLoss}</span>
        </div>
    `;
    
    // Generate insights
    const stats = calculateSummaryStats(matches);
    const insights = [];
    
    if (parseFloat(stats.winRate) >= 55) {
        insights.push({ text: `Strong win rate of ${stats.winRate}%`, icon: '🔥' });
    } else if (parseFloat(stats.winRate) <= 45) {
        insights.push({ text: `Win rate needs improvement (${stats.winRate}%)`, icon: '📉' });
    }
    
    if (parseFloat(stats.avgKDA) >= 3) {
        insights.push({ text: `Excellent KDA of ${stats.avgKDA}`, icon: '⚔️' });
    }
    
    if (parseFloat(stats.avgCS) >= 7) {
        insights.push({ text: `Great farming (${stats.avgCS} CS/min)`, icon: '🌾' });
    } else if (parseFloat(stats.avgCS) < 5) {
        insights.push({ text: `Focus on CS (${stats.avgCS} CS/min)`, icon: '📊' });
    }
    
    if (parseFloat(stats.avgVision) >= 40) {
        insights.push({ text: `Excellent vision control (${stats.avgVision} avg)`, icon: '👁️' });
    }
    
    document.getElementById('keyInsights').innerHTML = insights.map(i => `
        <div class="flex items-start p-3 bg-gray-700 rounded">
            <span class="text-2xl mr-3">${i.icon}</span>
            <span class="text-gray-300">${i.text}</span>
        </div>
    `).join('') || '<div class="text-gray-500">Not enough data for insights</div>';
}

function updateItemSection() {
    const matches = getFilteredMatches();
    
    // Group items by match and count frequency
    const itemCombos = {};
    
    matches.forEach(m => {
        if (m.items && m.items.length > 0) {
            // Get final build (last 6 items, excluding trinkets)
            const build = m.items.filter(item => item !== 0).slice(0, 6);
            if (build.length >= 3) {
                const buildKey = build.sort((a, b) => a - b).join('-');
                if (!itemCombos[buildKey]) {
                    itemCombos[buildKey] = {
                        items: build,
                        count: 0,
                        wins: 0,
                        champion: m.champion_name
                    };
                }
                itemCombos[buildKey].count++;
                if (m.win) itemCombos[buildKey].wins++;
            }
        }
    });
    
    // Sort by frequency and get top 5
    const topBuilds = Object.values(itemCombos)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    
    const itemBuildsHTML = topBuilds.map(build => {
        const winRate = ((build.wins / build.count) * 100).toFixed(1);
        const itemIcons = build.items.map(itemKey => createItemIcon(itemKey, 10)).join('');
        
        return `
            <div class="flex items-center justify-between p-3 bg-gray-700 rounded">
                <div class="flex items-center gap-3">
                    <div class="flex gap-1">
                        ${itemIcons}
                    </div>
                    <span class="text-sm text-gray-400">${build.champion}</span>
                </div>
                <div class="text-right">
                    <div class="text-white font-semibold">${winRate}% WR</div>
                    <div class="text-xs text-gray-400">${build.count} games</div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('itemBuilds').innerHTML = itemBuildsHTML || 
        '<div class="text-gray-500 text-center py-8">No item build data available</div>';
}

function updateRuneSection() {
    const matches = getFilteredMatches();
    
    // Group by rune setup (using keystone + all runes as unique identifier)
    const runeSetups = {};
    
    matches.forEach(m => {
        if (m.keystone_name && m.rune_primary) {
            const key = `${m.keystone_name}-${m.rune_combo}`; // Unique key for this rune setup
            if (!runeSetups[key]) {
                runeSetups[key] = {
                    primary: m.rune_primary,
                    secondary: m.rune_secondary,
                    keystone_name: m.keystone_name,
                    keystone_icon: m.keystone_icon,
                    primary_rune2_name: m.primary_rune2_name,
                    primary_rune2_icon: m.primary_rune2_icon,
                    primary_rune3_name: m.primary_rune3_name,
                    primary_rune3_icon: m.primary_rune3_icon,
                    primary_rune4_name: m.primary_rune4_name,
                    primary_rune4_icon: m.primary_rune4_icon,
                    secondary_rune1_name: m.secondary_rune1_name,
                    secondary_rune1_icon: m.secondary_rune1_icon,
                    secondary_rune2_name: m.secondary_rune2_name,
                    secondary_rune2_icon: m.secondary_rune2_icon,
                    count: 0,
                    wins: 0
                };
            }
            runeSetups[key].count++;
            if (m.win) runeSetups[key].wins++;
        }
    });
    
    // Sort by frequency and get top 6
    const topRunes = Object.values(runeSetups)
        .filter(setup => setup.primary !== 'Unknown')
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    
    if (topRunes.length === 0) {
        document.getElementById('runeSetups').innerHTML = 
            '<div class="text-gray-500 text-center py-8 col-span-3">No rune data available</div>';
        return;
    }
    
    const runeSetupsHTML = topRunes.map(setup => {
        const winRate = ((setup.wins / setup.count) * 100).toFixed(1);
        const winColor = parseFloat(winRate) >= 50 ? 'text-green-400' : 'text-red-400';
        const secondaryText = setup.secondary === 'None' ? '<span class="italic">No Secondary</span>' : setup.secondary;
        
        // Build primary runes display (keystone is larger, other 3 runes smaller)
        const primaryRunesHTML = `
            <div class="flex items-center gap-2 mb-2">
                <img src="${setup.keystone_icon}" alt="${setup.keystone_name}" 
                     class="w-10 h-10 rounded border border-gray-600" 
                     title="${setup.keystone_name}">
                <div class="flex flex-col justify-center">
                    <span class="text-xs font-semibold text-white">${setup.keystone_name}</span>
                    <span class="text-xs text-gray-400">${setup.primary}</span>
                </div>
            </div>
            <div class="flex gap-1 mb-3">
                ${setup.primary_rune2_icon && setup.primary_rune2_name !== 'None' ? 
                    `<img src="${setup.primary_rune2_icon}" alt="${setup.primary_rune2_name}" 
                          class="w-6 h-6 rounded border border-gray-700" 
                          title="${setup.primary_rune2_name}">` : ''}
                ${setup.primary_rune3_icon && setup.primary_rune3_name !== 'None' ? 
                    `<img src="${setup.primary_rune3_icon}" alt="${setup.primary_rune3_name}" 
                          class="w-6 h-6 rounded border border-gray-700" 
                          title="${setup.primary_rune3_name}">` : ''}
                ${setup.primary_rune4_icon && setup.primary_rune4_name !== 'None' ? 
                    `<img src="${setup.primary_rune4_icon}" alt="${setup.primary_rune4_name}" 
                          class="w-6 h-6 rounded border border-gray-700" 
                          title="${setup.primary_rune4_name}">` : ''}
            </div>
        `;
        
        // Build secondary runes display
        const secondaryRunesHTML = setup.secondary !== 'None' ? `
            <div class="mb-2">
                <span class="text-xs text-gray-400">${secondaryText}</span>
            </div>
            <div class="flex gap-1 mb-2">
                ${setup.secondary_rune1_icon && setup.secondary_rune1_name !== 'None' ? 
                    `<img src="${setup.secondary_rune1_icon}" alt="${setup.secondary_rune1_name}" 
                          class="w-6 h-6 rounded border border-gray-700" 
                          title="${setup.secondary_rune1_name}">` : ''}
                ${setup.secondary_rune2_icon && setup.secondary_rune2_name !== 'None' ? 
                    `<img src="${setup.secondary_rune2_icon}" alt="${setup.secondary_rune2_name}" 
                          class="w-6 h-6 rounded border border-gray-700" 
                          title="${setup.secondary_rune2_name}">` : ''}
            </div>
        ` : `<div class="mb-2"><span class="text-xs text-gray-400 italic">${secondaryText}</span></div>`;
        
        return `
            <div class="p-4 bg-gray-700 rounded">
                ${primaryRunesHTML}
                ${secondaryRunesHTML}
                <div class="flex justify-between items-center pt-2 border-t border-gray-600">
                    <span class="text-xs text-gray-400">${setup.count} games</span>
                    <span class="font-semibold ${winColor}">${winRate}% WR</span>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('runeSetups').innerHTML = runeSetupsHTML;
}

// ============================================================================
// Chart Functions
// ============================================================================

function createWinRateChart() {
    const matches = getFilteredMatches();
    if (matches.length === 0) return;
    
    const { buckets } = aggregateMatchesByTimeBucket(
        matches, 
        AppData.dateFilters.timeBucket
    );
    
    const ctx = document.getElementById('winRateChart').getContext('2d');
    
    if (AppData.charts.winRate) {
        AppData.charts.winRate.destroy();
    }
    
    // Aggregated trend line
    const trendPoints = buckets.map(b => ({
        x: new Date(b.timestamp),
        y: parseFloat(b.winRate),
        bucket: b // Store bucket data for tooltip
    }));
    
    AppData.charts.winRate = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: `Win Rate (${AppData.dateFilters.timeBucket})`,
                    data: trendPoints,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'nearest',
                intersect: true
            },
            plugins: {
                legend: { labels: { color: '#fff' } },
                tooltip: {
                    callbacks: {
                        title: (context) => {
                            const dataPoint = context[0].raw;
                            return new Date(dataPoint.x).toLocaleDateString();
                        },
                        label: (context) => {
                            const dataPoint = context[0].raw;
                            const b = dataPoint.bucket;
                            return [
                                `Win Rate: ${b.winRate}%`,
                                `Games: ${b.games}`,
                                `Avg KDA: ${b.avgKDA}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { 
                        color: '#9ca3af',
                        callback: (value) => value + '%'
                    },
                    grid: { color: '#374151' }
                },
                x: {
                    type: 'time',
                    time: {
                        unit: getTimeUnit(AppData.dateFilters.timeBucket),
                        displayFormats: {
                            day: 'MMM d',
                            week: 'MMM d',
                            month: 'MMM yyyy',
                            quarter: 'QQQ yyyy',
                            year: 'yyyy'
                        }
                    },
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' }
                }
            }
        }
    });
}

function createKDAChart() {
    const matches = getFilteredMatches();
    if (matches.length === 0) return;
    
    const { buckets } = aggregateMatchesByTimeBucket(
        matches, 
        AppData.dateFilters.timeBucket
    );
    
    const ctx = document.getElementById('kdaChart').getContext('2d');
    
    if (AppData.charts.kda) {
        AppData.charts.kda.destroy();
    }
    
    // KDA trend line - only show the calculated KDA ratio
    const trendKDA = buckets.map(b => ({ x: new Date(b.timestamp), y: parseFloat(b.avgKDA), bucket: b }));
    
    AppData.charts.kda = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'KDA',
                    data: trendKDA,
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'nearest',
                intersect: true
            },
            plugins: {
                legend: { labels: { color: '#fff' } },
                tooltip: {
                    callbacks: {
                        title: (context) => {
                            const dataPoint = context[0].raw;
                            return new Date(dataPoint.x).toLocaleDateString();
                        },
                        label: (context) => {
                            const dataPoint = context[0].raw;
                            const b = dataPoint.bucket;
                            return [
                                `KDA Ratio: ${dataPoint.y}`,
                                `Games: ${b.games}`,
                                `Avg Kills: ${b.avgKills}`,
                                `Avg Deaths: ${b.avgDeaths}`,
                                `Avg Assists: ${b.avgAssists}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' }
                },
                x: {
                    type: 'time',
                    time: {
                        unit: getTimeUnit(AppData.dateFilters.timeBucket),
                        displayFormats: {
                            day: 'MMM d',
                            week: 'MMM d',
                            month: 'MMM yyyy',
                            quarter: 'QQQ yyyy',
                            year: 'yyyy'
                        }
                    },
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' }
                }
            }
        }
    });
}

function createRadarChart() {
    const matches = getFilteredMatches();
    const stats = calculateSummaryStats(matches);
    
    // Normalize stats to 0-100 scale
    const normalized = {
        kda: Math.min(parseFloat(stats.avgKDA) / 5 * 100, 100),
        cs: Math.min(parseFloat(stats.avgCS) / 10 * 100, 100),
        vision: Math.min(parseFloat(stats.avgVision) / 50 * 100, 100),
        damage: Math.min(parseFloat(stats.avgDamage) / 1000 * 100, 100),
        gold: Math.min(parseFloat(stats.avgGold) / 500 * 100, 100)
    };
    
    const ctx = document.getElementById('radarChart').getContext('2d');
    
    if (AppData.charts.radar) {
        AppData.charts.radar.destroy();
    }
    
    AppData.charts.radar = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['KDA', 'CS/min', 'Vision', 'Damage/min', 'Gold/min'],
            datasets: [{
                label: 'Your Performance',
                data: [normalized.kda, normalized.cs, normalized.vision, normalized.damage, normalized.gold],
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: '#3b82f6',
                pointBackgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#fff' } }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' },
                    pointLabels: { color: '#9ca3af' }
                }
            }
        }
    });
}

function createDamageChart() {
    const matches = getFilteredMatches().slice(0, 20).reverse();
    
    const ctx = document.getElementById('damageChart').getContext('2d');
    
    if (AppData.charts.damage) {
        AppData.charts.damage.destroy();
    }
    
    AppData.charts.damage = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: matches.map((_, i) => `G${i + 1}`),
            datasets: [
                {
                    label: 'Damage Dealt',
                    data: matches.map(m => m.damage_dealt),
                    backgroundColor: '#ef4444'
                },
                {
                    label: 'Damage Taken',
                    data: matches.map(m => m.damage_taken),
                    backgroundColor: '#f59e0b'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#fff' } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' }
                },
                x: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' }
                }
            }
        }
    });
}

function createKillParticipationChart() {
    const matches = getFilteredMatches();
    if (matches.length === 0) return;
    
    const { buckets } = aggregateMatchesByTimeBucket(
        matches, 
        AppData.dateFilters.timeBucket
    );
    
    const ctx = document.getElementById('killParticipationChart').getContext('2d');
    
    if (AppData.charts.killParticipation) {
        AppData.charts.killParticipation.destroy();
    }
    
    // Aggregated trend line
    const trendPoints = buckets.map(b => ({
        x: new Date(b.timestamp),
        y: parseFloat(b.avgKP),
        bucket: b
    }));
    
    AppData.charts.killParticipation = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: `Kill Participation (${AppData.dateFilters.timeBucket})`,
                    data: trendPoints,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'nearest',
                intersect: true
            },
            plugins: {
                legend: { labels: { color: '#fff' } },
                tooltip: {
                    callbacks: {
                        title: (context) => {
                            const dataPoint = context[0].raw;
                            return new Date(dataPoint.x).toLocaleDateString();
                        },
                        label: (context) => {
                            const dataPoint = context[0].raw;
                            const b = dataPoint.bucket;
                            return [
                                `Avg KP: ${dataPoint.y}%`,
                                `Games: ${b.games}`,
                                `Win Rate: ${b.winRate}%`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { 
                        color: '#9ca3af',
                        callback: (value) => value + '%'
                    },
                    grid: { color: '#374151' }
                },
                x: {
                    type: 'time',
                    time: {
                        unit: getTimeUnit(AppData.dateFilters.timeBucket),
                        displayFormats: {
                            day: 'MMM d',
                            week: 'MMM d',
                            month: 'MMM yyyy',
                            quarter: 'QQQ yyyy',
                            year: 'yyyy'
                        }
                    },
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' }
                }
            }
        }
    });
}

function createGoldChart() {
    const matches = getFilteredMatches();
    if (matches.length === 0) return;
    
    const { buckets } = aggregateMatchesByTimeBucket(
        matches, 
        AppData.dateFilters.timeBucket
    );
    
    const ctx = document.getElementById('goldChart').getContext('2d');
    
    if (AppData.charts.gold) {
        AppData.charts.gold.destroy();
    }
    
    // Aggregated trend line
    const trendPoints = buckets.map(b => ({
        x: new Date(b.timestamp),
        y: parseFloat(b.avgGoldPerMin),
        bucket: b
    }));
    
    AppData.charts.gold = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: `Gold per Minute (${AppData.dateFilters.timeBucket})`,
                    data: trendPoints,
                    borderColor: '#fbbf24',
                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'nearest',
                intersect: true
            },
            plugins: {
                legend: { labels: { color: '#fff' } },
                tooltip: {
                    callbacks: {
                        title: (context) => {
                            const dataPoint = context[0].raw;
                            return new Date(dataPoint.x).toLocaleDateString();
                        },
                        label: (context) => {
                            const dataPoint = context[0].raw;
                            const b = dataPoint.bucket;
                            return [
                                `Avg Gold/Min: ${dataPoint.y}`,
                                `Games: ${b.games}`,
                                `Win Rate: ${b.winRate}%`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' }
                },
                x: {
                    type: 'time',
                    time: {
                        unit: getTimeUnit(AppData.dateFilters.timeBucket),
                        displayFormats: {
                            day: 'MMM d',
                            week: 'MMM d',
                            month: 'MMM yyyy',
                            quarter: 'QQQ yyyy',
                            year: 'yyyy'
                        }
                    },
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' }
                }
            }
        }
    });
}

function createCSChart() {
    const matches = getFilteredMatches();
    if (matches.length === 0) return;
    
    const { buckets } = aggregateMatchesByTimeBucket(
        matches, 
        AppData.dateFilters.timeBucket
    );
    
    const ctx = document.getElementById('csChart').getContext('2d');
    
    if (AppData.charts.cs) {
        AppData.charts.cs.destroy();
    }
    
    // Aggregated trend line
    const trendPoints = buckets.map(b => ({
        x: new Date(b.timestamp),
        y: parseFloat(b.avgCSPerMin),
        bucket: b
    }));
    
    AppData.charts.cs = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: `CS per Minute (${AppData.dateFilters.timeBucket})`,
                    data: trendPoints,
                    borderColor: '#a78bfa',
                    backgroundColor: 'rgba(167, 139, 250, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'nearest',
                intersect: true
            },
            plugins: {
                legend: { labels: { color: '#fff' } },
                tooltip: {
                    callbacks: {
                        title: (context) => {
                            const dataPoint = context[0].raw;
                            return new Date(dataPoint.x).toLocaleDateString();
                        },
                        label: (context) => {
                            const dataPoint = context[0].raw;
                            const b = dataPoint.bucket;
                            return [
                                `Avg CS/Min: ${dataPoint.y}`,
                                `Games: ${b.games}`,
                                `Win Rate: ${b.winRate}%`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' }
                },
                x: {
                    type: 'time',
                    time: {
                        unit: getTimeUnit(AppData.dateFilters.timeBucket),
                        displayFormats: {
                            day: 'MMM d',
                            week: 'MMM d',
                            month: 'MMM yyyy',
                            quarter: 'QQQ yyyy',
                            year: 'yyyy'
                        }
                    },
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' }
                }
            }
        }
    });
}

function createVisionChart() {
    const matches = getFilteredMatches();
    if (matches.length === 0) return;
    
    const { buckets } = aggregateMatchesByTimeBucket(
        matches, 
        AppData.dateFilters.timeBucket
    );
    
    const ctx = document.getElementById('visionChart').getContext('2d');
    
    if (AppData.charts.vision) {
        AppData.charts.vision.destroy();
    }
    
    // Aggregated trend line
    const trendPoints = buckets.map(b => ({
        x: new Date(b.timestamp),
        y: parseFloat(b.avgVision),
        bucket: b
    }));
    
    AppData.charts.vision = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: `Vision Score (${AppData.dateFilters.timeBucket})`,
                    data: trendPoints,
                    borderColor: '#ec4899',
                    backgroundColor: 'rgba(236, 72, 153, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'nearest',
                intersect: true
            },
            plugins: {
                legend: { labels: { color: '#fff' } },
                tooltip: {
                    callbacks: {
                        title: (context) => {
                            const dataPoint = context[0].raw;
                            return new Date(dataPoint.x).toLocaleDateString();
                        },
                        label: (context) => {
                            const dataPoint = context[0].raw;
                            const b = dataPoint.bucket;
                            return [
                                `Avg Vision: ${dataPoint.y}`,
                                `Games: ${b.games}`,
                                `Win Rate: ${b.winRate}%`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' }
                },
                x: {
                    type: 'time',
                    time: {
                        unit: getTimeUnit(AppData.dateFilters.timeBucket),
                        displayFormats: {
                            day: 'MMM d',
                            week: 'MMM d',
                            month: 'MMM yyyy',
                            quarter: 'QQQ yyyy',
                            year: 'yyyy'
                        }
                    },
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' }
                }
            }
        }
    });
}

function createWardChart() {
    const matches = getFilteredMatches();
    
    const totals = matches.reduce((acc, m) => ({
        placed: acc.placed + m.wards_placed,
        killed: acc.killed + m.wards_killed,
        control: acc.control + m.control_wards_purchased
    }), { placed: 0, killed: 0, control: 0 });
    
    const ctx = document.getElementById('wardChart').getContext('2d');
    
    if (AppData.charts.ward) {
        AppData.charts.ward.destroy();
    }
    
    AppData.charts.ward = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Wards Placed', 'Wards Destroyed', 'Control Wards'],
            datasets: [{
                data: [totals.placed, totals.killed, totals.control],
                backgroundColor: ['#22c55e', '#ef4444', '#f59e0b']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#fff' } }
            }
        }
    });
}

function createDayOfWeekChart() {
    const matches = getFilteredMatches();
    const dayMap = {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    days.forEach(day => dayMap[day] = { games: 0, wins: 0 });
    
    matches.forEach(m => {
        if (m.day_of_week && dayMap[m.day_of_week]) {
            dayMap[m.day_of_week].games++;
            if (m.win) dayMap[m.day_of_week].wins++;
        }
    });
    
    const winRates = days.map(day => 
        dayMap[day].games > 0 ? (dayMap[day].wins / dayMap[day].games * 100).toFixed(1) : 0
    );
    
    const ctx = document.getElementById('dayOfWeekChart').getContext('2d');
    
    if (AppData.charts.dayOfWeek) {
        AppData.charts.dayOfWeek.destroy();
    }
    
    AppData.charts.dayOfWeek = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days.map(d => d.substring(0, 3)),
            datasets: [{
                label: 'Win Rate %',
                data: winRates,
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' }
                },
                x: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' }
                }
            }
        }
    });
}

function createHourOfDayChart() {
    const matches = getFilteredMatches();
    const hourMap = {};
    
    for (let i = 0; i < 24; i++) {
        hourMap[i] = { games: 0, wins: 0 };
    }
    
    matches.forEach(m => {
        if (m.hour_of_day !== undefined) {
            hourMap[m.hour_of_day].games++;
            if (m.win) hourMap[m.hour_of_day].wins++;
        }
    });
    
    const gamesData = Object.keys(hourMap).map(h => hourMap[h].games);
    
    const ctx = document.getElementById('hourOfDayChart').getContext('2d');
    
    if (AppData.charts.hourOfDay) {
        AppData.charts.hourOfDay.destroy();
    }
    
    AppData.charts.hourOfDay = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(hourMap).map(h => h + ':00'),
            datasets: [{
                label: 'Games Played',
                data: gamesData,
                backgroundColor: '#8b5cf6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { 
                        color: '#9ca3af',
                        stepSize: 1
                    },
                    grid: { color: '#374151' }
                },
                x: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: '#374151' }
                }
            }
        }
    });
}

function updateAllCharts() {
    createWinRateChart();
    createKDAChart();
    createRadarChart();
    createDamageChart();
    createKillParticipationChart();
    createGoldChart();
    createCSChart();
    createVisionChart();
    createWardChart();
    createDayOfWeekChart();
    createHourOfDayChart();
}

// ============================================================================
// Event Handlers
// ============================================================================

function setupEventListeners() {
    // Filter change handlers
    const timePeriodFilter = document.getElementById('timePeriodFilter');
    const queueFilter = document.getElementById('queueFilter');
    const championFilter = document.getElementById('championFilter');
    
    if (timePeriodFilter) {
        timePeriodFilter.addEventListener('change', (e) => {
            AppData.filters.timePeriod = e.target.value;
            refreshDashboard();
        });
    }
    
    if (queueFilter) {
        queueFilter.addEventListener('change', (e) => {
            AppData.filters.queueType = e.target.value;
            refreshDashboard();
        });
    }
    
    if (championFilter) {
        championFilter.addEventListener('change', (e) => {
            AppData.filters.champion = e.target.value;
            refreshDashboard();
        });
    }
}

function refreshDashboard() {
    updateSummaryCards();
    updateChampionSection();
    updateCombatSection();
    updateMatchHistoryTable();
    updateInsightsSection();
    updateItemSection();
    updateRuneSection();
    updateAllCharts();
}

// ============================================================================
// Initialization
// ============================================================================

async function initialize() {
    console.log('Initializing dashboard...');
    
    // Keep loading screen visible during initialization
    document.getElementById('loadingScreen').classList.remove('hidden');
    
    // First, load the player list
    const playersLoaded = await loadPlayerList();
    
    if (!playersLoaded) {
        document.getElementById('loadingScreen').classList.add('hidden');
        alert('Error: Could not load players. Please check players.json');
        return;
    }
    
    // Automatically load data for all players
    const selectedPlayers = getSelectedPlayers();
    
    if (selectedPlayers.length === 0) {
        document.getElementById('loadingScreen').classList.add('hidden');
        alert('No players available to load');
        return;
    }
    
    // Load data for all selected players (combined)
    const success = await loadAllData(selectedPlayers);
    
    // Hide loading screen
    document.getElementById('loadingScreen').classList.add('hidden');
    
    if (success) {
        // Setup event listeners
        setupEventListeners();
        
        // Update all sections
        updateChampionFilter();
        refreshDashboard();
        
        console.log('Dashboard initialized successfully!');
    } else {
        alert('Failed to load data. Please check console for errors.');
    }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

