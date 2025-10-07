const dataManager = require('../../utils/dataManager');
const configManager = require('../../utils/managers/configManager');

module.exports = {
  name: 'crime',
  description: 'Try to commit a crime for coins, with a chance to get caught and fined!',
  usage: '!crime',
  category: 'economy',
  cooldown: 300, // 5 minutes in seconds
  async execute(message) {
    const guildId = message.guild.id;

    // Check if economy and gambling are enabled for this guild
    if (!configManager.isFeatureEnabled(guildId, 'economy_enabled') || 
        !configManager.isFeatureEnabled(guildId, 'gambling_enabled')) {
      return message.channel.send('❌ Crime features are disabled in this server.');
    }

    const userId = message.author.id;
    
    // Get configured crime settings for this guild
    const economyConfig = configManager.getEconomyConfig(guildId);
    const crimeSettings = economyConfig.crime_settings;
    
    const successChance = crimeSettings.success_chance;
    const caught = Math.random() > successChance;
    
    const currentBalance = await dataManager.getUserBalance(userId);
    
    let amount, resultMessage;
    
    if (caught) {
      // Calculate fine within configured range
      const minFine = crimeSettings.fine_range.min;
      const maxFine = crimeSettings.fine_range.max;
      const fine = Math.floor(Math.random() * (maxFine - minFine + 1)) + minFine;
      
      // Deduct fine (allow negative balance)
      await dataManager.addToUserBalance(userId, -fine);
      const newBalance = dataManager.getUserBalance(userId);
      
      const crimes = [
        'pickpocketing', 'shoplifting', 'jaywalking', 'vandalism', 
        'trespassing', 'loitering', 'speeding', 'littering'
      ];
      const crime = crimes[Math.floor(Math.random() * crimes.length)];
      
      resultMessage = `🚨 **You got caught ${crime}!** You paid a fine of **${fine}** coins.`;
      resultMessage += `\n💳 **New balance:** ${newBalance} coins`;
      
      return message.channel.send(resultMessage);
    } else {
      // Calculate reward within configured range
      const minReward = crimeSettings.reward_range.min;
      const maxReward = crimeSettings.reward_range.max;
      const reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
      
      // Give reward
      await dataManager.addToUserBalance(userId, reward);
      
      // Add to earned total for badge tracking
      await dataManager.addToEarnedTotal(userId, reward);
      
      // Award crime-master badge
      await dataManager.awardBadge(userId, 'crime-master');
      
      const newBalance = dataManager.getUserBalance(userId);
      
      const crimes = [
        'sold contraband', 'ran a con game', 'found a wallet', 'hacked an ATM',
        'smuggled goods', 'robbed a bank', 'sold insider info', 'blackmailed someone'
      ];
      const crime = crimes[Math.floor(Math.random() * crimes.length)];
      
      resultMessage = `💰 **Crime successful!** You ${crime} and earned **${reward}** coins!`;
      resultMessage += `\n💳 **New balance:** ${newBalance} coins`;

      return message.channel.send(resultMessage);
    }
  }
};
