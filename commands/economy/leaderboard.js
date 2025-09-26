/**
 * Leaderboard Command - Display Top Earners
 * 
 * Shows the server's top earners by balance with rankings and statistics.
 * Includes pagination for large leaderboards.
 */

const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const logger = require('../../utils/logger');

module.exports = {
    name: 'leaderboard',
    description: 'View the top earners on the server',
    aliases: ['lb', 'top', 'rich', 'richest'],
    usage: '!leaderboard [page]',
    category: 'economy',
    cooldown: 10,
    
    async execute(message, args, client) {
        try {
            // Parse page number (default to 1)
            const page = Math.max(1, parseInt(args[0]) || 1);
            const itemsPerPage = 10;
            const startIndex = (page - 1) * itemsPerPage;
            
            // Get leaderboard data
            const leaderboard = dataManager.getLeaderboard(100); // Get top 100
            const totalPages = Math.ceil(leaderboard.length / itemsPerPage);
            
            // Check if page exists
            if (page > totalPages && totalPages > 0) {
                return await message.reply(`❌ Page ${page} does not exist! There are only ${totalPages} pages.`);
            }
            
            // Get users for current page
            const pageUsers = leaderboard.slice(startIndex, startIndex + itemsPerPage);
            
            if (pageUsers.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ffd700')
                    .setTitle('🏆 Leaderboard')
                    .setDescription('No users found! Start earning coins with `!earn` to appear on the leaderboard.')
                    .setFooter({ text: `Saint Toadle Economy`, iconURL: client.user.displayAvatarURL() });
                
                return await message.reply({ embeds: [embed] });
            }

            // Create leaderboard description
            let description = '';
            let userRank = null;
            
            for (let i = 0; i < pageUsers.length; i++) {
                const userData = pageUsers[i];
                const rank = startIndex + i + 1;
                
                // Try to get user from client cache
                let username = 'Unknown User';
                try {
                    const user = await client.users.fetch(userData.userId);
                    username = user.username;
                } catch (error) {
                    // User not found, keep 'Unknown User'
                }
                
                // Check if this is the command user
                if (userData.userId === message.author.id) {
                    userRank = rank;
                }
                
                // Add rank emoji for top 3
                let rankEmoji = `${rank}.`;
                if (rank === 1) rankEmoji = '🥇';
                else if (rank === 2) rankEmoji = '🥈';
                else if (rank === 3) rankEmoji = '🥉';
                else rankEmoji = `**${rank}.**`;
                
                description += `${rankEmoji} **${username}**\n`;
                description += `💰 ${userData.balance.toLocaleString()} coins`;
                
                // Show additional stats for top 3
                if (rank <= 3) {
                    description += ` • 🎯 ${userData.referrals} referrals`;
                }
                
                description += '\n\n';
            }

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#ffd700')
                .setTitle('🏆 Economy Leaderboard')
                .setDescription(description.trim())
                .setFooter({ 
                    text: `Page ${page} of ${totalPages} • Saint Toadle Economy`,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            // Add user's rank if they're not on current page
            if (userRank === null && leaderboard.length > 0) {
                for (let i = 0; i < leaderboard.length; i++) {
                    if (leaderboard[i].userId === message.author.id) {
                        userRank = i + 1;
                        break;
                    }
                }
            }

            if (userRank !== null && (userRank < startIndex + 1 || userRank > startIndex + itemsPerPage)) {
                const userBalance = dataManager.getUserBalance(message.author.id);
                embed.addFields({
                    name: '📊 Your Rank',
                    value: `#${userRank} • ${userBalance.toLocaleString()} coins`,
                    inline: true
                });
            }

            // Add navigation info if there are multiple pages
            if (totalPages > 1) {
                let navigationText = `Use \`${client.config.prefix}leaderboard <page>\` to view other pages.`;
                
                if (page > 1) {
                    navigationText += `\n⬅️ Previous: \`${client.config.prefix}leaderboard ${page - 1}\``;
                }
                if (page < totalPages) {
                    navigationText += `\n➡️ Next: \`${client.config.prefix}leaderboard ${page + 1}\``;
                }
                
                embed.addFields({
                    name: '📄 Navigation',
                    value: navigationText,
                    inline: false
                });
            }

            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            logger.logError('Leaderboard command execution', error, {
                user: message.author.id,
                page: args[0]
            });
            
            await message.reply('❌ An error occurred while loading the leaderboard. Please try again later.');
        }
    }
};