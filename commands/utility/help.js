// commands/utility/help.js

const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { getCommandsByCategory } = require('../../handlers/commandHandler');

module.exports = {
    name: 'help',
    description: 'Display all available commands or get help for a specific command',
    aliases: ['h', 'commands', 'cmd'],
    usage: '!help [command]',
    category: 'utility',
    cooldown: 5,
    dmAllowed: true,

    async execute(message, args, client) {
        try {
            const prefix = client.config.prefix;

            // Specific command help
            if (args[0]) {
                const name = args[0].toLowerCase();
                const cmd = client.commands.get(name) 
                    || client.commands.find(c => c.aliases?.includes(name));
                if (!cmd) {
                    return message.reply(`❌ Command \`${name}\` not found!`);
                }

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`📚 Command: ${cmd.name}`)
                    .setDescription(cmd.description || 'No description available')
                    .addFields(
                        { name: '📝 Usage', value: `\`${cmd.usage || `${prefix}${cmd.name}`}\`` },
                        { name: '📂 Category', value: cmd.category || 'General', inline: true }
                    )
                    .setFooter({ text: `Saint Toadle Bot • Use ${prefix}help`, iconURL: client.user.displayAvatarURL() });

                if (cmd.aliases?.length) {
                    embed.addFields({ name: '🔗 Aliases', value: cmd.aliases.map(a=>`\`${prefix}${a}\``).join(', '), inline: true });
                }
                if (cmd.cooldown) {
                    embed.addFields({ name: '⏱️ Cooldown', value: `${cmd.cooldown}s`, inline: true });
                }
                if (cmd.permissions?.length) {
                    embed.addFields({ name: '🔒 Permissions', value: cmd.permissions.join(', '), inline: false });
                }

                return message.reply({ embeds: [embed] });
            }

            // General help
            const categories = getCommandsByCategory(client.commands);
            const helpEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🤖 Saint Toadle Bot - Command List')
                .setDescription(`Use \`${prefix}help <command>\` for details`)
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter({ text: `Prefix: ${prefix} • Total Commands: ${client.commands.size}` })
                .setTimestamp();

            for (const [cat, cmds] of Object.entries(categories)) {
                helpEmbed.addFields({
                    name: `📂 ${cat.charAt(0).toUpperCase()+cat.slice(1)} (${cmds.length})`,
                    value: cmds.map(c=>`\`${c.name}\``).join(' • '),
                    inline: false
                });
            }

            return message.reply({ embeds: [helpEmbed] });

        } catch (error) {
            logger.logError('Help command execution', error, {
                user: message.author.id,
                args
            });
            return message.reply('❌ An error occurred while displaying help information.');
        }
    }
};
