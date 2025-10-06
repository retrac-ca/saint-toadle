const dataManager = require('./dataManager');

const INTEREST_RATE = 0.02; // 2% daily interest
const NOTIFY_CHANNEL_ID = '1000088676979707914'; // updated channel ID

let botClient;

function setupDailyInterestTask(client) {
  botClient = client;
  applyInterestDaily();
  setInterval(applyInterestDaily, 86400000); // every 24 hours
}

async function applyInterestDaily() {
  try {
    const result = await dataManager.applyBankInterest(INTEREST_RATE);
    await dataManager.saveAll();
    console.log(
      `Applied interest: ${result.totalInterest} coins to ${result.accountsWithInterest} accounts.`
    );

    if (botClient) {
      try {
        const channel = await botClient.channels.fetch(NOTIFY_CHANNEL_ID);
        if (channel && typeof channel.send === 'function') {
          await channel.send(
            `💰 Daily bank interest applied: ${result.totalInterest} coins added to ${result.accountsWithInterest} users.`
          );
        }
      } catch (sendError) {
        console.warn(
          `⚠️ Could not send interest notification in channel ${NOTIFY_CHANNEL_ID}: ${sendError.code || sendError.message}`
        );
      }
    }
  } catch (error) {
    console.error('Failed to apply daily interest:', error);
  }
}

module.exports = { setupDailyInterestTask };
