const blackjack = require('./blackjack');

module.exports = {
  name: 'hit',
  description: 'Draw a card in an ongoing blackjack game',
  usage: '!hit',
  category: 'gambling',
  cooldown: 5,
  async execute(message, args, client) {
    await blackjack.execute(message, ['hit'], client);
  },
};