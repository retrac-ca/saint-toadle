const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    name: 'modstats',
    description: 'View moderation statistics for the server',
    usage: '!modstats [days]',
    permissions: [PermissionFlagsBits.KickMembers],

    async execute(message, args) {
        if (!message.member.permissions.has(this.permissions)) {
            return message.reply('❌ You do not have permission to use this command.');
        }

        const days = args.length > 0 ? Math.max(1, Math.min(365, parseInt(args[0]) || 30)) : 30;
        const guild = message.guild;

        try {
            const stats = await this.getLogStats(guild.id, days);

            const warningsPath = path.join(__dirname, '../../data/warnings.json');
            let totalWarnings = 0;
            let usersWithWarnings = 0;
            
            try {
                const warningsData = await fs.readFile(warningsPath, 'utf8');
                const warnings = JSON.parse(warningsData);

                if (warnings[guild.id]) {
                    const guildWarnings = warnings[guild.id];
                    usersWithWarnings = Object.keys(guildWarnings).length;
                    totalWarnings = Object.values(guildWarnings).reduce((sum, user) => sum + user.totalWarnings, 0);
                }
            } catch (error) {
                // No warnings file exists yet
            }

            const warningRate = stats.total > 0 ? ((stats.warnings / stats.total) * 100).toFixed(1) : 0;
            const banRate = stats.total > 0 ? (((stats.bans) / stats.total) * 100).toFixed(1) : 0;

            const statsEmbed = new EmbedBuilder()
                .setColor(0x4F46E5)
                .setTitle('📊 Moderation Statistics')
                .setDescription(`Server moderation activity for the last ${days} days`)
                .addFields(
                    { name: '📝 Total Actions', value: stats.total.toString(), inline: true },
                    { name: '⚠️ Warnings', value: `${stats.warnings} (${warningRate}%)`, inline: true },
                    { name: '🔨 Bans', value: `${stats.bans} (${banRate}%)`, inline: true },
                    { name: '👢 Kicks', value: stats.kicks.toString(), inline: true },
                    { name: '🔇 Mutes', value: stats.mutes.toString(), inline: true },
                    { name: '👥 Unique Users', value: stats.uniqueUsers.toString(), inline: true },
                    { name: '⚠️ All-Time Warnings', value: totalWarnings.toString(), inline: true },
                    { name: '👤 Users with Warnings', value: usersWithWarnings.toString(), inline: true },
                    { name: '📈 Avg. Actions/Day', value: (stats.total / days).toFixed(1), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Saint Toadle Moderation System' });

            let activityLevel = 'Low';
            let activityColor = 0x00FF00;
            
            if (stats.total / days > 5) {
                activityLevel = 'High';
                activityColor = 0xFF0000;
            } else if (stats.total / days > 2) {
                activityLevel = 'Medium';
                activityColor = 0xFFFF00;
            }

            statsEmbed.setColor(activityColor);
            statsEmbed.addFields({ 
                name: '🎯 Activity Level', 
                value: activityLevel, 
                inline: true 
            });

            await message.channel.send({ embeds: [statsEmbed] });

        } catch (error) {
            console.error('Error in modstats command:', error);
            await message.reply('❌ An error occurred while fetching moderation statistics. Please try again.');
        }
    },

    async getLogStats(guildId, days = 30) {
        try {
            const logsPath = path.join(__dirname, '../../data/moderation_logs.json');
            const data = await fs.readFile(logsPath, 'utf8');
            const logsData = JSON.parse(data);
            const guildLogs = logsData[guildId] || [];

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const recentLogs = guildLogs.filter(log => new Date(log.timestamp) >= cutoffDate);

            const stats = {
                total: recentLogs.length,
                warnings: recentLogs.filter(log => log.action === 'WARNING').length,
                bans: recentLogs.filter(log => log.action === 'BAN' || log.action === 'AUTO_BAN').length,
                kicks: recentLogs.filter(log => log.action === 'KICK').length,
                mutes: recentLogs.filter(log => log.action === 'MUTE').length,
                uniqueUsers: [...new Set(recentLogs.map(log => log.target.id))].length
            };

            return stats;

        } catch (error) {
            console.error('Error getting log stats:', error);
            return {
                total: 0,
                warnings: 0,
                bans: 0,
                kicks: 0,
                mutes: 0,
                uniqueUsers: 0
            };
        }
    }
};
