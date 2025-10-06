// commands/economy/invest.js
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'invest',
  description: 'Invest coins for a chance at higher returns or potential losses!',
  usage: '!invest <amount>',
  category: 'economy',
  cooldown: 600, // 10 minutes in seconds
  async execute(message, args) {
    const failChance = 0.25; // 25% chance of losing money
    const investAmount = parseInt(args[0], 10);

    if (isNaN(investAmount) || investAmount <= 0) {
      return message.reply('❌ You must specify a positive amount to invest!\nUsage: `!invest <amount>`');
    }

    if (investAmount < 10) {
      return message.reply('❌ Minimum investment is **10 coins**.');
    }

    const userId = message.author.id;
    const currentBalance = dataManager.getUserBalance(userId);

    if (investAmount > currentBalance) {
      return message.reply(`❌ You don't have enough coins! You have **${currentBalance}** coins but tried to invest **${investAmount}**.`);
    }

    // Deduct the investment amount first
    dataManager.removeFromUserBalance(userId, investAmount);
    
    const failed = Math.random() < failChance;
    let resultAmount, resultMessage;

    if (failed) {
      // Investment failed - lose 50% to 100% of investment
      const lossPercentage = Math.random() * 0.5 + 0.5; // 50% to 100%
      const lossAmount = Math.floor(investAmount * lossPercentage);
      resultAmount = -lossAmount; // This will be the net loss (already deducted investment)
      
      const failures = [
        'market crashed', 'company went bankrupt', 'ponzi scheme collapsed',
        'crypto rug pull', 'bad timing', 'economic downturn', 'SEC investigation'
      ];
      const failure = failures[Math.floor(Math.random() * failures.length)];
      
      resultMessage = `📉 **Investment failed!** Your investment in ${failure} and you lost **${lossAmount}** coins (${Math.floor(lossPercentage * 100)}% of investment).`;
      
      // Give back what they didn't lose
      const returnAmount = investAmount - lossAmount;
      if (returnAmount > 0) {
        dataManager.addToUserBalance(userId, returnAmount);
      }
    } else {
      // Investment succeeded - earn 150% to 300% of investment
      const successMultiplier = Math.random() * 1.5 + 1.5; // 1.5x to 3.0x
      const totalReturn = Math.floor(investAmount * successMultiplier);
      const profit = totalReturn - investAmount;
      
      dataManager.addToUserBalance(userId, totalReturn); // Give back investment + profit
      
      const successes = [
        'tech startup IPO', 'cryptocurrency moon', 'real estate flip',
        'stock market rally', 'commodity surge', 'merger announcement', 'patent approval'
      ];
      const success = successes[Math.floor(Math.random() * successes.length)];
      
      resultMessage = `📈 **Investment succeeded!** Your ${success} returned **${totalReturn}** coins (${Math.floor(successMultiplier * 100)}% return)!\nProfit: **+${profit}** coins`;
    }

    const newBalance = dataManager.getUserBalance(userId);
    resultMessage += `\n💳 **New balance:** ${newBalance} coins`;

    return message.reply(resultMessage);
  }
};
