const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    name: 'cleanwarnings',
    description: 'Clean old warnings from the database',
    usage: '!cleanwarnings [days]',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args) {
        const guild = message.guild;
        const author = message.member;

        if (!author.permissions.has(this.permissions)) {
            return message.reply('❌ You do not have permission to use this command.');
        }

        const days = args.length > 0 ? parseInt(args[0]) : 90;
        if (isNaN(days) || days < 1 || days > 365) {
            return message.reply('❌ Days must be a number between 1 and 365.');
        }

        try {
            const warningsPath = path.join(__dirname, '../../data/warnings.json');
            let warningsData = {};
            try {
                const data = await fs.readFile(warningsPath, 'utf8');
                warningsData = JSON.parse(data);
            } catch {
                return message.reply('❌ No warnings data found.');
            }

            if (!warningsData[guild.id]) {
                return message.reply('❌ No warnings found for this server.');
            }

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            let totalRemoved = 0;
            let usersAffected = 0;

            for (const userId in warningsData[guild.id]) {
                const user = warningsData[guild.id][userId];
                const originalCount = user.warnings.length;

                user.warnings = user.warnings.filter(warning =>
                    new Date(warning.timestamp) >= cutoffDate
                );

                const removedCount = originalCount - user.warnings.length;
                if (removedCount > 0) {
                    totalRemoved += removedCount;
                    usersAffected++;

                    user.totalWarnings = user.warnings.length;

                    if (user.warnings.length === 0) {
                        delete warningsData[guild.id][userId];
                    }
                }
            }

            await fs.writeFile(warningsPath, JSON.stringify(warningsData, null, 2));

            const resultEmbed = new EmbedBuilder()
                .setColor(totalRemoved > 0 ? 0x00FF00 : 0x808080)
                .setTitle('🧹 Warning Cleanup Complete')
                .setDescription(`Cleaned warnings older than ${days} days`)
                .addFields(
                    { name: '🗑️ Warnings Removed', value: totalRemoved.toString(), inline: true },
                    { name: '👥 Users Affected', value: usersAffected.toString(), inline: true },
                    { name: '📅 Cutoff Date', value: cutoffDate.toLocaleDateString(), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Saint Toadle Moderation System' });

            if (totalRemoved === 0) {
                resultEmbed.setDescription(`No warnings older than ${days} days found to clean.`);
            }

            await message.channel.send({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('Error in cleanwarnings command:', error);
            await message.reply('❌ An error occurred while cleaning warnings. Please try again.');
        }
    }
};
