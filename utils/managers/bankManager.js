const logger = require('../logger');

class BankManager {
    constructor(userData) {
        this.userData = userData;
    }

    /**
     * Get user's bank balance
     * @param {string} userId - Discord user ID
     * @returns {number} Bank balance
     */
    getBankBalance(userId) {
        const user = this.getUser(userId);
        return user.bankBalance || 0;
    }

    /**
     * Deposit coins from wallet to bank
     * @param {string} userId - Discord user ID
     * @param {number} amount - Amount to deposit
     * @returns {Object} Result object with success status
     */
    deposit(userId, amount) {
        if (amount <= 0) {
            return { success: false, message: 'Amount must be positive' };
        }

        const user = this.getUser(userId);
        if (user.balance < amount) {
            return {
                success: false,
                message: `Insufficient wallet balance. You have ${user.balance} coins.`
            };
        }

        // Transfer from wallet to bank
        user.balance -= amount;
        user.bankBalance = (user.bankBalance || 0) + amount;
        user.lastBankActivity = Date.now();

        this.updateUser(userId, user);
        logger.debug(`💰 User ${userId} deposited ${amount} coins to bank`);

        return {
            success: true,
            message: `Deposited ${amount} coins to bank`,
            newWalletBalance: user.balance,
            newBankBalance: user.bankBalance
        };
    }

    /**
     * Withdraw coins from bank to wallet
     * @param {string} userId - Discord user ID
     * @param {number} amount - Amount to withdraw
     * @returns {Object} Result object with success status
     */
    withdraw(userId, amount) {
        if (amount <= 0) {
            return { success: false, message: 'Amount must be positive' };
        }

        const user = this.getUser(userId);
        const bankBalance = user.bankBalance || 0;

        if (bankBalance < amount) {
            return {
                success: false,
                message: `Insufficient bank balance. You have ${bankBalance} coins in bank.`
            };
        }

        // Transfer from bank to wallet
        user.bankBalance = bankBalance - amount;
        user.balance += amount;
        user.lastBankActivity = Date.now();

        this.updateUser(userId, user);
        logger.debug(`💰 User ${userId} withdrew ${amount} coins from bank`);

        return {
            success: true,
            message: `Withdrew ${amount} coins from bank`,
            newWalletBalance: user.balance,
            newBankBalance: user.bankBalance
        };
    }

    /**
     * Apply interest to bank accounts
     * @param {number} interestRate - Interest rate (e.g., 0.02 for 2%)
     * @param {string|null} guildId - If provided, only apply to users in this guild
     * @returns {Object} Summary of interest applied
     */
    applyInterest(interestRate = 0.01, guildId = null) {
        let totalInterest = 0;
        let accountsWithInterest = 0;

        for (const [userId, user] of this.userData.entries()) {
            // If guildId filter set, skip users not in that guild
            if (guildId && user.guildId !== guildId) continue;

            const bankBalance = user.bankBalance || 0;
            if (bankBalance > 0) {
                const interest = Math.floor(bankBalance * interestRate);
                if (interest > 0) {
                    user.bankBalance = bankBalance + interest;
                    user.totalEarned = (user.totalEarned || 0) + interest;
                    this.updateUser(userId, user);

                    totalInterest += interest;
                    accountsWithInterest++;
                }
            }
        }

        logger.info(`💰 Applied ${totalInterest} total interest to ${accountsWithInterest} bank accounts`);
        return { totalInterest, accountsWithInterest };
    }

    // Helper methods
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
        return this.userData.get(userId);
    }

    updateUser(userId, updates) {
        const user = this.getUser(userId);
        Object.assign(user, updates);
        this.userData.set(userId, user);
        logger.debug(`👤 Updated user ${userId}:`, updates);
    }
}

module.exports = BankManager;
