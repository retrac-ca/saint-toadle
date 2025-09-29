# Saint Toadle Discord Bot

A comprehensive Discord bot with economy, referral tracking, and moderation features.

## Features

- 🏦 **Economy System**: Earn coins with the `!earn` command (random rewards)
- 🎯 **Referral System**: Track invites and reward users for referrals
- 🛡️ **Moderation Tools**: Ban, kick, mute, and other moderation commands
- 📊 **User Statistics**: Balance checking, leaderboards, and more
- 🔧 **Utility Commands**: Server info, user info, and helpful tools
- 📝 **Comprehensive Logging**: File-based logging with timestamps and debug info

## Installation

### Prerequisites
- Node.js 16.0.0 or higher
- npm (comes with Node.js)
- A Discord bot token

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/saint-toadle.git
   cd saint-toadle
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Add your Discord bot token to the `.env` file
   - Adjust other settings as needed

4. **Start the bot:**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

## Commands

### Economy Commands
- `!balance` - Check your current balance
- `!earn` - Earn random coins (1-50)
- `!leaderboard` - View the top earners
- `!give @user <amount>` - Give coins to another user

### Referral Commands
- `!reginvurl <invite_url>` - Register an invite URL for tracking
- `!claiminvite <invite_code>` - Claim referral bonus manually
- `!referrals` - Check your referral stats

### Moderation Commands
- `!ban @user [reason]` - Ban a user
- `!kick @user [reason]` - Kick a user
- `!mute @user [time] [reason]` - Mute a user
- `!unmute @user` - Unmute a user
- `!clear <amount>` - Clear messages

### Utility Commands
- `!help` - Show all available commands
- `!serverinfo` - Display server information
- `!userinfo [@user]` - Display user information
- `!ping` - Check bot latency

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Your Discord bot token | Required |
| `PREFIX` | Command prefix | `!` |
| `DEBUG_MODE` | Enable debug logging | `true` |
| `DAILY_EARN_MIN` | Minimum earn amount | `1` |
| `DAILY_EARN_MAX` | Maximum earn amount | `50` |
| `REFERRAL_BONUS` | Coins awarded for referrals | `50` |

## File Structure

```
saint-toadle/
├── commands/           # Command files
│   ├── economy/       # Economy-related commands
│   ├── moderation/    # Moderation commands
│   ├── referral/      # Referral system commands
│   └── utility/       # Utility commands
├── handlers/          # Event and command handlers
├── utils/             # Utility functions and modules
├── data/              # Data storage (JSON files)
├── logs/              # Log files
├── config/            # Configuration files
├── index.js           # Main bot file
├── package.json       # Dependencies
├── .env               # Environment variables
└── README.md          # This file
```

## Logging

The bot includes comprehensive logging:
- Console output with colored formatting
- File-based logs with rotation
- Error tracking with stack traces
- Debug information for troubleshooting

Log files are stored in the `logs/` directory with timestamps.

## Referral System

The bot supports two methods for referral tracking:

1. **Automatic Detection**: The bot monitors invite usage and automatically awards referrals
2. **Manual Claiming**: New users can use `!claiminvite <code>` to manually claim their referral

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

If you encounter any issues or need help:
1. Check the logs in the `logs/` directory
2. Enable debug mode in `.env`
3. Create an issue on GitHub

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Changelog

### Version 1.0.0
- Initial release
- Economy system with random rewards
- Referral tracking system
- Moderation commands
- Comprehensive logging
- Utility commands


# SAINT TOADLE ROADMAP: 
1. Advanced Economy Features **[IN PROGRESS]**
> Daily/Weekly Bonus: Allow users to claim daily or weekly consistent bonuses. **[COMPLETE]**
> Gambling Games: Implement games like slots, blackjack, or roulette using coins. **[COMPLETE]**
> Trade/Market: Let users trade items or create a virtual marketplace. **[COMPLETE]**
> Bank System: Add deposit/withdraw features with interest or limits. **[COMPLETE]**
> Achievements and Levels: Add experience and levels for engaging users. **[PARKED]**

2. Enhanced Referral System
> Referral Leaderboard: Track top inviters per server and display leaderboards. **[NOT REQUIRED]**
> Referral Goals: Set milestones with extra bonuses. **[PARKED]**
> Invite Link Generation: Allow users to generate custom invite links from the bot. **[NOT REQUIRED]**
> Referral QR Codes: Generate invite QR codes for easy sharing. **[NOT REQUIRED]**

3. More Moderation Tools
> Auto-moderation: Automate detection of spam, links, swear words. **[NOT REQUIRED // Built into Native Discord Server Management]**
> Customizable Warnings: Warning system with history and auto-ban thresholds. **[IN PROGRESS]**
> Moderation Logs: Detailed logs with timestamps, auto-export.
> Role Management: Automate assigning/removing roles based on activity, roles leveling.

4. User Engagement & Community
> Polls and Voting: Interactive polls with reaction votes. **[NOT REQUIRED // Built into Native Discord Server Management]**
> Custom Commands: Let admins create server-specific commands.
> Giveaways: Scheduled or instant giveaways for coins or roles.
> Social Profiles: Extended user profiles and public stats.

5. Integration & Automation
> Integration with APIs: Link with external APIs like game stats, social media.
> Webhook Automation: Announcements from feeds (e.g. news, YouTube).
> Auto Welcome/Goodbye: Customizable welcome images/messages.

6. Performance and Stability
> Database Integration: Move JSON data to SQLite, MongoDB, or PostgreSQL.
> Caching Improvements: Optimize data access for large servers.
> Load Balancing: Support for sharding and distributed setups.