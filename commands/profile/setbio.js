const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'setbio',
  usage: '!profile setbio <text>',
  description: 'Set your profile bio',
  category: 'profile',
  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('❌ Usage: `!profile setbio <text>`');
    }

    const bio = args.join(' ');
    
    if (bio.length > 200) {
      return message.reply('❌ Bio must be 200 characters or less.');
    }

    try {
      await dataManager.setBio(message.author.id, bio);
      message.reply(`✅ Updated your bio: "${bio}"`);
    } catch (error) {
      console.error('Error setting bio:', error);
      message.reply('❌ An error occurred while setting your bio.');
    }
  }
};
