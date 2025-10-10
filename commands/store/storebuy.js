const { EmbedBuilder } = require('discord.js');
const StoreManager = require('../../utils/managers/storeManager');
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'storebuy',
  description: 'Buy an item from the store',
  usage: '!storebuy <item key> [quantity]',
  category: 'store',
  cooldown: 5,
  async execute(message, args) {
    if (args.length < 1) {
      return message.reply('❌ Usage: !storebuy <item key> [quantity]');
    }

    // Parse quantity
    let quantity = 1;
    const maybeQty = parseInt(args[args.length - 1], 10);
    let itemKey = args.join(' ');
    if (!isNaN(maybeQty) && maybeQty > 0 && args.length > 1) {
      quantity = maybeQty;
      itemKey = args.slice(0, -1).join(' ');
    }
    if (quantity <= 0) {
      return message.reply('❌ Quantity must be a positive number.');
    }

    const guildId = message.guild.id;
    const userId = message.author.id;
    const item = await StoreManager.getItem(guildId, itemKey);
    if (!item) {
      return message.reply(`❌ Item "${itemKey}" not found in the store.`);
    }

    const totalCost = item.price * quantity;
    const userBalance = dataManager.getUserBalance(userId);
    if (userBalance < totalCost) {
      return message.reply(`❌ You need ${totalCost} coins but only have ${userBalance} coins.`);
    }

    // Deduct coins
    const deductSuccess = dataManager.removeFromUserBalance(userId, totalCost);
    if (!deductSuccess) {
      return message.reply('❌ Failed to process payment. Please try again.');
    }

    try {
      if (item.type === 'theme') {
        // Unlock theme(s)
        for (let i = 0; i < quantity; i++) {
          await dataManager.addUnlockedTheme(userId, item.key);
        }
      } else {
        // Add to inventory
        const success = await dataManager.addItemToUser(userId, item.key, quantity);
        if (!success) {
          dataManager.addToUserBalance(userId, totalCost);
          return message.reply('❌ Failed to add item to inventory. Payment refunded.');
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('🛒 Purchase Successful!')
        .setDescription(
          item.type === 'theme'
            ? `You unlocked **${item.name}** theme for **${totalCost}** coins.`
            : `You bought **${quantity} x ${item.name}** for **${totalCost}** coins.`
        )
        .addFields(
          { name: '💰 Remaining Balance', value: `${dataManager.getUserBalance(userId)} coins`, inline: true },
          { name: '📦 Item Added', value: item.type === 'theme' ? `${item.name} theme unlocked` : `${quantity} x ${item.name}`, inline: true }
        )
        .setColor('#00FF00')
        .setFooter({ text: 'Saint Toadle Store' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error processing storebuy:', error);
      dataManager.addToUserBalance(userId, totalCost);
      return message.reply('❌ An error occurred granting item/theme. Payment refunded.');
    }
  }
};
