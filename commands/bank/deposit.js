const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'deposit',
  description: 'Deposit coins from your wallet to your bank',
  usage: '!deposit <amount>',
  category: 'bank',
  cooldown: 5,
  async execute(message, args) {
    if (args.length !== 1) {
      return message.reply('Usage: !deposit <amount>');
    }

    const userId = message.author.id;
    const amount = parseInt(args[0]);

    if (isNaN(amount) || amount <= 0) {
      return message.reply('❌ Please specify a valid positive amount to deposit.');
    }

    // Deposit using bank manager
    const result = dataManager.depositToBank(userId, amount);

    if (!result.success) {
      return message.reply(`❌ ${result.message}`);
    }

    const embed = new EmbedBuilder()
      .setTitle('Deposit Successful')
      .setDescription(`You deposited **${amount} coins** to your bank.\n\nWallet balance: ${result.newWalletBalance}\nBank balance: ${result.newBankBalance}`)
      .setColor('#00ff00')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};