require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');

const logger = require('./utils/logger');
const dataManager = require('./utils/dataManager');
const inviteTracker = require('./utils/inviteTracker');
const eventHandler = require('./handlers/eventHandler');
const commandHandler = require('./handlers/commandHandler');
const { setupDailyInterestTask } = require('./utils/interestScheduler');
const giveawayManager = require('./utils/managers/giveawayManager');
const configManager = require('./utils/managers/configManager');

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

    // Initialize configuration manager
    try {
      await configManager.loadConfigs();
      logger.info('⚙️ Configuration manager initialized');
    } catch (error) {
      logger.error('Failed to initialize configuration manager:', error);
    }

    // Initialize invite tracker
    await inviteTracker.initialize(client);
    logger.info('🎯 Invite tracker initialized');

    // Set bot activity
    client.user.setActivity(`${config.prefix}help for commands`, { type: 'LISTENING' });

    // Hand off client to giveawayManager for scheduled endings
    giveawayManager.setClient(client);

    // Register all event handlers (including interactionCreate for giveaways)
    eventHandler.initializeEvents(client);

    // Schedule daily interest notifications
    setupDailyInterestTask(client);

    logger.info('✅ All systems initialized successfully!');
  } catch (error) {
    logger.error('❌ Error during bot initialization:', error);
    process.exit(1);
  }
});

// Message command handler with configurable prefix support
client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const guildPrefix = configManager.getPrefix(guildId);

    if (!message.content.startsWith(guildPrefix) && !message.content.startsWith(config.prefix)) return;

    const usedPrefix = message.content.startsWith(guildPrefix) ? guildPrefix : config.prefix;
    message.usedPrefix = usedPrefix;

    await commandHandler.processCommand(client, message);
  } catch (error) {
    logger.error('❌ Error processing message:', error);
  }
});

// Guild member join with configurable welcome messages
client.on('guildMemberAdd', async (member) => {
  try {
    logger.info(`👋 New member joined: ${member.user.tag} (${member.user.id})`);

    const guildConfig = configManager.getConfig(member.guild.id);
    if (!guildConfig.features.welcome_messages) {
      logger.debug(`Welcome messages disabled for guild ${member.guild.name}`);
      return;
    }

    const channelId = guildConfig.channels.welcome_channel || WELCOME_CHANNEL_ID;
    if (channelId) {
      const ch = member.guild.channels.cache.get(channelId);
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

    await sendReferralPrompt(member);
    await inviteTracker.handleMemberJoin(member);
  } catch (error) {
    logger.error('❌ Error handling member join:', error);
  }
});

// Guild member leave with configurable leave messages
client.on('guildMemberRemove', async (member) => {
  try {
    logger.info(`👋 Member left: ${member.user.tag} (${member.user.id})`);

    const guildConfig = configManager.getConfig(member.guild.id);
    if (!guildConfig.features.leave_messages) {
      logger.debug(`Leave messages disabled for guild ${member.guild.name}`);
      return;
    }

    const channelId = guildConfig.channels.leave_channel || LEAVE_CHANNEL_ID;
    if (channelId) {
      const ch = member.guild.channels.cache.get(channelId);
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
    logger.error('❌ Error handling member leave:', error);
  }
});

// Invite create/delete tracking
client.on('inviteCreate', async (invite) => {
  try {
    logger.debug(`📨 Invite created: ${invite.code} by ${invite.inviter?.tag}`);
    await inviteTracker.handleInviteCreate(invite);
  } catch (error) {
    logger.error('❌ Error handling invite creation:', error);
  }
});
client.on('inviteDelete', async (invite) => {
  try {
    logger.debug(`🗑️ Invite deleted: ${invite.code}`);
    await inviteTracker.handleInviteDelete(invite);
  } catch (error) {
    logger.error('❌ Error handling invite deletion:', error);
  }
});

async function sendReferralPrompt(member) {
  try {
    const prefix = configManager.getPrefix(member.guild.id);
    const msg = `🎉 **Welcome to ${member.guild.name}!**\n\n` +
                `Use \`${prefix}claiminvite <invite_code>\` if you have one.\n` +
                `Use \`${prefix}help\` for commands!`;
    await member.send(msg);
    logger.debug(`📧 Referral prompt sent to ${member.user.tag}`);
  } catch {
    const ch = member.guild.systemChannel;
    if (ch) {
      const prefix = configManager.getPrefix(member.guild.id);
      await ch.send(`👋 Welcome ${member}!\nUse \`${prefix}help\` for commands!`);
    }
  }
}

// Error/warning logging
client.on('error', e => logger.error('❌ Discord client error:', e));
client.on('warn', w => logger.warn('⚠️ Discord client warning:', w));

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down gracefully...');
  await dataManager.saveAll();
  client.destroy();
  process.exit(0);
});
process.on('uncaughtException', e => { logger.error('💥 Uncaught Exception:', e); process.exit(1); });
process.on('unhandledRejection', (r,p) => { logger.error('💥 Unhandled Rejection at:', p, 'reason:', r); });

// Start the bot
function startBot() {
  if (!config.token) {
    logger.error('❌ No Discord token provided! Set DISCORD_TOKEN in .env');
    process.exit(1);
  }
  logger.info('🚀 Starting Saint Toadle Discord Bot...');
  logger.info(`🔧 Debug Mode: ${config.debugMode?'ON':'OFF'}`);
  client.login(config.token).catch(e => { logger.error('❌ Failed to login:', e); process.exit(1); });
}

// Load commands then launch
(async () => {
  try {
    await commandHandler.loadCommands(client);
    logger.info('📚 Commands loaded successfully');
    startBot();
  } catch (error) {
    logger.error('❌ Failed to initialize bot:', error);
    process.exit(1);
  }
})();
