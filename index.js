require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const cron = require('node-cron');

const logger = require('./utils/logger');
const dataManager = require('./utils/dataManager');
const inviteTracker = require('./utils/inviteTracker');
const eventHandler = require('./handlers/eventHandler');
const commandHandler = require('./handlers/commandHandler');
const { setupDailyInterestTask } = require('./utils/interestScheduler');
const giveawayManager = require('./utils/managers/giveawayManager');
const configManager = require('./utils/managers/configManager');

const days = require('./data/international_days.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildModeration,
  ]
});

client.commands = new Collection();
client.cooldowns = new Collection();

const config = {
  prefix: process.env.PREFIX || '!',
  token: process.env.DISCORD_TOKEN,
  debugMode: process.env.DEBUG_MODE === 'true',
  earnMin: parseInt(process.env.DAILY_EARN_MIN) || 1,
  earnMax: parseInt(process.env.DAILY_EARN_MAX) || 50,
  referralBonus: parseInt(process.env.REFERRAL_BONUS) || 50
};
client.config = config;

const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const LEAVE_CHANNEL_ID = process.env.LEAVE_CHANNEL_ID;

// When client is ready
client.once('clientReady', async () => {
  try {
    logger.info(`🎉 ${client.user.tag} is now online!`);
    logger.info(`📊 Serving ${client.guilds.cache.size} servers`);
    logger.info(`👥 Watching ${client.users.cache.size} users`);

    // Initialize data
    await dataManager.initialize();
    logger.info('💾 Data manager initialized');

    // Load guild configs
    await configManager.loadConfigs();
    logger.info('⚙️ Configuration manager initialized');

    // Initialize invite tracker
    await inviteTracker.initialize(client);
    logger.info('🎯 Invite tracker initialized');

    // Schedule daily interest
    setupDailyInterestTask(client);

    // Schedule daily international-day reminders at 09:00
    cron.schedule('0 9 * * *', () => {
      const today = new Date().toISOString().slice(5, 10); // "MM-DD"
      const matches = days.filter(d => d.date === today);
      if (!matches.length) return;
      const guilds = client.guilds.cache;
      guilds.forEach(guild => {
        const gc = configManager.getConfig(guild.id);
        const channelId = gc.reminderChannelId;
        if (!channelId) return;
        const ch = guild.channels.cache.get(channelId);
        if (!ch?.send) return;
        matches.forEach(d =>
          ch.send(`🌐 Today is **${d.name}**!`)
        );
      });
    });

    // Set bot activity and initialize events
    client.user.setActivity(`${config.prefix}help for commands`, { type: 'LISTENING' });
    giveawayManager.setClient(client);
    eventHandler.initializeEvents(client);

    logger.info('✅ All systems initialized successfully!');
  } catch (error) {
    logger.error('❌ Error during bot initialization:', error);
    process.exit(1);
  }
});

// Message commands
client.on('messageCreate', async message => {
  try {
    if (message.author.bot || !message.guild) return;
    const guildId = message.guild.id;
    const guildPrefix = configManager.getPrefix(guildId);
    if (!message.content.startsWith(guildPrefix) && !message.content.startsWith(config.prefix)) return;
    message.usedPrefix = message.content.startsWith(guildPrefix) ? guildPrefix : config.prefix;
    await commandHandler.processCommand(client, message);
  } catch (error) {
    logger.error('❌ Error processing message:', error);
  }
});

// Member join
client.on('guildMemberAdd', async member => {
  try {
    const gc = configManager.getConfig(member.guild.id);
    if (gc.features.welcomeMessages) {
      const cid = gc.channels.welcomeChannel || WELCOME_CHANNEL_ID;
      const ch = member.guild.channels.cache.get(cid);
      if (ch?.send) {
        const embed = {
          color: 0x00FF00,
          title: '👋 Welcome!',
          description: `${member} joined **${member.guild.name}**`,
          thumbnail: { url: member.user.displayAvatarURL() },
          fields: [
            { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp/1000)}:F>`, inline: true },
            { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Welcome!' }
        };
        await ch.send({ embeds: [embed] });
      }
    }
    // Referral prompt + invite handling
    await Promise.all([
      commandHandler.sendReferralPrompt?.(member),
      inviteTracker.handleMemberJoin(member)
    ]);
  } catch (error) {
    logger.error('❌ Error on member join:', error);
  }
});

// Member leave
client.on('guildMemberRemove', async member => {
  try {
    const gc = configManager.getConfig(member.guild.id);
    if (gc.features.leaveMessages) {
      const cid = gc.channels.leaveChannel || LEAVE_CHANNEL_ID;
      const ch = member.guild.channels.cache.get(cid);
      if (ch?.send) {
        const embed = {
          color: 0xFF0000,
          title: '👋 Goodbye!',
          description: `**${member.user.tag}** has left **${member.guild.name}**`,
          thumbnail: { url: member.user.displayAvatarURL() },
          fields: [
            { name: 'Joined', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp/1000)}:F>` : 'Unknown', inline: true },
            { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Goodbye!' }
        };
        await ch.send({ embeds: [embed] });
      }
    }
  } catch (error) {
    logger.error('❌ Error on member leave:', error);
  }
});

// Invite tracking
client.on('inviteCreate', invite => inviteTracker.handleInviteCreate(invite).catch(e => logger.error('Error inviteCreate:', e)));
client.on('inviteDelete', invite => inviteTracker.handleInviteDelete(invite).catch(e => logger.error('Error inviteDelete:', e)));

// Error handling
client.on('error', e => logger.error('❌ Discord client error:', e));
client.on('warn', w => logger.warn('⚠️ Discord client warning:', w));
process.on('SIGINT', async () => { await dataManager.saveAll(); client.destroy(); process.exit(0); });
process.on('uncaughtException', e => { logger.error('💥 Uncaught Exception:', e); process.exit(1); });
process.on('unhandledRejection', (r,p) => { logger.error('💥 Unhandled Rejection at:', p, 'reason:', r); });

// Start bot
(async () => {
  try {
    await commandHandler.loadCommands(client);
    logger.info('📚 Commands loaded successfully');
    if (!config.token) throw new Error('No DISCORD_TOKEN');
    logger.info(`🚀 Starting Saint Toadle Discord Bot...`);
    client.login(config.token);
  } catch (error) {
    logger.error('❌ Bot startup failed:', error);
    process.exit(1);
  }
})();
