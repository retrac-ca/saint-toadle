/**
 * Invite Tracker Utility - Advanced Invite Tracking System
 * 
 * Provides comprehensive invite tracking functionality including:
 * - Automatic invite usage monitoring
 * - Manual referral processing
 * - Invite validation and management
 * - Statistical tracking and reporting
 */

const logger = require('./logger');
const dataManager = require('./dataManager');

class InviteTracker {
    constructor() {
        this.inviteCache = new Map();
        this.initialized = false;
    }

    /**
     * Initialize the invite tracker for all guilds
     * @param {Client} client - Discord.js client instance
     */
    async initialize(client) {
        try {
            logger.info('🎯 Initializing invite tracker...');
            
            // Cache invites for all guilds
            for (const guild of client.guilds.cache.values()) {
                await this.cacheGuildInvites(guild);
            }
            
            this.initialized = true;
            logger.info(`✅ Invite tracker initialized for ${client.guilds.cache.size} guilds`);
            
        } catch (error) {
            logger.logError('Invite tracker initialization', error);
            throw error;
        }
    }

    /**
     * Cache invites for a specific guild
     * @param {Guild} guild - Discord guild object
     */
    async cacheGuildInvites(guild) {
        try {
            const invites = await guild.invites.fetch();
            const inviteMap = new Map();
            
            for (const invite of invites.values()) {
                inviteMap.set(invite.code, {
                    code: invite.code,
                    uses: invite.uses,
                    inviterId: invite.inviter?.id,
                    createdAt: invite.createdAt,
                    maxUses: invite.maxUses,
                    expiresAt: invite.expiresAt
                });
            }
            
            this.inviteCache.set(guild.id, inviteMap);
            logger.debug(`📥 Cached ${inviteMap.size} invites for guild ${guild.name}`);
            
        } catch (error) {
            logger.logError(`Caching invites for guild ${guild.id}`, error);
        }
    }

    /**
     * Handle member join event
     * @param {GuildMember} member - Guild member who joined
     */
    async handleMemberJoin(member) {
        try {
            logger.debug(`👋 Processing member join: ${member.user.tag} in ${member.guild.name}`);
            
            // Update invite cache and check for usage changes
            await this.updateAndCheckInvites(member.guild);
            
        } catch (error) {
            logger.logError('Handling member join for invite tracking', error);
        }
    }

    /**
     * Update invite cache and check for usage changes
     * @param {Guild} guild - Discord guild object
     */
    async updateAndCheckInvites(guild) {
        try {
            const cachedInvites = this.inviteCache.get(guild.id) || new Map();
            const currentInvites = await guild.invites.fetch();
            
            // Check for usage increases
            for (const currentInvite of currentInvites.values()) {
                const cachedInvite = cachedInvites.get(currentInvite.code);
                
                if (cachedInvite && currentInvite.uses > cachedInvite.uses) {
                    const usageIncrease = currentInvite.uses - cachedInvite.uses;
                    logger.debug(`📈 Invite usage increase detected: ${currentInvite.code} (+${usageIncrease})`);
                    
                    // Check if this invite is registered for referral tracking
                    if (dataManager.isInviteRegistered(currentInvite.code)) {
                        const inviterId = dataManager.getInviteOwner(currentInvite.code);
                        logger.logReferral('usage_detected', inviterId, null, currentInvite.code, `Usage increase: +${usageIncrease}`);
                        
                        // Note: We don't automatically award referrals here anymore
                        // Users must use !claiminvite to claim their referral
                        logger.info(`🎯 Registered invite ${currentInvite.code} was used, awaiting manual claim`);
                    }
                }
            }
            
            // Update cache
            await this.cacheGuildInvites(guild);
            
        } catch (error) {
            logger.logError('Updating and checking invites', error);
        }
    }

    /**
     * Handle invite creation event
     * @param {Invite} invite - Created invite object
     */
    async handleInviteCreate(invite) {
        try {
            logger.debug(`📨 Invite created: ${invite.code} by ${invite.inviter?.tag || 'Unknown'}`);
            
            // Update cache for this guild
            await this.cacheGuildInvites(invite.guild);
            
        } catch (error) {
            logger.logError('Handling invite creation', error);
        }
    }

    /**
     * Handle invite deletion event
     * @param {Invite} invite - Deleted invite object
     */
    async handleInviteDelete(invite) {
        try {
            logger.debug(`🗑️ Invite deleted: ${invite.code}`);
            
            // Update cache for this guild
            await this.cacheGuildInvites(invite.guild);
            
        } catch (error) {
            logger.logError('Handling invite deletion', error);
        }
    }

    /**
     * Validate an invite code
     * @param {string} inviteCode - Invite code to validate
     * @param {Client} client - Discord.js client instance
     * @returns {Object} Validation result
     */
    async validateInvite(inviteCode, client) {
        try {
            const invite = await client.fetchInvite(inviteCode);
            
            return {
                valid: true,
                invite: {
                    code: invite.code,
                    guildId: invite.guild?.id,
                    guildName: invite.guild?.name,
                    inviterId: invite.inviter?.id,
                    inviterTag: invite.inviter?.tag,
                    uses: invite.uses,
                    maxUses: invite.maxUses,
                    expiresAt: invite.expiresAt,
                    createdAt: invite.createdAt
                }
            };
            
        } catch (error) {
            return {
                valid: false,
                error: error.message,
                code: error.code
            };
        }
    }

    /**
     * Get invite statistics for a guild
     * @param {string} guildId - Guild ID
     * @returns {Object} Invite statistics
     */
    getGuildInviteStats(guildId) {
        const cachedInvites = this.inviteCache.get(guildId) || new Map();
        
        let totalInvites = 0;
        let totalUses = 0;
        let activeInvites = 0;
        let registeredInvites = 0;
        
        for (const invite of cachedInvites.values()) {
            totalInvites++;
            totalUses += invite.uses;
            
            if (!invite.expiresAt || invite.expiresAt > Date.now()) {
                activeInvites++;
            }
            
            if (dataManager.isInviteRegistered(invite.code)) {
                registeredInvites++;
            }
        }
        
        return {
            totalInvites,
            activeInvites,
            registeredInvites,
            totalUses,
            averageUses: totalInvites > 0 ? Math.round(totalUses / totalInvites) : 0
        };
    }

    /**
     * Get user's invite statistics
     * @param {string} userId - User ID
     * @returns {Object} User invite statistics
     */
    getUserInviteStats(userId) {
        const userInvites = dataManager.getUserInvites(userId);
        const userStats = dataManager.getUserStats(userId);
        
        return {
            registeredInvites: userInvites.length,
            totalReferrals: userStats.referrals,
            hasClaimedReferral: userStats.hasClaimedReferral,
            inviteCodes: userInvites.map(invite => invite.code)
        };
    }

    /**
     * Clean up expired invites from cache
     * @param {string} guildId - Guild ID to clean up
     */
    cleanupExpiredInvites(guildId) {
        const cachedInvites = this.inviteCache.get(guildId);
        if (!cachedInvites) return;
        
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [code, invite] of cachedInvites.entries()) {
            if (invite.expiresAt && invite.expiresAt <= now) {
                cachedInvites.delete(code);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            logger.debug(`🧹 Cleaned up ${cleanedCount} expired invites for guild ${guildId}`);
        }
    }

    /**
     * Get comprehensive tracking report
     * @returns {Object} Complete tracking report
     */
    getTrackingReport() {
        const report = {
            initialized: this.initialized,
            guildsTracked: this.inviteCache.size,
            totalCachedInvites: 0,
            totalUses: 0
        };
        
        for (const inviteMap of this.inviteCache.values()) {
            report.totalCachedInvites += inviteMap.size;
            for (const invite of inviteMap.values()) {
                report.totalUses += invite.uses;
            }
        }
        
        return report;
    }
}

// Create and export singleton instance
const inviteTracker = new InviteTracker();
module.exports = inviteTracker;