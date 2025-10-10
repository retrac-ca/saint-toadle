const { EmbedBuilder } = require('discord.js');
const nukeState = require('../../utils/data/nuke-state');

module.exports = {
  name: 'abort',
  description: '❌ Cancel a pending economy nuke.',
  permissions: ['MANAGE_GUILD'],
  async execute(message) {
    const guildId = message.guild.id;
    if (!nukeState.isPending(guildId)) {
      return message.reply('No economy nuke is pending.');
    }

    const requester = nukeState.getRequester(guildId);
    if (requester !== message.author.id) {
      return message.reply('Only the user who initiated the nuke can abort it.');
    }

    nukeState.clearPending(guildId);

    const embed = new EmbedBuilder()
      .setTitle('🛑 Nuke Aborted')
      .setDescription('The pending economy wipe has been canceled.')
      .setColor('Orange')
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  }
};
