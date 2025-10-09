const { Permissions } = require('discord.js');
const dataManager = require('../../utils/dataManager');

// Import the pending nukes from nuke.js (we'll use a shared module)
const pendingNukes = require('./nuke-state');

module.exports = {
  name: 'launch',
  description: '🚀 Execute the pending economy nuke operation.',
  usage: '!launch',
  category: 'dev',
  permissions: ['ADMINISTRATOR'],
  async execute(message, args) {
    const guildId = message.guild.id;
    const userId = message.author.id;

    const nukeData = pendingNukes.get(guildId);
    if (!nukeData) {
      return message.reply('⚠️ No nuke operation is pending. Use `!nuke` first.');
    }

    // Only the person who initiated can launch
    if (nukeData.initiatorId !== userId) {
      return message.reply('❌ Only the administrator who initiated the nuke can launch it.');
    }

    // Clear timeout and remove from pending
    clearTimeout(nukeData.timeoutID);
    pendingNukes.delete(guildId);

    // Execute the nuke
    try {
      const startTime = Date.now();
      await message.channel.send('🚀 **LAUNCHING NUKE OPERATION...**\n💥 Wiping economy data...');

      // Clear all economy data for this guild
      await dataManager.clearEconomyData(guildId);

      const duration = Date.now() - startTime;
      
      await message.channel.send({
        content: '✅ **NUKE OPERATION COMPLETE**\n\n' +
                '**Destroyed:**\n' +
                '• All user wallet balances\n' +
                '• All bank balances\n' +
                '• All user inventories\n' +
                '• All marketplace listings\n' +
                '• All store items\n\n' +
                '**Preserved:**\n' +
                '• User levels and achievements\n' +
                '• User profiles and badges\n\n' +
                `⏱️ Operation completed in ${duration}ms`
      });

    } catch (error) {
      console.error('Error during nuke operation:', error);
      await message.channel.send('❌ **NUKE OPERATION FAILED**\n\nAn error occurred during the wipe. Check console logs.');
    }
  }
};
