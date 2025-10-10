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

    // Bank manager handles banking operations (now supports guild filter)
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

  // ===== USER METHODS =====

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

  // ===== BANK METHODS =====

  getBankBalance(userId) {
    return this.bankManager.getBankBalance(userId);
  }

  depositToBank(userId, amount) {
    return this.bankManager.deposit(userId, amount);
  }

  withdrawFromBank(userId, amount) {
    return this.bankManager.withdraw(userId, amount);
  }

  /**
   * Apply bank interest to all users or filter by guild.
   * @param {number} rate - interest rate
   * @param {string|null} guildId - optional guild filter
   * @returns {{totalInterest:number,accountsWithInterest:number}}
   */
  applyBankInterest(rate = 0.01, guildId = null) {
    return this.bankManager.applyInterest(rate, guildId);
  }

  // ===== MARKETPLACE METHODS =====

  createListing(sellerId, guildId, item, quantity, price) {
    return this.marketplaceManager.createListing(sellerId, guildId, item, quantity, price);
  }

  removeListing(listingId) {
    return this.marketplaceManager.removeListing(listingId);
  }

  getListing(listingId) {
    return this.marketplaceManager.getListing(listingId);
  }

  getListingsPaged(guildId, page = 1, perPage = 10) {
    return this.marketplaceManager.getListingsPaged(guildId, page, perPage);
  }

  purchaseMarketplaceItem(buyerId, guildId, listingId, quantity) {
    return this.marketplaceManager.purchaseItem(buyerId, guildId, listingId, quantity);
  }

  // ===== REFERRAL METHODS =====

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

  // ===== STATISTICS METHODS =====

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

  // ===== NUKE METHODS =====

  async clearEconomyData(guildId) {
    await this.clearUserEconomyData(guildId);
    await this.clearMarketplaceListings(guildId);
    await this.clearStoreItems(guildId);
    await this.saveAll();
    logger.info(`💥 Economy data cleared for guild ${guildId}`);
  }

  async clearUserEconomyData(guildId) {
    const users = this.data.users || new Map();
    for (const [userId, user] of users) {
      if (user.guildId === guildId) {
        user.balance = 0;
        user.bankBalance = 0;
        user.totalEarned = 0;
        user.inventory = {};
        user.dailyStreak = 0;
        user.lastDaily = 0;
        user.lastWeekly = 0;
        user.lastEarn = 0;
        await this.userManager.updateUser(userId, user);
      }
    }
  }

  async clearMarketplaceListings(guildId) {
    const listings = this.data.listings || new Map();
    for (const [id, listing] of listings) {
      if (listing.guildId === guildId) {
        listings.delete(id);
      }
    }
  }

  async clearStoreItems(guildId) {
    const items = this.data.items || new Map();
    for (const [id, item] of items) {
      if (item.guildId === guildId) {
        items.delete(id);
      }
    }
  }

  // ===== MISC =====

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
    return Boolean(
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
