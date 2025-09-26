/**
 * Daily Command - Claim daily bonus coins
 * Allows a user to claim coins once every 24 hours.
 */

const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const logger = require('../../utils/logger');

module.exports = {
  name: 'daily',
  description: 'Claim your daily coin bonus (once every 24 hours)',
  aliases: [],
  usage: '!daily',
  category: 'economy',
  cooldown: 0, // Managed manually here
  async execute(message, args, client) {
    try {
      const userId = message.author.id;
      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;
      const user = dataManager.getUser(userId);

      // Check last daily claim time
      if (user.lastDaily && (now - user.lastDaily < DAY_MS)) {
        const nextClaim = new Date(user.lastDaily + DAY_MS);
        const waitTime = nextClaim - now;
        const hours = Math.floor(waitTime / (60 * 60 * 1000));
        const minutes = Math.floor((waitTime % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((waitTime % (60 * 1000)) / 1000);

        return message.reply(`🕒 You have already claimed your daily bonus. Next claim available in ${hours}h ${minutes}m ${seconds}s.`);
      }

      // Random bonus between 20 and 100 coins
      const bonus = Math.floor(Math.random() * 81) + 20;

      // Add coins & update lastDaily
      dataManager.addToUserBalance(userId, bonus);
      dataManager.updateUser(userId, { lastDaily: now });

      const newBalance = dataManager.getUserBalance(userId);

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎁 Daily Bonus Claimed!')
        .setDescription(`You earned **${bonus.toLocaleString()}** coins today!`)
        .addFields(
          { name: '🏦 New Balance', value: `${newBalance.toLocaleString()} coins`, inline: true }
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Come back tomorrow for your next bonus!' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      logger.logTransaction('daily_bonus', userId, bonus, `New balance: ${newBalance}`);

    } catch (error) {
      logger.logError('Daily command execution', error, { user: message.author.id });
      await message.reply('❌ An error occurred while claiming your daily bonus. Please try again later.');
    }
  }
};