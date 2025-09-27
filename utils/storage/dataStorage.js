const fs = require('fs-extra');
const path = require('path');
const logger = require('../logger');

class DataStorage {
    constructor() {
        this.dataDir = path.join(__dirname, '..', '..', 'data');
        this.files = {
            users: path.join(this.dataDir, 'users.json'),
            referrals: path.join(this.dataDir, 'referrals.json'),
            invites: path.join(this.dataDir, 'invites.json'),
            guilds: path.join(this.dataDir, 'guilds.json'),
            claimed: path.join(this.dataDir, 'claimed.json'),
            items: path.join(this.dataDir, 'items.json'),
            listings: path.join(this.dataDir, 'listings.json')
        };
    }

    /**
     * Initialize storage - ensure data directory exists
     */
    async initialize() {
        try {
            await fs.ensureDir(this.dataDir);
            logger.debug('📁 Data storage directory initialized');
        } catch (error) {
            logger.logError('Data storage initialization', error);
            throw error;
        }
    }

    /**
     * Load data from a specific file
     * @param {string} dataType - Type of data to load (users, items, etc.)
     * @returns {Promise<Map|Set|null>} Loaded data structure or null if file doesn't exist
     */
    async loadData(dataType) {
        const filePath = this.files[dataType];
        if (!filePath) {
            throw new Error(`Unknown data type: ${dataType}`);
        }

        try {
            if (await fs.pathExists(filePath)) {
                const jsonData = await fs.readJson(filePath);
                
                // Convert data based on type
                if (dataType === 'claimed') {
                    return new Set(jsonData);
                } else {
                    return new Map(Object.entries(jsonData));
                }
            } else {
                logger.debug(`📂 No existing ${dataType} data file found, starting fresh`);
                return dataType === 'claimed' ? new Set() : new Map();
            }
        } catch (error) {
            logger.logError(`Loading ${dataType} data`, error);
            throw error;
        }
    }

    /**
     * Load all data files
     * @returns {Promise<Object>} Object containing all loaded data structures
     */
    async loadAll() {
        const data = {};
        
        for (const dataType of Object.keys(this.files)) {
            try {
                data[dataType] = await this.loadData(dataType);
                const size = data[dataType].size || 0;
                logger.debug(`📂 Loaded ${dataType} data: ${size} entries`);
            } catch (error) {
                logger.logError(`Failed to load ${dataType}`, error);
                // Initialize empty data structure on error
                data[dataType] = dataType === 'claimed' ? new Set() : new Map();
            }
        }

        return data;
    }

    /**
     * Save data to a specific file
     * @param {string} dataType - Type of data to save
     * @param {Map|Set} dataStructure - Data structure to save
     * @returns {Promise<boolean>} Success status
     */
    async saveData(dataType, dataStructure) {
        const filePath = this.files[dataType];
        if (!filePath) {
            throw new Error(`Unknown data type: ${dataType}`);
        }

        try {
            let dataToSave;
            
            if (dataType === 'claimed') {
                // Convert Set to Array for JSON serialization
                dataToSave = Array.from(dataStructure);
            } else {
                // Convert Map to Object for JSON serialization
                dataToSave = Object.fromEntries(dataStructure);
            }

            await fs.writeJson(filePath, dataToSave, { spaces: 2 });
            logger.debug(`💾 Saved ${dataType} data`);
            return true;
        } catch (error) {
            logger.logError(`Saving ${dataType} data`, error);
            return false;
        }
    }

    /**
     * Save all data structures
     * @param {Object} dataStructures - Object containing all data structures
     * @returns {Promise<Object>} Results of save operations
     */
    async saveAll(dataStructures) {
        const results = {};
        const savePromises = [];

        for (const [dataType, dataStructure] of Object.entries(dataStructures)) {
            if (this.files[dataType]) {
                const savePromise = this.saveData(dataType, dataStructure)
                    .then(success => {
                        results[dataType] = { success };
                        return { dataType, success };
                    })
                    .catch(error => {
                        results[dataType] = { success: false, error: error.message };
                        logger.logError(`Failed to save ${dataType}`, error);
                        return { dataType, success: false, error };
                    });
                
                savePromises.push(savePromise);
            }
        }

        await Promise.all(savePromises);
        
        const successCount = Object.values(results).filter(r => r.success).length;
        const totalCount = Object.keys(results).length;
        
        logger.debug(`💾 Saved ${successCount}/${totalCount} data files successfully`);
        
        return results;
    }

    /**
     * Create backup of a data file
     * @param {string} dataType - Type of data to backup
     * @returns {Promise<string|null>} Backup file path or null on failure
     */
    async createBackup(dataType) {
        const filePath = this.files[dataType];
        if (!filePath || !(await fs.pathExists(filePath))) {
            return null;
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(this.dataDir, 'backups');
            const backupPath = path.join(backupDir, `${dataType}_${timestamp}.json`);
            
            await fs.ensureDir(backupDir);
            await fs.copy(filePath, backupPath);
            
            logger.debug(`📋 Created backup: ${backupPath}`);
            return backupPath;
        } catch (error) {
            logger.logError(`Creating backup for ${dataType}`, error);
            return null;
        }
    }

    /**
     * Create backups of all data files
     * @returns {Promise<Object>} Object with backup results
     */
    async createAllBackups() {
        const backupResults = {};
        
        for (const dataType of Object.keys(this.files)) {
            backupResults[dataType] = await this.createBackup(dataType);
        }
        
        const successCount = Object.values(backupResults).filter(path => path !== null).length;
        logger.info(`📋 Created ${successCount} backups`);
        
        return backupResults;
    }

    /**
     * Clean old backup files (keep only recent ones)
     * @param {number} maxAge - Maximum age in days
     * @param {number} maxCount - Maximum number of backups to keep per data type
     * @returns {Promise<number>} Number of files cleaned
     */
    async cleanOldBackups(maxAge = 30, maxCount = 10) {
        const backupDir = path.join(this.dataDir, 'backups');
        
        if (!(await fs.pathExists(backupDir))) {
            return 0;
        }

        try {
            const files = await fs.readdir(backupDir);
            const now = Date.now();
            const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;
            
            // Group files by data type
            const filesByType = {};
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const dataType = file.split('_')[0];
                    if (!filesByType[dataType]) filesByType[dataType] = [];
                    
                    const filePath = path.join(backupDir, file);
                    const stats = await fs.stat(filePath);
                    filesByType[dataType].push({
                        path: filePath,
                        name: file,
                        age: now - stats.mtime.getTime()
                    });
                }
            }

            let deletedCount = 0;
            
            // Clean files for each data type
            for (const [dataType, typeFiles] of Object.entries(filesByType)) {
                // Sort by age (newest first)
                typeFiles.sort((a, b) => a.age - b.age);
                
                for (let i = 0; i < typeFiles.length; i++) {
                    const file = typeFiles[i];
                    const shouldDelete = file.age > maxAgeMs || i >= maxCount;
                    
                    if (shouldDelete) {
                        await fs.remove(file.path);
                        deletedCount++;
                        logger.debug(`🗑️ Deleted old backup: ${file.name}`);
                    }
                }
            }

            if (deletedCount > 0) {
                logger.info(`🗑️ Cleaned ${deletedCount} old backup files`);
            }
            
            return deletedCount;
        } catch (error) {
            logger.logError('Cleaning old backups', error);
            return 0;
        }
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>} Storage statistics
     */
    async getStorageStats() {
        const stats = {
            dataDir: this.dataDir,
            files: {},
            totalSize: 0,
            backupCount: 0
        };

        try {
            // Get main data files stats
            for (const [dataType, filePath] of Object.entries(this.files)) {
                if (await fs.pathExists(filePath)) {
                    const fileStats = await fs.stat(filePath);
                    stats.files[dataType] = {
                        size: fileStats.size,
                        modified: fileStats.mtime,
                        exists: true
                    };
                    stats.totalSize += fileStats.size;
                } else {
                    stats.files[dataType] = { exists: false };
                }
            }

            // Count backup files
            const backupDir = path.join(this.dataDir, 'backups');
            if (await fs.pathExists(backupDir)) {
                const backupFiles = await fs.readdir(backupDir);
                stats.backupCount = backupFiles.filter(f => f.endsWith('.json')).length;
            }

        } catch (error) {
            logger.logError('Getting storage stats', error);
        }

        return stats;
    }

    /**
     * Validate data file integrity
     * @param {string} dataType - Type of data to validate
     * @returns {Promise<Object>} Validation result
     */
    async validateDataFile(dataType) {
        const filePath = this.files[dataType];
        if (!filePath) {
            return { valid: false, error: 'Unknown data type' };
        }

        try {
            if (!(await fs.pathExists(filePath))) {
                return { valid: true, message: 'File does not exist (acceptable)' };
            }

            const jsonData = await fs.readJson(filePath);
            
            // Basic validation based on expected structure
            if (dataType === 'claimed') {
                const isValid = Array.isArray(jsonData);
                return { 
                    valid: isValid, 
                    message: isValid ? 'Valid array structure' : 'Expected array structure',
                    entries: isValid ? jsonData.length : 0
                };
            } else {
                const isValid = typeof jsonData === 'object' && jsonData !== null;
                return { 
                    valid: isValid, 
                    message: isValid ? 'Valid object structure' : 'Expected object structure',
                    entries: isValid ? Object.keys(jsonData).length : 0
                };
            }
        } catch (error) {
            return { 
                valid: false, 
                error: error.message,
                message: 'Failed to parse JSON'
            };
        }
    }

    /**
     * Validate all data files
     * @returns {Promise<Object>} Validation results for all files
     */
    async validateAllDataFiles() {
        const results = {};
        
        for (const dataType of Object.keys(this.files)) {
            results[dataType] = await this.validateDataFile(dataType);
        }
        
        const validCount = Object.values(results).filter(r => r.valid).length;
        const totalCount = Object.keys(results).length;
        
        logger.debug(`✅ Data validation: ${validCount}/${totalCount} files valid`);
        
        return {
            results,
            summary: {
                valid: validCount,
                total: totalCount,
                allValid: validCount === totalCount
            }
        };
    }
}

module.exports = DataStorage;