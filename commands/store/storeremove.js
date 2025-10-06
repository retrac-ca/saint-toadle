const StoreManager = require('../../utils/managers/storeManager');

module.exports = {
  name: 'storeremove',
  description: 'Remove an item from the store (Admin only)',
  category: 'economy',
  usage: '!storeremove <name>',
  cooldown: 5,
  permissions: [],
  async execute(message, args, client) {
    try {
      // Only allow users with "Admin" role (change role name if needed)
      const adminRoleName = 'Wise Guy';
      if (!message.member.roles.cache.some(role => role.name === adminRoleName)) {
        return message.reply('❌ You do not have permission to remove items from the store.');
      }

      if (args.length < 1) {
        return message.reply('Usage: !storeremove <name>');
      }

      const name = args.join(' ');

      await StoreManager.removeItem(name);

      await message.reply(`✅ Removed item "${name}" from the store.`);
    } catch (error) {
      if (error.message === 'Item not found') {
        return message.reply('❌ That item was not found in the store.');
      }
      console.error('Error in !storeremove command:', error);
      await message.reply('❌ An error occurred while removing the store item.');
    }
  }
};
