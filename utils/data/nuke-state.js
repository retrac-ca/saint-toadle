const fs = require('fs');
const path = require('path');

// Now go up from utils → project root → data
const STATE_FILE = path.join(__dirname, '..', 'data', 'nuke-state.json');

let state = {};
if (fs.existsSync(STATE_FILE)) {
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    state = {};
  }
}

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

module.exports = {
  isPending(guildId) {
    return Boolean(state[guildId]);
  },
  setPending(guildId, userId) {
    state[guildId] = { requestedBy: userId, timestamp: Date.now() };
    saveState();
  },
  clearPending(guildId) {
    delete state[guildId];
    saveState();
  },
  getRequester(guildId) {
    return state[guildId]?.requestedBy;
  }
};
