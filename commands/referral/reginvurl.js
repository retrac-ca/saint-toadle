/**
 * Register Invite URL Command - Register Invite for Tracking
 * 
 * Allows users to register Discord invite URLs/codes for referral tracking.
 * Validates invite codes and prevents duplicate registrations.
 */

const { EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const logger = require('../../utils/logger');

module.exports = {
    name: 'reginvurl',
    description: 'Register an invite URL/code for referral tracking',
    aliases: ['reginvite', 'register', 'reg'],
    usage: '!reginvurl <invite_url_or_code>',
    category: 'referral',
    cooldown: 30,
    
    async execute(message, args, client) {
        try {
            // Check if invite URL/code is provided
            if (!args[0]) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Missing Invite Code')
                    .setDescription('Please provide an invite URL or code to register.')
                    .addFields({
                        name: '📝 Usage',
                        value: `\`${client.config.prefix}reginvurl <invite_url_or_code>\``,
                        inline: false
                    })
                    .addFields({
                        name: '💡 Examples',
                        value: '`!reginvurl https://discord.gg/abc123`\n`!reginvurl abc123`',
                        inline: false
                    })
                    .setFooter({ text: 'Saint Toadle Referral System' });
                
                return await message.reply({ embeds: [embed] });
            }

            // Extract invite code from URL or use direct code
            let inviteCode = args[0];
            
            // Handle discord.gg URLs
            if (inviteCode.includes('discord.gg/')) {
                const match = inviteCode.match(/discord\.gg\/([a-zA-Z0-9]+)/);
                if (match) {
                    inviteCode = match[1];
                } else {
                    return await message.reply('❌ Invalid Discord invite URL format!');
                }
            }
            
            // Handle discord.com/invite URLs
            if (inviteCode.includes('discord.com/invite/')) {
                const match = inviteCode.match(/discord\.com\/invite\/([a-zA-Z0-9]+)/);
                if (match) {
                    inviteCode = match[1];
                } else {
                    return await message.reply('❌ Invalid Discord invite URL format!');
                }
            }

            // Basic validation for invite code format
            if (!/^[a-zA-Z0-9]+$/.test(inviteCode) || inviteCode.length < 2 || inviteCode.length > 20) {
                return await message.reply('❌ Invalid invite code format! Invite codes should only contain letters and numbers.');
            }

            // Check if invite is already registered
            if (dataManager.isInviteRegistered(inviteCode)) {
                const currentOwner = dataManager.getInviteOwner(inviteCode);
                
                // Check if current user is trying to register their own invite again
                if (currentOwner === message.author.id) {
                    return await message.reply('❌ You have already registered this invite code!');
                }
                
                return await message.reply('❌ This invite code is already registered by another user!');
            }

            // Optional: Validate that the invite actually exists and belongs to this guild
            try {
                const invite = await client.fetchInvite(inviteCode);
                
                // Check if invite belongs to the current guild
                if (invite.guild?.id !== message.guild.id) {
                    return await message.reply('❌ This invite code is not for this server!');
                }
                
                // Check if the user has permission to use this invite
                // (This is optional - you might want to allow any valid invite)
                logger.debug(`✅ Validated invite: ${inviteCode} for guild ${invite.guild.name}`);
                
            } catch (inviteError) {
                // Invite validation failed - could be expired, invalid, or from another guild
                logger.debug(`⚠️ Could not validate invite ${inviteCode}: ${inviteError.message}`);
                
                // For now, we'll still allow registration but warn the user
                const warningEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⚠️ Invite Validation Warning')
                    .setDescription('The invite code could not be validated (it might be expired or from another server). It will still be registered, but may not work properly.')
                    .addFields({
                        name: '❓ Do you want to continue?',
                        value: 'React with ✅ to continue or ❌ to cancel',
                        inline: false
                    });
                
                const warningMessage = await message.reply({ embeds: [warningEmbed] });
                
                // Add reactions for user choice
                await warningMessage.react('✅');
                await warningMessage.react('❌');
                
                // Wait for user reaction
                const filter = (reaction, user) => {
                    return ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
                };
                
                try {
                    const collected = await warningMessage.awaitReactions({
                        filter,
                        max: 1,
                        time: 30000,
                        errors: ['time']
                    });
                    
                    const reaction = collected.first();
                    if (reaction.emoji.name === '❌') {
                        await warningMessage.edit({ 
                            embeds: [new EmbedBuilder().setColor('#ff0000').setTitle('❌ Registration Cancelled')] 
                        });
                        return;
                    }
                    
                } catch (reactionError) {
                    await warningMessage.edit({ 
                        embeds: [new EmbedBuilder().setColor('#ff0000').setTitle('❌ Registration Timed Out')] 
                    });
                    return;
                }
            }

            // Register the invite
            dataManager.registerInvite(inviteCode, message.author.id);

            // Get user's total registered invites
            const userInvites = dataManager.getUserInvites(message.author.id);

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Invite Registered Successfully!')
                .setDescription(`Your invite code has been registered for referral tracking.`)
                .addFields(
                    {
                        name: '🎯 Invite Code',
                        value: `\`${inviteCode}\``,
                        inline: true
                    },
                    {
                        name: '👤 Owner',
                        value: `${message.author}`,
                        inline: true
                    },
                    {
                        name: '📊 Your Total Invites',
                        value: `${userInvites.length} registered`,
                        inline: true
                    }
                )
                .addFields({
                    name: '💰 How Referrals Work',
                    value: `When someone joins using your invite and uses \`${client.config.prefix}claiminvite ${inviteCode}\`, you'll earn **${client.config.referralBonus} coins**!`,
                    inline: false
                })
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setFooter({ 
                    text: 'Share your invite and earn rewards!',
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            // Log the registration
            logger.logReferral('register', message.author.id, null, inviteCode, `Total user invites: ${userInvites.length}`);
            
        } catch (error) {
            logger.logError('Register invite URL command execution', error, {
                user: message.author.id,
                inviteInput: args[0]
            });
            
            await message.reply('❌ An error occurred while registering your invite. Please try again later.');
        }
    }
};