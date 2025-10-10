const { EmbedBuilder } = require('discord.js');
const StoreManager = require('../../utils/managers/storeManager');

module.exports = {
  name: 'store',
  description: 'Browse server store items',
  usage: '!store',
  category: 'store',
  cooldown: 5,
  async execute(message) {
    const guildId = message.guild.id;
    const storeItems = await StoreManager.getItems(guildId);
    if (!storeItems.length) {
      return message.reply('No items available in the store.');
    }

    const embed = new EmbedBuilder()
      .setTitle('Server Store')
      .setDescription('Available items:')
      .setColor('#FFD700')
      .setTimestamp();

    for (const item of storeItems) {
      embed.addFields({
        name: `${item.emoji || ''} ${item.name} — Key: ${item.key}`,
        value: `${item.description}\nPrice: ${item.price} coins`,
        inline: false
      });
    }

    await message.reply({ embeds: [embed] });
  }
};
