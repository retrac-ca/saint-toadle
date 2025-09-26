/**
 * Claim Invite Command - Manual Referral Claiming
 * 
 * Allows new members to manually claim referral bonuses by providing invite codes.
 * This is the fallback method when automatic tracking fails.
 */

const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const logger = require('../../utils/logger');

module.exports = {
    name: 'claiminvite',
    description: 'Claim referral bonus by providing the invite code you used',
    aliases: ['claim', 'claimref', 'ref'],
    usage: '!claiminvite <invite_code>',
    category: 'referral',
    cooldown: 60,
    
    async execute(message, args, client) {
        try {
            // Check if invite code is provided
            if (!args[0]) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Missing Invite Code')
                    .setDescription('Please provide the invite code you used to join this server.')
                    .addFields({
                        name: '📝 Usage',
                        value: `\`${client.config.prefix}claiminvite <invite_code>\``,
                        inline: false
                    })
                    .addFields({
                        name: '💡 Example',
                        value: '`!claiminvite abc123`',
                        inline: false
                    })
                    .addFields({
                        name: '❓ How to find your invite code',
                        value: 'The invite code is the part after `discord.gg/` in the invite link.\nFor example, if the link was `https://discord.gg/abc123`, the code is `abc123`.',
                        inline: false
                    })
                    .setFooter({ text: 'Saint Toadle Referral System' });
                
                return await message.reply({ embeds: [embed] });
            }

            const inviteCode = args[0].trim();
            const claimerId = message.author.id;

            // Process the referral claim
            const result = dataManager.processReferralClaim(inviteCode, claimerId);

            if (!result.success) {
                let errorEmbed;

                switch (result.reason) {
                    case 'already_claimed':
                        errorEmbed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('❌ Already Claimed')
                            .setDescription('You have already claimed a referral bonus! Each user can only claim one referral reward.')
                            .addFields({
                                name: '💡 Still want to help?',
                                value: `You can still support the community by using \`${client.config.prefix}give\` to share coins with others!`,
                                inline: false
                            });
                        break;

                    case 'invalid_code':
                        errorEmbed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('❌ Invalid Invite Code')
                            .setDescription('This invite code is not registered or does not exist.')
                            .addFields({
                                name: '❓ Possible reasons',
                                value: '• The invite code was typed incorrectly\n• The invite has not been registered yet\n• The invite has expired or been deleted',
                                inline: false
                            })
                            .addFields({
                                name: '💡 What to do',
                                value: `Ask the person who invited you to register their invite using \`${client.config.prefix}reginvurl\``,
                                inline: false
                            });
                        break;

                    case 'self_referral':
                        errorEmbed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('❌ Self-Referral Not Allowed')
                            .setDescription('You cannot refer yourself! Nice try though 😉')
                            .addFields({
                                name: '💡 Tip',
                                value: 'Invite your friends to earn referral bonuses when they join and claim!',
                                inline: false
                            });
                        break;

                    default:
                        errorEmbed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('❌ Claim Failed')
                            .setDescription(result.message || 'Unable to process referral claim.');
                }

                return await message.reply({ embeds: [errorEmbed] });
            }

            // Success! Create celebration embed
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎉 Referral Claimed Successfully!')
                .setDescription(`Thank you for joining through a referral! Your inviter has been rewarded.`)
                .addFields(
                    {
                        name: '💰 Reward Given',
                        value: `${result.bonus.toLocaleString()} coins`,
                        inline: true
                    },
                    {
                        name: '🎯 Invite Code',
                        value: `\`${inviteCode}\``,
                        inline: true
                    }
                )
                .addFields({
                    name: '🌟 What\'s Next?',
                    value: `• Use \`${client.config.prefix}earn\` to start earning your own coins!\n• Use \`${client.config.prefix}balance\` to check your current balance\n• Use \`${client.config.prefix}help\` to see all available commands`,
                    inline: false
                })
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setFooter({ 
                    text: 'Welcome to Saint Toadle Economy!',
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            await message.reply({ embeds: [successEmbed] });

            // Try to notify the inviter
            try {
                const inviterUser = await client.users.fetch(result.inviterId);
                const notificationEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('🎊 Referral Bonus Earned!')
                    .setDescription(`${message.author.username} just claimed your referral!`)
                    .addFields(
                        {
                            name: '💰 Bonus Earned',
                            value: `${result.bonus.toLocaleString()} coins`,
                            inline: true
                        },
                        {
                            name: '👤 Referred User',
                            value: message.author.username,
                            inline: true
                        }
                    )
                    .addFields({
                        name: '🏦 Check Your Balance',
                        value: `Use \`${client.config.prefix}balance\` to see your updated balance!`,
                        inline: false
                    })
                    .setFooter({ text: `From ${message.guild.name}` })
                    .setTimestamp();

                await inviterUser.send({ embeds: [notificationEmbed] });
                logger.debug(`📧 Sent referral notification to ${inviterUser.tag}`);

            } catch (dmError) {
                logger.debug(`⚠️ Could not send referral notification: ${dmError.message}`);
            }

            // Send celebration message in the channel
            const celebrationMessages = [
                '🎉 Another successful referral!',
                '🌟 The community is growing!',
                '💫 Great job spreading the word!',
                '🎊 Welcome to the family!',
                '✨ Referral power activated!'
            ];

            const randomCelebration = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
            
            try {
                await message.channel.send(randomCelebration);
            } catch (channelError) {
                logger.debug(`⚠️ Could not send celebration message: ${channelError.message}`);
            }
            
        } catch (error) {
            logger.logError('Claim invite command execution', error, {
                claimer: message.author.id,
                inviteCode: args[0]
            });
            
            await message.reply('❌ An error occurred while processing your referral claim. Please try again later.');
        }
    }
};