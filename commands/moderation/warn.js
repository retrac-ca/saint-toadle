const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const ModerationLogger = require('../../utils/ModerationLogger');

module.exports = {
    name: 'warn',
    description: 'Issue a warning to a user',
    usage: '!warn @user reason',
    permissions: [PermissionFlagsBits.KickMembers],

    async execute(message, args) {
        const guild = message.guild;
        const moderator = message.member;

        if (!moderator.permissions.has(this.permissions)) {
            return message.reply('❌ You do not have permission to use this command.');
        }

        if (args.length === 0) {
            return message.reply('❌ Please mention a user to warn.');
        }

        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('❌ Invalid user mention.');
        }
        if (targetUser.bot) {
            return message.reply('❌ You cannot warn bots.');
        }
        if (targetUser.id === message.author.id) {
            return message.reply('❌ You cannot warn yourself.');
        }

        const targetMember = await guild.members.fetch(targetUser.id);
        if (!targetMember) {
            return message.reply('❌ User not found in this server.');
        }
        if (targetMember.roles.highest.position >= moderator.roles.highest.position && guild.ownerId !== message.author.id) {
            return message.reply('❌ You cannot warn someone with an equal or higher role.');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            const warningsPath = path.join(__dirname, '../../data/warnings.json');
            let warningsData = {};
            try {
                const data = await fs.readFile(warningsPath, 'utf8');
                warningsData = JSON.parse(data);
            } catch {
                warningsData = {};
            }

            if (!warningsData[guild.id]) warningsData[guild.id] = {};
            if (!warningsData[guild.id][targetUser.id]) {
                warningsData[guild.id][targetUser.id] = {
                    warnings: [],
                    totalWarnings: 0,
                };
            }

            const warningId = Date.now().toString();
            const warning = {
                id: warningId,
                reason: reason,
                moderator: {
                    id: message.author.id,
                    username: message.author.username,
                },
                timestamp: new Date().toISOString(),
                guild: guild.id,
            };

            warningsData[guild.id][targetUser.id].warnings.push(warning);
            warningsData[guild.id][targetUser.id].totalWarnings++;

            await fs.writeFile(warningsPath, JSON.stringify(warningsData, null, 2));

            const warnEmbed = new EmbedBuilder()
                .setColor(0xff6b35)
                .setTitle('⚠️ User Warning')
                .setDescription(`**${targetUser.username}** has been warned`)
                .addFields(
                    { name: '📋 Reason', value: reason },
                    { name: '👮 Moderator', value: message.author.tag, inline: true },
                    { name: '📊 Total Warnings', value: warningsData[guild.id][targetUser.id].totalWarnings.toString(), inline: true },
                    { name: '🆔 Warning ID', value: warningId, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Saint Toadle Moderation System' });

            await message.channel.send({ embeds: [warnEmbed] });

            try {
                await targetUser.send({ embeds: [warnEmbed] });
            } catch { /* Ignore DM failures */ }

            // Log the moderation action using ModerationLogger utility
            const logger = new ModerationLogger();
            await logger.logAction(guild, 'WARNING', targetUser, message.author, reason, { warningId });

        } catch (error) {
            console.error('Error in warn command:', error);
            await message.reply('❌ An error occurred while issuing the warning.');
        }
    },
};