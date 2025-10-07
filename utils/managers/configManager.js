/**
 * Configuration Manager - Server-specific bot configuration
 * 
 * Manages guild-specific settings for Saint Toadle Discord Bot
 * Provides centralized configuration management with validation
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../logger');

class ConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, '../../data/guild_configs.json');
        this.configs = new Map();
        this.defaultConfig = {
            prefix: '!',
            economy: {
                earn_range: { min: 1, max: 50 },
                crime_settings: {
                    success_chance: 0.85,
                    reward_range: { min: 10, max: 109 },
                    fine_range: { min: 10, max: 59 }
                },
                invest_settings: {
                    fail_chance: 0.25,
                    multiplier_range: { min: 0.5, max: 2.0 }
                },
                daily_bonus: { min: 50, max: 100 },
                bank_interest_rate: 0.02
            },
            channels: {
                welcome_channel: null,
                leave_channel: null,
                logs_channel: null,
                interest_notification: null
            },
            roles: {
                admin_role: 'Admin',
                moderator_role: 'Moderator'
            },
            features: {
                welcome_messages: true,
                leave_messages: true,
                economy_enabled: true,
                giveaways_enabled: true,
                gambling_enabled: true
            }
        };
    }

    async loadConfigs() {
        try {
            const data = await fs.readFile(this.configPath, 'utf8');
            const configs = JSON.parse(data);
            
            for (const [guildId, config] of Object.entries(configs)) {
                this.configs.set(guildId, config);
            }
            
            logger.debug(`📂 Loaded configurations for ${this.configs.size} guilds`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this.saveConfigs();
                logger.debug('📂 Created new guild configs file');
            } else {
                logger.error('Error loading guild configs:', error);
            }
        }
    }

    async saveConfigs() {
        try {
            const configObj = {};
            for (const [guildId, config] of this.configs.entries()) {
                configObj[guildId] = config;
            }
            
            await fs.writeFile(this.configPath, JSON.stringify(configObj, null, 2));
            logger.debug('📂 Saved guild configurations');
        } catch (error) {
            logger.error('Error saving guild configs:', error);
            throw error;
        }
    }

    getConfig(guildId) {
        if (!this.configs.has(guildId)) {
            this.configs.set(guildId, { ...this.defaultConfig });
            this.saveConfigs();
        }
        return this.configs.get(guildId);
    }

    async updateConfig(guildId, path, value) {
        try {
            const config = this.getConfig(guildId);
            const pathParts = path.split('.');
            
            let current = config;
            for (let i = 0; i < pathParts.length - 1; i++) {
                if (!current[pathParts[i]]) {
                    current[pathParts[i]] = {};
                }
                current = current[pathParts[i]];
            }
            
            const isValid = this.validateConfigValue(path, value);
            if (!isValid) {
                return false;
            }
            
            current[pathParts[pathParts.length - 1]] = value;
            await this.saveConfigs();
            
            logger.info(`⚙️ Updated config for guild ${guildId}: ${path} = ${value}`);
            return true;
        } catch (error) {
            logger.error('Error updating config:', error);
            return false;
        }
    }

    validateConfigValue(path, value) {
        const validations = {
            'prefix': (v) => typeof v === 'string' && v.length <= 3 && v.length > 0,
            'economy.earn_range.min': (v) => typeof v === 'number' && v >= 1 && v <= 1000,
            'economy.earn_range.max': (v) => typeof v === 'number' && v >= 1 && v <= 1000,
            'economy.crime_settings.success_chance': (v) => typeof v === 'number' && v >= 0 && v <= 1,
            'economy.crime_settings.reward_range.min': (v) => typeof v === 'number' && v >= 1,
            'economy.crime_settings.reward_range.max': (v) => typeof v === 'number' && v >= 1,
            'economy.crime_settings.fine_range.min': (v) => typeof v === 'number' && v >= 1,
            'economy.crime_settings.fine_range.max': (v) => typeof v === 'number' && v >= 1,
            'economy.invest_settings.fail_chance': (v) => typeof v === 'number' && v >= 0 && v <= 1,
            'economy.daily_bonus.min': (v) => typeof v === 'number' && v >= 1,
            'economy.daily_bonus.max': (v) => typeof v === 'number' && v >= 1,
            'economy.bank_interest_rate': (v) => typeof v === 'number' && v >= 0 && v <= 1,
            'roles.admin_role': (v) => typeof v === 'string' && v.length <= 100,
            'roles.moderator_role': (v) => typeof v === 'string' && v.length <= 100
        };

        const validator = validations[path];
        return validator ? validator(value) : true;
    }

    getPrefix(guildId) {
        return this.getConfig(guildId).prefix;
    }

    getEconomyConfig(guildId) {
        return this.getConfig(guildId).economy;
    }

    getChannelConfig(guildId) {
        return this.getConfig(guildId).channels;
    }

    getRoleConfig(guildId) {
        return this.getConfig(guildId).roles;
    }

    getFeatureConfig(guildId) {
        return this.getConfig(guildId).features;
    }

    isFeatureEnabled(guildId, feature) {
        const features = this.getFeatureConfig(guildId);
        return features[feature] !== false;
    }

    getAdminRole(guildId) {
        return this.getRoleConfig(guildId).admin_role;
    }

    getModeratorRole(guildId) {
        return this.getRoleConfig(guildId).moderator_role;
    }
}

const configManager = new ConfigManager();
module.exports = configManager;
