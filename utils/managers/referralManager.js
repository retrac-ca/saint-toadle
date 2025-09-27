const logger = require('../logger');

class ReferralManager {
    constructor(invitesData, claimedData, userManager) {
        this.invitesData = invitesData;
        this.claimedData = claimedData;
        this.userManager = userManager;
    }

    /**
     * Register an invite code with an inviter
     * @param {string} inviteCode - Discord invite code
     * @param {string} inviterUserId - User ID of the inviter
     */
    registerInvite(inviteCode, inviterUserId) {
        this.invitesData.set(inviteCode, {
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
        const invite = this.invitesData.get(inviteCode);
        return invite ? invite.inviterId : null;
    }

    /**
     * Check if invite code is registered
     * @param {string} inviteCode - Discord invite code
     * @returns {boolean} True if registered, false otherwise
     */
    isInviteRegistered(inviteCode) {
        return this.invitesData.has(inviteCode);
    }

    /**
     * Get all registered invites for a user
     * @param {string} userId - Discord user ID
     * @returns {Array} Array of invite codes registered by the user
     */
    getUserInvites(userId) {
        const userInvites = [];
        
        for (const [inviteCode, inviteData] of this.invitesData.entries()) {
            if (inviteData.inviterId === userId) {
                userInvites.push({
                    code: inviteCode,
                    ...inviteData
                });
            }
        }
        
        return userInvites;
    }

    /**
     * Check if user has already claimed a referral bonus
     * @param {string} userId - Discord user ID
     * @returns {boolean} True if already claimed, false otherwise
     */
    hasClaimedReferral(userId) {
        return this.claimedData.has(userId);
    }

    /**
     * Mark user as having claimed referral bonus
     * @param {string} userId - Discord user ID
     */
    markReferralClaimed(userId) {
        this.claimedData.add(userId);
        logger.debug(`✅ Marked referral as claimed for user ${userId}`);
    }

    /**
     * Process referral claim
     * @param {string} inviteCode - Invite code used
     * @param {string} claimerUserId - User ID of the person claiming
     * @returns {Object} Result object with success status and details
     */
    processReferralClaim(inviteCode, claimerUserId) {
        if (this.hasClaimedReferral(claimerUserId)) {
            return {
                success: false,
                reason: 'already_claimed',
                message: 'You have already claimed a referral bonus!'
            };
        }

        const inviterId = this.getInviteOwner(inviteCode);
        if (!inviterId) {
            return {
                success: false,
                reason: 'invalid_code',
                message: 'Invalid invite code or code not registered!'
            };
        }

        if (inviterId === claimerUserId) {
            return {
                success: false,
                reason: 'self_referral',
                message: 'You cannot refer yourself!'
            };
        }

        const referralBonus = parseInt(process.env.REFERRAL_BONUS) || 50;
        
        this.userManager.addToUserBalance(inviterId, referralBonus);
        
        const inviter = this.userManager.getUser(inviterId);
        this.userManager.updateUser(inviterId, { referrals: inviter.referrals + 1 });
        
        this.markReferralClaimed(claimerUserId);
        
        logger.logReferral('claim', inviterId, claimerUserId, inviteCode, `Bonus awarded: ${referralBonus}`);
        
        return {
            success: true,
            inviterId: inviterId,
            bonus: referralBonus,
            message: `Referral bonus of ${referralBonus} coins awarded to your inviter!`
        };
    }
}

module.exports = ReferralManager;