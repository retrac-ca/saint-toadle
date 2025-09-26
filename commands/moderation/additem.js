const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'additem',
  description: 'Add items to a user’s inventory (Mods/Admins only)',
  usage: '!additem <@user> <item> <quantity>',
  category: 'moderation',
  permissions: [PermissionsBitField.Flags.ManageGuild],
  cooldown: 5,
  async execute(message, args) {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply('❌ You do not have permission to use this command.');
    }

    if (args.length < 3) return message.reply('Usage: !additem <@user> <item> <quantity>');

    const user = message.mentions.users.first();
    if (!user) return message.reply('Please mention a valid user.');

    const item = args[1].toLowerCase();
    const quantity = parseInt(args[2]);

    if (isNaN(quantity) || quantity <= 0) return message.reply('Quantity must be a positive number.');

    dataManager.addItemToUser(user.id, item, quantity);

    const embed = new EmbedBuilder()
      .setTitle('Inventory Updated')
      .setDescription(`Added **${quantity}** x **${item}** to ${user.tag}'s inventory.`)
      .setColor('#00ff00')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};