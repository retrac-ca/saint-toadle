/**
 * Give Command - Transfer Coins Between Users
 * 
 * Allows users to give coins to other users.
 * Includes validation for sufficient funds and prevents self-transfers.
 */

const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const logger = require('../../utils/logger');

module.exports = {
    name: 'give',
    description: 'Give coins to another user',
    aliases: ['transfer', 'send', 'pay'],
    usage: '!give @user <amount>',
    category: 'economy',
    cooldown: 5,
    
    async execute(message, args, client) {
        try {
            // Check if user mentioned someone and provided amount
            if (args.length < 2) {
                return await message.reply('❌ Usage: `!give @user <amount>`\nExample: `!give @john 100`');
            }

            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                return await message.reply('❌ Please mention a user to give coins to!');
            }

            // Prevent self-transfers
            if (targetUser.id === message.author.id) {
                return await message.reply('❌ You cannot give coins to yourself!');
            }

            // Prevent giving to bots
            if (targetUser.bot) {
                return await message.reply('❌ You cannot give coins to bots!');
            }

            // Parse and validate amount
            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount <= 0) {
                return await message.reply('❌ Please provide a valid positive amount!');
            }

            // Check if sender has sufficient funds
            const senderBalance = dataManager.getUserBalance(message.author.id);
            if (senderBalance < amount) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Insufficient Funds')
                    .setDescription(`You only have ${senderBalance.toLocaleString()} coins!\nYou need ${amount.toLocaleString()} coins to complete this transfer.`)
                    .setFooter({ text: `Use ${client.config.prefix}earn to earn more coins!` });
                
                return await message.reply({ embeds: [embed] });
            }

            // Perform the transfer
            dataManager.removeFromUserBalance(message.author.id, amount);
            dataManager.addToUserBalance(targetUser.id, amount);

            // Get updated balances
            const newSenderBalance = dataManager.getUserBalance(message.author.id);
            const newReceiverBalance = dataManager.getUserBalance(targetUser.id);

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('💸 Transfer Successful!')
                .setDescription(`${message.author} gave ${amount.toLocaleString()} coins to ${targetUser}`)
                .addFields(
                    {
                        name: '👤 Sender',
                        value: `${message.author.username}\n💰 ${newSenderBalance.toLocaleString()} coins`,
                        inline: true
                    },
                    {
                        name: '👤 Receiver',
                        value: `${targetUser.username}\n💰 ${newReceiverBalance.toLocaleString()} coins`,
                        inline: true
                    },
                    {
                        name: '💰 Amount Transferred',
                        value: `${amount.toLocaleString()} coins`,
                        inline: false
                    }
                )
                .setThumbnail('https://cdn.discordapp.com/emojis/741394314101047378.png')
                .setFooter({ 
                    text: 'Thank you for your generosity!',
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            // Try to notify the receiver via DM
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('💰 You Received Coins!')
                    .setDescription(`${message.author.username} sent you ${amount.toLocaleString()} coins!`)
                    .addFields({
                        name: '🏦 Your New Balance',
                        value: `${newReceiverBalance.toLocaleString()} coins`,
                        inline: true
                    })
                    .setFooter({ text: `From ${message.guild.name}` });

                await targetUser.send({ embeds: [dmEmbed] });
                logger.debug(`📧 Sent transfer notification to ${targetUser.tag}`);
                
            } catch (dmError) {
                logger.debug(`⚠️ Could not send DM notification to ${targetUser.tag}: ${dmError.message}`);
            }

            // Log the transaction
            logger.logTransaction('give', message.author.id, -amount, `To: ${targetUser.id}, Sender new balance: ${newSenderBalance}`);
            logger.logTransaction('receive', targetUser.id, amount, `From: ${message.author.id}, Receiver new balance: ${newReceiverBalance}`);
            
        } catch (error) {
            logger.logError('Give command execution', error, {
                sender: message.author.id,
                receiver: message.mentions.users.first()?.id,
                amount: args[1]
            });
            
            await message.reply('❌ An error occurred while transferring coins. Please try again later.');
        }
    }
};