const { EmbedBuilder } = require('discord.js');
const StoreManager = require('../../utils/managers/storeManager');
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'storebuy',
  description: 'Buy an item from the store',
  usage: '!storebuy <item name> [quantity]',
  category: 'store',
  cooldown: 5,
  async execute(message, args, client) {
    try {
      if (args.length < 1) {
        return message.reply('Usage: !storebuy <item name> [quantity]');
      }

      // Parse quantity (optional last arg if numeric)
      let quantity = 1;
      let itemName = args.join(' ');
      const lastArg = args[args.length - 1];
      const maybeQty = parseInt(lastArg, 10);
      
      if (!isNaN(maybeQty) && maybeQty > 0 && args.length > 1) {
        quantity = maybeQty;
        itemName = args.slice(0, -1).join(' ');
      }

      if (quantity <= 0) {
        return message.reply('❌ Quantity must be a positive number.');
      }

      // Get store items
      const storeItems = await StoreManager.getItems();
      const item = storeItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());

      if (!item) {
        return message.reply(`❌ Item "${itemName}" not found in the store.`);
      }

      const userId = message.author.id;
      const totalCost = item.price * quantity;

      // Check user balance using dataManager
      const userBalance = dataManager.getUserBalance(userId);

      if (userBalance < totalCost) {
        return message.reply(`❌ You need ${totalCost} coins but only have ${userBalance} coins.`);
      }

      // Deduct coins from user balance
      const deductSuccess = dataManager.removeFromUserBalance(userId, totalCost);
      
      if (!deductSuccess) {
        return message.reply('❌ Failed to process payment. Please try again.');
      }

      try {
        // Add item to user inventory directly (bypassing validation)
        const addItemSuccess = await dataManager.addItemToUserInventory(userId, item.name, quantity);

        if (!addItemSuccess) {
          // Refund the coins if adding item failed
          dataManager.addToUserBalance(userId, totalCost);
          return message.reply('❌ Failed to add item to inventory. Payment refunded.');
        }

        // Success embed
        const embed = new EmbedBuilder()
          .setTitle('🛒 Purchase Successful!')
          .setDescription(`You bought **${quantity} x ${item.name}** for **${totalCost}** coins.`)
          .addFields(
            { name: '💰 Remaining Balance', value: `${dataManager.getUserBalance(userId)} coins`, inline: true },
            { name: '📦 Item Added', value: `${quantity} x ${item.name}`, inline: true }
          )
          .setColor('#00FF00')
          .setFooter({ text: 'Saint Toadle Store' })
          .setTimestamp();

        await message.reply({ embeds: [embed] });

      } catch (inventoryError) {
        console.error('Error adding to inventory:', inventoryError);
        // Refund the coins if adding item failed
        dataManager.addToUserBalance(userId, totalCost);
        return message.reply('❌ Failed to add item to inventory. Payment refunded.');
      }

    } catch (error) {
      console.error('Error in storebuy command:', error);
      await message.reply('❌ An error occurred while processing your purchase.');
    }
  }
};