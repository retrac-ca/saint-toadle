const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'listitem',
  description: 'List an item for sale on the marketplace',
  usage: '!listitem <item> <quantity> <price>',
  category: 'marketplace',
  cooldown: 10,
  async execute(message, args) {
    if (args.length < 3) {
      return message.reply('Usage: !listitem <item> <quantity> <price>');
    }

    const userId = message.author.id;
    const item = args[0].toLowerCase();
    const quantity = parseInt(args[1]);
    const price = parseInt(args[2]);

    if (!dataManager.isValidItem(item)) {
      return message.reply(`❌ The item "${item}" does not exist in the catalog.`);
    }
    if (isNaN(quantity) || quantity <= 0) {
      return message.reply('❌ Please enter a valid positive number for quantity.');
    }
    if (isNaN(price) || price <= 0) {
      return message.reply('❌ Please enter a valid positive number for price.');
    }

    // Check user inventory
    const userItemQty = dataManager.getUserItemQuantity(userId, item);
    if (userItemQty < quantity) {
      return message.reply(`❌ You only have ${userItemQty}x ${item}, which is less than the quantity you want to list.`);
    }

    // Create the listing
    const listing = dataManager.createListing(userId, item, quantity, price);

    if (!listing) {
      return message.reply('❌ Failed to create listing. Please try again.');
    }

    const itemInfo = dataManager.getItemInfo(item);
    const embed = new EmbedBuilder()
      .setTitle('Item Listed')
      .setDescription(`You have successfully listed **${quantity}x ${itemInfo.name || item}** for **${price} coins** each.`)
      .setColor('#00ff00')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};