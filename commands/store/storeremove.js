const StoreManager = require('../../utils/managers/storeManager');
const configManager = require('../../utils/managers/configManager');

module.exports = {
  name: 'storeremove',
  description: 'Remove an item from the store (Admin only)',
  category: 'economy',
  usage: '!storeremove <name>',
  cooldown: 5,
  permissions: [],
  async execute(message, args, client) {
    try {
      const guildId = message.guild.id;
      
      // Get configured admin role name for this guild
      const adminRoleName = configManager.getAdminRole(guildId);
      
      // Check if user has the configured admin role
      if (!message.member.roles.cache.some(role => role.name === adminRoleName)) {
        return message.channel.send(`❌ You need the "${adminRoleName}" role to remove items from the store.`);
      }

      if (args.length < 1) {
        return message.channel.send('Usage: !storeremove <name>');
      }

      const name = args.join(' ');

      await StoreManager.removeItem(name);

      await message.channel.send(`✅ Removed item "${name}" from the store.`);
    } catch (error) {
      if (error.message === 'Item not found') {
        return message.channel.send('❌ That item was not found in the store.');
      }
      console.error('Error in !storeremove command:', error);
      await message.channel.send('❌ An error occurred while removing the store item.');
    }
  }
};
