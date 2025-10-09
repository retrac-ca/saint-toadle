// commands/config/setintdayreminder.js

module.exports = {
  name: 'setintdayreminder',
  description: 'Set the channel for daily International Day reminders',
  permissions: ['Administrator'],
  async execute(message, args) {
    // Try mention first, then ID, else default to current channel
    let channel = message.mentions.channels.first();
    if (!channel && args[0]) {
      channel = message.guild.channels.cache.get(args[0]);
    }
    if (!channel) {
      channel = message.channel;
    }

    try {
      const configManager = require('../../utils/managers/configManager');
      await configManager.setReminderChannel(message.guild.id, channel.id);
      message.reply(`✅ International Day reminder channel set to ${channel}`);
    } catch (err) {
      message.reply('❌ Failed to set reminder channel.');
      console.error(err);
    }
  }
};
