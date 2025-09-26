/**
 * Blackjack Command - Simple text-based blackjack game
 * Uses an in-memory game state per user for turn-based gameplay
 */

const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const logger = require('../../utils/logger');

const games = new Map();

function createDeck() {
  const suits = ['♠','♥','♦','♣'];
  const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  let deck = [];
  for (const s of suits) {
    for (const v of values) {
      deck.push(v + s);
    }
  }
  return deck.sort(() => Math.random() - 0.5); // shuffle
}

function cardValue(card) {
  const rank = card.slice(0, -1);
  if ('JQK'.includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank);
}

function calculateHand(hand) {
  let value = 0;
  let aces = 0;
  for (const card of hand) {
    value += cardValue(card);
    if (card.startsWith('A')) aces++;
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

function renderHand(hand) {
  return hand.join(' ');
}

module.exports = {
  name: 'blackjack',
  description: 'Play blackjack against the bot',
  usage: '!blackjack <bet> OR !hit OR !stand',
  category: 'gambling',
  cooldown: 10,
  async execute(message, args, client) {
    try {
      const userId = message.author.id;
      if (!games.has(userId)) {
        // Start new game on !blackjack <bet>
        if (args.length !== 1) {
          return message.reply('Start a game with `!blackjack <bet>`');
        }
        const bet = parseInt(args[0]);
        if (isNaN(bet) || bet <= 0) {
          return message.reply('Invalid bet amount');
        }
        if (dataManager.getUserBalance(userId) < bet) {
          return message.reply('Insufficient funds');
        }

        const deck = createDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];
        const playerValue = calculateHand(playerHand);
        const dealerValue = calculateHand(dealerHand);

        games.set(userId, {
          deck, playerHand, dealerHand, bet, stage: 'player'
        });

        const embed = new EmbedBuilder()
          .setTitle('Blackjack')
          .setDescription(`Your hand: ${renderHand(playerHand)} (Total: ${playerValue})\nDealer shows: ${dealerHand[0]} ?`)
          .setFooter({ text: 'Use !hit to draw a card or !stand to hold your hand.' })
          .setColor('#0099ff');

        await message.reply({ embeds: [embed] });
      } else {
        // Continue existing game
        const game = games.get(userId);
        if (message.content.startsWith(`${client.config.prefix}hit`)) {
          if (game.stage !== 'player') return message.reply('It\'s not your turn.');

          game.playerHand.push(game.deck.pop());
          const playerValue = calculateHand(game.playerHand);
          if (playerValue > 21) {
            dataManager.removeFromUserBalance(userId, game.bet);
            games.delete(userId);
            return message.reply(`You busted with ${playerValue}! You lost ${game.bet} coins.`);
          }

          const embed = new EmbedBuilder()
            .setTitle('Blackjack')
            .setDescription(`Your hand: ${renderHand(game.playerHand)} (Total: ${playerValue})\nDealer shows: ${game.dealerHand[0]} ?`)
            .setFooter({ text: 'Use !hit to draw a card or !stand to hold your hand.' })
            .setColor('#0099ff');

          return message.reply({ embeds: [embed] });
        } else if (message.content.startsWith(`${client.config.prefix}stand`)) {
          if (game.stage !== 'player') return message.reply('It\'s not your turn.');

          // Dealer turn
          game.stage = 'dealer';
          let dealerValue = calculateHand(game.dealerHand);
          while(dealerValue < 17) {
            game.dealerHand.push(game.deck.pop());
            dealerValue = calculateHand(game.dealerHand);
          }

          const playerValue = calculateHand(game.playerHand);

          let resultMessage = '';
          if (dealerValue > 21 || playerValue > dealerValue) {
            // Player wins
            const payout = game.bet * 2;
            dataManager.addToUserBalance(userId, payout);
            resultMessage = `You win! Your ${playerValue} beats dealer's ${dealerValue}. You earned ${payout} coins!`;
          } else if (dealerValue === playerValue) {
            // Tie, refund bet
            dataManager.addToUserBalance(userId, game.bet);
            resultMessage = `It's a tie! Both you and the dealer have ${playerValue}. Your bet of ${game.bet} coins has been refunded.`;
          } else {
            // Dealer wins
            dataManager.removeFromUserBalance(userId, game.bet);
            resultMessage = `Dealer wins with ${dealerValue} against your ${playerValue}. You lost ${game.bet} coins.`;
          }

          games.delete(userId);

          const embed = new EmbedBuilder()
            .setTitle('Blackjack - Result')
            .setDescription(`Your hand: ${renderHand(game.playerHand)} (Total: ${playerValue})\nDealer hand: ${renderHand(game.dealerHand)} (Total: ${dealerValue})\n\n${resultMessage}`)
            .setColor('#0099ff');

          return message.reply({ embeds: [embed] });
        } else {
          return message.reply(`You have an active blackjack game. Use \`!hit\` or \`!stand\` to play your turn.`);
        }
      }
    } catch (error) {
      logger.logError('Blackjack command execution', error, { user: message.author.id });
      return message.reply('An error occurred while playing blackjack. Please try again later.');
    }
  }
};