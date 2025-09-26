/**
 * Roulette Command - Place a bet on roulette wheel outcomes.
 *
 * Usage:
 *  - @mentions allowed as bet targets (e.g., red, black, even, odd, or a number 0-36)
 *  - Bet amount required
 *
 * Example:
 *  !roulette red 100
 *  !roulette 17 50
 */

const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const logger = require('../../utils/logger');

const colors = {
  red: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36],
  black: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35]
};

function pickNumber() {
  return Math.floor(Math.random() * 37); // 0 to 36
}

function getColor(number) {
  if (number === 0) return 'green';
  if (colors.red.includes(number)) return 'red';
  if (colors.black.includes(number)) return 'black';
  return 'unknown';
}

module.exports = {
  name: "roulette",
  description: "Play roulette and bet on number, color, even or odd",
  usage: "!roulette <bet> <amount>",
  category: "gambling",
  cooldown: 15,
  async execute(message, args, client) {
    try {
      if (args.length < 2) {
        return message.reply("Usage: !roulette <bet> <amount>\nBet can be a number (0-36), 'red', 'black', 'even', or 'odd'");
      }

      let betType = args[0].toLowerCase();
      const betAmount = parseInt(args[1]);
      const userId = message.author.id;

      if (!betAmount || betAmount <= 0) {
        return message.reply("Please specify a valid positive bet amount.");
      }

      const balance = dataManager.getUserBalance(userId);
      if (betAmount > balance) {
        return message.reply(`You only have ${balance.toLocaleString()} coins, which is insufficient for this bet.`);
      }

      // Validate bet type
      if (["red","black","even","odd"].indexOf(betType) === -1) {
        const numBet = Number(betType);
        if (!(numBet >= 0 && numBet <=36)) {
          return message.reply("Invalid bet type. Bet must be a number 0-36, 'red', 'black', 'even', or 'odd'.");
        }
        betType = numBet;
      }

      // Spin the wheel
      const outcome = pickNumber();
      const outcomeColor = getColor(outcome);

      // Determine win multiplier
      let multiplier = 0;
      let won = false;

      if (typeof betType === "number") {
        if (betType === outcome) {
          multiplier = 35;
          won = true;
        }
      } else if (betType === "red" || betType === "black") {
        if (outcomeColor === betType) {
          multiplier = 2;
          won = true;
        }
      } else if (betType === "even") {
        if (outcome !== 0 && outcome % 2 === 0) {
          multiplier = 2;
          won = true;
        }
      } else if (betType === "odd") {
        if (outcome !== 0 && outcome % 2 === 1) {
          multiplier = 2;
          won = true;
        }
      }

      // Calculate result
      let payout = 0;
      if (won) {
        payout = betAmount * multiplier;
        dataManager.addToUserBalance(userId, payout);
      } else {
        dataManager.removeFromUserBalance(userId, betAmount);
        payout = -betAmount;
      }

      const balanceAfter = dataManager.getUserBalance(userId);

      const embed = new EmbedBuilder()
        .setTitle("🎰 Roulette")
        .setDescription(`The wheel spun and landed on: **${outcome}** (${outcomeColor})`)
        .addFields(
          { name: "Your Bet", value: `${betType}`, inline: true },
          { name: "Bet Amount", value: `${betAmount.toLocaleString()} coins`, inline: true },
          { name: won ? "You Won!" : "You Lost!", value: `${payout > 0 ? `+${payout.toLocaleString()}` : payout.toLocaleString()} coins`, inline: true },
          { name: "New Balance", value: `${balanceAfter.toLocaleString()} coins`, inline: false }
        )
        .setColor(won ? "#00FF00" : "#FF0000")
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      logger.logTransaction("roulette", userId, payout, `Bet: ${betAmount}, BetType: ${betType}, Outcome: ${outcome}`);

    } catch (error) {
      logger.logError("roulette command", error, { user: message.author.id, command: message.content });
      message.reply("An error occurred while processing your roulette bet.");
    }
  }
};