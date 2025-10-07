const dataManager = require('../../utils/dataManager');
const configManager = require('../../utils/managers/configManager');

module.exports = {
  name: 'daily',
  description: 'Claim your daily bonus!',
  usage: '!daily',
  category: 'economy',
  cooldown: 86400, // 24 hours
  async execute(message) {
    const guildId = message.guild.id;
    const userId = message.author.id;

    // Check if economy is enabled
    if (!configManager.isFeatureEnabled(guildId, 'economy_enabled')) {
      return message.channel.send('❌ Economy features are disabled in this server.');
    }

    // Get configured daily bonus range
    const economyConfig = configManager.getEconomyConfig(guildId);
    const dailySettings = economyConfig.daily_bonus;
    const minBonus = dailySettings.min;
    const maxBonus = dailySettings.max;
    
    const bonus = Math.floor(Math.random() * (maxBonus - minBonus + 1)) + minBonus;

    // Add bonus to user
    await dataManager.addToUserBalance(userId, bonus);
    await dataManager.addToEarnedTotal(userId, bonus);

    const newBalance = dataManager.getUserBalance(userId);

    return message.channel.send(`🎁 **Daily Bonus Claimed!** You received **${bonus}** coins! Your balance: **${newBalance}** coins.`);
  }
};
