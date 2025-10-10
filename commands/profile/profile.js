const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const StoreManager = require('../../utils/managers/storeManager');

module.exports = {
  name: 'profile',
  usage: '!profile [@user] OR !profile settheme <themeId>',
  description: 'View a user\'s profile or manage profile themes',
  category: 'profile',
  async execute(message, args) {
    // Handle settheme subcommand
    if (args[0] === 'settheme') {
      if (!args[1]) {
        return message.reply('❌ Usage: `!profile settheme <themeId>`');
      }

      const themeId = args[1];
      const user = await dataManager.getUser(message.author.id);

      if (!user.unlockedThemes || !user.unlockedThemes.includes(themeId)) {
        return message.reply('❌ You have not unlocked that theme.');
      }

      console.debug('⬇️ settheme args:', themeId);
      await dataManager.setUserTheme(message.author.id, themeId);
      const updated = (await dataManager.getUser(message.author.id)).selectedTheme;
      console.debug('⬆️ settheme saved:', updated);

      return message.reply(`✅ Profile theme set to **${themeId}**!`);
    }

    // Handle regular profile display
    const targetUser = message.mentions.users.first() || message.author;
    const userData = await dataManager.getUser(targetUser.id);

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

    // Apply selected theme styling
    if (userData.selectedTheme) {
      const themeInfo = await StoreManager.getItem(message.guild.id, userData.selectedTheme);
      if (themeInfo?.color) {
        embed.setColor(themeInfo.color);
        console.debug('🎨 Applied theme color:', themeInfo.color);
      }
      if (themeInfo?.bannerURL) embed.setImage(themeInfo.bannerURL);
    }

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
        .map(id => badgeEmojis[id] || id)
        .join(' ');
      embed.addFields({ name: '🏷️ Badges', value: badgeDisplay, inline: false });
    }

    // Add unlocked themes if any
    if (userData.unlockedThemes && userData.unlockedThemes.length > 0) {
      const themeList = userData.unlockedThemes.join(', ');
      embed.addFields({ name: '🎨 Unlocked Themes', value: themeList, inline: false });
    }

    await message.channel.send({ embeds: [embed] });
  }
};
