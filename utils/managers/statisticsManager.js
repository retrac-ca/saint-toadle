const logger = require('../logger');

class StatisticsManager {
    constructor(userData, invitesData, claimedData, listingsData) {
        this.userData = userData;
        this.invitesData = invitesData;
        this.claimedData = claimedData;
        this.listingsData = listingsData;
    }

    /**
     * Get comprehensive statistics
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const totalUsers = this.userData.size;
        const totalInvites = this.invitesData.size;
        const totalClaimed = this.claimedData.size;
        const totalListings = this.listingsData.size;
        
        let totalBalance = 0;
        let totalBankBalance = 0;
        let totalEarned = 0;
        let totalReferrals = 0;
        
        for (const user of this.userData.values()) {
            totalBalance += user.balance || 0;
            totalBankBalance += user.bankBalance || 0;
            totalEarned += user.totalEarned || 0;
            totalReferrals += user.referrals || 0;
        }
        
        return {
            users: {
                total: totalUsers,
                totalBalance,
                totalBankBalance,
                totalEarned,
                averageBalance: totalUsers > 0 ? Math.round(totalBalance / totalUsers) : 0
            },
            referrals: {
                totalInvites,
                totalClaimed,
                totalReferrals,
                claimRate: totalInvites > 0 ? Math.round((totalClaimed / totalInvites) * 100) : 0
            },
            marketplace: {
                totalListings,
                totalValue: this.getTotalMarketplaceValue()
            }
        };
    }

    /**
     * Get user statistics
     * @param {string} userId - Discord user ID
     * @returns {Object} User statistics
     */
    getUserStats(userId, userManager, referralManager) {
        const user = userManager.getUser(userId);
        const userInvites = referralManager.getUserInvites(userId);
        const hasClaimed = referralManager.hasClaimedReferral(userId);
        
        return {
            balance: user.balance,
            bankBalance: user.bankBalance || 0,
            totalEarned: user.totalEarned,
            referrals: user.referrals,
            invitesRegistered: userInvites.length,
            hasClaimedReferral: hasClaimed,
            joinedAt: user.joinedAt,
            lastEarn: user.lastEarn,
            lastBankActivity: user.lastBankActivity
        };
    }

    /**
     * Get total marketplace value
     * @returns {number} Total value of all listings
     */
    getTotalMarketplaceValue() {
        let totalValue = 0;
        for (const listing of this.listingsData.values()) {
            totalValue += listing.price * listing.quantity;
        }
        return totalValue;
    }

    /**
     * Get top users by various metrics
     * @param {string} metric - 'balance', 'bankBalance', 'totalEarned', 'referrals'
     * @param {number} limit - Number of users to return
     * @returns {Array} Top users array
     */
    getTopUsers(metric = 'balance', limit = 10) {
        const users = Array.from(this.userData.entries())
            .map(([userId, userData]) => ({ userId, ...userData }))
            .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
            .slice(0, limit);
            
        return users;
    }

    /**
     * Get marketplace statistics by item
     * @returns {Object} Item statistics
     */
    getMarketplaceItemStats() {
        const itemStats = {};
        
        for (const listing of this.listingsData.values()) {
            if (!itemStats[listing.item]) {
                itemStats[listing.item] = {
                    totalListings: 0,
                    totalQuantity: 0,
                    averagePrice: 0,
                    minPrice: Infinity,
                    maxPrice: 0,
                    totalValue: 0
                };
            }
            
            const stats = itemStats[listing.item];
            stats.totalListings++;
            stats.totalQuantity += listing.quantity;
            stats.totalValue += listing.price * listing.quantity;
            stats.minPrice = Math.min(stats.minPrice, listing.price);
            stats.maxPrice = Math.max(stats.maxPrice, listing.price);
        }
        
        // Calculate averages
        for (const stats of Object.values(itemStats)) {
            stats.averagePrice = Math.round(stats.totalValue / stats.totalQuantity);
            if (stats.minPrice === Infinity) stats.minPrice = 0;
        }
        
        return itemStats;
    }
}

module.exports = StatisticsManager;