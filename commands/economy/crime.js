// commands/economy/crime.js
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'crime',
  description: 'Try to commit a crime for coins, with a chance to get caught and fined!',
  usage: '!crime',
  category: 'economy',
  cooldown: 300, // 5 minutes in seconds
  async execute(message) {
    const caughtChance = 0.15; // 15% chance of being caught
    const caught = Math.random() < caughtChance;
    
    const userId = message.author.id;
    const currentBalance = dataManager.getUserBalance(userId);

    let amount, resultMessage;
    
    if (caught) {
      // User got caught - pay a fine (10-100 coins)
      amount = -(Math.floor(Math.random() * 91) + 10); // -10 to -100
      dataManager.addToUserBalance(userId, amount);
      
      const crimes = [
        'pickpocketing', 'shoplifting', 'jaywalking', 'vandalism', 
        'trespassing', 'loitering', 'speeding', 'littering'
      ];
      const crime = crimes[Math.floor(Math.random() * crimes.length)];
      
      resultMessage = `🚨 **You got caught ${crime}!** You paid a fine of **${Math.abs(amount)}** coins.`;
    } else {
      // User succeeded - earn coins (5-75 coins)
      amount = Math.floor(Math.random() * 71) + 5; // 5 to 75
      dataManager.addToUserBalance(userId, amount);
      
      const crimes = [
        'sold contraband', 'ran a con game', 'found a wallet', 'hacked an ATM',
        'smuggled goods', 'robbed a bank', 'sold insider info', 'blackmailed someone'
      ];
      const crime = crimes[Math.floor(Math.random() * crimes.length)];
      
      resultMessage = `💰 **Crime successful!** You ${crime} and earned **${amount}** coins!`;
    }

    const newBalance = dataManager.getUserBalance(userId);
    resultMessage += `\n💳 **New balance:** ${newBalance} coins`;

    return message.reply(resultMessage);
  }
};
