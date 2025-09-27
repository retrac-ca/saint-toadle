const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'withdraw',
  description: 'Withdraw coins from your bank to your wallet',
  usage: '!withdraw <amount>',
  category: 'bank',
  cooldown: 5,
  async execute(message, args) {
    if (args.length !== 1) {
      return message.reply('Usage: !withdraw <amount>');
    }

    const userId = message.author.id;
    const amount = parseInt(args[0]);

    if (isNaN(amount) || amount <= 0) {
      return message.reply('❌ Please specify a valid positive amount to withdraw.');
    }

    // Withdraw using bank manager
    const result = dataManager.withdrawFromBank(userId, amount);

    if (!result.success) {
      return message.reply(`❌ ${result.message}`);
    }

    const embed = new EmbedBuilder()
      .setTitle('Withdrawal Successful')
      .setDescription(`You withdrew **${amount} coins** from your bank.\n\nWallet balance: ${result.newWalletBalance}\nBank balance: ${result.newBankBalance}`)
      .setColor('#00ff00')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};