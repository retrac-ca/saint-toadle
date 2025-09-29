const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    name: 'removewarn',
    description: 'Remove a warning from a user',
    usage: '!removewarn @user warningID',
    permissions: [PermissionFlagsBits.KickMembers],

    async execute(message, args) {
        const guild = message.guild;
        const moderator = message.member;

        if (!moderator.permissions.has(this.permissions)) {
            return message.reply('❌ You do not have permission to use this command.');
        }

        if (args.length < 2) {
            return message.reply('❌ Please specify a user and warning ID. Usage: !removewarn @user warningID');
        }

        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('❌ Invalid or missing user mention.');
        }

        const warningId = args[1];

        try {
            const warningsPath = path.join(__dirname, '../../data/warnings.json');
            let warningsData = {};
            try {
                const data = await fs.readFile(warningsPath, 'utf8');
                warningsData = JSON.parse(data);
            } catch {
                return message.reply('❌ No warnings data found.');
            }

            if (!warningsData[guild.id] || !warningsData[guild.id][targetUser.id]) {
                return message.reply('❌ This user has no warnings in this server.');
            }

            const userWarnings = warningsData[guild.id][targetUser.id];
            const warningIndex = userWarnings.warnings.findIndex(w => w.id === warningId);

            if (warningIndex === -1) {
                return message.reply('❌ Warning ID not found.');
            }

            const removedWarning = userWarnings.warnings.splice(warningIndex, 1)[0];
            userWarnings.totalWarnings = Math.max(0, userWarnings.totalWarnings - 1);

            if (userWarnings.warnings.length === 0) {
                delete warningsData[guild.id][targetUser.id];
            }

            await fs.writeFile(warningsPath, JSON.stringify(warningsData, null, 2));

            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Warning Removed')
                .setDescription(`Successfully removed warning ID **${warningId}** from **${targetUser.username}**`)
                .addFields(
                    { name: 'Reason', value: removedWarning.reason || 'No reason provided' },
                    { name: 'Remaining Warnings', value: userWarnings.totalWarnings.toString() }
                )
                .setTimestamp()
                .setFooter({ text: 'Saint Toadle Moderation System' });

            await message.channel.send({ embeds: [successEmbed] });

            // Add logModerationAction here if you have logging utilities.

        } catch (error) {
            console.error('Error removing warning:', error);
            await message.reply('❌ An error occurred while removing the warning.');
        }
    }
};
