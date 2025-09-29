const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    name: 'modlogs',
    description: 'View moderation logs',
    usage: '!modlogs [@user] [action] [limit]',
    permissions: [PermissionFlagsBits.KickMembers],

    async execute(message, args) {
        if (!message.member.permissions.has(this.permissions)) {
            return message.reply('❌ You do not have permission to use this command.');
        }

        let targetUser;
        let actionFilter;
        let limit = 10;

        // Extract user mention, action filter, and limit from args
        args.forEach(arg => {
            if (message.mentions.users.size && !targetUser) {
                targetUser = message.mentions.users.first();
            } else if (['WARNING','AUTO_BAN','BAN','KICK','MUTE','UNMUTE','WARNING_REMOVED'].includes(arg.toUpperCase())) {
                actionFilter = arg.toUpperCase();
            } else if (!isNaN(parseInt(arg))) {
                const parsed = parseInt(arg);
                if (parsed >= 1 && parsed <= 25) limit = parsed;
            }
        });

        const guild = message.guild;

        try {
            const logsPath = path.join(__dirname, '../../data/moderation_logs.json');
            let logsData = {};
            try {
                const data = await fs.readFile(logsPath, 'utf8');
                logsData = JSON.parse(data);
            } catch {
                logsData = {};
            }

            const guildLogs = logsData[guild.id] || [];

            if (guildLogs.length === 0) {
                return message.reply('❌ No moderation logs found for this server.');
            }

            let filteredLogs = [...guildLogs];

            if (targetUser) {
                filteredLogs = filteredLogs.filter(log => log.target.id === targetUser.id);
            }

            if (actionFilter) {
                filteredLogs = filteredLogs.filter(log => log.action === actionFilter);
            }

            if (filteredLogs.length === 0) {
                return message.reply('❌ No logs found matching the specified criteria.');
            }

            filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const displayLogs = filteredLogs.slice(0, limit);

            let title = '📋 Moderation Logs';
            let description = `Showing ${displayLogs.length} of ${filteredLogs.length} logs`;

            if (targetUser) title += ` for ${targetUser.username}`;
            if (actionFilter) description += ` (${actionFilter})`;

            const logsEmbed = new EmbedBuilder()
                .setColor(0x4F46E5)
                .setTitle(title)
                .setDescription(description)
                .setTimestamp()
                .setFooter({ text: 'Saint Toadle Moderation System' });

            displayLogs.forEach(log => {
                const date = new Date(log.timestamp).toLocaleString();
                const actionEmoji = this.getActionEmoji(log.action);

                let fieldValue = `**Target:** ${log.target.username} (${log.target.id})\n`;
                fieldValue += `**Moderator:** ${log.moderator.username}\n`;
                fieldValue += `**Reason:** ${log.reason}\n`;
                fieldValue += `**Date:** ${date}`;

                if (log.warningId) {
                    fieldValue += `\n**Warning ID:** ${log.warningId}`;
                }

                logsEmbed.addFields({
                    name: `${actionEmoji} ${log.action} - Log ID: ${log.id}`,
                    value: fieldValue,
                });
            });

            await message.channel.send({ embeds: [logsEmbed] });

        } catch (error) {
            console.error('Error in modlogs command:', error);
            await message.reply('❌ An error occurred while fetching moderation logs. Please try again.');
        }
    },

    getActionEmoji(action) {
        const emojis = {
            'WARNING': '⚠️',
            'AUTO_BAN': '🔨',
            'BAN': '🔨',
            'KICK': '👢',
            'MUTE': '🔇',
            'UNMUTE': '🔊',
            'WARNING_REMOVED': '✅'
        };
        return emojis[action] || '📝';
    }
};