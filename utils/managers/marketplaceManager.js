const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');

class MarketplaceManager {
  constructor(listingsData, userManager) {
    this.listingsData = listingsData;     // Map<id, listing>
    this.userManager = userManager;
  }

  createListing(sellerId, guildId, item, quantity, price) {
    if (!this.userManager.isValidItem(item) || quantity <= 0 || price <= 0) {
      return null;
    }

    const owned = this.userManager.getUserItemQuantity(sellerId, item);
    if (owned < quantity) return null;

    const removed = this.userManager.removeItemFromUser(sellerId, item, quantity);
    if (!removed) return null;

    const listingId = uuidv4();
    const listing = {
      id: listingId,
      guildId,
      sellerId,
      item,
      quantity,
      price,
      timestamp: Date.now()
    };

    this.listingsData.set(listingId, listing);
    logger.debug(`🛒 Created listing ${listingId} by ${sellerId} in guild ${guildId}`);
    return listing;
  }

  removeListing(listingId) {
    if (!this.listingsData.has(listingId)) return false;
    this.listingsData.delete(listingId);
    logger.debug(`🛒 Removed listing ${listingId}`);
    return true;
  }

  getListing(listingId) {
    return this.listingsData.get(listingId) || null;
  }

  getListingsPaged(guildId, page = 1, perPage = 10) {
    // Filter by guildId
    const all = Array.from(this.listingsData.values())
      .filter(l => l.guildId === guildId)
      .sort((a, b) => b.timestamp - a.timestamp);

    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const start = (page - 1) * perPage;
    const listings = all.slice(start, start + perPage);

    return { listings, total, totalPages };
  }

  purchaseItem(buyerId, guildId, listingId, quantity) {
    const listing = this.getListing(listingId);
    if (!listing || listing.guildId !== guildId) {
      return { success: false, message: 'Listing not found in this server' };
    }
    if (quantity > listing.quantity) {
      return { success: false, message: `Only ${listing.quantity} available` };
    }
    if (buyerId === listing.sellerId) {
      return { success: false, message: 'Cannot buy your own listing' };
    }

    const totalCost = listing.price * quantity;
    const buyerBal = this.userManager.getUserBalance(buyerId);
    if (buyerBal < totalCost) {
      return { success: false, message: `Insufficient funds. Need ${totalCost}, have ${buyerBal}` };
    }

    if (!this.userManager.removeFromUserBalance(buyerId, totalCost)) {
      return { success: false, message: 'Failed to deduct payment' };
    }
    this.userManager.addToUserBalance(listing.sellerId, totalCost);
    this.userManager.addItemToUser(buyerId, listing.item, quantity);

    if (listing.quantity === quantity) {
      this.removeListing(listingId);
    } else {
      listing.quantity -= quantity;
      this.listingsData.set(listingId, listing);
    }

    logger.debug(`💰 ${buyerId} bought ${quantity}x ${listing.item} for ${totalCost} in guild ${guildId}`);
    return { success: true, listing, totalCost };
  }
}

module.exports = MarketplaceManager;
