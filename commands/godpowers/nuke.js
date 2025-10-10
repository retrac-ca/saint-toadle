const { EmbedBuilder } = require('discord.js');
const nukeState = require('../../utils/data/nuke-state');

module.exports = {
  name: 'nuke',
  description: '⚠️ Initiate a full economy wipe. Requires confirmation via !launch or !abort.',
  permissions: ['MANAGE_GUILD'],
  async execute(message) {
    const guildId = message.guild.id;
    if (nukeState.isPending(guildId)) {
      return message.reply('A nuke is already pending. Use `!launch` to execute or `!abort` to cancel.');
    }

    nukeState.setPending(guildId, message.author.id);

    const embed = new EmbedBuilder()
      .setTitle('🚨 Economy Nuke Initiated')
      .setDescription([
        'This will permanently wipe **all user balances**, **bank**, **inventories**, **store items**, and **market listings** for this server.',
        '⚠️ **This action is irreversible once confirmed!**',
        '',
        `Requested by: <@${message.author.id}>`,
        '',
        'To **confirm**, run `!launch` within 2 minutes.',
        'To **cancel**, run `!abort`.'
      ].join('\n'))
      .setColor('Red')
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  }
};
