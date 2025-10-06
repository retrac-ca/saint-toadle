// commands/giveaway.js
const ms = require('ms');
const giveawayManager = require('../utils/managers/giveawayManager');

module.exports = {
  name: 'giveaway',
  usage: '!giveaway <start|end|reroll|lookup> [options]',
  description: 'Manage giveaways: start, end, reroll, or lookup active giveaways',
  async execute(message, args) {
    const sub = args[0];
    if (!sub || !['start', 'end', 'reroll', 'lookup'].includes(sub)) {
      return message.reply(`Usage: ${this.usage}`);
    }

    try {
      if (sub === 'start') {
        // !giveaway start <duration> <winners> [currency] [prize]
        const durationMs = ms(args[1]);
        const winners = parseInt(args[2], 10);
        const currency = parseInt(args[3], 10) || 0;
        const prize = args.slice(currency ? 4 : 3).join(' ') || 'No custom prize';

        if (!durationMs || isNaN(winners) || winners < 1) {
          return message.reply(`Usage: !giveaway start <duration> <winners> [currency] [prize]`);
        }

        const endTimestamp = Date.now() + durationMs;
        const g = await giveawayManager.createGiveaway({
          guildId: message.guild.id,
          channelId: message.channel.id,
          hostId: message.author.id,
          prize,
          currencyAmount: currency,
          winnerCount: winners,
          endTimestamp
        });

        const embed = {
          color: 0x00AE86,
          title: '🎉 Giveaway Started!',
          description:
            `**ID:** ${g.id}\n` +
            `**Prize:** ${prize}\n` +
            `**Currency:** ${currency}\n` +
            `**Winners:** ${winners}\n` +
            `**Ends:** <t:${Math.floor(endTimestamp / 1000)}:F>\n` +
            `Hosted by <@${message.author.id}>`
        };
        const row = {
          type: 1,
          components: [{
            type: 2,
            style: 1,
            custom_id: `enter_giveaway_${g.id}`,
            label: 'Enter Giveaway'
          }]
        };

        const sent = await message.channel.send({ embeds: [embed], components: [row] });
        await giveawayManager.scheduleEnd(g.id, sent.channel.id, sent.id, endTimestamp);
        return;
      }

      if (sub === 'end') {
        // !giveaway end <giveawayId>
        const id = parseInt(args[1], 10);
        if (isNaN(id)) {
          return message.reply(`Usage: !giveaway end <giveawayId>`);
        }
        const ok = await giveawayManager.endGiveawayNow(id);
        return message.channel.send(
          ok ? `Giveaway #${id} ended by <@${message.author.id}>.` : 'Giveaway not found or already ended.'
        );
      }

      if (sub === 'reroll') {
        // !giveaway reroll <giveawayId>
        const id = parseInt(args[1], 10);
        if (isNaN(id)) {
          return message.reply(`Usage: !giveaway reroll <giveawayId>`);
        }
        const winners = await giveawayManager.rerollGiveaway(id);
        if (!winners) {
          return message.reply('Giveaway not found or not yet ended.');
        }
        return message.channel.send(
          `New winners for #${id}: ${winners.map(u => `<@${u}>`).join(', ')}`
        );
      }

      if (sub === 'lookup') {
        // !giveaway lookup
        const allData = await giveawayManager.loadGiveaways();
        const active = Object.values(allData.giveaways)
          .filter(g => !g.ended && g.guildId === message.guild.id);

        if (active.length === 0) {
          return message.reply('No active giveaways in this server.');
        }

        const lines = active.map(g =>
          `• ID ${g.id}: "${g.prize}" ends <t:${Math.floor(g.endTimestamp / 1000)}:R>`
        );
        return message.channel.send(`**Active Giveaways:**\n${lines.join('\n')}`);
      }

    } catch (err) {
      console.error('Giveaway command error:', err);
      return message.reply('An error occurred executing the giveaway command.');
    }
  }
};
