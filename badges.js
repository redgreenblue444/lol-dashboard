// ============================================================================
// Achievement Badge System
// Calculates and displays achievement badges for match performance
// ============================================================================

const BadgeSystem = {
    // Badge definitions with icons, colors, and criteria
    badges: {
        // Combat Badges
        flawless: {
            icon: '🔥',
            name: 'Flawless',
            description: 'Perfect KDA - No deaths',
            color: 'gold',
            priority: 10
        },
        pentakill: {
            icon: '⚔️',
            name: 'Pentakill',
            description: 'Pentakill achieved',
            color: 'gold',
            priority: 10
        },
        quadrakill: {
            icon: '💥',
            name: 'Quadrakill',
            description: 'Quadrakill achieved',
            color: 'silver',
            priority: 8
        },
        sharpshooter: {
            icon: '🎯',
            name: 'Sharpshooter',
            description: '10+ kills with less than 3 deaths',
            color: 'silver',
            priority: 7
        },
        soloCarry: {
            icon: '🗡️',
            name: 'Solo Carry',
            description: 'Highest kills on team',
            color: 'silver',
            priority: 6
        },
        
        // Economy Badges
        wealthy: {
            icon: '💰',
            name: 'Wealthy',
            description: 'Highest gold earned in game',
            color: 'gold',
            priority: 7
        },
        farmingGod: {
            icon: '🌾',
            name: 'Farming God',
            description: '10+ CS/min or highest CS in game',
            color: 'silver',
            priority: 6
        },
        
        // Vision Badges
        visionMaster: {
            icon: '👁️',
            name: 'Vision Master',
            description: '50+ vision score or highest in game',
            color: 'silver',
            priority: 6
        },
        wardHunter: {
            icon: '🔍',
            name: 'Ward Hunter',
            description: '10+ wards destroyed',
            color: 'bronze',
            priority: 4
        },
        mapControl: {
            icon: '🎯',
            name: 'Map Control',
            description: '20+ wards placed',
            color: 'bronze',
            priority: 4
        },
        
        // Team Badges
        teamPlayer: {
            icon: '🤝',
            name: 'Team Player',
            description: '80%+ kill participation',
            color: 'silver',
            priority: 6
        },
        damageDealer: {
            icon: '🚀',
            name: 'Damage Dealer',
            description: 'Highest damage to champions',
            color: 'gold',
            priority: 7
        },
        tank: {
            icon: '🛡️',
            name: 'Tank',
            description: 'Highest damage taken',
            color: 'bronze',
            priority: 5
        },
        
        // Objective Badges
        towerDestroyer: {
            icon: '🏰',
            name: 'Tower Destroyer',
            description: '3+ towers destroyed',
            color: 'bronze',
            priority: 5
        },
        
        // Support Badges
        lifeSupport: {
            icon: '💚',
            name: 'Life Support',
            description: '15+ assists',
            color: 'silver',
            priority: 5
        },
        
        // ============== NEGATIVE PERFORMANCE BADGES ==============
        inting: {
            icon: '💀',
            name: 'The Feeder',
            description: '10+ deaths with KDA under 1.0',
            color: 'negative',
            priority: 2
        },
        goldSink: {
            icon: '💸',
            name: 'Gold Sink',
            description: 'Lowest gold earned on your team',
            color: 'negative',
            priority: 2
        },
        invisible: {
            icon: '👻',
            name: 'Invisible',
            description: 'Less than 20% kill participation',
            color: 'negative',
            priority: 2
        },
        wardless: {
            icon: '🚫',
            name: 'Wardless Wonder',
            description: 'Placed less than 5 wards all game',
            color: 'negative',
            priority: 1
        },
        blindSpot: {
            icon: '🙈',
            name: 'Blind Spot',
            description: 'Lowest vision score in the entire game',
            color: 'negative',
            priority: 2
        },
        caught: {
            icon: '🪤',
            name: 'Caught Out',
            description: '5+ deaths with less than 3 kills+assists',
            color: 'negative',
            priority: 2
        },
        poorFarmer: {
            icon: '🥀',
            name: 'Poor Farmer',
            description: 'Under 4 CS/min (non-support role)',
            color: 'negative',
            priority: 2
        },
        bankrupt: {
            icon: '🪙',
            name: 'Bankrupt',
            description: 'Lowest gold in the entire game',
            color: 'negative',
            priority: 1
        },
        darkZone: {
            icon: '🌑',
            name: 'Dark Zone',
            description: 'Under 10 vision score entire game',
            color: 'negative',
            priority: 1
        },
        runItDown: {
            icon: '🏃',
            name: 'Run It Down',
            description: '10+ deaths as non-tank role',
            color: 'negative',
            priority: 3
        },
        
        // ============== POSITIVE PERFORMANCE BADGES ==============
        untouchable: {
            icon: '✨',
            name: 'Untouchable',
            description: '0-1 deaths in a 25+ minute game',
            color: 'gold',
            priority: 9
        },
        hardCarry: {
            icon: '🎒',
            name: 'Hard Carry',
            description: '40%+ of team damage AND won',
            color: 'gold',
            priority: 10
        },
        efficiency: {
            icon: '📈',
            name: 'Efficiency',
            description: '10+ KDA ratio',
            color: 'gold',
            priority: 9
        },
        clutch: {
            icon: '⏱️',
            name: 'Clutch Player',
            description: 'High performance in long games (35+ min)',
            color: 'silver',
            priority: 7
        },
        comeback: {
            icon: '🔄',
            name: 'Comeback Kid',
            description: 'Won despite being behind (low damage taken, high damage dealt)',
            color: 'silver',
            priority: 7
        },
        tripleKill: {
            icon: '🔱',
            name: 'Triple Kill',
            description: 'Triple kill achieved',
            color: 'bronze',
            priority: 6
        },
        
        // ============== OBJECTIVE BADGES ==============
        dragonSlayer: {
            icon: '🐉',
            name: 'Dragon Slayer',
            description: 'High objective participation (jungle with high CS)',
            color: 'bronze',
            priority: 5
        },
        splitPusher: {
            icon: '🗡️',
            name: 'Split Pusher',
            description: '5+ towers with low kill participation',
            color: 'silver',
            priority: 6
        },
        inhibitorDestroyer: {
            icon: '🏛️',
            name: 'Inhibitor Destroyer',
            description: '2+ inhibitors destroyed',
            color: 'bronze',
            priority: 5
        },
        objectiveFocused: {
            icon: '🎯',
            name: 'Objective Focused',
            description: 'High structure damage (turrets + inhibitors)',
            color: 'bronze',
            priority: 5
        },
        
        // ============== ECONOMY & FARMING BADGES ==============
        greedyFarmer: {
            icon: '🌽',
            name: 'Greedy Farmer',
            description: '12+ CS per minute',
            color: 'gold',
            priority: 7
        },
        goldRush: {
            icon: '💎',
            name: 'Gold Rush',
            description: '400+ gold per minute',
            color: 'silver',
            priority: 6
        },
        efficientSpender: {
            icon: '🛒',
            name: 'Efficient Spender',
            description: 'High damage despite moderate gold',
            color: 'bronze',
            priority: 4
        },
        
        // ============== VISION & MAP CONTROL BADGES ==============
        lightbringer: {
            icon: '🕯️',
            name: 'Lightbringer',
            description: '30+ wards placed',
            color: 'silver',
            priority: 5
        },
        oracle: {
            icon: '🔮',
            name: 'Oracle',
            description: '15+ wards destroyed',
            color: 'silver',
            priority: 5
        },
        controlFreak: {
            icon: '👁️‍🗨️',
            name: 'Control Freak',
            description: '10+ control wards purchased',
            color: 'bronze',
            priority: 4
        },
        
        // ============== COMBAT & MECHANICS BADGES ==============
        glassCannon: {
            icon: '🔫',
            name: 'Glass Cannon',
            description: 'High damage dealt and taken, many deaths',
            color: 'neutral',
            priority: 3
        },
        duelist: {
            icon: '⚔️',
            name: 'Duelist',
            description: 'High kills with low assists (solo player)',
            color: 'silver',
            priority: 6
        },
        executioner: {
            icon: '🪓',
            name: 'Executioner',
            description: '10+ kills with less than 3 assists',
            color: 'bronze',
            priority: 4
        },
        support: {
            icon: '🩹',
            name: 'Support',
            description: '15+ assists with less than 3 kills',
            color: 'silver',
            priority: 5
        },
        menace: {
            icon: '😈',
            name: 'Menace',
            description: 'Highest damage in entire game (all 10 players)',
            color: 'gold',
            priority: 10
        },
        
        // ============== FUNNY/MEME BADGES ==============
        betterJungleWins: {
            icon: '🌲',
            name: 'Better Jungle Wins',
            description: 'Jungle with significant stat lead',
            color: 'neutral',
            priority: 4
        },
        afkFarming: {
            icon: '🚜',
            name: 'AFK Farming',
            description: '300+ CS with under 30% kill participation',
            color: 'neutral',
            priority: 3
        },
        ksStealer: {
            icon: '🥷',
            name: 'KS Stealer',
            description: '15+ kills with less than 5 assists',
            color: 'neutral',
            priority: 3
        },
        baitMaster: {
            icon: '🎣',
            name: 'Bait Master',
            description: 'Highest damage taken but few deaths',
            color: 'bronze',
            priority: 5
        },
        reportJungle: {
            icon: '📢',
            name: 'Report Jungle',
            description: 'Jungle with lowest vision on team',
            color: 'negative',
            priority: 2
        },
        worthIt: {
            icon: '💯',
            name: 'Worth It',
            description: 'Triple/Quadra/Penta but died in the process',
            color: 'silver',
            priority: 7
        },
        ghostPing: {
            icon: '👻',
            name: 'Ghost Ping',
            description: 'Support with most wards but team struggled',
            color: 'neutral',
            priority: 3
        },
        intToWin: {
            icon: '🎲',
            name: 'Int to Win',
            description: '10+ deaths but still won the game',
            color: 'neutral',
            priority: 3
        },
        
        // ============== NEUTRAL/INFORMATIVE BADGES ==============
        balanced: {
            icon: '⚖️',
            name: 'Balanced',
            description: 'KDA between 2-4, average performance',
            color: 'neutral',
            priority: 2
        },
        roamer: {
            icon: '🗺️',
            name: 'Roamer',
            description: 'Support with high kill participation',
            color: 'bronze',
            priority: 4
        },
        doubleKill: {
            icon: '⚡',
            name: 'Double Kill',
            description: 'Double kills achieved',
            color: 'bronze',
            priority: 4
        }
    },
    
    /**
     * Calculate badges for a participant in a match
     * @param {Object} participant - Participant data
     * @param {Object} allParticipants - All 10 participants for context
     * @param {Object} teamData - Team aggregated data
     * @returns {Array} Array of earned badge keys
     */
    calculateBadges(participant, allParticipants, teamData) {
        const earnedBadges = [];
        const gameDuration = participant.game_duration_minutes || 25;
        const isSupport = (participant.team_position === 'UTILITY');
        const isJungle = (participant.team_position === 'JUNGLE');
        const isTank = ['TOP', 'UTILITY', 'JUNGLE'].includes(participant.team_position);
        
        // Get team and game-wide stats
        const teamParticipants = allParticipants.filter(p => p.team_id === participant.team_id);
        const teamKills = teamParticipants.map(p => p.kills);
        const teamGold = teamParticipants.map(p => p.gold_earned);
        const teamVision = teamParticipants.map(p => p.vision_score);
        
        const allGold = allParticipants.map(p => p.gold_earned);
        const allCS = allParticipants.map(p => p.cs_total);
        const allVision = allParticipants.map(p => p.vision_score);
        const allDamage = allParticipants.map(p => p.damage_dealt);
        const allDamageTaken = allParticipants.map(p => p.damage_taken);
        
        // ========== EXISTING BADGES ==========
        
        // Combat Badges
        if (participant.deaths === 0 && participant.kills > 0) {
            earnedBadges.push('flawless');
        }
        
        if (participant.penta_kills > 0) {
            earnedBadges.push('pentakill');
        }
        
        if (participant.quadra_kills > 0 && participant.penta_kills === 0) {
            earnedBadges.push('quadrakill');
        }
        
        if (participant.triple_kills > 0 && participant.quadra_kills === 0 && participant.penta_kills === 0) {
            earnedBadges.push('tripleKill');
        }
        
        if (participant.double_kills > 0) {
            earnedBadges.push('doubleKill');
        }
        
        if (participant.kills >= 10 && participant.deaths < 3) {
            earnedBadges.push('sharpshooter');
        }
        
        if (participant.kills === Math.max(...teamKills) && participant.kills >= 10) {
            earnedBadges.push('soloCarry');
        }
        
        // Economy Badges
        if (participant.gold_earned === Math.max(...allGold)) {
            earnedBadges.push('wealthy');
        }
        
        if (participant.cs_per_minute >= 10 || participant.cs_total === Math.max(...allCS)) {
            earnedBadges.push('farmingGod');
        }
        
        // Vision Badges
        if (participant.vision_score >= 50 || participant.vision_score === Math.max(...allVision)) {
            earnedBadges.push('visionMaster');
        }
        
        if (participant.wards_killed >= 10) {
            earnedBadges.push('wardHunter');
        }
        
        if (participant.wards_placed >= 20) {
            earnedBadges.push('mapControl');
        }
        
        // Team Badges
        if (participant.kill_participation >= 0.80) {
            earnedBadges.push('teamPlayer');
        }
        
        if (participant.damage_dealt === Math.max(...allDamage)) {
            earnedBadges.push('damageDealer');
        }
        
        if (participant.damage_taken === Math.max(...allDamageTaken)) {
            earnedBadges.push('tank');
        }
        
        // Objective Badges
        if (participant.turret_kills >= 3) {
            earnedBadges.push('towerDestroyer');
        }
        
        // Support Badge
        if (participant.assists >= 15) {
            earnedBadges.push('lifeSupport');
        }
        
        // ========== NEW NEGATIVE BADGES ==========
        
        if (participant.deaths >= 10 && participant.kda < 1.0) {
            earnedBadges.push('inting');
        }
        
        if (participant.gold_earned === Math.min(...teamGold) && gameDuration >= 20) {
            earnedBadges.push('goldSink');
        }
        
        if (participant.kill_participation < 0.20) {
            earnedBadges.push('invisible');
        }
        
        if (participant.wards_placed < 5 && !isSupport) {
            earnedBadges.push('wardless');
        }
        
        if (participant.vision_score === Math.min(...allVision)) {
            earnedBadges.push('blindSpot');
        }
        
        if (participant.deaths >= 5 && (participant.kills + participant.assists) < 3) {
            earnedBadges.push('caught');
        }
        
        if (participant.cs_per_minute < 4 && !isSupport) {
            earnedBadges.push('poorFarmer');
        }
        
        if (participant.gold_earned === Math.min(...allGold)) {
            earnedBadges.push('bankrupt');
        }
        
        if (participant.vision_score < 10) {
            earnedBadges.push('darkZone');
        }
        
        if (participant.deaths >= 10 && !isTank) {
            earnedBadges.push('runItDown');
        }
        
        // ========== NEW POSITIVE BADGES ==========
        
        if ((participant.deaths === 0 || participant.deaths === 1) && gameDuration >= 25) {
            earnedBadges.push('untouchable');
        }
        
        // Hard Carry - 40%+ team damage AND won
        const teamTotalDamage = teamParticipants.reduce((sum, p) => sum + p.damage_dealt, 0);
        if (participant.win && teamTotalDamage > 0 && 
            (participant.damage_dealt / teamTotalDamage) >= 0.40) {
            earnedBadges.push('hardCarry');
        }
        
        if (participant.kda >= 10) {
            earnedBadges.push('efficiency');
        }
        
        if (gameDuration >= 35 && participant.kda >= 4) {
            earnedBadges.push('clutch');
        }
        
        // Comeback - won with relatively low deaths but high damage
        if (participant.win && participant.deaths <= 3 && 
            participant.damage_dealt > (allDamage.reduce((a, b) => a + b, 0) / 10)) {
            earnedBadges.push('comeback');
        }
        
        // ========== NEW OBJECTIVE BADGES ==========
        
        if (isJungle && participant.cs_total >= 150) {
            earnedBadges.push('dragonSlayer');
        }
        
        if (participant.turret_kills >= 5 && participant.kill_participation < 0.40) {
            earnedBadges.push('splitPusher');
        }
        
        if (participant.inhibitor_kills >= 2) {
            earnedBadges.push('inhibitorDestroyer');
        }
        
        if ((participant.turret_kills + participant.inhibitor_kills) >= 5) {
            earnedBadges.push('objectiveFocused');
        }
        
        // ========== NEW ECONOMY BADGES ==========
        
        if (participant.cs_per_minute >= 12) {
            earnedBadges.push('greedyFarmer');
        }
        
        if (participant.gold_per_minute >= 400) {
            earnedBadges.push('goldRush');
        }
        
        // Efficient Spender - high damage with medium gold
        const avgGold = allGold.reduce((a, b) => a + b, 0) / allGold.length;
        if (participant.gold_earned < avgGold * 1.2 && 
            participant.damage_dealt > (allDamage.reduce((a, b) => a + b, 0) / 10) * 1.2) {
            earnedBadges.push('efficientSpender');
        }
        
        // ========== NEW VISION BADGES ==========
        
        if (participant.wards_placed >= 30) {
            earnedBadges.push('lightbringer');
        }
        
        if (participant.wards_killed >= 15) {
            earnedBadges.push('oracle');
        }
        
        if (participant.control_wards_purchased >= 10) {
            earnedBadges.push('controlFreak');
        }
        
        // ========== NEW COMBAT BADGES ==========
        
        if (participant.damage_dealt > (allDamage.reduce((a, b) => a + b, 0) / 10) * 1.3 &&
            participant.damage_taken > (allDamageTaken.reduce((a, b) => a + b, 0) / 10) * 1.2 &&
            participant.deaths >= 5) {
            earnedBadges.push('glassCannon');
        }
        
        if (participant.kills >= 8 && participant.assists < participant.kills * 0.5) {
            earnedBadges.push('duelist');
        }
        
        if (participant.kills >= 10 && participant.assists < 3) {
            earnedBadges.push('executioner');
        }
        
        if (participant.assists >= 15 && participant.kills < 3) {
            earnedBadges.push('support');
        }
        
        if (participant.damage_dealt === Math.max(...allDamage)) {
            earnedBadges.push('menace');
        }
        
        // ========== FUNNY/MEME BADGES ==========
        
        if (isJungle && (participant.cs_total > Math.max(...allCS) * 0.9 || 
            participant.damage_dealt > Math.max(...allDamage) * 0.9)) {
            earnedBadges.push('betterJungleWins');
        }
        
        if (participant.cs_total >= 300 && participant.kill_participation < 0.30) {
            earnedBadges.push('afkFarming');
        }
        
        if (participant.kills >= 15 && participant.assists < 5) {
            earnedBadges.push('ksStealer');
        }
        
        if (participant.damage_taken === Math.max(...allDamageTaken) && participant.deaths <= 3) {
            earnedBadges.push('baitMaster');
        }
        
        if (isJungle && participant.vision_score === Math.min(...teamVision)) {
            earnedBadges.push('reportJungle');
        }
        
        if ((participant.triple_kills > 0 || participant.quadra_kills > 0 || participant.penta_kills > 0) &&
            participant.deaths >= 1) {
            earnedBadges.push('worthIt');
        }
        
        if (isSupport && participant.wards_placed >= Math.max(...teamParticipants.map(p => p.wards_placed)) &&
            !participant.win) {
            earnedBadges.push('ghostPing');
        }
        
        if (participant.deaths >= 10 && participant.win) {
            earnedBadges.push('intToWin');
        }
        
        // ========== NEUTRAL/INFORMATIVE BADGES ==========
        
        if (participant.kda >= 2 && participant.kda <= 4) {
            earnedBadges.push('balanced');
        }
        
        if (isSupport && participant.kill_participation >= 0.60) {
            earnedBadges.push('roamer');
        }
        
        return earnedBadges;
    },
    
    /**
     * Get top badges for display (limited to 5)
     * @param {Array} badgeKeys - Array of earned badge keys
     * @returns {Array} Top 5 badges sorted by priority
     */
    getTopBadges(badgeKeys, limit = 5) {
        return badgeKeys
            .map(key => ({ key, ...this.badges[key] }))
            .sort((a, b) => b.priority - a.priority)
            .slice(0, limit);
    },
    
    /**
     * Render badge HTML
     * @param {Object} badge - Badge object
     * @returns {string} HTML string
     */
    renderBadge(badge) {
        const colorClasses = {
            gold: 'badge-gold',
            silver: 'badge-silver',
            bronze: 'badge-bronze',
            negative: 'badge-negative',
            neutral: 'badge-neutral'
        };
        
        const colorClass = colorClasses[badge.color] || 'badge-bronze';
        // Escape HTML entities for data attribute
        const escapedDesc = badge.description
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        
        return `<span class="badge ${colorClass}" 
                      data-badge-tooltip="${escapedDesc}">
            ${badge.icon} ${badge.name}
        </span>`;
    },
    
    /**
     * Render multiple badges
     * @param {Array} badgeKeys - Array of badge keys
     * @param {number} limit - Maximum badges to show
     * @returns {string} HTML string
     */
    renderBadges(badgeKeys, limit = 5) {
        const topBadges = this.getTopBadges(badgeKeys, limit);
        return topBadges.map(badge => this.renderBadge(badge)).join('');
    },
    
    /**
     * Initialize tooltip event listeners
     * Call this after badges are rendered to the DOM
     */
    initTooltips() {
        // Use mouseover/mouseout for better event bubbling
        document.addEventListener('mouseover', (e) => {
            const badge = e.target.closest('.badge');
            if (badge) {
                const description = badge.getAttribute('data-badge-tooltip');
                if (description) {
                    this.showTooltip(e, description, badge);
                }
            }
        });
        
        document.addEventListener('mouseout', (e) => {
            const badge = e.target.closest('.badge');
            if (badge) {
                this.hideTooltip();
            }
        });
    },
    
    /**
     * Show custom tooltip on badge hover
     * @param {Event} event - Mouse event
     * @param {string} description - Tooltip text (HTML encoded)
     * @param {Element} badgeElement - The badge element
     */
    showTooltip(event, description, badgeElement) {
        // Hide any existing tooltip first
        this.hideTooltip();
        
        let tooltip = document.getElementById('badge-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'badge-tooltip';
            tooltip.className = 'badge-tooltip';
            document.body.appendChild(tooltip);
        }
        
        // Decode HTML entities and set as text content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = description;
        tooltip.textContent = tempDiv.textContent || tempDiv.innerText || description;
        
        // Position immediately (don't wait for next frame)
        const rect = badgeElement.getBoundingClientRect();
        
        // Set initial position off-screen to measure
        tooltip.style.left = '-9999px';
        tooltip.style.top = '-9999px';
        tooltip.style.opacity = '0';
        tooltip.style.display = 'block';
        
        // Measure tooltip
        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;
        
        // Calculate position - center above badge
        let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        let top = rect.top - tooltipHeight - 10;
        
        // Keep on screen horizontally
        if (left < 10) left = 10;
        if (left + tooltipWidth > window.innerWidth - 10) {
            left = window.innerWidth - tooltipWidth - 10;
        }
        
        // Keep on screen vertically - show below if no room above
        if (top < 10) {
            top = rect.bottom + 10;
        }
        
        // Apply final position and show
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.opacity = '';
        tooltip.classList.add('show');
    },
    
    /**
     * Hide custom tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById('badge-tooltip');
        if (tooltip) {
            tooltip.classList.remove('show');
        }
    }
};

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BadgeSystem;
}

// Verify BadgeSystem is loaded in browser
console.log('BadgeSystem loaded:', typeof BadgeSystem !== 'undefined');

// Initialize tooltips when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            BadgeSystem.initTooltips();
            console.log('Badge tooltips initialized');
        });
    } else {
        // DOM already loaded
        BadgeSystem.initTooltips();
        console.log('Badge tooltips initialized');
    }
}

