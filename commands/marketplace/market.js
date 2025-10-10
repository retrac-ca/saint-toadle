const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'market',
  description: 'Browse marketplace listings',
  usage: '!market [page]',
  category: 'marketplace',
  cooldown: 5,
  async execute(message, args) {
    const guildId = message.guild.id;
    const page = args[0] ? Math.max(1, parseInt(args[0], 10)) : 1;
    const perPage = 5;

    const { listings, total, totalPages } = dataManager.getListingsPaged(guildId, page, perPage);
    if (listings.length === 0) {
      return message.reply('No listings found on that page.');
    }

    const embed = new EmbedBuilder()
      .setTitle(`Marketplace Listings (Page ${page}/${totalPages})`)
      .setColor('Blue')
      .setFooter({ text: `Total Listings: ${total}` })
      .setTimestamp();

    for (const l of listings) {
      const info = dataManager.getItemInfo(l.item);
      embed.addFields({
        name: `${info.emoji || ''} ${info.name || l.item} — ID: ${l.id}`,
        value: `Seller: <@${l.sellerId}>\nQty: ${l.quantity}\nPrice: ${l.price} coins`,
        inline: false
      });
    }

    await message.reply({ embeds: [embed] });
  }
};
