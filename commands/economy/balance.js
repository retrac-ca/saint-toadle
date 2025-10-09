const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const configManager = require('../../utils/managers/configManager');

module.exports = {
  name: 'balance',
  aliases: ['bal', 'coins', 'money'],
  description: 'Check your coin balance and bank info',
  usage: '!balance [user]',
  category: 'economy',
  cooldown: 3,
  async execute(message, args) {
    const guildId = message.guild.id;

    // Check if economy is enabled
    if (!configManager.isFeatureEnabled(guildId, 'economy_enabled')) {
      return message.reply('❌ Economy features are disabled in this server.');
    }

    // Get target user (mention or message author)
    const targetUser = message.mentions.users.first() || message.author;
    const userId = targetUser.id;

    try {
      // Get user data
      const user = await dataManager.getUser(userId, guildId);
      const balance = user.balance || 0;
      const bankBalance = user.bankBalance || 0;
      const totalEarned = user.totalEarned || 0;

      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle(`💰 ${targetUser.username}'s Balance`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '💵 Wallet', value: `${balance.toLocaleString()} coins`, inline: true },
          { name: '🏦 Bank',  value: `${bankBalance.toLocaleString()} coins`, inline: true },
          { name: '💎 Total', value: `${(balance + bankBalance).toLocaleString()} coins`, inline: true },
          { name: '📈 Total Earned', value: `${totalEarned.toLocaleString()} coins`, inline: false }
        )
        .setTimestamp();

      // Reply with the embed
      return message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in balance command:', error);
      return message.reply('❌ An error occurred while checking the balance.');
    }
  }
};
