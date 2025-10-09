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
    return this.userManager.addToUserInventory(userId, item, quantity);
  }

  removeItemFromUser(userId, item, quantity) {
    return this.userManager.removeFromUser(userId, item, quantity);
  }

  getLeaderboard(limit = 10) {
    return this.userManager.getLeaderboard(limit);
  }

  // ===== PROFILE EXTENSIONS =====

  async setBio(userId, text) {
    const user = (await this.userManager.getUser(userId)) || {};
    user.bio = text;
    await this.userManager.updateUser(userId, user);
    await this.saveAll();
  }

  async addLink(userId, platform, url) {
    const user = (await this.userManager.getUser(userId)) || {};
    user.links = user.links || {};
    user.links[platform] = url;
    await this.userManager.updateUser(userId, user);
    await this.saveAll();
  }

  async removeLink(userId, platform) {
    const user = (await this.userManager.getUser(userId)) || {};
    if (user.links) {
      delete user.links[platform];
      await this.userManager.updateUser(userId, user);
      await this.saveAll();
    }
  }

  async awardBadge(userId, badgeId) {
    const user = (await this.userManager.getUser(userId)) || {};
    user.badges = user.badges || [];
    if (!user.badges.includes(badgeId)) {
      user.badges.push(badgeId);
      await this.userManager.updateUser(userId, user);
      await this.saveAll();
    }
  }

  async revokeBadge(userId, badgeId) {
    const user = (await this.userManager.getUser(userId)) || {};
    if (user.badges) {
      user.badges = user.badges.filter(b => b !== badgeId);
      await this.userManager.updateUser(userId, user);
      await this.saveAll();
    }
  }

  async addToEarnedTotal(userId, amount) {
    const user = (await this.userManager.getUser(userId)) || {};
    user.totalEarned = (user.totalEarned || 0) + amount;
    await this.userManager.updateUser(userId, user);
    await this.saveAll();
  }

  async updateDailyStreak(userId, claimedToday, claimedYesterday) {
    const user = (await this.userManager.getUser(userId)) || {};
    if (claimedToday && claimedYesterday) {
      user.dailyStreak = (user.dailyStreak || 0) + 1;
    } else if (claimedToday) {
      user.dailyStreak = 1;
    }
    await this.userManager.updateUser(userId, user);
    await this.saveAll();
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

  async applyBankInterestForGuild(guildId, rate) {
    const allUsers = await this.userManager.getAllUsers();
    let totalInterest = 0;
    let accountsWithInterest = 0;

    for (const [userId, userData] of Object.entries(allUsers)) {
      if (userData.guildId !== guildId) continue;
      const balance = userData.bankBalance || 0;
      if (balance <= 0) continue;

      const interest = Math.floor(balance * rate);
      if (interest > 0) {
        userData.bankBalance += interest;
        totalInterest += interest;
        accountsWithInterest++;
      }
    }

    await this.userManager.saveAllUsers(allUsers);
    return { totalInterest, accountsWithInterest };
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

  async createBackup() {
    return await this.storage.createAllBackups();
  }

  async cleanOldBackups(maxAge = 30, maxCount = 10) {
    return await this.storage.cleanOldBackups(maxAge, maxCount);
  }

  async getStorageStats() {
    return await this.storage.getStorageStats();
  }

  async validateDataFiles() {
    return await this.storage.validateAllDataFiles();
  }

  async saveDataType(dataType) {
    if (this.data[dataType]) {
      return await this.storage.saveData(dataType, this.data[dataType]);
    }
    return false;
  }

  async reloadDataType(dataType) {
    try {
      this.data[dataType] = await this.storage.loadData(dataType);
      this.initializeManagers();
      logger.debug(`🔄 Reloaded ${dataType} data`);
      return true;
    } catch (error) {
      logger.logError(`Reloading ${dataType} data`, error);
      return false;
    }
  }

  // ===== Nuke Methods =====

  /**
   * Clear all economy data for a guild (preserving levels/achievements)
   * @param {string} guildId
   */
  async clearEconomyData(guildId) {
    // Clear user economy data
    await this.clearUserEconomyData(guildId);

    // Clear marketplace listings
    await this.clearMarketplaceListings(guildId);

    // Clear store items
    await this.clearStoreItems(guildId);

    // Persist all changes
    await this.saveAll();

    logger.info(`💥 Economy data cleared for guild ${guildId}`);
  }

  /**
   * Clear user economy data (balances, inventories) but preserve levels/achievements
   * @param {string} guildId
   */
  async clearUserEconomyData(guildId) {
    const users = this.data.users || new Map();

    for (const [userId, user] of users) {
      if (user.guildId === guildId || (!user.guildId && guildId === 'default')) {
        user.balance = 0;
        user.bankBalance = 0;
        user.totalEarned = 0;
        user.inventory = {};
        user.dailyStreak = 0;
        user.lastDaily = 0;
        user.lastWeekly = 0;
        user.lastEarn = 0;
        // preserve: level, experience, messageCount, reactionCount, voiceTimeTotal, achievements, badges, bio, links, referrals
        await this.userManager.updateUser(userId, user);
      }
    }
  }

  /**
   * Clear all marketplace listings for a guild
   * @param {string} guildId
   */
  async clearMarketplaceListings(guildId) {
    const listings = this.data.listings || new Map();
    for (const [id, listing] of listings) {
      if (listing.guildId === guildId || (!listing.guildId && guildId === 'default')) {
        listings.delete(id);
      }
    }
  }

  /**
   * Clear all store items for a guild
   * @param {string} guildId
   */
  async clearStoreItems(guildId) {
    const items = this.data.items || new Map();
    for (const [id, item] of items) {
      if (item.guildId === guildId || (!item.guildId && guildId === 'default')) {
        items.delete(id);
      }
    }
  }

  // ===== UTILITY METHODS =====

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

  isInitialized() {
    return !!(
      this.userManager &&
      this.bankManager &&
      this.marketplaceManager &&
      this.referralManager &&
      this.statisticsManager
    );
  }

  async shutdown() {
    try {
      logger.info('🔄 Shutting down Data Manager...');
      this.stopAutoSave();
      await this.saveAll();
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
