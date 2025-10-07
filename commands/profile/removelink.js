const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'removelink',
  usage: '!profile removelink <platform>',
  description: 'Remove a social link from your profile',
  category: 'profile',
  async execute(message, args) {
    if (!args[0]) {
      return message.reply('❌ Usage: `!profile removelink <platform>`');
    }

    const platform = args[0].toLowerCase();
    const userData = dataManager.getUser(message.author.id);

    if (!userData?.links?.[platform]) {
      return message.reply(`❌ You don't have a ${platform} link set in your profile.`);
    }

    try {
      await dataManager.removeLink(message.author.id, platform);
      message.reply(`✅ Removed ${platform} link from your profile!`);
    } catch (error) {
      console.error('Error removing link:', error);
      message.reply('❌ An error occurred while removing the link.');
    }
  }
};
