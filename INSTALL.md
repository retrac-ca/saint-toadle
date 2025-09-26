# Installation and Setup Instructions for Saint Toadle Discord Bot

## Prerequisites

Before setting up the bot, ensure you have the following installed:

- **Node.js** (v16.0.0 or higher)
  - Download from: https://nodejs.org/
  - Verify installation: `node --version`
- **npm** (usually comes with Node.js)
  - Verify installation: `npm --version`
- **Git** (optional, for cloning the repository)
  - Download from: https://git-scm.com/

## Step-by-Step Installation

### 1. Download/Clone the Project

**Option A: Download ZIP**
- Download the project files to your desired location
- Extract the ZIP file
- Navigate to the extracted folder

**Option B: Git Clone**
```bash
git clone https://github.com/yourusername/saint-toadle.git
cd saint-toadle
```

### 2. Install Dependencies

Open a terminal/command prompt in the project directory and run:

```bash
npm install
```

This will install all required packages listed in `package.json`.

### 3. Configure Environment Variables

1. Copy the `.env` file template (it should already exist in the project)
2. The bot token is already configured in the `.env` file
3. You can modify other settings as needed:

```env
# Bot Configuration
DISCORD_TOKEN=MTQyMTE2MjgyNTU4NTUyODg1NQ.GAV8gr.KujmzQ3Qay3gUAbOgmQ41Au1VCDBle06q4d-KY
PREFIX=!
BOT_NAME=Saint Toadle
DEBUG_MODE=true

# Economy Settings
DAILY_EARN_MIN=1
DAILY_EARN_MAX=50
REFERRAL_BONUS=50

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true
```

### 4. Test the Bot

Start the bot to make sure everything is working:

```bash
npm start
```

You should see output similar to:
```
🚀 Starting Saint Toadle Discord Bot...
🔧 Debug Mode: ON
💰 Earn Range: 1-50 coins
🎯 Referral Bonus: 50 coins
📚 Commands loaded successfully
🎉 Saint Toadle#8372 is now online!
📊 Serving 1 servers
👥 Watching X users
💾 Data manager initialized
🎯 Invite tracker initialized
✅ All systems initialized successfully!
```

### 5. Stop the Bot

To stop the bot, press `Ctrl+C` in the terminal.

## File Structure Overview

After installation, your project should have this structure:

```
saint-toadle/
├── commands/           # All bot commands organized by category
│   ├── economy/       # Economy commands (balance, earn, give, etc.)
│   ├── moderation/    # Moderation commands (clear, ban, etc.)
│   ├── referral/      # Referral commands (reginvurl, claiminvite)
│   └── utility/       # Utility commands (help, ping, etc.)
├── handlers/          # Command and event handlers
├── utils/             # Utility modules (logger, dataManager, etc.)
├── data/              # Data storage (created automatically)
├── logs/              # Log files (created automatically)
├── node_modules/      # Dependencies (created by npm install)
├── index.js           # Main bot file
├── package.json       # Project configuration and dependencies
├── .env               # Environment variables
└── README.md          # Project documentation
```

## Running the Bot

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**
   - Make sure you ran `npm install`
   - Check that you're in the correct directory

2. **"Invalid token" error**
   - Verify the bot token in the `.env` file
   - Make sure there are no extra spaces

3. **Permission errors**
   - Ensure the bot has the necessary permissions on your Discord server
   - Check that the bot role is positioned correctly in the server hierarchy

4. **Commands not working**
   - Make sure the bot is online and in your server
   - Check that you're using the correct prefix (default: `!`)
   - Verify the bot has permission to read messages and send messages

### Getting Help

1. **Check the logs:**
   - Look in the `logs/` directory for error logs
   - Enable debug mode in `.env` for more detailed logging

2. **Console output:**
   - The terminal where the bot is running shows real-time information
   - Look for error messages or warnings

3. **Test basic functionality:**
   - Try `!ping` to test if the bot is responding
   - Try `!help` to see all available commands

## Bot Permissions Required

Make sure your bot has these permissions on your Discord server:

### Essential Permissions:
- **Send Messages** - To respond to commands
- **Read Message History** - To process commands
- **Embed Links** - For rich embeds
- **Attach Files** - For logs and data export

### Moderation Permissions (if using moderation commands):
- **Manage Messages** - For clear/purge commands
- **Kick Members** - For kick command
- **Ban Members** - For ban command

### Invite Tracking Permissions:
- **Manage Server** - To fetch invite information
- **Create Instant Invite** - For invite validation

## Next Steps

1. **Test all features:**
   - Try earning coins with `!earn`
   - Check your balance with `!balance`
   - Register an invite with `!reginvurl`
   - Test referral claiming with `!claiminvite`

2. **Customize settings:**
   - Adjust earn amounts in `.env`
   - Modify referral bonuses as needed
   - Set up moderation log channels

3. **Monitor the bot:**
   - Check logs regularly
   - Monitor performance with `!ping`
   - Use debug mode for troubleshooting

The bot should now be fully operational and ready to use! 🎉