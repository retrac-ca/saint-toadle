const logger = require('../logger');

class UserManager {
    constructor(userData, itemsData) {
        this.userData = userData;
        this.itemsData = itemsData;
    }

    /**
     * Get user data by ID
     * @param {string} userId - Discord user ID
     * @returns {Object} User data object
     */
    getUser(userId) {
        if (!this.userData.has(userId)) {
            const newUser = {
                balance: 0,
                totalEarned: 0,
                bankBalance: 0,
                referrals: 0,
                lastEarn: null,
                lastBankActivity: null,
                joinedAt: Date.now(),
                inventory: {}
            };
            this.userData.set(userId, newUser);
            logger.debug(`👤 Created new user record: ${userId}`);
        }
        
        const user = this.userData.get(userId);
        if (!user.inventory) user.inventory = {};
        if (user.bankBalance === undefined) user.bankBalance = 0;
        return user;
    }

    /**
     * Update user data
     * @param {string} userId - Discord user ID
     * @param {Object} updates - Object containing fields to update
     */
    updateUser(userId, updates) {
        const user = this.getUser(userId);
        Object.assign(user, updates);
        this.userData.set(userId, user);
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
     * Check if item key is valid in the item catalog
     * @param {string} item - Item key
     * @returns {boolean} True if item exists in catalog
     */
    isValidItem(item) {
        return this.itemsData.has(item);
    }

    /**
     * Get item information from catalog
     * @param {string} item - Item key
     * @returns {Object} Item data object or undefined if not found
     */
    getItemInfo(item) {
        return this.itemsData.get(item);
    }

    /**
     * Get quantity of an item in user's inventory
     * @param {string} userId - Discord user ID
     * @param {string} item - Item name
     * @returns {number} Quantity owned, or 0 if none or invalid item
     */
    getUserItemQuantity(userId, item) {
        if (!this.isValidItem(item)) return 0;
        const user = this.getUser(userId);
        if (!user.inventory) return 0;
        return user.inventory[item] || 0;
    }

    /**
     * Add item(s) to user's inventory
     * @param {string} userId - Discord user ID
     * @param {string} item - Item name
     * @param {number} quantity - Quantity to add
     * @returns {boolean} True if successful
     */
    addItemToUser(userId, item, quantity) {
        if (quantity <= 0 || !this.isValidItem(item)) return false;
        const user = this.getUser(userId);
        if (!user.inventory) user.inventory = {};
        if (!user.inventory[item]) user.inventory[item] = 0;
        user.inventory[item] += quantity;
        this.updateUser(userId, user);
        logger.debug(`🛒 Added ${quantity}x ${item} to user ${userId}`);
        return true;
    }

    /**
     * Remove item(s) from user's inventory
     * @param {string} userId - Discord user ID
     * @param {string} item - Item name
     * @param {number} quantity - Quantity to remove
     * @returns {boolean} True if successful, false if insufficient quantity or invalid item
     */
    removeItemFromUser(userId, item, quantity) {
        if (quantity <= 0 || !this.isValidItem(item)) return false;
        const user = this.getUser(userId);
        if (!user.inventory || !user.inventory[item]) return false;
        if (user.inventory[item] < quantity) return false;
        user.inventory[item] -= quantity;
        if (user.inventory[item] === 0) delete user.inventory[item];
        this.updateUser(userId, user);
        logger.debug(`🛒 Removed ${quantity}x ${item} from user ${userId}`);
        return true;
    }

    /**
     * Get leaderboard data
     * @param {number} limit - Number of top users to return
     * @returns {Array} Array of user data sorted by balance
     */
    getLeaderboard(limit = 10) {
        const users = Array.from(this.userData.entries())
            .map(([userId, userData]) => ({ userId, ...userData }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, limit);
            
        return users;
    }
}

module.exports = UserManager;