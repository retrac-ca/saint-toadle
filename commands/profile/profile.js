const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
  name: 'profile',
  usage: '!profile [@user]',
  description: 'View a user\'s profile',
  category: 'profile',
  async execute(message, args) {
    const targetUser = message.mentions.users.first() || message.author;
    const userData = dataManager.getUser(targetUser.id);

    if (!userData) {
      return message.reply('❌ No profile data found for that user.');
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
      .setDescription(userData.bio || 'No bio set.')
      .addFields(
        { name: '💰 Balance', value: (userData.balance || 0).toLocaleString(), inline: true },
        { name: '🔄 Total Earned', value: (userData.totalEarned || 0).toLocaleString(), inline: true },
        { name: '👥 Referrals', value: (userData.referrals || 0).toString(), inline: true },
        { name: '🔥 Daily Streak', value: `${userData.dailyStreak || 0} days`, inline: true }
      )
      .setColor('#00AE86')
      .setTimestamp();

    // Add links if they exist
    if (userData.links && Object.keys(userData.links).length > 0) {
      const linksText = Object.entries(userData.links)
        .map(([platform, url]) => `[${platform}](${url})`)
        .join(' • ');
      embed.addFields({ name: '🔗 Links', value: linksText, inline: false });
    }

    // Add badges if they exist
    if (userData.badges && userData.badges.length > 0) {
      const badgeEmojis = {
        'first-referral': '🎖️',
        'crime-master': '🕵️',
        'investor': '💼',
        '3-day-streak': '🔥',
        '7-day-streak': '🏆',
        'store-champion': '🛒',
        'gambling-addict': '🎲',
        'community-helper': '🤝',
        'early-adopter': '⭐'
      };
      
      const badgeDisplay = userData.badges
        .map(badgeId => badgeEmojis[badgeId] || badgeId)
        .join(' ');
      embed.addFields({ name: '🏷️ Badges', value: badgeDisplay, inline: false });
    }

    message.channel.send({ embeds: [embed] });
  }
};
