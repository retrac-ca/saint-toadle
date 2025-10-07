const { EmbedBuilder } = require('discord.js');
const configManager = require('../../utils/managers/configManager');

module.exports = {
  name: 'configshow',
  usage: '!configshow',
  description: 'Display current server configuration',
  async execute(message) {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.channel.send('❌ You need **Manage Server** permission to use this command.');
    }
    const guildId = message.guild.id;
    const cfg = configManager.getConfig(guildId);

    const embed = new EmbedBuilder()
      .setColor('#00AE86')
      .setTitle(`⚙️ Configuration - ${message.guild.name}`)
      .addFields(
        { name: 'Prefix', value: `\`${cfg.prefix}\`` },
        { name: 'Earn Range', value: `${cfg.economy.earn_range.min}-${cfg.economy.earn_range.max}` },
        { name: 'Crime Success', value: `${Math.round(cfg.economy.crime_settings.success_chance*100)}%` },
        { name: 'Crime Rewards', value: `${cfg.economy.crime_settings.reward_range.min}-${cfg.economy.crime_settings.reward_range.max}` },
        { name: 'Crime Fines', value: `${cfg.economy.crime_settings.fine_range.min}-${cfg.economy.crime_settings.fine_range.max}` },
        { name: 'Invest Fail', value: `${Math.round(cfg.economy.invest_settings.fail_chance*100)}%` },
        { name: 'Daily Bonus', value: `${cfg.economy.daily_bonus.min}-${cfg.economy.daily_bonus.max}` },
        { name: 'Interest Rate', value: `${Math.round(cfg.economy.bank_interest_rate*100)}%` },
        { name: 'Welcome Channel', value: cfg.channels.welcome_channel ? `<#${cfg.channels.welcome_channel}>` : 'Not set' },
        { name: 'Leave Channel', value: cfg.channels.leave_channel ? `<#${cfg.channels.leave_channel}>` : 'Not set' },
        { name: 'Interest Channel', value: cfg.channels.interest_notification ? `<#${cfg.channels.interest_notification}>` : 'Not set' },
        { name: 'Admin Role', value: cfg.roles.admin_role },
        { name: 'Mod Role', value: cfg.roles.moderator_role },
        { name: 'Welcome Msgs', value: cfg.features.welcome_messages ? '✅' : '❌' },
        { name: 'Leave Msgs', value: cfg.features.leave_messages ? '✅' : '❌' },
        { name: 'Economy', value: cfg.features.economy_enabled ? '✅' : '❌' },
        { name: 'Giveaways', value: cfg.features.giveaways_enabled ? '✅' : '❌' },
        { name: 'Gambling', value: cfg.features.gambling_enabled ? '✅' : '❌' }
      )
      .setFooter({ text: 'Use !configset <setting> <value> to change settings' })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
};
