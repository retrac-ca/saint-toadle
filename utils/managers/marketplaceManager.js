const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');

class MarketplaceManager {
    constructor(listingsData, userManager) {
        this.listingsData = listingsData;
        this.userManager = userManager;
    }

    /**
     * Create a new marketplace listing
     * @param {string} sellerId - Seller's Discord user ID
     * @param {string} item - Item key from catalog
     * @param {number} quantity - Quantity to list (must be positive)
     * @param {number} price - Price per unit or total
     * @returns {Object|null} The created listing object, or null if invalid request
     */
    createListing(sellerId, item, quantity, price) {
        if (!sellerId || !this.userManager.isValidItem(item) || quantity <= 0 || price <= 0) return null;

        const owned = this.userManager.getUserItemQuantity(sellerId, item);
        if (owned < quantity) return null;

        const removed = this.userManager.removeItemFromUser(sellerId, item, quantity);
        if (!removed) return null;

        const listingId = uuidv4();
        const listing = {
            id: listingId,
            sellerId,
            item,
            quantity,
            price,
            timestamp: Date.now()
        };

        this.listingsData.set(listingId, listing);
        logger.debug(`🛒 Created listing ${listingId} by user ${sellerId}`);

        return listing;
    }

    /**
     * Remove a marketplace listing by ID
     * @param {string} listingId - Listing unique ID
     * @returns {boolean} True on success, false if not found
     */
    removeListing(listingId) {
        if (!this.listingsData.has(listingId)) return false;
        this.listingsData.delete(listingId);
        logger.debug(`🛒 Removed listing ${listingId}`);
        return true;
    }

    /**
     * Get listing by ID
     * @param {string} listingId
     * @returns {Object|null} Listing object or null if not found
     */
    getListing(listingId) {
        return this.listingsData.get(listingId) || null;
    }

    /**
     * Get all listings paginated and optionally filtered by item or seller
     * @param {number} page - 1-based page number
     * @param {number} perPage - Number of items per page
     * @param {string|null} filterItem - Optional filter by item key
     * @param {string|null} filterSeller - Optional filter by sellerId
     * @returns {Object} { listings: Array, total: number, totalPages: number }
     */
    getListingsPaged(page = 1, perPage = 10, filterItem = null, filterSeller = null) {
        let listingsArray = Array.from(this.listingsData.values());

        if (filterItem) {
            listingsArray = listingsArray.filter(l => l.item === filterItem);
        }
        if (filterSeller) {
            listingsArray = listingsArray.filter(l => l.sellerId === filterSeller);
        }

        listingsArray.sort((a, b) => b.timestamp - a.timestamp);

        const total = listingsArray.length;
        const totalPages = Math.ceil(total / perPage);
        const start = (page - 1) * perPage;
        const paged = listingsArray.slice(start, start + perPage);

        return { listings: paged, total, totalPages };
    }

    /**
     * Process a purchase from the marketplace
     * @param {string} buyerId - Buyer's Discord user ID
     * @param {string} listingId - ID of the listing to purchase
     * @param {number} quantity - Quantity to purchase
     * @returns {Object} Result object with success status and details
     */
    purchaseItem(buyerId, listingId, quantity) {
        const listing = this.getListing(listingId);
        if (!listing) {
            return { success: false, message: 'Listing not found' };
        }

        if (quantity > listing.quantity) {
            return { success: false, message: `Only ${listing.quantity} items available` };
        }

        if (buyerId === listing.sellerId) {
            return { success: false, message: 'Cannot buy your own listing' };
        }

        const totalCost = listing.price * quantity;
        const buyerBalance = this.userManager.getUserBalance(buyerId);
        
        if (buyerBalance < totalCost) {
            return { success: false, message: `Insufficient funds. Need ${totalCost}, have ${buyerBalance}` };
        }

        // Process transaction
        const removedFunds = this.userManager.removeFromUserBalance(buyerId, totalCost);
        if (!removedFunds) {
            return { success: false, message: 'Failed to deduct payment' };
        }

        this.userManager.addToUserBalance(listing.sellerId, totalCost);
        this.userManager.addItemToUser(buyerId, listing.item, quantity);

        // Update or remove listing
        if (listing.quantity === quantity) {
            this.removeListing(listingId);
        } else {
            listing.quantity -= quantity;
            this.listingsData.set(listingId, listing);
        }

        logger.debug(`💰 Purchase completed: ${buyerId} bought ${quantity}x ${listing.item} for ${totalCost}`);

        return {
            success: true,
            message: `Successfully purchased ${quantity}x ${listing.item} for ${totalCost} coins`,
            item: listing.item,
            quantity,
            totalCost,
            sellerId: listing.sellerId
        };
    }
}

module.exports = MarketplaceManager;