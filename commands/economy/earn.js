/**
 * Earn Command - Random Coin Earning
 * 
 * Allows users to earn random amounts of coins with configurable min/max values.
 * Includes cooldown to prevent spam and tracks earning statistics.
 */

const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const logger = require('../../utils/logger');
const configManager = require('../../utils/managers/configManager');

module.exports = {
    name: 'earn',
    description: 'Earn a random amount of coins',
    aliases: ['work', 'daily', 'claim'],
    usage: '!earn',
    category: 'economy',
    cooldown: 3600, // 1 hour cooldown (3600 seconds)
    
    async execute(message, args, client) {
        try {
            const userId = message.author.id;
            const guildId = message.guild.id;

            // Check if economy is enabled for this guild
            if (!configManager.isFeatureEnabled(guildId, 'economy_enabled')) {
                return message.channel.send('❌ Economy features are disabled in this server.');
            }

            // Get configured earn range for this guild
            const economyConfig = configManager.getEconomyConfig(guildId);
            const minEarn = economyConfig.earn_range.min;
            const maxEarn = economyConfig.earn_range.max;
            const earnAmount = Math.floor(Math.random() * (maxEarn - minEarn + 1)) + minEarn;
            
            // Add coins to user balance
            await dataManager.addToUserBalance(userId, earnAmount);
            await dataManager.updateUser(userId, { lastEarn: Date.now() });
            
            // Get updated balance
            const newBalance = dataManager.getUserBalance(userId);
            
            // Create success embed with random earning message
            const earnMessages = [
                `You worked hard and earned ${earnAmount} coins!`,
                `You found ${earnAmount} coins while exploring!`,
                `Your business venture paid off with ${earnAmount} coins!`,
                `You completed a task and earned ${earnAmount} coins!`,
                `Lucky you! You earned ${earnAmount} coins!`,
                `Your investments returned ${earnAmount} coins!`,
                `You helped someone and received ${earnAmount} coins as thanks!`,
                `Your side hustle generated ${earnAmount} coins!`
            ];
            
            const randomMessage = earnMessages[Math.floor(Math.random() * earnMessages.length)];
            
            const embed = new EmbedBuilder()
                .setColor('#ffd700')
                .setTitle('💰 Coins Earned!')
                .setDescription(randomMessage)
                .addFields(
                    {
                        name: '💎 Amount Earned',
                        value: `${earnAmount.toLocaleString()} coins`,
                        inline: true
                    },
                    {
                        name: '🏦 New Balance',
                        value: `${newBalance.toLocaleString()} coins`,
                        inline: true
                    }
                )
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setFooter({ 
                    text: `Next earn available in 1 hour`,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();


            // Add random earning tip occasionally
            if (Math.random() < 0.3) { // 30% chance
                const tips = [
                    'Invite friends to earn referral bonuses!',
                    'Check the leaderboard to see top earners!',
                    'Use !help to see all available commands!',
                    'Give coins to friends with !give command!'
                ];
                
                const randomTip = tips[Math.floor(Math.random() * tips.length)];
                embed.addFields({
                    name: '💡 Tip',
                    value: randomTip,
                    inline: false
                });
            }

            await message.channel.send({ embeds: [embed] });
            
            // Log the transaction
            logger.logTransaction('earn', userId, earnAmount, `New balance: ${newBalance}`);
            
        } catch (error) {
            logger.logError('Earn command execution', error, {
                user: message.author.id
            });
            
            await message.channel.send('❌ An error occurred while earning coins. Please try again later.');
        }
    }
};
