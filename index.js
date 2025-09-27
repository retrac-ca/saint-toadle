require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');

const logger = require('./utils/logger');
const dataManager = require('./utils/dataManager');
const inviteTracker = require('./utils/inviteTracker');
const eventHandler = require('./handlers/eventHandler');
const commandHandler = require('./handlers/commandHandler');
const { setupDailyInterestTask } = require('./utils/interestScheduler');

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

client.once('clientReady', async () => {
    try {
        logger.info(`🎉 ${client.user.tag} is now online!`);
        logger.info(`📊 Serving ${client.guilds.cache.size} servers`);
        logger.info(`👥 Watching ${client.users.cache.size} users`);
        
        await dataManager.initialize();
        logger.info('💾 Data manager initialized');
        
        await inviteTracker.initialize(client);
        logger.info('🎯 Invite tracker initialized');
        
        client.user.setActivity('!help for commands', { type: 'LISTENING' });
        logger.info('✅ All systems initialized successfully!');
        
        // Setup daily interest task with notification channel
        setupDailyInterestTask(client);
    } catch (error) {
        logger.error('❌ Error during bot initialization:', error);
        process.exit(1);
    }
});

client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot || !message.content.startsWith(config.prefix)) return;
        await commandHandler.processCommand(client, message);
    } catch (error) {
        logger.error('❌ Error processing message:', error);
    }
});

client.on('guildMemberAdd', async (member) => {
    try {
        logger.info(`👋 New member joined: ${member.user.tag} (${member.user.id})`);
        await sendReferralPrompt(member);
        await inviteTracker.handleMemberJoin(member);
    } catch (error) {
        logger.error('❌ Error handling member join:', error);
    }
});

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

If someone invited you to this server, you can help them earn rewards by using:
\`!claiminvite <invite_code>\`

For example: \`!claiminvite abc123\`

Use \`!help\` to see all available commands!
        `.trim();
        
        await member.send(welcomeMessage);
        logger.debug(`📧 Referral prompt sent to ${member.user.tag}`);
    } catch (error) {
        logger.debug(`⚠️ Could not send DM to ${member.user.tag}: ${error.message}`);
        
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

client.on('error', (error) => {
    logger.error('❌ Discord client error:', error);
});

client.on('warn', (warning) => {
    logger.warn('⚠️ Discord client warning:', warning);
});

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

function startBot() {
    if (!config.token) {
        logger.error('❌ No Discord token provided! Please set DISCORD_TOKEN in your .env file');
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