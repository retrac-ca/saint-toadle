/**
 * Slots Command - Simple Slot Machine Game
 * Allows users to bet coins on a slot machine and win multipliers.
 */

const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const logger = require('../../utils/logger');

const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '🔔'];

function spinSlots() {
  const result = [];
  for (let i = 0; i < 3; i++) {
    const s = symbols[Math.floor(Math.random() * symbols.length)];
    result.push(s);
  }
  return result;
}

function calculatePayout(spinResult, bet) {
  const [a, b, c] = spinResult;

  if (a === b && b === c) {
    // Jackpot pays 10x
    return bet * 10;
  } else if (a === b || b === c || a === c) {
    // Two matching symbols pay 3x
    return bet * 3;
  } else if (symbols.includes('⭐') && spinResult.includes('⭐')) {
    // Star symbol presence pays 2x partial
    return bet * 2;
  }
  // No match pays 0
  return 0;
}

module.exports = {
  name: 'slots',
  description: 'Play slots to win coins!',
  usage: '!slots <bet>',
  category: 'gambling',
  cooldown: 30,
  async execute(message, args, client) {
    try {
      if (args.length < 1) {
        return message.reply('Please specify an amount to bet! Usage: `!slots <bet>`');
      }

      const bet = parseInt(args[0]);
      if (isNaN(bet) || bet <= 0) {
        return message.reply('Invalid bet amount! It must be a positive number.');
      }

      const userId = message.author.id;
      const userBalance = dataManager.getUserBalance(userId);
      if (userBalance < bet) {
        return message.reply(`You only have ${userBalance.toLocaleString()} coins, which is insufficient for this bet.`);
      }

      // Spin slots
      const spinResult = spinSlots();

      // Calculate payout
      const payout = calculatePayout(spinResult, bet);
      const netGain = payout - bet;

      // Update balance accordingly
      if (netGain > 0) {
        dataManager.addToUserBalance(userId, netGain);
      } else {
        dataManager.removeFromUserBalance(userId, bet);
      }

      const newBalance = dataManager.getUserBalance(userId);

      const embed = new EmbedBuilder()
        .setColor(payout > 0 ? '#00ff00' : '#ff0000')
        .setTitle('🎰 Slot Machine')
        .setDescription(spinResult.join(' | '))
        .addFields(
          {
            name: payout > 0 ? '🎉 You won!' : '😢 You lost...',
            value: payout > 0 ? `You won ${payout.toLocaleString()} coins!` : `You lost ${bet.toLocaleString()} coins.`,
            inline: false
          },
          {
            name: '🏦 New Balance',
            value: newBalance.toLocaleString() + ' coins',
            inline: false
          }
        )
        .setFooter({ text: `Good luck next time!`, iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      logger.logTransaction('slots', userId, netGain, `Bet: ${bet}, Payout: ${payout}`);

    } catch (error) {
      logger.logError('Slots command execution', error, { user: message.author.id });
      await message.reply('❌ An error occurred while playing slots. Please try again later.');
    }
  }
};