const dataManager = require('../../utils/dataManager');
const configManager = require('../../utils/managers/configManager');

module.exports = {
  name: 'invest',
  description: 'Invest coins with a chance to multiply or lose them!',
  usage: '!invest <amount>',
  category: 'economy',
  cooldown: 600, // 10 minutes
  async execute(message, args) {
    const guildId = message.guild.id;
    const userId = message.author.id;

    // Check if features are enabled
    if (!configManager.isFeatureEnabled(guildId, 'economy_enabled') || 
        !configManager.isFeatureEnabled(guildId, 'gambling_enabled')) {
      return message.channel.send('❌ Investment features are disabled in this server.');
    }

    if (!args[0]) {
      return message.channel.send('Usage: !invest <amount>');
    }

    const amount = parseInt(args[0], 10);
    if (isNaN(amount) || amount < 1) {
      return message.channel.send('❌ Please enter a valid amount to invest.');
    }

    const balance = dataManager.getUserBalance(userId);
    if (balance < amount) {
      return message.channel.send(`❌ You don't have enough coins! Your balance: **${balance}** coins.`);
    }

    // Get configured investment settings
    const economyConfig = configManager.getEconomyConfig(guildId);
    const investSettings = economyConfig.invest_settings;
    const failChance = investSettings.fail_chance;
    const minMultiplier = investSettings.multiplier_range.min;
    const maxMultiplier = investSettings.multiplier_range.max;

    // Remove the investment amount first
    await dataManager.addToUserBalance(userId, -amount);

    const failed = Math.random() < failChance;
    
    if (failed) {
      const newBalance = dataManager.getUserBalance(userId);
      return message.channel.send(`📉 **Investment Failed!** You lost **${amount}** coins. Your balance: **${newBalance}** coins.`);
    } else {
      const multiplier = Math.random() * (maxMultiplier - minMultiplier) + minMultiplier;
      const profit = Math.floor(amount * multiplier);
      
      await dataManager.addToUserBalance(userId, profit);
      await dataManager.addToEarnedTotal(userId, profit - amount);
      
      const newBalance = dataManager.getUserBalance(userId);
      const netGain = profit - amount;
      
      return message.channel.send(`📈 **Investment Success!** You invested **${amount}** coins and got back **${profit}** coins (${netGain > 0 ? '+' : ''}${netGain} profit). Your balance: **${newBalance}** coins.`);
    }
  }
};
