const dataManager = require('../../utils/dataManager');

const availableBadges = [
  'first-referral', 'crime-master', 'investor', '3-day-streak', '7-day-streak',
  'store-champion', 'gambling-addict', 'community-helper', 'early-adopter'
];

module.exports = {
  name: 'badges',
  usage: '!profile grant|revoke <@user> <badgeId>',
  description: 'Grant or revoke badges (admin only)',
  category: 'profile',
  async execute(message, args) {
    // Check admin permissions
    if (!message.member.permissions.has('MANAGE_GUILD')) {
      return message.reply('❌ You need Manage Server permission to use this command.');
    }

    if (args.length < 3) {
      return message.reply(`❌ Usage: \`!profile grant|revoke <@user> <badgeId>\`\nAvailable badges: ${availableBadges.join(', ')}`);
    }

    const action = args[0].toLowerCase();
    const targetUser = message.mentions.users.first();
    const badgeId = args[2];

    if (!['grant', 'revoke'].includes(action)) {
      return message.reply('❌ Action must be either "grant" or "revoke"');
    }

    if (!targetUser) {
      return message.reply('❌ Please mention a valid user.');
    }

    if (!availableBadges.includes(badgeId)) {
      return message.reply(`❌ Invalid badge ID. Available badges: ${availableBadges.join(', ')}`);
    }

    try {
      if (action === 'grant') {
        await dataManager.awardBadge(targetUser.id, badgeId);
        message.reply(`✅ Granted badge "${badgeId}" to ${targetUser.username}!`);
      } else {
        await dataManager.revokeBadge(targetUser.id, badgeId);
        message.reply(`✅ Revoked badge "${badgeId}" from ${targetUser.username}!`);
      }
    } catch (error) {
      console.error('Error managing badge:', error);
      message.reply('❌ An error occurred while managing the badge.');
    }
  }
};
