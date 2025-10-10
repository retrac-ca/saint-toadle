const { EmbedBuilder } = require('discord.js');
const nukeState = require('../../utils/data/nuke-state');
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'launch',
  description: '💥 Confirm and execute a pending economy nuke.',
  permissions: ['MANAGE_GUILD'],
  async execute(message) {
    const guildId = message.guild.id;
    if (!nukeState.isPending(guildId)) {
      return message.reply('No economy nuke is pending.');
    }

    const requester = nukeState.getRequester(guildId);
    if (requester !== message.author.id) {
      return message.reply('Only the user who initiated the nuke can confirm it.');
    }

    await dataManager.clearEconomyData(guildId);
    nukeState.clearPending(guildId);

    const embed = new EmbedBuilder()
      .setTitle('💣 Economy Nuked')
      .setDescription('All balances, bank funds, inventories, and marketplace listings have been wiped for this server.')
      .setColor('DarkRed')
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  }
};
