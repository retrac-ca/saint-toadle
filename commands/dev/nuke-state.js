// Shared state for nuke operations
const pendingNukes = new Map(); // guildId → { timeoutID, initiatorId }

module.exports = pendingNukes;
