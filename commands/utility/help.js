/**
 * Help Command - Display Bot Commands and Information
 * 
 * Shows all available commands organized by category with descriptions and usage examples.
 * Supports both general help and specific command help.
 */

const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');

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
            
            // If a specific command is requested
            if (args[0]) {
                const commandName = args[0].toLowerCase();
                const command = client.commands.get(commandName) || 
                               client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
                
                if (!command) {
                    return await message.reply(`❌ Command \`${commandName}\` not found!`);
                }
                
                // Create detailed command help embed
                const commandEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`📚 Command: ${command.name}`)
                    .setDescription(command.description || 'No description available')
                    .addFields({
                        name: '📝 Usage',
                        value: `\`${command.usage || `${prefix}${command.name}`}\``,
                        inline: false
                    });
                
                if (command.aliases && command.aliases.length > 0) {
                    commandEmbed.addFields({
                        name: '🔗 Aliases',
                        value: command.aliases.map(alias => `\`${prefix}${alias}\``).join(', '),
                        inline: true
                    });
                }
                
                if (command.cooldown) {
                    const cooldownText = command.cooldown >= 3600 
                        ? `${Math.floor(command.cooldown / 3600)} hour${Math.floor(command.cooldown / 3600) > 1 ? 's' : ''}`
                        : command.cooldown >= 60 
                            ? `${Math.floor(command.cooldown / 60)} minute${Math.floor(command.cooldown / 60) > 1 ? 's' : ''}`
                            : `${command.cooldown} second${command.cooldown > 1 ? 's' : ''}`;
                    
                    commandEmbed.addFields({
                        name: '⏱️ Cooldown',
                        value: cooldownText,
                        inline: true
                    });
                }
                
                if (command.permissions && command.permissions.length > 0) {
                    commandEmbed.addFields({
                        name: '🔒 Required Permissions',
                        value: command.permissions.join(', '),
                        inline: false
                    });
                }
                
                commandEmbed.addFields({
                    name: '📂 Category',
                    value: command.category || 'General',
                    inline: true
                });
                
                commandEmbed.setFooter({ 
                    text: `Saint Toadle Bot • Use ${prefix}help for all commands`,
                    iconURL: client.user.displayAvatarURL()
                });
                
                return await message.reply({ embeds: [commandEmbed] });
            }
            
            // General help - show all commands organized by category
            const commandHandler = require('../../handlers/commandHandler');
            const categories = commandHandler.getCommandsByCategory();
            
            const helpEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🤖 Saint Toadle Bot - Command List')
                .setDescription(`Use \`${prefix}help <command>\` for detailed information about a specific command.`)
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ 
                    text: `Prefix: ${prefix} • Total Commands: ${client.commands.size}`,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();
            
            // Add commands by category
            for (const [categoryName, commands] of Object.entries(categories)) {
                if (commands.length === 0) continue;
                
                // Get category emoji
                const categoryEmojis = {
                    economy: '💰',
                    referral: '🎯',
                    moderation: '🛡️',
                    utility: '🔧',
                    general: '📚'
                };
                
                const emoji = categoryEmojis[categoryName] || '📁';
                const categoryTitle = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
                
                // Create command list for this category
                const commandList = commands
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(cmd => `\`${cmd.name}\``)
                    .join(' • ');
                
                helpEmbed.addFields({
                    name: `${emoji} ${categoryTitle} (${commands.length})`,
                    value: commandList,
                    inline: false
                });
            }
            
            // Add additional information
            helpEmbed.addFields({
                name: '🌟 Key Features',
                value: '• **Economy System**: Earn and trade coins\n• **Referral Rewards**: Invite friends for bonuses\n• **Moderation Tools**: Keep your server safe\n• **Rich Statistics**: Track your progress',
                inline: false
            });
            
            helpEmbed.addFields({
                name: '🎯 Getting Started',
                value: `• Use \`${prefix}earn\` to start earning coins\n• Use \`${prefix}balance\` to check your coins\n• Use \`${prefix}reginvurl\` to register invites\n• Use \`${prefix}leaderboard\` to see top earners`,
                inline: false
            });
            
            helpEmbed.addFields({
                name: '🔗 Links',
                value: '[Support Server](https://discord.gg/yoursupport) • [Documentation](https://github.com/yourusername/saint-toadle) • [Report Issues](https://github.com/yourusername/saint-toadle/issues)',
                inline: false
            });
            
            await message.reply({ embeds: [helpEmbed] });
            
        } catch (error) {
            logger.logError('Help command execution', error, {
                user: message.author.id,
                requestedCommand: args[0]
            });
            
            await message.reply('❌ An error occurred while displaying help information.');
        }
    }
};