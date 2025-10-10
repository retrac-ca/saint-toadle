// commands/economy/daily.js
const dataManager = require('../../utils/dataManager');
const configManager = require('../../utils/managers/configManager');

module.exports = {
  name: 'daily',
  description: 'Claim your daily bonus!',
  usage: '!daily',
  category: 'economy',
  cooldown: 86400,
  async execute(message) {
    const guildId = message.guild.id;
    const userId = message.author.id;

    if (!configManager.isFeatureEnabled(guildId, 'economy_enabled')) {
      return message.channel.send('❌ Economy features are disabled in this server.');
    }

    const dailySettings = configManager.getEconomyConfig(guildId).daily_bonus;
    const bonus = Math.floor(Math.random() * (dailySettings.max - dailySettings.min + 1)) + dailySettings.min;

    dataManager.addToUserBalance(userId, bonus);
    // Optionally track total earned:
    // await dataManager.addToEarnedTotal(userId, bonus);

    const newBalance = dataManager.getUserBalance(userId);
    return message.channel.send(
      `🎁 **Daily Bonus Claimed!** You received **${bonus}** coins! Your balance: **${newBalance}** coins.`
    );
  }
};
