const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'buy',
  description: 'Buy an item from the marketplace using the listing ID',
  usage: '!buy <listingId> <quantity>',
  category: 'marketplace',
  cooldown: 10,
  async execute(message, args) {
    if (args.length < 1) {
      return message.reply('Usage: !buy <listingId> [quantity]');
    }

    const buyerId = message.author.id;
    const listingId = args[0];
    const quantity = args.length > 1 ? parseInt(args[1]) : 1;

    if (isNaN(quantity) || quantity <= 0) {
      return message.reply('❌ Please specify a valid positive number for quantity.');
    }

    const listing = dataManager.getListing(listingId);
    if (!listing) {
      return message.reply('❌ Listing not found.');
    }

    if (quantity > listing.quantity) {
      return message.reply(`❌ The listing only has ${listing.quantity} item(s) available.`);
    }

    const totalCost = listing.price * quantity;

    // Check if buyer has enough balance
    const buyerBalance = dataManager.getUserBalance(buyerId);
    if (buyerBalance < totalCost) {
      return message.reply(`❌ You do not have enough coins. Your balance is ${buyerBalance}, but the total cost is ${totalCost}.`);
    }

    if (buyerId === listing.sellerId) {
      return message.reply(`❌ You cannot buy your own listing.`);
    }

    // Proceed with transaction
    // Deduct from buyer
    const removedFunds = dataManager.removeFromUserBalance(buyerId, totalCost);
    if (!removedFunds) {
      return message.reply('❌ Failed to deduct coins from your balance.');
    }

    // Add coins to seller balance
    dataManager.addToUserBalance(listing.sellerId, totalCost);

    // Add purchased quantity to buyer inventory
    dataManager.addItemToUser(buyerId, listing.item, quantity);

    // Update or remove listing
    if (listing.quantity === quantity) {
      dataManager.removeListing(listingId);
    } else {
      listing.quantity -= quantity;
      dataManager.data.listings.set(listingId, listing);
    }

    const itemInfo = dataManager.getItemInfo(listing.item);

    const embed = new EmbedBuilder()
      .setTitle('Purchase Successful')
      .setDescription(`You bought **${quantity}x ${itemInfo.name || listing.item}** from <@${listing.sellerId}> for **${totalCost} coins**.`)
      .setColor('#00ff00')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};