// handlers/commandHandler.js

const { Collection } = require('discord.js');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

class CommandHandler {
    constructor() {
        this.commands = new Collection();
        this.cooldowns = new Collection();
        this.commandsDir = path.join(__dirname, '..', 'commands');
        this.commandCount = 0;
    }

    async loadCommands(client) {
        try {
            const start = Date.now();
            this.commandCount = 0;
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
                logger.warn(`⚠️ Command file ${path.basename(filePath)} missing required properties`);
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
        return parts.length > 1 ? parts[0] : 'general';
    }

    getCommandsByCategory(commands) {
        const categories = {};
        for (const cmd of commands.values()) {
            const cat = cmd.category || 'general';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd);
        }
        return categories;
    }

    async processCommand(client, message) {
        try {
            const start = Date.now();
            const prefix = message.usedPrefix || client.config.prefix;
            let content = message.content.slice(prefix.length).trim();
            let commandName, args;
            const split = content.split(/ +/);
            const twoWord = split.length >= 2 ? `${split[0]} ${split[1]}`.toLowerCase() : null;
            if (twoWord) {
                const cmd2 = this.commands.find(cmd => cmd.name === twoWord || (cmd.aliases||[]).includes(twoWord));
                if (cmd2) {
                    commandName = cmd2.name;
                    args = split.slice(2);
                }
            }
            if (!commandName) {
                const parts = content.split(/ +/);
                commandName = parts.shift().toLowerCase();
                args = parts;
            }
            const command = this.commands.get(commandName)
                || this.commands.find(cmd => (cmd.aliases||[]).includes(commandName));
            if (!command) {
                logger.debug(`❓ Unknown command: ${commandName}`);
                return;
            }
            logger.debug(`🎯 Processing command: ${commandName} from ${message.author.tag}`);
            if (!this.checkPermissions(command, message)) {
                await message.channel.send('❌ You do not have permission to use this command.');
                logger.logCommand(message, commandName, 'no_permission');
                return;
            }
            if (!this.checkCooldown(command, message)) {
                const timeLeft = this.getCooldownTimeLeft(command, message);
                await message.channel.send(`⏱️ Please wait ${timeLeft} seconds before using this command.`);
                logger.logCommand(message, commandName, 'cooldown');
                return;
            }
            await command.execute(message, args, client);
            if (command.cooldown > 0) {
                const userId = message.author.id;
                if (!this.cooldowns.has(command.name)) {
                    this.cooldowns.set(command.name, new Collection());
                }
                this.cooldowns.get(command.name).set(userId, Date.now());
                setTimeout(() => this.cooldowns.get(command.name).delete(userId), command.cooldown * 1000);
            }
            logger.logPerformance('Command', Date.now() - start, { command: commandName });
            logger.logCommand(message, commandName, 'success');
        } catch (error) {
            logger.logError('Command execution', error, {
                message: message.content,
                user: message.author.id,
                guild: message.guild?.id
            });
            try { await message.channel.send('❌ An error occurred while executing the command.'); } catch {}
        }
    }

    checkPermissions(command, message) {
        if (!command.permissions?.length) return true;
        if (!message.guild) return false;
        for (const perm of command.permissions) {
            if (!message.member.permissions.has(perm)) {
                logger.debug(`❌ Missing permission: ${perm}`);
                return false;
            }
        }
        return true;
    }

    checkCooldown(command, message) {
        if (!command.cooldown) return true;
        const userId = message.author.id;
        const timestamps = this.cooldowns.get(command.name);
        if (!timestamps?.has(userId)) return true;
        const expiration = timestamps.get(userId) + command.cooldown * 1000;
        return Date.now() >= expiration;
    }

    getCooldownTimeLeft(command, message) {
        const userId = message.author.id;
        const timestamps = this.cooldowns.get(command.name);
        if (!timestamps?.has(userId)) return 0;
        const expiration = timestamps.get(userId) + command.cooldown * 1000;
        return Math.ceil((expiration - Date.now()) / 1000) || 0;
    }
}

module.exports = new CommandHandler();
