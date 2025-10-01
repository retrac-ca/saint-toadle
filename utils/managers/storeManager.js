const fs = require('fs-extra');
const path = require('path');

const storeFilePath = path.join(__dirname, '..', 'data', 'store.json');

class StoreManager {
  static async loadStore() {
    try {
      // Ensure data folder exists before accessing file
      const dataDir = path.join(__dirname, '..', 'data');
      await fs.ensureDir(dataDir);

      const exists = await fs.pathExists(storeFilePath);
      if (!exists) {
        await fs.writeJson(storeFilePath, []);
        return [];
      }
      const data = await fs.readJson(storeFilePath);
      return data;
    } catch (error) {
      console.error('Error loading store data:', error);
      throw new Error('Failed to load store data');
    }
  }

  static async saveStore(storeItems) {
    try {
      await fs.writeJson(storeFilePath, storeItems, { spaces: 2 });
    } catch (error) {
      throw new Error('Failed to save store data');
    }
  }

  static async addItem(item) {
    const storeItems = await this.loadStore();
    storeItems.push(item);
    await this.saveStore(storeItems);
  }

  static async removeItem(itemName) {
    let storeItems = await this.loadStore();
    const originalLength = storeItems.length;
    storeItems = storeItems.filter(item => item.name.toLowerCase() !== itemName.toLowerCase());
    if (storeItems.length === originalLength) {
      throw new Error('Item not found');
    }
    await this.saveStore(storeItems);
  }

  static async getItems() {
    return await this.loadStore();
  }
}

module.exports = StoreManager;
