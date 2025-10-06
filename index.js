require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');

const logger = require('./utils/logger');
const dataManager = require('./utils/dataManager');
const inviteTracker = require('./utils/inviteTracker');
const eventHandler = require('./handlers/eventHandler');
const commandHandler = require('./handlers/commandHandler');
const { setupDailyInterestTask } = require('./utils/interestScheduler');
const giveawayManager = require('./utils/managers/giveawayManager');

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
client.once('ready', async () => {
  try {
    logger.info(`🎉 ${client.user.tag} is now online!`);
    logger.info(`📊 Serving ${client.guilds.cache.size} servers`);
    logger.info(`👥 Watching ${client.users.cache.size} users`);

    // Initialize data
    await dataManager.initialize();
    logger.info('💾 Data manager initialized');

    // Initialize invite tracker
    await inviteTracker.initialize(client);
    logger.info('🎯 Invite tracker initialized');

    // Set bot activity
    client.user.setActivity('!help for commands', { type: 'LISTENING' });

    // Hand off client to giveawayManager for scheduled endings
    giveawayManager.setClient(client);

    // Register all event handlers (including interactionCreate for giveaway entries)
    eventHandler.initializeEvents(client);

    // Schedule daily interest notifications
    setupDailyInterestTask(client);

    logger.info('✅ All systems initialized successfully!');
  } catch (error) {
    logger.error('❌ Error during bot initialization:', error);
    process.exit(1);
  }
});

// Message command handler
client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot || !message.content.startsWith(config.prefix)) return;
    await commandHandler.processCommand(client, message);
  } catch (error) {
    logger.error('❌ Error processing message:', error);
  }
});

// Guild member join
client.on('guildMemberAdd', async (member) => {
  try {
    logger.info(`👋 New member joined: ${member.user.tag} (${member.user.id})`);

    // Welcome embed
    if (WELCOME_CHANNEL_ID) {
      const welcomeChannel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
      if (welcomeChannel?.send) {
        const embed = {
          color: 0x00FF00,
          title: '👋 Welcome!',
          description: `${member} joined **${member.guild.name}**`,
          thumbnail: { url: member.user.displayAvatarURL() },
          fields: [
            {
              name: 'Account Created',
              value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`,
              inline: true
            },
            {
              name: 'Member Count',
              value: `${member.guild.memberCount}`,
              inline: true
            }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Welcome!' }
        };
        await welcomeChannel.send({ embeds: [embed] });
      }
    }

    // Referral prompt & invite handling
    await sendReferralPrompt(member);
    await inviteTracker.handleMemberJoin(member);
  } catch (error) {
    logger.error('❌ Error handling member join:', error);
  }
});

// Guild member leave
client.on('guildMemberRemove', async (member) => {
  try {
    logger.info(`👋 Member left: ${member.user.tag} (${member.user.id})`);
    if (LEAVE_CHANNEL_ID) {
      const leaveChannel = member.guild.channels.cache.get(LEAVE_CHANNEL_ID);
      if (leaveChannel?.send) {
        const embed = {
          color: 0xFF0000,
          title: '👋 Goodbye!',
          description: `**${member.user.tag}** has left **${member.guild.name}**`,
          thumbnail: { url: member.user.displayAvatarURL() },
          fields: [
            {
              name: 'Joined',
              value: member.joinedTimestamp
                ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
                : 'Unknown',
              inline: true
            },
            {
              name: 'Member Count',
              value: `${member.guild.memberCount}`,
              inline: true
            }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Goodbye!' }
        };
        await leaveChannel.send({ embeds: [embed] });
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
    const welcomeMessage = `
🎉 **Welcome to ${member.guild.name}!**

If someone invited you to this server, help them earn rewards:
\`!claiminvite <invite_code>\`

Use \`!help\` for all commands!
    `.trim();

    await member.send(welcomeMessage);
    logger.debug(`📧 Referral prompt sent to ${member.user.tag}`);
  } catch (error) {
    logger.debug(`⚠️ Could not DM ${member.user.tag}: ${error.message}`);
    const channel = member.guild.systemChannel;
    if (channel) {
      try {
        await channel.send(`
👋 Welcome ${member}!

Use \`!claiminvite <invite_code>\` to help your inviter earn rewards!
Use \`!help\`.
        `.trim());
        logger.debug(`📢 Welcome message sent in system channel for ${member.user.tag}`);
      } catch (err) {
        logger.debug(`⚠️ Could not send to system channel: ${err.message}`);
      }
    }
  }
}

// Discord client error/warning logging
client.on('error', (error) => logger.error('❌ Discord client error:', error));
client.on('warn', (warning) => logger.warn('⚠️ Discord client warning:', warning));

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down gracefully...');
  try {
    await dataManager.saveAll();
    logger.info('💾 Data saved successfully');
    client.destroy();
    logger.info('🔌 Discord connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the bot
function startBot() {
  if (!config.token) {
    logger.error('❌ No Discord token provided! Set DISCORD_TOKEN in .env');
    process.exit(1);
  }
  logger.info('🚀 Starting Saint Toadle Discord Bot...');
  logger.info(`🔧 Debug Mode: ${config.debugMode ? 'ON' : 'OFF'}`);
  logger.info(`💰 Earn Range: ${config.earnMin}-${config.earnMax} coins`);
  logger.info(`🎯 Referral Bonus: ${config.referralBonus} coins`);

  client.login(config.token).catch((error) => {
    logger.error('❌ Failed to login to Discord:', error);
    process.exit(1);
  });
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
