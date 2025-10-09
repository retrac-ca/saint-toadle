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
client.once('ready', async () => {
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
      client.guilds.cache.forEach(guild => {
        const gc = configManager.getConfig(guild.id);
        const channelId = gc.reminderChannelId;
        if (!channelId) return;
        const ch = guild.channels.cache.get(channelId);
        if (!ch?.send) return;
        matches.forEach(d => ch.send(`🌐 Today is **${d.name}**!`));
      });
    });

    // Set bot activity
    client.user.setActivity(`${config.prefix}help for commands`, { type: 'LISTENING' });

    // Give giveawayManager access to client
    giveawayManager.setClient(client);

    // Initialize event handlers (messageCreate, reaction, voice, etc.)
    eventHandler.initializeEvents(client);

    logger.info('✅ All systems initialized successfully!');
  } catch (error) {
    logger.error('❌ Error during bot initialization:', error);
    process.exit(1);
  }
});

// Start bot
(async () => {
  try {
    // Load commands once
    await commandHandler.loadCommands(client);
    logger.info('📚 Commands loaded successfully');
    if (!config.token) throw new Error('No DISCORD_TOKEN');
    logger.info('🚀 Starting Saint Toadle Discord Bot...');
    await client.login(config.token);
  } catch (error) {
    logger.error('❌ Bot startup failed:', error);
    process.exit(1);
  }
})();
