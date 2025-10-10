// utils/interestScheduler.js

const dataManager = require('./dataManager');
const configManager = require('./managers/configManager');

let botClient;

function setupDailyInterestTask(client) {
  botClient = client;
  applyInterestDaily();
  setInterval(applyInterestDaily, 24 * 60 * 60 * 1000); // every 24 hours
}

async function applyInterestDaily() {
  try {
    const guilds = botClient.guilds.cache;
    let totalInterestApplied = 0;
    let totalAccountsProcessed = 0;

    for (const guild of guilds.values()) {
      const guildId = guild.id;
      const guildConfig = configManager.getConfig(guildId);

      // Default to 2% if not set
      const interestRate = guildConfig?.economy?.bank_interest_rate ?? 0.02;

      // Notification channel config
      const notificationChannelId =
        guildConfig?.channels?.interest_notification ||
        guildConfig?.channels?.reminderChannelId ||
        guildConfig?.channels?.logs_channel;

      // Apply interest and await result
      const { totalInterest, accountsWithInterest } =
        await dataManager.applyBankInterest(interestRate, guildId);

      totalInterestApplied += totalInterest;
      totalAccountsProcessed += accountsWithInterest;

      console.log(
        `Applied interest: ${totalInterest} coins to ${accountsWithInterest} accounts in ${guild.name}.`
      );

      // Send notification to channel if configured
      if (notificationChannelId) {
        try {
          const channel = await botClient.channels.fetch(notificationChannelId);
          if (channel?.send) {
            const message = accountsWithInterest > 0
              ? `💰 Daily bank interest applied: ${totalInterest} coins added to ${accountsWithInterest} users (${(interestRate * 100).toFixed(0)}% rate).`
              : `💤 Daily bank interest: No interest applied (${(interestRate * 100).toFixed(0)}% rate).`;
            await channel.send(message);
          }
        } catch (sendError) {
          console.warn(`⚠️ Could not send interest notification in ${guild.name}: ${sendError.message}`);
        }
      }
    }

    await dataManager.saveAll();
    console.log(
      `Total interest applied: ${totalInterestApplied} coins to ${totalAccountsProcessed} accounts across ${guilds.size} guilds.`
    );
  } catch (error) {
    console.error('Failed to apply daily interest:', error);
  }
}

module.exports = { setupDailyInterestTask };
