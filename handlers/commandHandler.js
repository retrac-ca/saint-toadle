/**
 * Command Handler - Command Loading and Processing System
 * 
 * Handles loading commands from the directory structure,
 * command execution, cooldowns, and permission checks.
 *
 * Supports nested subdirectories.
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
        this.commandCount = 0; // Initialize command count
    }

    async loadCommands(client) {
        try {
            const start = Date.now();
            this.commandCount = 0;  // Reset count on each load

            await this.loadCommandsFromDirectory(this.commandsDir);

            client.commands = this.commands;
            client.cooldowns = this.cooldowns;

            const duration = Date.now() - start;
            logger.logPerformance('Command loading', duration, { commandCount: this.commandCount });
            logger.info(`📚 Loaded ${this.commandCount} commands in ${duration}ms`);

        } catch (error) {
            logger.logError('Command loading', error);
            throw error;
        }
    }

    async loadCommandsFromDirectory(dir) {
        try {
            const items = await fs.readdir(dir);

            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = await fs.stat(fullPath);
                if (stat.isDirectory()) {
                    await this.loadCommandsFromDirectory(fullPath);
                } else if (item.endsWith('.js')) {
                    await this.loadCommand(fullPath);
                }
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.logError(`Loading commands from directory ${dir}`, error);
            }
        }
    }

    async loadCommand(filePath) {
        try {
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);

            if (!command.name || !command.execute) {
                logger.warn(`⚠️ Command file ${path.basename(filePath)} missing required properties (name, execute)`);
                return;
            }

            command.filePath = filePath;
            command.category = this.getCategoryFromPath(filePath);

            this.commands.set(command.name, command);
            this.commandCount++;

            logger.debug(`✅ Loaded command: ${command.name} (${command.category})`);
            
        } catch (error) {
            logger.logError(`Loading command ${filePath}`, error);
        }
    }

    getCategoryFromPath(filePath) {
        const relative = path.relative(this.commandsDir, filePath);
        const parts = relative.split(path.sep);
        if (parts.length > 1) return parts[0];
        return 'general';
    }

    async processCommand(client, message) {
        try {
            const start = Date.now();
            const args = message.content.slice(client.config.prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            const command =
                this.commands.get(commandName) ||
                this.commands.find(cmd => cmd.aliases?.includes(commandName));

            if (!command) {
                logger.debug(`❓ Unknown command: ${commandName}`);
                return;
            }

            if (!this.checkPermissions(command, message)) {
                await message.reply('❌ You do not have permission to use this command.');
                logger.logCommand(message, commandName, 'no_permission');
                return;
            }

            if (!this.checkCooldown(command, message)) {
                const timeLeft = this.getCooldownTimeLeft(command, message);
                await message.reply(`⏱️ Please wait ${timeLeft} seconds before using this command.`);
                logger.logCommand(message, commandName, 'cooldown');
                return;
            }

            // Execute command
            await command.execute(message, args, client);

            // Set cooldown timestamp AFTER successful command execution
            const userId = message.author.id;
            const cmdName = command.name;
            if (command.cooldown && command.cooldown > 0) {
                if (!this.cooldowns.has(cmdName)) this.cooldowns.set(cmdName, new Collection());
                this.cooldowns.get(cmdName).set(userId, Date.now());
                setTimeout(() => this.cooldowns.get(cmdName).delete(userId), command.cooldown * 1000);
            }

            logger.logPerformance('Command', Date.now() - start, { command: commandName });
            logger.logCommand(message, commandName, 'success');

        } catch (error) {
            logger.logError('Command execution', error, { message: message.content, user: message.author.id, guild: message.guild?.id });
            try {
                await message.reply('❌ An error occurred while executing the command.');
            } catch (replyError) {
                logger.logError('Reply failed', replyError);
            }
        }
    }

    checkPermissions(command, message) {
        if (!command.permissions || command.permissions.length === 0) return true;

        if (!message.guild) return command.dmAllowed;

        const memberPerms = message.member.permissions;
        for (const perm of command.permissions) {
            if (!memberPerms.has(perm)) {
                logger.debug(`❌ Permission check failed: User ${message.author.tag} missing ${perm}`);
                return false;
            }
        }
        return true;
    }

    checkCooldown(command, message) {
        if (!command.cooldown || command.cooldown <= 0) return true;

        const userId = message.author.id;
        const commandName = command.name;

        if (!this.cooldowns.has(commandName)) {
            return true;
        }

        const timestamps = this.cooldowns.get(commandName);
        if (!timestamps.has(userId)) {
            return true;
        }

        const expirationTime = timestamps.get(userId) + command.cooldown * 1000;
        return Date.now() >= expirationTime;
    }

    getCooldownTimeLeft(command, message) {
        const userId = message.author.id;
        const commandName = command.name;
        const timestamps = this.cooldowns.get(commandName);
        if (!timestamps) return 0;
        if (!timestamps.has(userId)) return 0;

        const expirationTime = timestamps.get(userId) + command.cooldown * 1000;
        const remaining = expirationTime - Date.now();
        return Math.ceil(remaining / 1000) || 0;
    }
}

module.exports = new CommandHandler();