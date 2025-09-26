/**
 * Ping Command - Check Bot Latency
 * 
 * Tests bot responsiveness and displays API and message latency.
 * Useful for monitoring bot performance.
 */

const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
    name: 'ping',
    description: 'Check bot latency and response time',
    aliases: ['latency', 'pong'],
    usage: '!ping',
    category: 'utility',
    cooldown: 5,
    dmAllowed: true,
    
    async execute(message, args, client) {
        try {
            const startTime = Date.now();
            
            // Send initial message
            const pingEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('🏓 Pinging...')
                .setDescription('Calculating latency...')
                .setTimestamp();
            
            const sentMessage = await message.reply({ embeds: [pingEmbed] });
            
            // Calculate latencies
            const messageLatency = Date.now() - startTime;
            const apiLatency = Math.round(client.ws.ping);
            
            // Determine latency status and color
            let status, color, statusEmoji;
            const totalLatency = messageLatency + apiLatency;
            
            if (totalLatency < 200) {
                status = 'Excellent';
                color = '#00ff00';
                statusEmoji = '🟢';
            } else if (totalLatency < 500) {
                status = 'Good';
                color = '#ffaa00';
                statusEmoji = '🟡';
            } else if (totalLatency < 1000) {
                status = 'Fair';
                color = '#ff6600';
                statusEmoji = '🟠';
            } else {
                status = 'Poor';
                color = '#ff0000';
                statusEmoji = '🔴';
            }
            
            // Update embed with results
            const resultEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle('🏓 Pong!')
                .setDescription(`Bot latency information`)
                .addFields(
                    {
                        name: '📨 Message Latency',
                        value: `${messageLatency}ms`,
                        inline: true
                    },
                    {
                        name: '🌐 API Latency',
                        value: `${apiLatency}ms`,
                        inline: true
                    },
                    {
                        name: '📊 Status',
                        value: `${statusEmoji} ${status}`,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `Saint Toadle Bot • Uptime: ${formatUptime(client.uptime)}`,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();
            
            // Add performance tip for poor latency
            if (totalLatency >= 1000) {
                resultEmbed.addFields({
                    name: '💡 Performance Tip',
                    value: 'High latency detected. This may be due to network issues or high server load.',
                    inline: false
                });
            }
            
            await sentMessage.edit({ embeds: [resultEmbed] });
            
            // Log performance metrics
            logger.logPerformance('Ping command', messageLatency, {
                apiLatency,
                totalLatency,
                status
            });
            
        } catch (error) {
            logger.logError('Ping command execution', error, {
                user: message.author.id
            });
            
            await message.reply('❌ An error occurred while checking latency.');
        }
    }
};

/**
 * Format uptime duration into readable string
 * @param {number} uptime - Uptime in milliseconds
 * @returns {string} Formatted uptime string
 */
function formatUptime(uptime) {
    if (!uptime) return 'Unknown';
    
    const totalSeconds = Math.floor(uptime / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    
    return parts.join(' ');
}