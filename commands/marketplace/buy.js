const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'buy',
  description: 'Buy an item from the marketplace',
  usage: '!buy <listingId> [quantity]',
  category: 'marketplace',
  cooldown: 10,
  async execute(message, args) {
    if (args.length < 1) {
      return message.reply('Usage: !buy <listingId> [quantity]');
    }

    const guildId = message.guild.id;
    const buyerId = message.author.id;
    const listingId = args[0];
    const quantity = args[1] ? parseInt(args[1], 10) : 1;

    if (quantity <= 0) {
      return message.reply('❌ Quantity must be positive.');
    }

    const result = dataManager.purchaseMarketplaceItem(buyerId, guildId, listingId, quantity);
    if (!result.success) {
      return message.reply(`❌ ${result.message}`);
    }

    const info = dataManager.getItemInfo(result.listing.item);
    const embed = new EmbedBuilder()
      .setTitle('Purchase Successful')
      .setDescription(`You bought **${quantity}x ${info.name || result.listing.item}** from <@${result.listing.sellerId}> for **${result.totalCost} coins**.`)
      .setColor('Green')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
