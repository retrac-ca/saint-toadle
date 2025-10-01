const { EmbedBuilder } = require('discord.js');
const StoreManager = require('../../utils/managers/storeManager');

module.exports = {
  name: 'store',
  description: 'View available store items',
  category: 'economy',
  usage: '!store',
  cooldown: 5,
  async execute(message, args, client) {
    try {
      const storeItems = await StoreManager.getItems();

      if (storeItems.length === 0) {
        return message.reply('The store is currently empty.');
      }

      const embed = new EmbedBuilder()
        .setTitle('🛒 Store Items')
        .setColor('#00AAFF')
        .setFooter({ text: 'Saint Toadle Bot Store' })
        .setTimestamp();

      for (const item of storeItems) {
        embed.addFields({ 
          name: item.name, 
          value: `Price: ${item.price} coins\n${item.description || 'No description provided.'}`, 
          inline: false 
        });
      }

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in !store command:', error);
      await message.reply('❌ An error occurred while fetching the store items.');
    }
  }
};