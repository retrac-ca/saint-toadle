const logger = require('../logger');
const DataStorage = require('../storage/dataStorage');

class UserManager {
    constructor(userData, itemsData) {
        this.userData = userData;     // Map of userId → userData
        this.itemsData = itemsData;   // Map of itemKey → itemInfo
        this.storage = new DataStorage();
    }

    /**
     * Return all user records as an object keyed by userId.
     * @returns {Promise<Object.<string, Object>>}
     */
    async getAllUsers() {
        const obj = {};
        for (const [id, data] of this.userData.entries()) {
            obj[id] = data;
        }
        return obj;
    }

    /**
     * Persist all user records passed in.
     * @param {Object.<string, Object>} allUsers
     * @returns {Promise<void>}
     */
    async saveAllUsers(allUsers) {
        // Update in-memory Map
        this.userData.clear();
        for (const [id, data] of Object.entries(allUsers)) {
            this.userData.set(id, data);
        }
        // Persist the Map directly so DataStorage can iterate it
        await this.storage.saveData('users', this.userData);
        logger.debug('💾 Saved all users to storage');
    }

    /**
     * Get user data by ID
     * @param {string} userId
     * @returns {Object}
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
                inventory: {},
                badges: [],
                links: {},
                bio: '',
                dailyStreak: 0,
                lastDaily: 0,
                lastWeekly: 0,
                guildId: null,
                // Add theme fields
                unlockedThemes: [],
                selectedTheme: null
            };
            this.userData.set(userId, newUser);
            logger.debug(`👤 Created new user record: ${userId}`);
        }
        const user = this.userData.get(userId);
        // Ensure legacy users get theme fields
        user.inventory = user.inventory || {};
        user.bankBalance = user.bankBalance || 0;
        user.badges = user.badges || [];
        user.links = user.links || {};
        user.unlockedThemes = Array.isArray(user.unlockedThemes) ? user.unlockedThemes : [];
        if (!('selectedTheme' in user)) user.selectedTheme = null;
        return user;
    }

    updateUser(userId, updates) {
        const user = this.getUser(userId);
        Object.assign(user, updates);
        this.userData.set(userId, user);
        logger.debug(`👤 Updated user ${userId}:`, updates);
    }

    getUserBalance(userId) {
        return this.getUser(userId).balance;
    }

    setUserBalance(userId, amount) {
        this.updateUser(userId, { balance: Math.max(0, amount) });
        logger.logTransaction('set_balance', userId, amount);
    }

    addToUserBalance(userId, amount) {
        const user = this.getUser(userId);
        const newBalance = user.balance + amount;
        const newTotalEarned = (user.totalEarned || 0) + Math.max(0, amount);
        this.updateUser(userId, {
            balance: newBalance,
            totalEarned: newTotalEarned
        });
        logger.logTransaction('add_balance', userId, amount, `New balance: ${newBalance}`);
    }

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

    isValidItem(item) {
        return this.itemsData.has(item);
    }

    getItemInfo(item) {
        return this.itemsData.get(item);
    }

    getUserItemQuantity(userId, item) {
        if (!this.isValidItem(item)) return 0;
        const user = this.getUser(userId);
        return user.inventory[item] || 0;
    }

    addItemToUser(userId, item, quantity) {
        if (quantity <= 0 || !this.isValidItem(item)) return false;
        const user = this.getUser(userId);
        user.inventory[item] = (user.inventory[item] || 0) + quantity;
        this.updateUser(userId, user);
        logger.debug(`🛒 Added ${quantity}x ${item} to user ${userId}`);
        return true;
    }

    addItemToUserInventory(userId, item, quantity) {
        if (quantity <= 0) return false;
        const user = this.getUser(userId);
        user.inventory[item] = (user.inventory[item] || 0) + quantity;
        this.updateUser(userId, user);
        logger.debug(`🛒 Added ${quantity}x ${item} to user ${userId} inventory (store purchase)`);
        return true;
    }

    removeItemFromUser(userId, item, quantity) {
        if (quantity <= 0 || !this.isValidItem(item)) return false;
        const user = this.getUser(userId);
        if ((user.inventory[item] || 0) < quantity) return false;
        user.inventory[item] -= quantity;
        if (user.inventory[item] === 0) delete user.inventory[item];
        this.updateUser(userId, user);
        logger.debug(`🛒 Removed ${quantity}x ${item} from user ${userId}`);
        return true;
    }

    getLeaderboard(limit = 10) {
        return Array.from(this.userData.entries())
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, limit);
    }
}

module.exports = UserManager;
