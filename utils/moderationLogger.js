const fs = require('fs').promises;
const path = require('path');
const { EmbedBuilder } = require('discord.js');

class ModerationLogger {
    constructor() {
        this.logsPath = path.join(__dirname, '../data/moderation_logs.json');
    }

    async logAction(guild, action, target, moderator, reason, additionalData = {}) {
        try {
            // Load existing logs
            let logsData = {};
            try {
                const data = await fs.readFile(this.logsPath, 'utf8');
                logsData = JSON.parse(data);
            } catch {
                logsData = {};
            }

            // Initialize guild logs
            if (!logsData[guild.id]) {
                logsData[guild.id] = [];
            }

            // Create log entry
            const entry = {
                id: Date.now().toString(),
                action,
                target: {
                    id: target.id,
                    username: target.username,
                    tag: target.tag
                },
                moderator: {
                    id: moderator.id,
                    username: moderator.username,
                    tag: moderator.tag
                },
                reason,
                timestamp: new Date().toISOString(),
                guild: guild.id,
                ...additionalData
            };

            logsData[guild.id].push(entry);

            // Keep only last MAX_LOGS_PER_GUILD entries
            const max = parseInt(process.env.MAX_LOGS_PER_GUILD) || 1000;
            if (logsData[guild.id].length > max) {
                logsData[guild.id] = logsData[guild.id].slice(-max);
            }

            await fs.writeFile(this.logsPath, JSON.stringify(logsData, null, 2));

            await this.sendToLogChannel(guild, entry);
            return entry;

        } catch (err) {
            console.error('Error in ModerationLogger.logAction:', err);
            throw err;
        }
    }

    async sendToLogChannel(guild, logEntry) {
        try {
            const names = process.env.MOD_LOG_CHANNEL_NAME
                ? [process.env.MOD_LOG_CHANNEL_NAME]
                : ['mod-logs','modlogs','moderation-logs','logs','audit-logs'];
            let channel = null;
            for (const name of names) {
                channel = guild.channels.cache.find(c =>
                    c.name.toLowerCase() === name.toLowerCase() && c.type === 0
                );
                if (channel) break;
            }
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle('📋 Moderation Log')
                .setColor(this.getColor(logEntry.action))
                .addFields(
                    { name: 'Action', value: logEntry.action, inline: true },
                    { name: 'Target', value: `${logEntry.target.username} (${logEntry.target.id})`, inline: true },
                    { name: 'Moderator', value: `${logEntry.moderator.username} (${logEntry.moderator.id})`, inline: true },
                    { name: 'Reason', value: logEntry.reason, inline: false }
                )
                .setTimestamp(new Date(logEntry.timestamp))
                .setFooter({ text: `Log ID: ${logEntry.id}` });

            if (logEntry.warningId) {
                embed.addFields({ name: 'Warning ID', value: logEntry.warningId, inline: true });
            }
            if (logEntry.duration) {
                embed.addFields({ name: 'Duration', value: logEntry.duration, inline: true });
            }

            await channel.send({ embeds: [embed] });
        } catch (err) {
            console.error('Error sending moderation log to channel:', err);
        }
    }

    getColor(action) {
        const map = {
            'WARNING': 0xFF6B35,
            'AUTO_BAN': 0xFF0000,
            'BAN': 0xFF0000,
            'KICK': 0xFFA500,
            'MUTE': 0xFFFF00,
            'UNMUTE': 0x00FF00,
            'WARNING_REMOVED': 0x00FF00
        };
        return map[action] || 0x808080;
    }

    async getLogStats(guildId, days = 30) {
        try {
            const raw = await fs.readFile(this.logsPath, 'utf8');
            const data = JSON.parse(raw);
            const list = data[guildId] || [];
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            const recent = list.filter(e => new Date(e.timestamp) >= cutoff);

            return {
                total: recent.length,
                warnings: recent.filter(e => e.action === 'WARNING').length,
                bans: recent.filter(e => e.action === 'BAN' || e.action === 'AUTO_BAN').length,
                kicks: recent.filter(e => e.action === 'KICK').length,
                mutes: recent.filter(e => e.action === 'MUTE').length,
                uniqueUsers: new Set(recent.map(e => e.target.id)).size
            };
        } catch {
            return { total:0, warnings:0, bans:0, kicks:0, mutes:0, uniqueUsers:0 };
        }
    }
}

module.exports = ModerationLogger;