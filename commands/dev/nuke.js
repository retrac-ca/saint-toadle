const { Permissions } = require('discord.js');
const dataManager = require('../../utils/dataManager');

const pendingNukes = new Map(); // guildId → { timeoutID, initiatorId }

module.exports = {
  name: 'nuke',
  description: '💥 Wipe ALL economy data and inventories for this server (EXCEPT levels/achievements). Requires Administrator.',
  usage: '!nuke',
  category: 'dev',
  permissions: ['ADMINISTRATOR'],
  async execute(message, args) {
    const guildId = message.guild.id;
    const userId = message.author.id;

    if (pendingNukes.has(guildId)) {
      return message.reply('⚠️ A nuke is already pending. Use `!launch` or `!abort`.');
    }

    // Confirmation prompt
    await message.reply({
      content: '⚠️ **DANGER ZONE** ⚠️\n\n' +
               'This will **PERMANENTLY DELETE**:\n' +
               '• All user wallet balances\n' +
               '• All bank balances\n' +
               '• All user inventories\n' +
               '• All marketplace listings\n' +
               '• All store items\n\n' +
               '**Levels and achievements will be preserved.**\n\n' +
               'Type `!launch` to confirm or `!abort` to cancel.\n' +
               '⏱️ You have 60 seconds.'
    });

    // Set 60-second timeout to auto-abort
    const timeoutID = setTimeout(() => {
      pendingNukes.delete(guildId);
      message.channel.send('⏱️ Nuke operation timed out and was automatically aborted.');
    }, 60_000);

    pendingNukes.set(guildId, { timeoutID, initiatorId: userId });
  }
};
