const dataManager = require('../../utils/dataManager');

const validPlatforms = ['twitter', 'twitch', 'github', 'youtube', 'discord', 'steam', 'instagram', 'tiktok'];

module.exports = {
  name: 'addlink',
  usage: '!profile addlink <platform> <url>',
  description: 'Add a social link to your profile',
  category: 'profile',
  async execute(message, args) {
    if (args.length < 2) {
      return message.reply(`❌ Usage: \`!profile addlink <platform> <url>\`\nSupported platforms: ${validPlatforms.join(', ')}`);
    }

    const platform = args[0].toLowerCase();
    const url = args[1];

    if (!validPlatforms.includes(platform)) {
      return message.reply(`❌ Invalid platform. Supported platforms: ${validPlatforms.join(', ')}`);
    }

    // Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return message.reply('❌ URL must start with http:// or https://');
    }

    try {
      await dataManager.addLink(message.author.id, platform, url);
      message.reply(`✅ Added ${platform} link to your profile!`);
    } catch (error) {
      console.error('Error adding link:', error);
      message.reply('❌ An error occurred while adding the link.');
    }
  }
};
