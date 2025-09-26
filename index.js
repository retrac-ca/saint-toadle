/**
 * Saint Toadle Discord Bot - Main Entry Point
 * 
 * This is the main file that starts and configures the Discord bot.
 * It handles bot initialization, event loading, command handling, and logging.
 * 
 * Author: Your Name
 * Version: 1.0.0
 */

// Load environment variables from .env file
require('dotenv').config();

// Import required Discord.js components
const { Client, GatewayIntentBits, Collection } = require('discord.js');

// Import utility modules
const logger = require('./utils/logger');
const dataManager = require('./utils/dataManager');
const inviteTracker = require('./utils/inviteTracker');
const eventHandler = require('./handlers/eventHandler');
const commandHandler = require('./handlers/commandHandler');

/**
 * Create Discord client instance with necessary intents
 * Intents define what events the bot can listen to
 */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,              // Basic guild information
        GatewayIntentBits.GuildMessages,       // Read messages in guilds
        GatewayIntentBits.MessageContent,      // Access message content
        GatewayIntentBits.GuildMembers,        // Track member joins/leaves
        GatewayIntentBits.GuildInvites,        // Track invite creation/deletion
        GatewayIntentBits.GuildModeration,     // Moderation events (bans, etc.)
    ]
});

/**
 * Initialize collections for storing commands and cooldowns
 * Collections are Map-like structures optimized for Discord.js
 */
client.commands = new Collection();
client.cooldowns = new Collection();

/**
 * Bot configuration from environment variables
 */
const config = {
    prefix: process.env.PREFIX || '!',
    token: process.env.DISCORD_TOKEN,
    debugMode: process.env.DEBUG_MODE === 'true',
    earnMin: parseInt(process.env.DAILY_EARN_MIN) || 1,
    earnMax: parseInt(process.env.DAILY_EARN_MAX) || 50,
    referralBonus: parseInt(process.env.REFERRAL_BONUS) || 50
};

// Make config accessible to other modules
client.config = config;

/**
 * Initialize bot systems when client is ready
 */
client.once('clientReady', async () => {
    try {
        logger.info(`🎉 ${client.user.tag} is now online!`);
        logger.info(`📊 Serving ${client.guilds.cache.size} servers`);
        logger.info(`👥 Watching ${client.users.cache.size} users`);
        
        // Initialize data storage
        await dataManager.initialize();
        logger.info('💾 Data manager initialized');
        
        // Initialize invite tracking for all guilds
        await inviteTracker.initialize(client);
        logger.info('🎯 Invite tracker initialized');
        
        // Set bot activity status
        client.user.setActivity('!help for commands', { type: 'LISTENING' });
        
        logger.info('✅ All systems initialized successfully!');
        
    } catch (error) {
        logger.error('❌ Error during bot initialization:', error);
        process.exit(1);
    }
});

/**
 * Handle message creation events
 * This is where command processing happens
 */
client.on('messageCreate', async (message) => {
    try {
        // Ignore bot messages and messages without prefix
        if (message.author.bot || !message.content.startsWith(config.prefix)) return;
        
        // Process the command
        await commandHandler.processCommand(client, message);
        
    } catch (error) {
        logger.error('❌ Error processing message:', error);
    }
});

/**
 * Handle member join events
 * This triggers the referral claim prompt
 */
client.on('guildMemberAdd', async (member) => {
    try {
        logger.info(`👋 New member joined: ${member.user.tag} (${member.user.id})`);
        
        // Send referral claim prompt to new member
        await sendReferralPrompt(member);
        
        // Update invite tracking
        await inviteTracker.handleMemberJoin(member);
        
    } catch (error) {
        logger.error('❌ Error handling member join:', error);
    }
});

/**
 * Handle invite creation events
 */
client.on('inviteCreate', async (invite) => {
    try {
        logger.debug(`📨 Invite created: ${invite.code} by ${invite.inviter?.tag}`);
        await inviteTracker.handleInviteCreate(invite);
    } catch (error) {
        logger.error('❌ Error handling invite creation:', error);
    }
});

/**
 * Handle invite deletion events
 */
client.on('inviteDelete', async (invite) => {
    try {
        logger.debug(`🗑️ Invite deleted: ${invite.code}`);
        await inviteTracker.handleInviteDelete(invite);
    } catch (error) {
        logger.error('❌ Error handling invite deletion:', error);
    }
});

/**
 * Send referral claim prompt to new members
 * @param {GuildMember} member - The new guild member
 */
async function sendReferralPrompt(member) {
    try {
        const welcomeMessage = `
🎉 **Welcome to ${member.guild.name}!**

If someone invited you to this server, you can help them earn rewards by using:
\`!claiminvite <invite_code>\`

For example: \`!claiminvite abc123\`

Use \`!help\` to see all available commands!
        `.trim();
        
        await member.send(welcomeMessage);
        logger.debug(`📧 Referral prompt sent to ${member.user.tag}`);
        
    } catch (error) {
        // If we can't send DM, try to send in a system channel or log
        logger.debug(`⚠️ Could not send DM to ${member.user.tag}: ${error.message}`);
        
        // Try to send in system channel if available
        if (member.guild.systemChannel) {
            const publicMessage = `
👋 Welcome ${member}! 

If someone invited you, use \`!claiminvite <invite_code>\` to help them earn rewards!
Use \`!help\` for all commands.
            `.trim();
            
            try {
                await member.guild.systemChannel.send(publicMessage);
                logger.debug(`📢 Welcome message sent to system channel for ${member.user.tag}`);
            } catch (channelError) {
                logger.debug(`⚠️ Could not send to system channel: ${channelError.message}`);
            }
        }
    }
}

/**
 * Handle bot errors and warnings
 */
client.on('error', (error) => {
    logger.error('❌ Discord client error:', error);
});

client.on('warn', (warning) => {
    logger.warn('⚠️ Discord client warning:', warning);
});

/**
 * Handle process termination gracefully
 */
process.on('SIGINT', async () => {
    logger.info('🛑 Shutting down gracefully...');
    
    try {
        // Save any pending data
        await dataManager.saveAll();
        logger.info('💾 Data saved successfully');
        
        // Destroy client connection
        client.destroy();
        logger.info('🔌 Discord connection closed');
        
        process.exit(0);
    } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

/**
 * Validate configuration and start the bot
 */
function startBot() {
    if (!config.token) {
        logger.error('❌ No Discord token provided! Please set DISCORD_TOKEN in your .env file');
        process.exit(1);
    }
    
    logger.info('🚀 Starting Saint Toadle Discord Bot...');
    logger.info(`🔧 Debug Mode: ${config.debugMode ? 'ON' : 'OFF'}`);
    logger.info(`💰 Earn Range: ${config.earnMin}-${config.earnMax} coins`);
    logger.info(`🎯 Referral Bonus: ${config.referralBonus} coins`);
    
    // Login to Discord
    client.login(config.token).catch((error) => {
        logger.error('❌ Failed to login to Discord:', error);
        process.exit(1);
    });
}

// Initialize command loading and start the bot
(async () => {
    try {
        // Load all commands
        await commandHandler.loadCommands(client);
        logger.info('📚 Commands loaded successfully');
        
        // Start the bot
        startBot();
        
    } catch (error) {
        logger.error('❌ Failed to initialize bot:', error);
        process.exit(1);
    }
})();