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

    const guildId = message.guild.id;
    const userId = message.author.id;
    const item = args[0].toLowerCase();
    const quantity = parseInt(args[1], 10);
    const price = parseInt(args[2], 10);

    if (!dataManager.isValidItem(item)) {
      return message.reply(`❌ Item "${item}" not found.`);
    }
    if (quantity <= 0 || price <= 0) {
      return message.reply('❌ Quantity and price must be positive numbers.');
    }

    const userQty = dataManager.getUserItemQuantity(userId, item);
    if (userQty < quantity) {
      return message.reply(`❌ You only have ${userQty}x ${item}.`);
    }

    const listing = dataManager.createListing(userId, guildId, item, quantity, price);
    if (!listing) {
      return message.reply('❌ Failed to create listing.');
    }

    const info = dataManager.getItemInfo(item);
    const embed = new EmbedBuilder()
      .setTitle('Item Listed')
      .setDescription(`You listed **${quantity}x ${info.name || item}** for **${price} coins** each.`)
      .setColor('Green')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
