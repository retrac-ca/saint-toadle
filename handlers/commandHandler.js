/**
 * Command Handler - Command Loading and Processing System
 * 
 * Handles loading commands from the commands directory structure,
 * processing command execution, managing cooldowns, and permission checks.
 * 
 * Supports nested command categories in subdirectories.
 */

const { Collection } = require('discord.js');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

class CommandHandler {
    constructor() {
        this.commands = new Collection();
        this.cooldowns = new Collection();
        this.commandsDir = path.join(__dirname, '..', 'commands');
    }

    /**
     * Load all commands from the commands directory
     * Supports nested directories for command categories
     * 
     * @param {Client} client - Discord.js client instance
     */
    async loadCommands(client) {
        try {
            const startTime = Date.now();
            let commandCount = 0;

            // Recursively load commands from all subdirectories
            await this.loadCommandsFromDirectory(this.commandsDir);

            // Store commands in client for access from other modules
            client.commands = this.commands;
            client.cooldowns = this.cooldowns;

            const loadTime = Date.now() - startTime;
            logger.logPerformance('Command loading', loadTime, { commandCount });
            logger.info(`📚 Loaded ${commandCount} commands in ${loadTime}ms`);

        } catch (error) {
            logger.logError('Command loading', error);
            throw error;
        }
    }

    /**
     * Recursively load commands from a directory
     * 
     * @param {string} dir - Directory path to load commands from
     */
    async loadCommandsFromDirectory(dir) {
        try {
            const items = await fs.readdir(dir);

            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stat = await fs.stat(itemPath);

                if (stat.isDirectory()) {
                    // Recursively load from subdirectory
                    await this.loadCommandsFromDirectory(itemPath);
                } else if (item.endsWith('.js')) {
                    // Load command file
                    await this.loadCommand(itemPath);
                }
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.logError(`Loading commands from directory ${dir}`, error);
            }
        }
    }

    /**
     * Load a single command file
     * 
     * @param {string} filePath - Path to the command file
     */
    async loadCommand(filePath) {
        try {
            // Clear require cache to allow hot reloading
            delete require.cache[require.resolve(filePath)];
            
            const command = require(filePath);
            
            // Validate command structure
            if (!command.name || !command.execute) {
                logger.warn(`⚠️ Command file ${path.basename(filePath)} is missing required properties (name, execute)`);
                return;
            }

            // Store command with additional metadata
            command.filePath = filePath;
            command.category = this.getCategoryFromPath(filePath);
            
            this.commands.set(command.name, command);
            
            logger.debug(`✅ Loaded command: ${command.name} (${command.category})`);
            
        } catch (error) {
            logger.logError(`Loading command from ${filePath}`, error);
        }
    }

    /**
     * Get command category from file path
     * 
     * @param {string} filePath - Path to the command file
     * @returns {string} Category name
     */
    getCategoryFromPath(filePath) {
        const relativePath = path.relative(this.commandsDir, filePath);
        const parts = relativePath.split(path.sep);
        
        if (parts.length > 1) {
            return parts[0]; // First directory is the category
        }
        
        return 'general';
    }

    /**
     * Process a command from a message
     * 
     * @param {Client} client - Discord.js client instance
     * @param {Message} message - Discord message object
     */
    async processCommand(client, message) {
        try {
            const startTime = Date.now();
            
            // Parse command and arguments
            const args = message.content.slice(client.config.prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            // Find command (support aliases)
            const command = this.commands.get(commandName) || 
                           this.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
            
            if (!command) {
                logger.debug(`❓ Unknown command: ${commandName}`);
                return;
            }

            // Check permissions
            if (!this.checkPermissions(command, message)) {
                await message.reply('❌ You do not have permission to use this command.');
                logger.logCommand(message, commandName, 'no_permission');
                return;
            }

            // Check cooldowns
            if (!this.checkCooldown(command, message)) {
                const timeLeft = this.getCooldownTimeLeft(command, message);
                await message.reply(`⏱️ Please wait ${timeLeft} seconds before using this command again.`);
                logger.logCommand(message, commandName, 'cooldown');
                return;
            }

            // Execute command
            await command.execute(message, args, client);
            
            // Log successful execution
            const executionTime = Date.now() - startTime;
            logger.logPerformance(`Command: ${commandName}`, executionTime);
            logger.logCommand(message, commandName, 'success');
            
        } catch (error) {
            logger.logError('Command execution', error, {
                command: message.content,
                user: message.author.id,
                guild: message.guild?.id
            });
            
            try {
                await message.reply('❌ There was an error executing this command.');
            } catch (replyError) {
                logger.logError('Sending error reply', replyError);
            }
        }
    }

    /**
     * Check if user has required permissions for command
     * 
     * @param {Object} command - Command object
     * @param {Message} message - Discord message object
     * @returns {boolean} True if user has permission
     */
    checkPermissions(command, message) {
        // No permission requirements
        if (!command.permissions || command.permissions.length === 0) {
            return true;
        }

        // DM channels - only allow if command supports DM
        if (!message.guild) {
            return command.dmAllowed === true;
        }

        // Check if user has required permissions
        const memberPermissions = message.member.permissions;
        
        for (const permission of command.permissions) {
            if (!memberPermissions.has(permission)) {
                logger.debug(`❌ Permission check failed: ${message.author.tag} missing ${permission}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Check command cooldown
     * 
     * @param {Object} command - Command object
     * @param {Message} message - Discord message object
     * @returns {boolean} True if command can be executed
     */
    checkCooldown(command, message) {
        // No cooldown set
        if (!command.cooldown || command.cooldown <= 0) {
            return true;
        }

        const userId = message.author.id;
        const commandName = command.name;
        
        // Get or create cooldown collection for this command
        if (!this.cooldowns.has(commandName)) {
            this.cooldowns.set(commandName, new Collection());
        }
        
        const timestamps = this.cooldowns.get(commandName);
        const cooldownAmount = command.cooldown * 1000; // Convert to milliseconds
        
        if (timestamps.has(userId)) {
            const expirationTime = timestamps.get(userId) + cooldownAmount;
            
            if (Date.now() < expirationTime) {
                return false; // Still on cooldown
            }
        }
        
        // Set new cooldown timestamp
        timestamps.set(userId, Date.now());
        
        // Clean up expired cooldowns
        setTimeout(() => timestamps.delete(userId), cooldownAmount);
        
        return true;
    }

    /**
     * Get remaining cooldown time in seconds
     * 
     * @param {Object} command - Command object
     * @param {Message} message - Discord message object
     * @returns {number} Remaining cooldown time in seconds
     */
    getCooldownTimeLeft(command, message) {
        const userId = message.author.id;
        const commandName = command.name;
        const timestamps = this.cooldowns.get(commandName);
        
        if (!timestamps || !timestamps.has(userId)) {
            return 0;
        }
        
        const expirationTime = timestamps.get(userId) + (command.cooldown * 1000);
        const timeLeft = Math.ceil((expirationTime - Date.now()) / 1000);
        
        return Math.max(0, timeLeft);
    }

    /**
     * Reload a specific command
     * 
     * @param {string} commandName - Name of the command to reload
     * @returns {boolean} True if successfully reloaded
     */
    async reloadCommand(commandName) {
        try {
            const command = this.commands.get(commandName);
            
            if (!command) {
                logger.warn(`⚠️ Cannot reload command '${commandName}': command not found`);
                return false;
            }
            
            // Reload the command file
            await this.loadCommand(command.filePath);
            
            logger.info(`🔄 Reloaded command: ${commandName}`);
            return true;
            
        } catch (error) {
            logger.logError(`Reloading command ${commandName}`, error);
            return false;
        }
    }

    /**
     * Get all commands organized by category
     * 
     * @returns {Object} Object with categories as keys and command arrays as values
     */
    getCommandsByCategory() {
        const categories = {};
        
        for (const command of this.commands.values()) {
            const category = command.category || 'general';
            
            if (!categories[category]) {
                categories[category] = [];
            }
            
            categories[category].push(command);
        }
        
        return categories;
    }

    /**
     * Get command statistics
     * 
     * @returns {Object} Statistics about loaded commands
     */
    getStats() {
        const categories = this.getCommandsByCategory();
        const totalCommands = this.commands.size;
        const totalCategories = Object.keys(categories).length;
        
        return {
            totalCommands,
            totalCategories,
            categories: Object.keys(categories).map(name => ({
                name,
                count: categories[name].length
            }))
        };
    }
}

// Create and export singleton instance
const commandHandler = new CommandHandler();
module.exports = commandHandler;