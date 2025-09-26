/**
 * Balance Command - Check User Balance
 * 
 * Allows users to check their own balance or view another user's balance.
 * Displays current balance and basic statistics.
 */

const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const logger = require('../../utils/logger');

module.exports = {
    name: 'balance',
    description: 'Check your current balance or another user\'s balance',
    aliases: ['bal', 'coins', 'money'],
    usage: '!balance [@user]',
    category: 'economy',
    cooldown: 3,
    
    async execute(message, args, client) {
        try {
            // Determine target user (mentioned user or message author)
            const targetUser = message.mentions.users.first() || message.author;
            const isOwnBalance = targetUser.id === message.author.id;
            
            // Get user data
            const userData = dataManager.getUser(targetUser.id);
            const userStats = dataManager.getUserStats(targetUser.id);
            
            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`💰 ${isOwnBalance ? 'Your Balance' : `${targetUser.username}'s Balance`}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    {
                        name: '🏦 Current Balance',
                        value: `${userData.balance.toLocaleString()} coins`,
                        inline: true
                    },
                    {
                        name: '📈 Total Earned',
                        value: `${userData.totalEarned.toLocaleString()} coins`,
                        inline: true
                    },
                    {
                        name: '🎯 Referrals',
                        value: `${userData.referrals} users`,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `Use ${client.config.prefix}earn to earn more coins!`,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            // Add last earn time if available
            if (userData.lastEarn && isOwnBalance) {
                const lastEarnDate = new Date(userData.lastEarn);
                embed.addFields({
                    name: '⏰ Last Earn',
                    value: lastEarnDate.toLocaleString(),
                    inline: true
                });
            }

            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            logger.logError('Balance command execution', error, {
                user: message.author.id,
                targetUser: message.mentions.users.first()?.id
            });
            
            await message.reply('❌ An error occurred while checking the balance.');
        }
    }
};