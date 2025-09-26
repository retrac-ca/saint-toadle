/**
 * Clear/Purge Command - Bulk Message Deletion
 * 
 * Allows moderators to delete multiple messages at once.
 * Includes safety limits and proper permission checks.
 */

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
    name: 'clear',
    description: 'Delete multiple messages from the current channel',
    aliases: ['purge', 'delete', 'clean'],
    usage: '!clear <amount> [user]',
    category: 'moderation',
    permissions: [PermissionFlagsBits.ManageMessages],
    cooldown: 10,
    
    async execute(message, args, client) {
        try {
            // Check if amount is provided
            if (!args[0]) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Missing Amount')
                    .setDescription('Please specify the number of messages to delete.')
                    .addFields({
                        name: '📝 Usage',
                        value: `\`${client.config.prefix}clear <amount>\`\n\`${client.config.prefix}clear <amount> @user\``,
                        inline: false
                    })
                    .addFields({
                        name: '💡 Examples',
                        value: '`!clear 10` - Delete 10 recent messages\n`!clear 5 @john` - Delete 5 messages from @john',
                        inline: false
                    });
                
                return await message.reply({ embeds: [embed] });
            }

            // Parse amount
            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount <= 0) {
                return await message.reply('❌ Please provide a valid positive number!');
            }

            // Safety limit
            if (amount > 100) {
                return await message.reply('❌ You can only delete up to 100 messages at once for safety reasons.');
            }

            // Check if targeting specific user
            const targetUser = message.mentions.users.first();
            let deletedCount = 0;

            if (targetUser) {
                // Delete messages from specific user
                const messages = await message.channel.messages.fetch({ limit: 100 });
                const userMessages = messages.filter(msg => 
                    msg.author.id === targetUser.id && 
                    msg.id !== message.id &&
                    Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000 // 14 days limit
                );

                const messagesToDelete = Array.from(userMessages.values()).slice(0, amount);
                
                if (messagesToDelete.length === 0) {
                    return await message.reply(`❌ No recent messages found from ${targetUser.username} (messages must be less than 14 days old).`);
                }

                // Delete messages one by one for user-specific deletion
                for (const msg of messagesToDelete) {
                    try {
                        await msg.delete();
                        deletedCount++;
                        // Small delay to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error) {
                        logger.debug(`Could not delete message ${msg.id}: ${error.message}`);
                    }
                }
            } else {
                // Bulk delete recent messages
                try {
                    const messages = await message.channel.bulkDelete(amount + 1, true); // +1 for the command message
                    deletedCount = messages.size - 1; // -1 for the command message
                } catch (error) {
                    if (error.code === 50034) {
                        return await message.reply('❌ Cannot delete messages older than 14 days!');
                    } else if (error.code === 50013) {
                        return await message.reply('❌ I don\'t have permission to delete messages in this channel!');
                    } else {
                        throw error;
                    }
                }
            }

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Messages Deleted')
                .setDescription(`Successfully deleted ${deletedCount} message${deletedCount !== 1 ? 's' : ''}`)
                .addFields({
                    name: '📊 Details',
                    value: `**Channel:** ${message.channel}\n**Moderator:** ${message.author}\n**Target:** ${targetUser ? targetUser.username : 'All users'}`,
                    inline: false
                })
                .setFooter({ 
                    text: `Requested by ${message.author.username}`,
                    iconURL: message.author.displayAvatarURL()
                })
                .setTimestamp();

            // Send confirmation message and auto-delete after 5 seconds
            const confirmMessage = await message.channel.send({ embeds: [embed] });
            setTimeout(async () => {
                try {
                    await confirmMessage.delete();
                } catch (error) {
                    logger.debug('Could not delete confirmation message:', error.message);
                }
            }, 5000);

            // Log moderation action
            logger.logModeration(
                'clear',
                message.author.id,
                targetUser?.id || 'all',
                `Deleted ${deletedCount} messages`,
                message.guild.id
            );

            // Try to log in moderation log channel if exists
            await this.logToModerationChannel(message.guild, {
                action: 'Message Clear',
                moderator: message.author,
                target: targetUser || 'All users',
                details: `${deletedCount} messages deleted from ${message.channel}`,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.logError('Clear command execution', error, {
                moderator: message.author.id,
                channel: message.channel.id,
                amount: args[0],
                targetUser: message.mentions.users.first()?.id
            });
            
            await message.reply('❌ An error occurred while clearing messages. Please try again later.');
        }
    },

    /**
     * Log moderation action to designated log channel
     * @param {Guild} guild - Discord guild
     * @param {Object} logData - Moderation log data
     */
    async logToModerationChannel(guild, logData) {
        try {
            // Look for common moderation log channel names
            const logChannelNames = ['mod-log', 'modlog', 'moderation-log', 'audit-log', 'logs'];
            let logChannel = null;

            for (const channelName of logChannelNames) {
                logChannel = guild.channels.cache.find(ch => 
                    ch.name.toLowerCase() === channelName && ch.isTextBased()
                );
                if (logChannel) break;
            }

            if (!logChannel) return; // No log channel found

            const logEmbed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle('🛡️ Moderation Action')
                .addFields(
                    {
                        name: 'Action',
                        value: logData.action,
                        inline: true
                    },
                    {
                        name: 'Moderator',
                        value: `${logData.moderator} (${logData.moderator.id})`,
                        inline: true
                    },
                    {
                        name: 'Target',
                        value: logData.target.username ? `${logData.target} (${logData.target.id})` : logData.target,
                        inline: true
                    },
                    {
                        name: 'Details',
                        value: logData.details,
                        inline: false
                    }
                )
                .setTimestamp(logData.timestamp)
                .setFooter({ text: 'Saint Toadle Moderation' });

            await logChannel.send({ embeds: [logEmbed] });
            logger.debug(`📝 Logged moderation action to ${logChannel.name}`);
            
        } catch (error) {
            logger.debug(`Could not log to moderation channel: ${error.message}`);
        }
    }
};