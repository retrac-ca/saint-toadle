const StoreManager = require('../../utils/managers/storeManager');

module.exports = {
  name: 'storeadd',
  description: 'Add an item to the store (Admin only)',
  category: 'economy',
  usage: '!storeadd <name> <price> [description]',
  cooldown: 5,
  permissions: [], // no explicit discord permissions; role checked below
  async execute(message, args, client) {
    try {
      // Only allow users with "Admin" role (change role name if needed)
      const adminRoleName = 'Admin';
      if (!message.member.roles.cache.some(role => role.name === adminRoleName)) {
        return message.reply('❌ You do not have permission to add items to the store.');
      }

      if (args.length < 2) {
        return message.reply('Usage: !storeadd <name> <price> [description]');
      }

      const name = args[0];
      const price = parseInt(args[1], 10);
      const description = args.slice(2).join(' ') || '';

      if (isNaN(price) || price <= 0) {
        return message.reply('❌ Price must be a positive number.');
      }

      const newItem = { name, price, description };

      await StoreManager.addItem(newItem);

      await message.reply(`✅ Added item "${name}" to the store.`);
    } catch (error) {
      console.error('Error in !storeadd command:', error);
      await message.reply('❌ An error occurred while adding the store item.');
    }
  }
};