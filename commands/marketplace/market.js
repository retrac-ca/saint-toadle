const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'market',
  description: 'Browse marketplace listings',
  usage: '!market [page]',
  category: 'marketplace',
  cooldown: 5,
  async execute(message, args) {
    const page = args.length > 0 ? Math.max(1, parseInt(args[0])) : 1;
    const perPage = 5; // Items per page

    const { listings, total, totalPages } = dataManager.getListingsPaged(page, perPage);

    if (listings.length === 0) {
      return message.reply('No marketplace listings found for that page.');
    }

    const embed = new EmbedBuilder()
      .setTitle(`Marketplace Listings (Page ${page}/${totalPages})`)
      .setColor('#00bfff')
      .setFooter({ text: `Total Listings: ${total}`})
      .setTimestamp();

    for (const listing of listings) {
      const itemInfo = dataManager.getItemInfo(listing.item) || {};
      embed.addFields({
        name: `${itemInfo.emoji || ''} ${itemInfo.name || listing.item} — ID: ${listing.id}`,
        value: `Seller: <@${listing.sellerId}>\nQuantity: ${listing.quantity}\nPrice: ${listing.price} coins each`,
        inline: false
      });
    }

    await message.reply({ embeds: [embed] });
  }
};