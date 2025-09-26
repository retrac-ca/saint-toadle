const blackjack = require('./blackjack');

module.exports = {
  name: 'stand',
  description: 'Hold your hand in blackjack and finish the game',
  usage: '!stand',
  category: 'gambling',
  cooldown: 5,
  async execute(message, args, client) {
    await blackjack.execute(message, ['stand'], client);
  },
};