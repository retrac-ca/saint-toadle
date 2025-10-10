// commands/economy/crime.js
const dataManager = require('../../utils/dataManager');
const configManager = require('../../utils/managers/configManager');

module.exports = {
  name: 'crime',
  description: 'Try to commit a crime for coins, with a chance to get caught and fined!',
  usage: '!crime',
  category: 'economy',
  cooldown: 300,
  async execute(message) {
    const guildId = message.guild.id;

    if (
      !configManager.isFeatureEnabled(guildId, 'economy_enabled') ||
      !configManager.isFeatureEnabled(guildId, 'gambling_enabled')
    ) {
      return message.channel.send('❌ Crime features are disabled in this server.');
    }

    const userId = message.author.id;
    const economyConfig = configManager.getEconomyConfig(guildId);
    const { success_chance, fine_range, reward_range } = economyConfig.crime_settings;
    const caught = Math.random() > success_chance;
    const currentBalance = dataManager.getUserBalance(userId);

    if (caught) {
      const fine = Math.floor(Math.random() * (fine_range.max - fine_range.min + 1)) + fine_range.min;
      dataManager.addToUserBalance(userId, -fine);
      const newBalance = dataManager.getUserBalance(userId);
      const crimes = ['pickpocketing', 'shoplifting', 'jaywalking', 'vandalism', 'trespassing', 'loitering', 'speeding', 'littering'];
      const crime = crimes[Math.floor(Math.random() * crimes.length)];

      return message.channel.send(
        `🚨 **You got caught ${crime}!** You paid a fine of **${fine}** coins.\n💳 **New balance:** ${newBalance} coins`
      );
    } else {
      const reward = Math.floor(Math.random() * (reward_range.max - reward_range.min + 1)) + reward_range.min;
      dataManager.addToUserBalance(userId, reward);
      // Optionally award badge:
      // await dataManager.addBadge(userId, 'crime-master');

      const newBalance = dataManager.getUserBalance(userId);
      const crimes = ['sold contraband', 'ran a con game', 'found a wallet', 'hacked an ATM', 'smuggled goods', 'robbed a bank', 'sold insider info', 'blackmailed someone'];
      const crime = crimes[Math.floor(Math.random() * crimes.length)];

      return message.channel.send(
        `💰 **Crime successful!** You ${crime} and earned **${reward}** coins!\n💳 **New balance:** ${newBalance} coins`
      );
    }
  }
};
