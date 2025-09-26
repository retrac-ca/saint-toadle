/**
 * Event Handler - Discord Event Management
 * 
 * Manages Discord.js events and provides centralized event handling.
 * This file can be extended to add more event handlers as needed.
 */

const logger = require('../utils/logger');

class EventHandler {
    constructor() {
        this.events = new Map();
    }

    /**
     * Register an event handler
     * @param {string} eventName - Name of the Discord event
     * @param {Function} handler - Event handler function
     */
    registerEvent(eventName, handler) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        
        this.events.get(eventName).push(handler);
        logger.debug(`📅 Registered handler for event: ${eventName}`);
    }

    /**
     * Initialize all event handlers for a client
     * @param {Client} client - Discord.js client instance
     */
    initializeEvents(client) {
        for (const [eventName, handlers] of this.events.entries()) {
            client.on(eventName, async (...args) => {
                for (const handler of handlers) {
                    try {
                        await handler(...args);
                    } catch (error) {
                        logger.logError(`Event handler for ${eventName}`, error);
                    }
                }
            });
        }
        
        logger.info(`📅 Initialized ${this.events.size} event handlers`);
    }

    /**
     * Get event statistics
     * @returns {Object} Event handler statistics
     */
    getStats() {
        const stats = {
            totalEvents: this.events.size,
            totalHandlers: 0,
            events: {}
        };
        
        for (const [eventName, handlers] of this.events.entries()) {
            stats.events[eventName] = handlers.length;
            stats.totalHandlers += handlers.length;
        }
        
        return stats;
    }
}

// Create and export singleton instance
const eventHandler = new EventHandler();
module.exports = eventHandler;