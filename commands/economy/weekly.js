/**
 * Weekly Command - Claim weekly bonus coins
 * Allows a user to claim coins once every 7 days.
 */

const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const logger = require('../../utils/logger');

module.exports = {
  name: 'weekly',
  description: 'Claim your weekly coin bonus (once every 7 days)',
  aliases: [],
  usage: '!weekly',
  category: 'economy',
  cooldown: 0, // Managed manually here
  async execute(message, args, client) {
    try {
      const userId = message.author.id;
      const now = Date.now();
      const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      const user = dataManager.getUser(userId);

      // Check last weekly claim time
      if (user.lastWeekly && (now - user.lastWeekly < WEEK_MS)) {
        const nextClaim = new Date(user.lastWeekly + WEEK_MS);
        const waitTime = nextClaim - now;
        const days = Math.floor(waitTime / (24 * 60 * 60 * 1000));
        const hours = Math.floor((waitTime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((waitTime % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((waitTime % (60 * 1000)) / 1000);

        return message.reply(`🕒 You have already claimed your weekly bonus. Next claim available in ${days}d ${hours}h ${minutes}m ${seconds}s.`);
      }

      // Random bonus between 100 and 500 coins
      const bonus = Math.floor(Math.random() * 401) + 100;

      // Add coins & update lastWeekly
      dataManager.addToUserBalance(userId, bonus);
      dataManager.updateUser(userId, { lastWeekly: now });

      const newBalance = dataManager.getUserBalance(userId);

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎉 Weekly Bonus Claimed!')
        .setDescription(`You earned **${bonus.toLocaleString()}** coins this week!`)
        .addFields(
          { name: '🏦 New Balance', value: `${newBalance.toLocaleString()} coins`, inline: true }
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Come back next week for your next bonus!' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      logger.logTransaction('weekly_bonus', userId, bonus, `New balance: ${newBalance}`);

    } catch (error) {
      logger.logError('Weekly command execution', error, { user: message.author.id });
      await message.reply('❌ An error occurred while claiming your weekly bonus. Please try again later.');
    }
  }
};