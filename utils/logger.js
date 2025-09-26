/**
 * Logger Utility - Comprehensive Logging System
 * 
 * Provides structured logging with multiple levels, file output, and colored console output.
 * Uses Winston logging library for robust log management with file rotation.
 * 
 * Log Levels:
 * - error: Error messages that need immediate attention
 * - warn: Warning messages for potential issues
 * - info: General information messages
 * - debug: Detailed debugging information
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
fs.ensureDirSync(logsDir);

/**
 * Custom log format for better readability
 */
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
        const logMessage = stack || message;
        return `[${timestamp}] ${level.toUpperCase()}: ${logMessage}`;
    })
);

/**
 * Console format with colors for better visibility
 */
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
        const logMessage = stack || message;
        return `[${timestamp}] ${level}: ${logMessage}`;
    })
);

/**
 * Create Winston logger instance with multiple transports
 */
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'saint-toadle' },
    transports: [
        // Console output with colors
        new winston.transports.Console({
            format: consoleFormat,
            level: process.env.DEBUG_MODE === 'true' ? 'debug' : 'info'
        }),
        
        // Error logs to separate file
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        
        // Combined logs to main log file
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 10
        })
    ]
});

/**
 * Add debug transport if in debug mode
 */
if (process.env.DEBUG_MODE === 'true') {
    logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'debug.log'),
        level: 'debug',
        maxsize: 5242880, // 5MB
        maxFiles: 3
    }));
}

/**
 * Command logging helper
 * Logs command execution with user and guild information
 * 
 * @param {Object} message - Discord message object
 * @param {string} commandName - Name of the executed command
 * @param {string} result - Result of command execution
 */
logger.logCommand = (message, commandName, result = 'success') => {
    const user = `${message.author.tag} (${message.author.id})`;
    const guild = message.guild ? `${message.guild.name} (${message.guild.id})` : 'DM';
    
    logger.info(`🎮 Command executed: ${commandName} | User: ${user} | Guild: ${guild} | Result: ${result}`);
};

/**
 * Economy transaction logging
 * Logs economy-related transactions for audit purposes
 * 
 * @param {string} type - Type of transaction (earn, give, spend, etc.)
 * @param {string} userId - User ID involved in transaction
 * @param {number} amount - Amount of currency involved
 * @param {string} details - Additional transaction details
 */
logger.logTransaction = (type, userId, amount, details = '') => {
    logger.info(`💰 Transaction: ${type} | User: ${userId} | Amount: ${amount} | Details: ${details}`);
};

/**
 * Referral system logging
 * Logs referral-related activities
 * 
 * @param {string} action - Action performed (register, claim, reward)
 * @param {string} inviterUserId - User ID of the inviter
 * @param {string} inviteeUserId - User ID of the invitee (if applicable)
 * @param {string} inviteCode - Invite code involved
 * @param {string} details - Additional details
 */
logger.logReferral = (action, inviterUserId, inviteeUserId = null, inviteCode = null, details = '') => {
    const invitee = inviteeUserId ? ` | Invitee: ${inviteeUserId}` : '';
    const code = inviteCode ? ` | Code: ${inviteCode}` : '';
    
    logger.info(`🎯 Referral ${action}: Inviter: ${inviterUserId}${invitee}${code} | ${details}`);
};

/**
 * Moderation action logging
 * Logs moderation actions for server audit trail
 * 
 * @param {string} action - Moderation action (ban, kick, mute, etc.)
 * @param {string} moderatorId - User ID of the moderator
 * @param {string} targetId - User ID of the target user
 * @param {string} reason - Reason for the action
 * @param {string} guildId - Guild ID where action occurred
 */
logger.logModeration = (action, moderatorId, targetId, reason = 'No reason provided', guildId) => {
    logger.info(`🛡️ Moderation: ${action} | Moderator: ${moderatorId} | Target: ${targetId} | Reason: ${reason} | Guild: ${guildId}`);
};

/**
 * Performance monitoring
 * Logs performance metrics for bot optimization
 * 
 * @param {string} operation - Operation being measured
 * @param {number} duration - Duration in milliseconds
 * @param {Object} metadata - Additional metadata
 */
logger.logPerformance = (operation, duration, metadata = {}) => {
    const meta = Object.keys(metadata).length > 0 ? ` | ${JSON.stringify(metadata)}` : '';
    logger.debug(`⚡ Performance: ${operation} took ${duration}ms${meta}`);
};

/**
 * Error logging with context
 * Enhanced error logging with additional context information
 * 
 * @param {string} context - Context where error occurred
 * @param {Error} error - Error object
 * @param {Object} additionalInfo - Additional context information
 */
logger.logError = (context, error, additionalInfo = {}) => {
    const info = Object.keys(additionalInfo).length > 0 ? ` | Additional Info: ${JSON.stringify(additionalInfo)}` : '';
    logger.error(`💥 Error in ${context}: ${error.message}${info}`, error);
};

/**
 * System startup logging
 * Logs system initialization steps
 */
logger.logStartup = (step, details = '') => {
    logger.info(`🚀 Startup: ${step} ${details}`);
};

/**
 * Log current memory usage
 * Useful for monitoring bot performance
 */
logger.logMemoryUsage = () => {
    const used = process.memoryUsage();
    const usage = {
        heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
        external: `${Math.round(used.external / 1024 / 1024)} MB`,
        rss: `${Math.round(used.rss / 1024 / 1024)} MB`
    };
    
    logger.debug(`📊 Memory usage: ${JSON.stringify(usage)}`);
};

/**
 * Create log entry for bot events
 * 
 * @param {string} event - Event name
 * @param {string} description - Event description
 * @param {Object} data - Event data
 */
logger.logEvent = (event, description, data = {}) => {
    const dataStr = Object.keys(data).length > 0 ? ` | Data: ${JSON.stringify(data)}` : '';
    logger.info(`📅 Event: ${event} - ${description}${dataStr}`);
};

// Export the logger instance
module.exports = logger;