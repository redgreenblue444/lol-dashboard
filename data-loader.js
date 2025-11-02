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
    
    // Charts
    charts: {},
    
    // Data Dragon version (loaded from data)
    ddragonVersion: null
};

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

function getItemIconUrl(itemKey) {
    const item = AppData.dimItems[itemKey];
    if (item && item.icon_url) {
        return item.icon_url;
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

function createItemIcon(itemKey, size = 8) {
    if (!itemKey || itemKey === 0) {
        return `<div class="w-${size} h-${size} bg-gray-700 rounded border border-gray-600"></div>`;
    }
    
    const iconUrl = getItemIconUrl(itemKey);
    const item = AppData.dimItems[itemKey];
    const name = item ? item.item_name : `Item ${itemKey}`;
    
    if (iconUrl) {
        return `<img src="${iconUrl}" alt="${name}" 
                     class="w-${size} h-${size} rounded border border-gray-600" 
                     title="${name}"
                     onerror="this.style.display='none'">`;
    }
    
    // Fallback: empty box
    return `<div class="w-${size} h-${size} bg-gray-700 rounded border border-gray-600" title="${name}"></div>`;
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

async function loadAllData() {
    try {
        updateLoadingStatus('Loading fact table...');
        AppData.factMatches = await loadCSV('data/fact_matches.csv');
        
        updateLoadingStatus('Loading champion data...');
        const champions = await loadCSV('data/dim_champion.csv');
        champions.forEach(c => AppData.dimChampions[c.champion_key] = c);
        
        updateLoadingStatus('Loading date data...');
        const dates = await loadCSV('data/dim_date.csv');
        dates.forEach(d => AppData.dimDates[d.date_key] = d);
        
        updateLoadingStatus('Loading queue data...');
        const queues = await loadCSV('data/dim_queue.csv');
        queues.forEach(q => AppData.dimQueues[q.queue_key] = q);
        
        updateLoadingStatus('Loading rune data...');
        const runes = await loadCSV('data/dim_rune.csv');
        runes.forEach(r => AppData.dimRunes[r.rune_key] = r);
        
        updateLoadingStatus('Loading item data...');
        const items = await loadCSV('data/dim_items.csv');
        items.forEach(i => AppData.dimItems[i.item_key] = i);
        
        updateLoadingStatus('Loading match items...');
        AppData.bridgeMatchItems = await loadCSV('data/bridge_match_items.csv');
        
        updateLoadingStatus('Loading match metadata...');
        const metadata = await loadCSV('data/dim_match_metadata.csv');
        metadata.forEach(m => AppData.dimMatchMetadata[m.match_key] = m);
        
        updateLoadingStatus('Loading participants...');
        const participants = await loadCSV('data/bridge_match_participants.csv');
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
        
        updateLoadingStatus('Joining data...');
        enrichMatchData();
        
        updateLoadingStatus('Complete!');
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
        
        // Get items for this match
        const matchItems = AppData.bridgeMatchItems
            .filter(b => b.match_key === fact.match_key)
            .sort((a, b) => a.item_position - b.item_position)
            .map(b => b.item_key);
        
        return {
            ...fact,
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
            items: matchItems
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
                    ${renderTeamScoreboard(blueTeam, 'BLUE TEAM', match)}
                    <div class="my-3 border-t border-gray-600"></div>
                    ${renderTeamScoreboard(redTeam, 'RED TEAM', match)}
                </div>
            </td>
        </tr>
    `;
}

function renderTeamScoreboard(team, teamName, match) {
    const teamWon = team[0].win === 1;
    const teamColor = teamName.startsWith('BLUE') ? 'text-blue-400' : 'text-red-400';
    
    return `
        <div class="mb-3">
            <div class="team-header ${teamColor}">
                ${teamName} ${teamWon ? '(VICTORY)' : '(DEFEAT)'}
            </div>
            ${team.map(p => renderParticipantRow(p, match)).join('')}
        </div>
    `;
}

function renderParticipantRow(participant, match) {
    const isPlayer = participant.is_player === 1;
    const playerClass = isPlayer ? 'player' : '';
    
    // Calculate badges
    const badges = BadgeSystem.calculateBadges(participant, match);
    const topBadges = badges.slice(0, 5); // Show top 5 badges
    
    // Build badge HTML
    const badgeHTML = topBadges.map(badge => {
        const badgeClass = badge.priority <= 2 ? 'badge-gold' : 
                          badge.priority <= 4 ? 'badge-silver' : 'badge-bronze';
        return `<span class="badge ${badgeClass}" title="${badge.description}">${badge.icon} ${badge.name}</span>`;
    }).join('');
    
    // Get item icons
    const itemIcons = (participant.items || []).slice(0, 7).map(itemKey => 
        createItemIcon(itemKey, 6)
    ).join('');
    
    return `
        <div class="participant-row ${playerClass}">
            <div style="min-width: 150px;">
                <div class="flex items-center gap-2">
                    ${createChampionIcon(participant.champion_id, 8)}
                    <div>
                        <div class="font-medium text-sm">
                            ${participant.summoner_name || participant.riot_id_game_name || 'Unknown'}
                            ${isPlayer ? '<span class="text-blue-400 font-bold ml-2">(YOU)</span>' : ''}
                        </div>
                        <div class="text-xs text-gray-400">${participant.team_position}</div>
                    </div>
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
            
            <div style="min-width: 100px;">
                <div class="flex gap-0.5 mb-1">
                    ${itemIcons}
                </div>
            </div>
            
            <div style="min-width: 300px;">
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

// ============================================================================
// Chart Functions
// ============================================================================

function createWinRateChart() {
    const matches = getFilteredMatches();
    const chartData = matches.slice(0, 20).reverse().map((m, i) => {
        // Calculate rolling win rate for last N games
        const recent = matches.slice(i, i + 10);
        const wins = recent.filter(m => m.win).length;
        return (wins / recent.length * 100).toFixed(1);
    });
    
    const ctx = document.getElementById('winRateChart').getContext('2d');
    
    if (AppData.charts.winRate) {
        AppData.charts.winRate.destroy();
    }
    
    AppData.charts.winRate = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map((_, i) => `Game ${i + 1}`),
            datasets: [{
                label: 'Rolling Win Rate (10 games)',
                data: chartData,
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.4,
                fill: true
            }]
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

function createKDAChart() {
    const matches = getFilteredMatches().slice(0, 20).reverse();
    
    const ctx = document.getElementById('kdaChart').getContext('2d');
    
    if (AppData.charts.kda) {
        AppData.charts.kda.destroy();
    }
    
    AppData.charts.kda = new Chart(ctx, {
        type: 'line',
        data: {
            labels: matches.map((_, i) => `Game ${i + 1}`),
            datasets: [
                {
                    label: 'Kills',
                    data: matches.map(m => m.kills),
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)'
                },
                {
                    label: 'Deaths',
                    data: matches.map(m => m.deaths),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)'
                },
                {
                    label: 'Assists',
                    data: matches.map(m => m.assists),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)'
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
    const matches = getFilteredMatches().slice(0, 20).reverse();
    
    const ctx = document.getElementById('killParticipationChart').getContext('2d');
    
    if (AppData.charts.killParticipation) {
        AppData.charts.killParticipation.destroy();
    }
    
    AppData.charts.killParticipation = new Chart(ctx, {
        type: 'line',
        data: {
            labels: matches.map((_, i) => `Game ${i + 1}`),
            datasets: [{
                label: 'Kill Participation %',
                data: matches.map(m => (m.kill_participation * 100).toFixed(1)),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
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

function createGoldChart() {
    const matches = getFilteredMatches().slice(0, 20).reverse();
    
    const ctx = document.getElementById('goldChart').getContext('2d');
    
    if (AppData.charts.gold) {
        AppData.charts.gold.destroy();
    }
    
    AppData.charts.gold = new Chart(ctx, {
        type: 'line',
        data: {
            labels: matches.map((_, i) => `Game ${i + 1}`),
            datasets: [{
                label: 'Gold per Minute',
                data: matches.map(m => m.gold_per_minute),
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                tension: 0.4,
                fill: true
            }]
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

function createCSChart() {
    const matches = getFilteredMatches().slice(0, 20).reverse();
    
    const ctx = document.getElementById('csChart').getContext('2d');
    
    if (AppData.charts.cs) {
        AppData.charts.cs.destroy();
    }
    
    AppData.charts.cs = new Chart(ctx, {
        type: 'line',
        data: {
            labels: matches.map((_, i) => `Game ${i + 1}`),
            datasets: [{
                label: 'CS per Minute',
                data: matches.map(m => m.cs_per_minute),
                borderColor: '#a78bfa',
                backgroundColor: 'rgba(167, 139, 250, 0.1)',
                tension: 0.4,
                fill: true
            }]
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

function createVisionChart() {
    const matches = getFilteredMatches().slice(0, 20).reverse();
    
    const ctx = document.getElementById('visionChart').getContext('2d');
    
    if (AppData.charts.vision) {
        AppData.charts.vision.destroy();
    }
    
    AppData.charts.vision = new Chart(ctx, {
        type: 'line',
        data: {
            labels: matches.map((_, i) => `Game ${i + 1}`),
            datasets: [{
                label: 'Vision Score',
                data: matches.map(m => m.vision_score),
                borderColor: '#ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                tension: 0.4,
                fill: true
            }]
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
    document.getElementById('timePeriodFilter').addEventListener('change', (e) => {
        AppData.filters.timePeriod = e.target.value;
        refreshDashboard();
    });
    
    document.getElementById('queueFilter').addEventListener('change', (e) => {
        AppData.filters.queueType = e.target.value;
        refreshDashboard();
    });
    
    document.getElementById('championFilter').addEventListener('change', (e) => {
        AppData.filters.champion = e.target.value;
        refreshDashboard();
    });
    
    document.getElementById('resetFilters').addEventListener('click', () => {
        AppData.filters = {
            timePeriod: 'all',
            queueType: 'all',
            champion: 'all'
        };
        document.getElementById('timePeriodFilter').value = 'all';
        document.getElementById('queueFilter').value = 'all';
        document.getElementById('championFilter').value = 'all';
        refreshDashboard();
    });
}

function refreshDashboard() {
    updateSummaryCards();
    updateChampionSection();
    updateCombatSection();
    updateMatchHistoryTable();
    updateInsightsSection();
    updateAllCharts();
}

// ============================================================================
// Initialization
// ============================================================================

async function initialize() {
    const success = await loadAllData();
    
    if (success) {
        // Hide loading screen
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        
        // Setup event listeners
        setupEventListeners();
        
        // Update all sections
        updateChampionFilter();
        refreshDashboard();
        
        console.log('Dashboard initialized successfully!');
    } else {
        updateLoadingStatus('Failed to load data. Please check console for errors.');
    }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

