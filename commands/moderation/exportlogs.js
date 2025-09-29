const { EmbedBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    name: 'exportlogs',
    description: 'Export moderation logs to CSV file',
    usage: '!exportlogs [@user] [action] [days]',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args) {
        if (!message.member.permissions.has(this.permissions)) {
            return message.reply('❌ You do not have permission to use this command.');
        }

        let targetUser;
        let actionFilter;
        let days = 30;

        // Parse arguments: user mention, action, days - order does not matter here but must be handled carefully
        args.forEach(arg => {
            if (message.mentions.users.size && !targetUser) {
                targetUser = message.mentions.users.first();
            } else if (['WARNING','AUTO_BAN','BAN','KICK','MUTE','UNMUTE','WARNING_REMOVED'].includes(arg.toUpperCase())) {
                actionFilter = arg.toUpperCase();
            } else if (!isNaN(parseInt(arg))) {
                days = parseInt(arg);
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
                return message.reply('❌ No moderation logs found.');
            }

            const guildLogs = logsData[guild.id] || [];

            if (guildLogs.length === 0) {
                return message.reply('❌ No moderation logs found for this server.');
            }

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            let filteredLogs = guildLogs.filter(log => new Date(log.timestamp) >= cutoffDate);

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

            const csvHeaders = [
                'Log ID',
                'Timestamp',
                'Action',
                'Target ID',
                'Target Username',
                'Target Tag',
                'Moderator ID',
                'Moderator Username',
                'Moderator Tag',
                'Reason',
                'Warning ID',
                'Channel ID'
            ];

            let csvContent = csvHeaders.join(',') + '\n';

            filteredLogs.forEach(log => {
                const row = [
                    log.id,
                    log.timestamp,
                    log.action,
                    log.target.id,
                    `"${log.target.username}"`,
                    `"${log.target.tag}"`,
                    log.moderator.id,
                    `"${log.moderator.username}"`,
                    `"${log.moderator.tag}"`,
                    `"${log.reason.replace(/"/g, '""')}"`,
                    log.warningId || '',
                    log.channel || ''
                ];
                csvContent += row.join(',') + '\n';
            });

            const tempDir = path.join(__dirname, '../../temp');
            await fs.mkdir(tempDir, { recursive: true });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `moderation_logs_${guild.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.csv`;
            const tempFilePath = path.join(tempDir, filename);

            await fs.writeFile(tempFilePath, csvContent);

            const attachment = new AttachmentBuilder(tempFilePath, { name: filename });

            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('📊 Logs Exported Successfully')
                .setDescription(`Exported ${filteredLogs.length} moderation log entries`)
                .addFields(
                    { name: '📅 Date Range', value: `Last ${days} days`, inline: true },
                    { name: '👤 User Filter', value: targetUser ? targetUser.username : 'All users', inline: true },
                    { name: '🎯 Action Filter', value: actionFilter || 'All actions', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Saint Toadle Moderation System' });

            await message.channel.send({ embeds: [successEmbed], files: [attachment] });

            setTimeout(async () => {
                try {
                    await fs.unlink(tempFilePath);
                } catch (error) {
                    console.error('Error cleaning up temp file:', error);
                }
            }, 30000);

        } catch (error) {
            console.error('Error in exportlogs command:', error);
            await message.reply('❌ An error occurred while exporting logs. Please try again.');
        }
    }
};