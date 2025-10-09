const dataManager = require('./dataManager');
const configManager = require('./managers/configManager');

let botClient;

function setupDailyInterestTask(client) {
  botClient = client;
  applyInterestDaily();
  setInterval(applyInterestDaily, 86400000); // every 24 hours
}

async function applyInterestDaily() {
  try {
    // Process each guild separately with their own interest rates
    const guilds = botClient.guilds.cache;
    let totalInterestApplied = 0;
    let totalAccountsProcessed = 0;

    for (const guild of guilds.values()) {
      const guildId = guild.id;
      const guildConfig = configManager.getConfig(guildId);
      const interestRate = guildConfig?.economy?.bank_interest_rate ?? 0.01;

      // Accept old and new channel config naming for notification override
      let notificationChannelId =
        guildConfig?.channels?.interest_notification ||
        guildConfig?.channels?.reminderChannelId ||
        guildConfig?.channels?.logs_channel;

      // Apply interest for this guild only
      const result = await dataManager.applyBankInterestForGuild(guildId, interestRate);
      totalInterestApplied += result.totalInterest;
      totalAccountsProcessed += result.accountsWithInterest;

      console.log(
        `Applied interest: ${result.totalInterest} coins to ${result.accountsWithInterest} accounts in ${guild.name}.`
      );

      // Send notification to configured channel if set
      if (botClient && notificationChannelId && result.accountsWithInterest > 0) {
        try {
          const channel = await botClient.channels.fetch(notificationChannelId);
          if (channel && typeof channel.send === 'function') {
            await channel.send(
              `💰 Daily bank interest applied: ${result.totalInterest} coins added to ${result.accountsWithInterest} users (${Math.round(interestRate * 100)}% rate).`
            );
          } else {
            console.warn(
              `⚠️ Fetched object for channel ${notificationChannelId} in ${guild.name} is not a text channel`
            );
          }
        } catch (sendError) {
          console.warn(
            `⚠️ Could not send interest notification in channel ${notificationChannelId} for guild ${guild.name}: ${sendError.code || sendError.message}`
          );
        }
      }
    }

    await dataManager.saveAll();
    console.log(`Total interest applied: ${totalInterestApplied} coins to ${totalAccountsProcessed} accounts across ${guilds.size} guilds.`);
  } catch (error) {
    console.error('Failed to apply daily interest:', error);
  }
}

module.exports = { setupDailyInterestTask };
