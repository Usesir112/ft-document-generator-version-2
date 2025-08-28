// src/data-fetchers/database/01-query-default-config.ts
// Default configuration query - generates its own output files
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { dbManager } from './00-connect-db';
import { SpecificationData } from '../../types';
import * as fs from 'fs';

/**
 * Configuration item interface (matches database schema)
 */
export interface ConfigurationItem {
    ConfigKey: string;
    Description: string;
    DefaultValue: string;
}

/**
 * Raw configuration format (as requested)
 */
export interface RawConfigurationItem {
    configkeyNo: string;
    desc: string;
    value: string;
}

/**
 * Fetch and save default configuration data
 */
export async function fetchAndSaveDefaultConfiguration(): Promise<void> {
    try {
        console.log('📡 Fetching Default Configuration from database...');
        
        // Connect to database
        await dbManager.connect();
        
        // Execute the configuration query
        const query = 'SELECT * FROM Configuration ORDER BY ConfigKey';
        const configItems = await dbManager.executeQuery<ConfigurationItem>(
            query,
            'Fetch default configuration'
        );
        
        console.log(`📊 Processing ${configItems.length} configuration items...`);
        
        // Transform to raw format (as you requested)
        const rawData: RawConfigurationItem[] = configItems.map(item => ({
            configkeyNo: item.ConfigKey || '',
            desc: item.Description || '',
            value: item.DefaultValue || ''
        }));
        
        // Transform to specification data format (for document generation)
        const specificationData: SpecificationData = configItems.map(item => ({
            section: 'Default Configuration',
            title: item.ConfigKey || 'Unknown Key',
            value: `${item.Description || 'No description'}: ${item.DefaultValue || 'No value'}`
        }));
        
        // --- SAVE TO FILES ---
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Save specification data (for document generation)
        const specFileName = 'default-config-data.json';
        const specFilePath = path.join(outputDir, specFileName);
        fs.writeFileSync(specFilePath, JSON.stringify(specificationData, null, 2));
        
        // Save raw data (your requested format)
        const rawFileName = 'default-config-raw.json';
        const rawFilePath = path.join(outputDir, rawFileName);
        fs.writeFileSync(rawFilePath, JSON.stringify(rawData, null, 2));
        
        // --- SUMMARY LOGGING ---
        console.log(`📈 Default Configuration Summary:`);
        console.log(`   Total Items: ${configItems.length}`);
        console.log(`   Database: ${dbManager.getConnectionInfo().server}/${dbManager.getConnectionInfo().database}`);
        console.log(`   Connection IP: ${dbManager.getConnectionInfo().currentIP}`);
        
        console.log(`✅ Default Configuration data saved:`);
        console.log(`   - ${specFileName} (for document generation)`);
        console.log(`   - ${rawFileName} (raw format as requested)`);
        
    } catch (error) {
        console.error('❌ Error fetching default configuration:', error);
        throw error;
    } finally {
        await dbManager.disconnect();
    }
}

/**
 * Query specific configuration by key pattern (utility function)
 */
export async function queryConfigurationByPattern(
    pattern: string,
    description: string
): Promise<RawConfigurationItem[]> {
    try {
        console.log(`🔍 Querying configuration by pattern: ${pattern}`);
        
        await dbManager.connect();
        
        const query = 'SELECT * FROM Configuration WHERE ConfigKey LIKE @pattern ORDER BY ConfigKey';
        const configItems = await dbManager.executeParameterizedQuery<ConfigurationItem>(
            query,
            { pattern: `%${pattern}%` },
            `Query configuration by pattern: ${description}`
        );
        
        const rawData: RawConfigurationItem[] = configItems.map(item => ({
            configkeyNo: item.ConfigKey || '',
            desc: item.Description || '',
            value: item.DefaultValue || ''
        }));
        
        console.log(`📊 Found ${rawData.length} configuration items matching pattern "${pattern}"`);
        
        return rawData;
        
    } catch (error) {
        console.error(`❌ Error querying configuration by pattern "${pattern}":`, error);
        throw error;
    } finally {
        await dbManager.disconnect();
    }
}

// 🧪 MANUAL TESTING SECTION
if (require.main === module) {
    console.log('🧪 Testing Default Configuration Query');
    console.log('=====================================');
    
    (async () => {
        try {
            await fetchAndSaveDefaultConfiguration();
            
            console.log('\n🎉 Default configuration query completed successfully!');
            console.log('📁 Check the output/ directory for generated files:');
            console.log('   - default-config-data.json (for document generation)');
            console.log('   - default-config-raw.json (raw format as requested)');
            
        } catch (error) {
            console.error('\n❌ Default configuration query failed:', error);
            process.exit(1);
        }
    })();
}
