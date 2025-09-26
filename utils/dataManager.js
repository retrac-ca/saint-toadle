/**
 * Data Manager - Persistent Data Storage System
 * 
 * Handles all data persistence for the bot including:
 * - User balances and economy data
 * - Referral tracking and statistics
 * - Server-specific configurations
 * - Automatic data saving and backup
 * 
 * Uses JSON files for simplicity but can be extended to use databases
 */

const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

class DataManager {
    constructor() {
        // Define data directory and file paths
        this.dataDir = path.join(__dirname, '..', 'data');
        this.files = {
            users: path.join(this.dataDir, 'users.json'),
            referrals: path.join(this.dataDir, 'referrals.json'),
            invites: path.join(this.dataDir, 'invites.json'),
            guilds: path.join(this.dataDir, 'guilds.json'),
            claimed: path.join(this.dataDir, 'claimed.json')
        };
        
        // In-memory data storage for fast access
        this.data = {
            users: new Map(),
            referrals: new Map(),
            invites: new Map(),
            guilds: new Map(),
            claimed: new Set()
        };
        
        // Auto-save interval (every 5 minutes)
        this.autoSaveInterval = 5 * 60 * 1000;
        this.autoSaveTimer = null;
    }

    /**
     * Initialize the data manager
     * Creates data directory and loads existing data
     */
    async initialize() {
        try {
            // Ensure data directory exists
            await fs.ensureDir(this.dataDir);
            
            // Load existing data
            await this.loadAll();
            
            // Start auto-save timer
            this.startAutoSave();
            
            logger.info('💾 Data Manager initialized successfully');
            
        } catch (error) {
            logger.logError('Data Manager initialization', error);
            throw error;
        }
    }

    /**
     * Load all data from JSON files into memory
     */
    async loadAll() {
        for (const [dataType, filePath] of Object.entries(this.files)) {
            try {
                if (await fs.pathExists(filePath)) {
                    const jsonData = await fs.readJson(filePath);
                    
                    if (dataType === 'claimed') {
                        // Convert array to Set for claimed referrals
                        this.data.claimed = new Set(jsonData);
                    } else {
                        // Convert object to Map
                        this.data[dataType] = new Map(Object.entries(jsonData));
                    }
                    
                    logger.debug(`📂 Loaded ${dataType} data: ${this.data[dataType].size || this.data[dataType].size} entries`);
                } else {
                    logger.debug(`📂 No existing ${dataType} data file found, starting fresh`);
                }
            } catch (error) {
                logger.logError(`Loading ${dataType} data`, error);
            }
        }
    }

    /**
     * Save all data to JSON files
     */
    async saveAll() {
        const savePromises = [];
        
        for (const [dataType, filePath] of Object.entries(this.files)) {
            try {
                let dataToSave;
                
                if (dataType === 'claimed') {
                    // Convert Set to Array for JSON serialization
                    dataToSave = Array.from(this.data.claimed);
                } else {
                    // Convert Map to Object for JSON serialization
                    dataToSave = Object.fromEntries(this.data[dataType]);
                }
                
                savePromises.push(
                    fs.writeJson(filePath, dataToSave, { spaces: 2 })
                        .then(() => logger.debug(`💾 Saved ${dataType} data`))
                        .catch(error => logger.logError(`Saving ${dataType} data`, error))
                );
                
            } catch (error) {
                logger.logError(`Preparing ${dataType} data for save`, error);
            }
        }
        
        await Promise.all(savePromises);
        logger.debug('💾 All data saved successfully');
    }

    /**
     * Start auto-save timer
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(async () => {
            try {
                await this.saveAll();
                logger.debug('⏰ Auto-save completed');
            } catch (error) {
                logger.logError('Auto-save', error);
            }
        }, this.autoSaveInterval);
        
        logger.debug('⏰ Auto-save timer started');
    }

    /**
     * Stop auto-save timer
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            logger.debug('⏰ Auto-save timer stopped');
        }
    }

    // ===== USER DATA METHODS =====

    /**
     * Get user data by ID
     * @param {string} userId - Discord user ID
     * @returns {Object} User data object
     */
    getUser(userId) {
        if (!this.data.users.has(userId)) {
            // Create new user with default values
            const newUser = {
                balance: 0,
                totalEarned: 0,
                referrals: 0,
                lastEarn: null,
                joinedAt: Date.now()
            };
            this.data.users.set(userId, newUser);
            logger.debug(`👤 Created new user record: ${userId}`);
        }
        
        return this.data.users.get(userId);
    }

    /**
     * Update user data
     * @param {string} userId - Discord user ID
     * @param {Object} updates - Object containing fields to update
     */
    updateUser(userId, updates) {
        const user = this.getUser(userId);
        Object.assign(user, updates);
        this.data.users.set(userId, user);
        logger.debug(`👤 Updated user ${userId}:`, updates);
    }

    /**
     * Get user balance
     * @param {string} userId - Discord user ID
     * @returns {number} User's current balance
     */
    getUserBalance(userId) {
        return this.getUser(userId).balance;
    }

    /**
     * Set user balance
     * @param {string} userId - Discord user ID
     * @param {number} amount - New balance amount
     */
    setUserBalance(userId, amount) {
        this.updateUser(userId, { balance: Math.max(0, amount) });
        logger.logTransaction('set_balance', userId, amount);
    }

    /**
     * Add to user balance
     * @param {string} userId - Discord user ID
     * @param {number} amount - Amount to add
     */
    addToUserBalance(userId, amount) {
        const user = this.getUser(userId);
        const newBalance = user.balance + amount;
        const newTotalEarned = user.totalEarned + amount;
        
        this.updateUser(userId, { 
            balance: newBalance,
            totalEarned: newTotalEarned
        });
        
        logger.logTransaction('add_balance', userId, amount, `New balance: ${newBalance}`);
    }

    /**
     * Remove from user balance
     * @param {string} userId - Discord user ID
     * @param {number} amount - Amount to remove
     * @returns {boolean} True if successful, false if insufficient funds
     */
    removeFromUserBalance(userId, amount) {
        const user = this.getUser(userId);
        
        if (user.balance < amount) {
            logger.debug(`❌ Insufficient funds for user ${userId}: ${user.balance} < ${amount}`);
            return false;
        }
        
        this.updateUser(userId, { balance: user.balance - amount });
        logger.logTransaction('remove_balance', userId, amount, `New balance: ${user.balance - amount}`);
        
        return true;
    }

    /**
     * Get leaderboard data
     * @param {number} limit - Number of top users to return
     * @returns {Array} Array of user data sorted by balance
     */
    getLeaderboard(limit = 10) {
        const users = Array.from(this.data.users.entries())
            .map(([userId, userData]) => ({ userId, ...userData }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, limit);
            
        return users;
    }

    // ===== INVITE TRACKING METHODS =====

    /**
     * Register an invite code with an inviter
     * @param {string} inviteCode - Discord invite code
     * @param {string} inviterUserId - User ID of the inviter
     */
    registerInvite(inviteCode, inviterUserId) {
        this.data.invites.set(inviteCode, {
            inviterId: inviterUserId,
            registeredAt: Date.now(),
            uses: 0
        });
        
        logger.logReferral('register', inviterUserId, null, inviteCode, 'Invite registered');
    }

    /**
     * Get invite owner by code
     * @param {string} inviteCode - Discord invite code
     * @returns {string|null} User ID of the inviter or null if not found
     */
    getInviteOwner(inviteCode) {
        const invite = this.data.invites.get(inviteCode);
        return invite ? invite.inviterId : null;
    }

    /**
     * Check if invite code is registered
     * @param {string} inviteCode - Discord invite code
     * @returns {boolean} True if registered, false otherwise
     */
    isInviteRegistered(inviteCode) {
        return this.data.invites.has(inviteCode);
    }

    /**
     * Get all registered invites for a user
     * @param {string} userId - Discord user ID
     * @returns {Array} Array of invite codes registered by the user
     */
    getUserInvites(userId) {
        const userInvites = [];
        
        for (const [inviteCode, inviteData] of this.data.invites.entries()) {
            if (inviteData.inviterId === userId) {
                userInvites.push({
                    code: inviteCode,
                    ...inviteData
                });
            }
        }
        
        return userInvites;
    }

    // ===== REFERRAL CLAIM TRACKING =====

    /**
     * Check if user has already claimed a referral bonus
     * @param {string} userId - Discord user ID
     * @returns {boolean} True if already claimed, false otherwise
     */
    hasClaimedReferral(userId) {
        return this.data.claimed.has(userId);
    }

    /**
     * Mark user as having claimed referral bonus
     * @param {string} userId - Discord user ID
     */
    markReferralClaimed(userId) {
        this.data.claimed.add(userId);
        logger.debug(`✅ Marked referral as claimed for user ${userId}`);
    }

    /**
     * Process referral claim
     * @param {string} inviteCode - Invite code used
     * @param {string} claimerUserId - User ID of the person claiming
     * @returns {Object} Result object with success status and details
     */
    processReferralClaim(inviteCode, claimerUserId) {
        // Check if user has already claimed
        if (this.hasClaimedReferral(claimerUserId)) {
            return {
                success: false,
                reason: 'already_claimed',
                message: 'You have already claimed a referral bonus!'
            };
        }

        // Check if invite code is registered
        const inviterId = this.getInviteOwner(inviteCode);
        if (!inviterId) {
            return {
                success: false,
                reason: 'invalid_code',
                message: 'Invalid invite code or code not registered!'
            };
        }

        // Check if user is trying to refer themselves
        if (inviterId === claimerUserId) {
            return {
                success: false,
                reason: 'self_referral',
                message: 'You cannot refer yourself!'
            };
        }

        // Process the claim
        const referralBonus = parseInt(process.env.REFERRAL_BONUS) || 50;
        
        // Add bonus to inviter
        this.addToUserBalance(inviterId, referralBonus);
        
        // Increment inviter's referral count
        const inviter = this.getUser(inviterId);
        this.updateUser(inviterId, { referrals: inviter.referrals + 1 });
        
        // Mark claimer as having claimed
        this.markReferralClaimed(claimerUserId);
        
        logger.logReferral('claim', inviterId, claimerUserId, inviteCode, `Bonus awarded: ${referralBonus}`);
        
        return {
            success: true,
            inviterId: inviterId,
            bonus: referralBonus,
            message: `Referral bonus of ${referralBonus} coins awarded to your inviter!`
        };
    }

    // ===== STATISTICS METHODS =====

    /**
     * Get comprehensive statistics
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const totalUsers = this.data.users.size;
        const totalInvites = this.data.invites.size;
        const totalClaimed = this.data.claimed.size;
        
        let totalBalance = 0;
        let totalEarned = 0;
        let totalReferrals = 0;
        
        for (const user of this.data.users.values()) {
            totalBalance += user.balance;
            totalEarned += user.totalEarned;
            totalReferrals += user.referrals;
        }
        
        return {
            users: {
                total: totalUsers,
                totalBalance,
                totalEarned,
                averageBalance: totalUsers > 0 ? Math.round(totalBalance / totalUsers) : 0
            },
            referrals: {
                totalInvites,
                totalClaimed,
                totalReferrals,
                claimRate: totalInvites > 0 ? Math.round((totalClaimed / totalInvites) * 100) : 0
            }
        };
    }

    /**
     * Get user statistics
     * @param {string} userId - Discord user ID
     * @returns {Object} User statistics
     */
    getUserStats(userId) {
        const user = this.getUser(userId);
        const userInvites = this.getUserInvites(userId);
        const hasClaimed = this.hasClaimedReferral(userId);
        
        return {
            balance: user.balance,
            totalEarned: user.totalEarned,
            referrals: user.referrals,
            invitesRegistered: userInvites.length,
            hasClaimedReferral: hasClaimed,
            joinedAt: user.joinedAt,
            lastEarn: user.lastEarn
        };
    }
}

// Create and export singleton instance
const dataManager = new DataManager();
module.exports = dataManager;