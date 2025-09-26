const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'inventory',
  description: 'Check your inventory of items',
  usage: '!inventory',
  category: 'utility',
  cooldown: 5,
  async execute(message) {
    try {
      const userId = message.author.id;
      const user = dataManager.getUser(userId);

      const inventory = user.inventory || {};
      const items = Object.entries(inventory);

      if (items.length === 0) {
        return message.reply("Your inventory is currently empty.");
      }

      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username}'s Inventory`)
        .setColor('#00bfff')
        .setTimestamp();

      // Add field per item with quantity
      items.forEach(([itemName, qty]) => {
        embed.addFields({ name: itemName, value: qty.toString(), inline: true });
      });

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      return message.reply('An error occurred fetching your inventory.');
    }
  }
};