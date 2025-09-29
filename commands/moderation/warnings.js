const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    name: 'warnings',
    description: 'View warnings for a user',
    usage: '!warnings [@user]',
    permissions: PermissionFlagsBits.KickMembers,

    async execute(message, args) {
        const guild = message.guild;
        const author = message.author;

        if (!message.member.permissions.has(this.permissions)) {
            return message.reply('❌ You do not have permission to use this command.');
        }

        let targetUser = author;

        if (args.length > 0) {
            const mentionedUser = message.mentions.users.first();
            if (mentionedUser) {
                targetUser = mentionedUser;
            } else {
                return message.reply('❌ Please mention a valid user to view warnings for.');
            }
        }

        try {
            const warningsPath = path.join(__dirname, '../../data/warnings.json');
            let warningsData = {};
            try {
                const data = await fs.readFile(warningsPath, 'utf8');
                warningsData = JSON.parse(data);
            } catch {
                warningsData = {};
            }

            if (!warningsData[guild.id] || !warningsData[guild.id][targetUser.id] || warningsData[guild.id][targetUser.id].warnings.length === 0) {
                return message.reply(`✅ **${targetUser.username}** has no warnings in this server.`);
            }

            const userWarnings = warningsData[guild.id][targetUser.id];
            const warnings = userWarnings.warnings;

            const embed = new EmbedBuilder()
                .setColor(0xff6b35)
                .setTitle(`⚠️ Warnings for ${targetUser.username}`)
                .setDescription(`**Total Warnings:** ${userWarnings.totalWarnings}`)
                .setFooter({ text: 'Saint Toadle Moderation System' })
                .setTimestamp();

            const recentWarnings = warnings.slice(-10).reverse();
            recentWarnings.forEach((warn, i) => {
                const date = new Date(warn.timestamp).toLocaleString();
                embed.addFields({
                    name: `Warning #${warnings.length - i} (ID: ${warn.id})`,
                    value: `**Reason:** ${warn.reason}\n**Moderator:** ${warn.moderator.username}\n**Date:** ${date}`,
                });
            });

            if (warnings.length > 10) {
                embed.setDescription(embed.data.description + '\n*(Showing 10 most recent warnings)*');
            }

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error fetching warnings:', error);
            await message.reply('❌ An error occurred while fetching warnings.');
        }
    },
};
