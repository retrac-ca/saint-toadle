const fs = require('fs-extra');
const path = require('path');

const storeFilePath = path.join(__dirname, '..', 'data', 'store.json');

class StoreManager {
  /**
   * Ensure store.json exists and load its contents as an object.
   * @returns {Object} mapping itemKey → itemDefinition
   */
  static async loadStore() {
    try {
      const dataDir = path.dirname(storeFilePath);
      await fs.ensureDir(dataDir);

      const exists = await fs.pathExists(storeFilePath);
      if (!exists) {
        // Initialize with empty object
        await fs.writeJson(storeFilePath, {}, { spaces: 2 });
        return {};
      }

      const data = await fs.readJson(storeFilePath);
      return data;
    } catch (error) {
      console.error('Error loading store data:', error);
      throw new Error('Failed to load store data');
    }
  }

  /**
   * Save the full store object back to disk.
   * @param {Object} storeDefs
   */
  static async saveStore(storeDefs) {
    try {
      await fs.writeJson(storeFilePath, storeDefs, { spaces: 2 });
    } catch (error) {
      console.error('Error saving store data:', error);
      throw new Error('Failed to save store data');
    }
  }

  /**
   * Get all store items for a guild context.
   * Returns an array of { key, ...definition }.
   */
  static async getItems(guildId) {
    const storeDefs = await this.loadStore();
    return Object.entries(storeDefs).map(([key, def]) => ({ key, ...def }));
  }

  /**
   * Get a single store item by key.
   * @param {string} guildId
   * @param {string} key
   * @returns {Object|null}
   */
  static async getItem(guildId, key) {
    const storeDefs = await this.loadStore();
    const def = storeDefs[key];
    return def ? { key, ...def } : null;
  }

  /**
   * Add or update an item in the store definitions.
   * @param {string} key
   * @param {Object} definition
   */
  static async addItem(key, definition) {
    const storeDefs = await this.loadStore();
    storeDefs[key] = definition;
    await this.saveStore(storeDefs);
  }

  /**
   * Remove an item from the store definitions by key.
   * @param {string} key
   */
  static async removeItem(key) {
    const storeDefs = await this.loadStore();
    if (!storeDefs[key]) {
      throw new Error('Item not found');
    }
    delete storeDefs[key];
    await this.saveStore(storeDefs);
  }
}

module.exports = StoreManager;
