const fs = require('fs').promises;
const path = require('path');
const dataManager = require('../dataManager');

class GiveawayManager {
    constructor() {
        this.giveawaysPath = path.join(__dirname, '../../data/giveaways.json');
        this.entriesPath = path.join(__dirname, '../../data/giveaway-entries.json');
        this.client = null; // Will be set when needed
    }

    async loadGiveaways() {
        try {
            const data = await fs.readFile(this.giveawaysPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // Initialize empty data structure
            const initialData = {
                nextId: 1,
                giveaways: {}
            };
            await this.saveGiveaways(initialData);
            return initialData;
        }
    }

    async saveGiveaways(data) {
        try {
            await fs.writeFile(this.giveawaysPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving giveaways:', error);
            throw error;
        }
    }

    async loadEntries() {
        try {
            const data = await fs.readFile(this.entriesPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // Initialize empty entries
            const initialData = {};
            await this.saveEntries(initialData);
            return initialData;
        }
    }

    async saveEntries(data) {
        try {
            await fs.writeFile(this.entriesPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving giveaway entries:', error);
            throw error;
        }
    }

    async createGiveaway(data) {
        const giveawaysData = await this.loadGiveaways();
        const id = giveawaysData.nextId++;
        
        const giveaway = {
            id,
            guildId: data.guildId,
            channelId: data.channelId,
            messageId: null, // Will be set later
            hostId: data.hostId,
            prize: data.prize,
            currencyAmount: data.currencyAmount,
            winnerCount: data.winnerCount,
            endTimestamp: data.endTimestamp,
            ended: false
        };

        giveawaysData.giveaways[id] = giveaway;
        await this.saveGiveaways(giveawaysData);
        
        return giveaway;
    }

    async getGiveaway(id) {
        const giveawaysData = await this.loadGiveaways();
        return giveawaysData.giveaways[id] || null;
    }

    async scheduleEnd(giveawayId, channelId, messageId, endTimestamp) {
        // Update the giveaway with message info
        const giveawaysData = await this.loadGiveaways();
        if (giveawaysData.giveaways[giveawayId]) {
            giveawaysData.giveaways[giveawayId].channelId = channelId;
            giveawaysData.giveaways[giveawayId].messageId = messageId;
            await this.saveGiveaways(giveawaysData);
        }

        // Schedule the end
        const delay = endTimestamp - Date.now();
        if (delay > 0) {
            setTimeout(() => this.concludeGiveaway(giveawayId), delay);
        }
    }

    async addEntry(giveawayId, userId) {
        const entriesData = await this.loadEntries();
        
        if (!entriesData[giveawayId]) {
            entriesData[giveawayId] = [];
        }

        // Check if user already entered
        if (entriesData[giveawayId].includes(userId)) {
            return false; // Already entered
        }

        entriesData[giveawayId].push(userId);
        await this.saveEntries(entriesData);
        return true;
    }

    async getEntries(giveawayId) {
        const entriesData = await this.loadEntries();
        return entriesData[giveawayId] || [];
    }

    async concludeGiveaway(giveawayId) {
        const giveaway = await this.getGiveaway(giveawayId);
        if (!giveaway || giveaway.ended) {
            return;
        }

        const entries = await this.getEntries(giveawayId);
        const winners = this.pickRandomWinners(entries, giveaway.winnerCount);

        // Award currency to winners
        for (const userId of winners) {
            if (giveaway.currencyAmount > 0) {
                dataManager.addToUserBalance(userId, giveaway.currencyAmount);
            }
        }

        // Update message
        try {
            const { Client } = require('discord.js');
            if (!this.client) {
                // Try to get client from main app
                this.client = require('../../index').client;
            }

            const channel = await this.client.channels.fetch(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.messageId);

            const resultEmbed = {
                color: 0x00AE86,
                title: '🎉 Giveaway Ended!',
                description: winners.length > 0 
                    ? `**Winners:** ${winners.map(u => `<@${u}>`).join(', ')}\n**Prize:** ${giveaway.prize}\n**Currency:** ${giveaway.currencyAmount} coins each`
                    : `No valid entries. Giveaway cancelled.\n**Prize:** ${giveaway.prize}`,
                footer: { text: `Hosted by the giveaway creator` },
                timestamp: new Date().toISOString()
            };

            await message.edit({ embeds: [resultEmbed], components: [] });
        } catch (error) {
            console.error('Error updating giveaway message:', error);
        }

        // Mark as ended
        await this.markGiveawayEnded(giveawayId);
    }

    pickRandomWinners(entries, count) {
        if (entries.length === 0) return [];
        if (entries.length <= count) return [...entries];
        
        const shuffled = [...entries].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    async markGiveawayEnded(giveawayId) {
        const giveawaysData = await this.loadGiveaways();
        if (giveawaysData.giveaways[giveawayId]) {
            giveawaysData.giveaways[giveawayId].ended = true;
            await this.saveGiveaways(giveawaysData);
        }
    }

    async endGiveawayNow(giveawayId) {
        const giveaway = await this.getGiveaway(giveawayId);
        if (!giveaway || giveaway.ended) {
            return false;
        }

        await this.concludeGiveaway(giveawayId);
        return true;
    }

    async rerollGiveaway(giveawayId) {
        const giveaway = await this.getGiveaway(giveawayId);
        if (!giveaway || !giveaway.ended) {
            return null;
        }

        const entries = await this.getEntries(giveawayId);
        const winners = this.pickRandomWinners(entries, giveaway.winnerCount);

        // Award currency to new winners
        for (const userId of winners) {
            if (giveaway.currencyAmount > 0) {
                dataManager.addToUserBalance(userId, giveaway.currencyAmount);
            }
        }

        return winners;
    }

    setClient(client) {
        this.client = client;
    }
}

module.exports = new GiveawayManager();