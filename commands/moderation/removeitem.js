const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'removeitem',
  description: 'Remove items from a user’s inventory (Mods/Admins only)',
  usage: '!removeitem <@user> <item> <quantity>',
  category: 'moderation',
  permissions: [PermissionsBitField.Flags.ManageGuild],
  cooldown: 5,
  async execute(message, args) {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply('❌ You do not have permission to use this command.');
    }

    if (args.length < 3) return message.reply('Usage: !removeitem <@user> <item> <quantity>');

    const user = message.mentions.users.first();
    if (!user) return message.reply('Please mention a valid user.');

    const item = args[1].toLowerCase();
    const quantity = parseInt(args[2]);

    if (isNaN(quantity) || quantity <= 0) return message.reply('Quantity must be a positive number.');

    const success = dataManager.removeItemFromUser(user.id, item, quantity);

    if (!success) return message.reply(`Failed to remove ${quantity} x ${item} from ${user.tag}'s inventory. Check if they have enough.`);

    const embed = new EmbedBuilder()
      .setTitle('Inventory Updated')
      .setDescription(`Removed **${quantity}** x **${item}** from ${user.tag}'s inventory.`)
      .setColor('#ff0000')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};