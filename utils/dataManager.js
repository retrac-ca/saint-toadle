/**
 * Data Manager - Modular Persistent Data Storage System
 * 
 * Orchestrates multiple specialized managers for different data domains:
 * - UserManager: handles user balances, inventories
 * - BankManager: handles deposit/withdraw/interest operations
 * - MarketplaceManager: handles item listings and purchases
 * - ReferralManager: handles invite tracking and referral claims
 * - StatisticsManager: handles analytics and reporting
 * - DataStorage: handles all file I/O operations
 */

const logger = require('./logger');

// Import storage handler
const DataStorage = require('./storage/dataStorage');

// Import specialized managers
const UserManager = require('./managers/userManager');
const BankManager = require('./managers/bankManager');
const MarketplaceManager = require('./managers/marketplaceManager');
const ReferralManager = require('./managers/referralManager');
const StatisticsManager = require('./managers/statisticsManager');

class DataManager {
    constructor() {
        // Initialize storage handler
        this.storage = new DataStorage();
        
        // Data structures will be loaded from storage
        this.data = {};
        
        // Specialized managers (initialized after data loading)
        this.userManager = null;
        this.bankManager = null;
        this.marketplaceManager = null;
        this.referralManager = null;
        this.statisticsManager = null;
        
        // Auto-save interval (every 5 minutes)
        this.autoSaveInterval = 5 * 60 * 1000;
        this.autoSaveTimer = null;
    }

    /**
     * Initialize the data manager and all sub-managers
     */
    async initialize() {
        try {
            // Initialize storage
            await this.storage.initialize();
            
            // Load all data from files
            this.data = await this.storage.loadAll();
            
            // Initialize specialized managers with loaded data
            this.initializeManagers();
            
            // Start auto-save timer
            this.startAutoSave();
            
            logger.info('💾 Modular Data Manager initialized successfully');
            
        } catch (error) {
            logger.logError('Data Manager initialization', error);
            throw error;
        }
    }

    /**
     * Initialize all specialized managers with loaded data
     */
    initializeManagers() {
        // User manager handles user data, balances, and inventory
        this.userManager = new UserManager(this.data.users, this.data.items);
        
        // Bank manager handles banking operations
        this.bankManager = new BankManager(this.data.users);
        
        // Marketplace manager handles item listings and purchases
        this.marketplaceManager = new MarketplaceManager(this.data.listings, this.userManager);
        
        // Referral manager handles invite tracking and claims
        this.referralManager = new ReferralManager(this.data.invites, this.data.claimed, this.userManager);
        
        // Statistics manager handles analytics and reporting
        this.statisticsManager = new StatisticsManager(
            this.data.users, 
            this.data.invites, 
            this.data.claimed, 
            this.data.listings
        );
        
        logger.debug('🔧 All specialized managers initialized');
    }

    /**
     * Save all data using the storage handler
     */
    async saveAll() {
        try {
            const results = await this.storage.saveAll(this.data);
            logger.debug('💾 All data saved through storage handler');
            return results;
        } catch (error) {
            logger.logError('Save all data', error);
            throw error;
        }
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

    // ===== USER METHODS (delegated to UserManager) =====

    getUser(userId) {
        return this.userManager.getUser(userId);
    }

    updateUser(userId, updates) {
        return this.userManager.updateUser(userId, updates);
    }

    getUserBalance(userId) {
        return this.userManager.getUserBalance(userId);
    }

    setUserBalance(userId, amount) {
        return this.userManager.setUserBalance(userId, amount);
    }

    addToUserBalance(userId, amount) {
        return this.userManager.addToUserBalance(userId, amount);
    }

    removeFromUserBalance(userId, amount) {
        return this.userManager.removeFromUserBalance(userId, amount);
    }

    isValidItem(item) {
        return this.userManager.isValidItem(item);
    }

    getItemInfo(item) {
        return this.userManager.getItemInfo(item);
    }

    getUserItemQuantity(userId, item) {
        return this.userManager.getUserItemQuantity(userId, item);
    }

    addItemToUser(userId, item, quantity) {
        return this.userManager.addItemToUser(userId, item, quantity);
    }

    removeItemFromUser(userId, item, quantity) {
        return this.userManager.removeItemFromUser(userId, item, quantity);
    }

    getLeaderboard(limit = 10) {
        return this.userManager.getLeaderboard(limit);
    }

    // ===== BANK METHODS (delegated to BankManager) =====

    getBankBalance(userId) {
        return this.bankManager.getBankBalance(userId);
    }

    depositToBank(userId, amount) {
        return this.bankManager.deposit(userId, amount);
    }

    withdrawFromBank(userId, amount) {
        return this.bankManager.withdraw(userId, amount);
    }

    applyBankInterest(interestRate = 0.01) {
        return this.bankManager.applyInterest(interestRate);
    }

    // ===== MARKETPLACE METHODS (delegated to MarketplaceManager) =====

    createListing(sellerId, item, quantity, price) {
        return this.marketplaceManager.createListing(sellerId, item, quantity, price);
    }

    removeListing(listingId) {
        return this.marketplaceManager.removeListing(listingId);
    }

    getListing(listingId) {
        return this.marketplaceManager.getListing(listingId);
    }

    getListingsPaged(page = 1, perPage = 10, filterItem = null, filterSeller = null) {
        return this.marketplaceManager.getListingsPaged(page, perPage, filterItem, filterSeller);
    }

    purchaseMarketplaceItem(buyerId, listingId, quantity) {
        return this.marketplaceManager.purchaseItem(buyerId, listingId, quantity);
    }

    // ===== REFERRAL METHODS (delegated to ReferralManager) =====

    registerInvite(inviteCode, inviterUserId) {
        return this.referralManager.registerInvite(inviteCode, inviterUserId);
    }

    getInviteOwner(inviteCode) {
        return this.referralManager.getInviteOwner(inviteCode);
    }

    isInviteRegistered(inviteCode) {
        return this.referralManager.isInviteRegistered(inviteCode);
    }

    getUserInvites(userId) {
        return this.referralManager.getUserInvites(userId);
    }

    hasClaimedReferral(userId) {
        return this.referralManager.hasClaimedReferral(userId);
    }

    markReferralClaimed(userId) {
        return this.referralManager.markReferralClaimed(userId);
    }

    processReferralClaim(inviteCode, claimerUserId) {
        return this.referralManager.processReferralClaim(inviteCode, claimerUserId);
    }

    // ===== STATISTICS METHODS (delegated to StatisticsManager) =====

    getStatistics() {
        return this.statisticsManager.getStatistics();
    }

    getUserStats(userId) {
        return this.statisticsManager.getUserStats(userId, this.userManager, this.referralManager);
    }

    getTopUsers(metric = 'balance', limit = 10) {
        return this.statisticsManager.getTopUsers(metric, limit);
    }

    getMarketplaceItemStats() {
        return this.statisticsManager.getMarketplaceItemStats();
    }

    // ===== STORAGE MANAGEMENT METHODS =====

    /**
     * Create backup of all data files
     */
    async createBackup() {
        return await this.storage.createAllBackups();
    }

    /**
     * Clean old backup files
     */
    async cleanOldBackups(maxAge = 30, maxCount = 10) {
        return await this.storage.cleanOldBackups(maxAge, maxCount);
    }

    /**
     * Get storage statistics
     */
    async getStorageStats() {
        return await this.storage.getStorageStats();
    }

    /**
     * Validate all data files
     */
    async validateDataFiles() {
        return await this.storage.validateAllDataFiles();
    }

    /**
     * Force save specific data type
     */
    async saveDataType(dataType) {
        if (this.data[dataType]) {
            return await this.storage.saveData(dataType, this.data[dataType]);
        }
        return false;
    }

    /**
     * Reload specific data type from disk
     */
    async reloadDataType(dataType) {
        try {
            this.data[dataType] = await this.storage.loadData(dataType);
            this.initializeManagers(); // Reinitialize managers with new data
            logger.debug(`🔄 Reloaded ${dataType} data`);
            return true;
        } catch (error) {
            logger.logError(`Reloading ${dataType} data`, error);
            return false;
        }
    }

    // ===== UTILITY METHODS =====

    /**
     * Get memory usage statistics
     */
    getMemoryStats() {
        return {
            users: this.data.users?.size || 0,
            items: this.data.items?.size || 0,
            listings: this.data.listings?.size || 0,
            invites: this.data.invites?.size || 0,
            claimed: this.data.claimed?.size || 0,
            guilds: this.data.guilds?.size || 0
        };
    }

    /**
     * Check if data manager is properly initialized
     */
    isInitialized() {
        return !!(this.userManager && 
                 this.bankManager && 
                 this.marketplaceManager && 
                 this.referralManager && 
                 this.statisticsManager);
    }

    /**
     * Graceful shutdown - save data and cleanup
     */
    async shutdown() {
        try {
            logger.info('🔄 Shutting down Data Manager...');
            
            // Stop auto-save
            this.stopAutoSave();
            
            // Save all data one final time
            await this.saveAll();
            
            // Create a final backup
            await this.createBackup();
            
            logger.info('✅ Data Manager shutdown complete');
            
        } catch (error) {
            logger.logError('Data Manager shutdown', error);
            throw error;
        }
    }
}

// Create and export singleton instance
const dataManager = new DataManager();
module.exports = dataManager;