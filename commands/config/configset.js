const configManager = require('../../utils/managers/configManager');

module.exports = {
  name: 'configset',
  usage: '!configset <setting> <value>',
  description: 'Change server configuration settings',
  async execute(message, args) {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.channel.send('❌ You need **Manage Server** permission to use this command.');
    }
    if (args.length < 2 || args[0].toLowerCase() === 'help') {
      return message.channel.send(`Usage: ${this.usage}`);
    }

    const sub = args[0].toLowerCase();
    const guildId = message.guild.id;

    try {
      // prefix
      if (sub === 'prefix') {
        if (args.length !== 2) return message.channel.send('❌ Usage: `!configset prefix <new_prefix>`');
        const pre = args[1];
        if (pre.length > 3) return message.channel.send('❌ Prefix must be ≤3 chars.');
        const ok = await configManager.updateConfig(guildId, 'prefix', pre);
        return message.channel.send(ok ? `✅ Prefix set to \`${pre}\`` : '❌ Update failed');
      }

      // earn
      if (sub === 'earn') {
        if (args.length !== 3) return message.channel.send('❌ Usage: `!configset earn <min> <max>`');
        const mi = parseInt(args[1], 10), ma = parseInt(args[2], 10);
        if (isNaN(mi) || isNaN(ma) || mi < 1 || ma < mi) return message.channel.send('❌ Invalid range');
        const ok1 = await configManager.updateConfig(guildId, 'economy.earn_range.min', mi);
        const ok2 = await configManager.updateConfig(guildId, 'economy.earn_range.max', ma);
        return message.channel.send(ok1 && ok2 ? `✅ Earn range ${mi}-${ma}` : '❌ Update failed');
      }

      // crime
      if (sub === 'crime') {
        console.log('[DEBUG] configset crime args=', args);
        if (args.length < 3) return message.channel.send('❌ Usage: `!configset crime <chance|rewards|fines> <values>`');
        const t = args[1].toLowerCase();

        if (t === 'chance') {
          const p = parseFloat(args[2]) / 100;
          if (isNaN(p) || p < 0 || p > 1) return message.channel.send('❌ Chance must be 0–100%');
          const ok = await configManager.updateConfig(guildId, 'economy.crime_settings.success_chance', p);
          return message.channel.send(ok ? `✅ Crime success ${Math.round(p*100)}%` : '❌ Update failed');
        }

        if (t === 'rewards' || t === 'fines') {
          if (args.length !== 4) return message.channel.send(`❌ Usage: \`!configset crime ${t} <min> <max>\``);
          const a = parseInt(args[2], 10), b = parseInt(args[3], 10);
          if (isNaN(a) || isNaN(b) || a < 1 || b < a) return message.channel.send('❌ Invalid range');
          const key = `economy.crime_settings.${t}_range`;
          const ok1 = await configManager.updateConfig(guildId, `${key}.min`, a);
          const ok2 = await configManager.updateConfig(guildId, `${key}.max`, b);
          return message.channel.send(ok1 && ok2 ? `✅ Crime ${t} ${a}-${b}` : '❌ Update failed');
        }

        return message.channel.send('❌ Unknown crime setting. Use: chance, rewards, or fines');
      }

      // invest
      if (sub === 'invest') {
        if (args[1] !== 'fail_chance' || args.length !== 3) {
          return message.channel.send('❌ Usage: `!configset invest fail_chance <percentage>`');
        }
        const p = parseFloat(args[2]) / 100;
        if (isNaN(p) || p < 0 || p > 1) return message.channel.send('❌ Percentage must be 0–100');
        const ok = await configManager.updateConfig(guildId, 'economy.invest_settings.fail_chance', p);
        return message.channel.send(ok ? `✅ Invest fail ${Math.round(p*100)}%` : '❌ Update failed');
      }

      // daily
      if (sub === 'daily') {
        if (args.length !== 3) return message.channel.send('❌ Usage: `!configset daily <min> <max>`');
        const mi = parseInt(args[1], 10), ma = parseInt(args[2], 10);
        if (isNaN(mi) || isNaN(ma) || mi < 1 || ma < mi) return message.channel.send('❌ Invalid range');
        const ok1 = await configManager.updateConfig(guildId, 'economy.daily_bonus.min', mi);
        const ok2 = await configManager.updateConfig(guildId, 'economy.daily_bonus.max', ma);
        return message.channel.send(ok1 && ok2 ? `✅ Daily bonus ${mi}-${ma}` : '❌ Update failed');
      }

      // channel
      if (sub === 'channel') {
        if (args.length !== 3) return message.channel.send('❌ Usage: `!configset channel <welcome|leave|interest> <#channel>`');
        const type = args[1].toLowerCase();
        const m = args[2].match(/^<#(\d+)>$/);
        if (!m) return message.channel.send('❌ Please mention a channel');
        const map = {
          welcome: 'channels.welcome_channel',
          leave: 'channels.leave_channel',
          interest: 'channels.interest_notification'
        };
        if (!map[type]) return message.channel.send('❌ Use “welcome”, “leave”, or “interest”');
        const ok = await configManager.updateConfig(guildId, map[type], m[1]);
        return message.channel.send(ok ? `✅ ${type} channel set` : '❌ Update failed');
      }

      // role
      if (sub === 'role') {
        if (args.length !== 3) return message.channel.send('❌ Usage: `!configset role <admin|moderator> <role_name>`');
        const type = args[1].toLowerCase(), name = args[2];
        if (name.length > 100) return message.channel.send('❌ Role name too long');
        const map = { admin: 'roles.admin_role', moderator: 'roles.moderator_role' };
        if (!map[type]) return message.channel.send('❌ Use “admin” or “moderator”');
        const ok = await configManager.updateConfig(guildId, map[type], name);
        return message.channel.send(ok ? `✅ ${type} role set to "${name}"` : '❌ Update failed');
      }

      // feature
      if (sub === 'feature') {
        if (args.length !== 3) return message.channel.send('❌ Usage: `!configset feature <feature> <true|false>`');
        const feat = args[1].toLowerCase(), val = args[2].toLowerCase();
        if (val !== 'true' && val !== 'false') return message.channel.send('❌ Value must be “true” or “false”');
        const map = {
          welcome_messages: 'features.welcome_messages',
          leave_messages: 'features.leave_messages',
          economy_enabled: 'features.economy_enabled',
          giveaways_enabled: 'features.giveaways_enabled',
          gambling_enabled: 'features.gambling_enabled'
        };
        if (!map[feat]) {
          return message.channel.send(`❌ Unknown feature. Options: ${Object.keys(map).join(', ')}`);
        }
        const ok = await configManager.updateConfig(guildId, map[feat], val === 'true');
        return message.channel.send(ok ? `✅ Feature "${feat}" ${val === 'true' ? 'enabled' : 'disabled'}` : '❌ Update failed');
      }

      // fallback
      return message.channel.send('❌ Unknown setting. Use `!configset help`.');
    } catch (err) {
      console.error('Error in config-set:', err);
      return message.channel.send('❌ An error occurred while updating configuration.');
    }
  }
};
