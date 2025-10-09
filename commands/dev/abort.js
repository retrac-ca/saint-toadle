const { Permissions } = require('discord.js');

// Import the pending nukes from nuke.js (we'll use a shared module)
const pendingNukes = require('./nuke-state');

module.exports = {
  name: 'abort',
  description: '❌ Cancel the pending economy nuke operation.',
  usage: '!abort',
  category: 'dev',
  permissions: ['ADMINISTRATOR'],
  async execute(message, args) {
    const guildId = message.guild.id;
    const userId = message.author.id;

    const nukeData = pendingNukes.get(guildId);
    if (!nukeData) {
      return message.reply('⚠️ No nuke operation is pending.');
    }

    // Only the person who initiated can abort
    if (nukeData.initiatorId !== userId) {
      return message.reply('❌ Only the administrator who initiated the nuke can abort it.');
    }

    // Clear timeout and remove from pending
    clearTimeout(nukeData.timeoutID);
    pendingNukes.delete(guildId);

    await message.reply('✅ **NUKE OPERATION ABORTED**\n\n' +
                       'Economy data remains intact. Crisis averted! 🛡️');
  }
};
