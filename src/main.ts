// main.ts - Simple main entry point
import * as dotenv from 'dotenv';
dotenv.config();

// Import data fetchers from azure cloud providers
import { fetchAndSaveWebServerDetails } from './data-fetchers/azure/00-web-server';
import { fetchAndSaveSqlDatabaseDetails } from './data-fetchers/azure/01-database';
import { fetchAndSaveStorageDetails } from './data-fetchers/azure/02-storage';
import { fetchAndSaveRedisDetails } from './data-fetchers/azure/03-redis';
import { fetchAndSaveAlertDetails } from './data-fetchers/azure/04-alert';

// Import document generator
import { generateDocument } from './doc-generators/document-generator';

// Import configuration
import { getResourceNames, displayCurrentConfig, CONFIG } from './config';

async function main() {
    try {
        console.log('🚀 Starting Azure Infrastructure Report Generation');
        console.log('================================================');
        
        // Display current configuration
        displayCurrentConfig();
        
        console.log('📡 Fetching Azure resource data...');
        
        // Get auto-generated resource names
        const resources = getResourceNames();
        
        // Run all data fetching operations in parallel
        await Promise.all([
            fetchAndSaveWebServerDetails(
                resources.resourceGroupName, 
                resources.webAppName, 
                resources.legacyPlanName
            ),
            fetchAndSaveSqlDatabaseDetails(
                resources.resourceGroupName, 
                resources.sqlServerName, 
                resources.sqlDatabaseName
            ),
            fetchAndSaveRedisDetails(
                resources.resourceGroupName, 
                resources.redisCacheName
            ),
            fetchAndSaveStorageDetails(
                resources.resourceGroupName, 
                resources.storageAccountName
            ),
            fetchAndSaveAlertDetails(
                resources.resourceGroupName, 
                resources.webAppName, 
                resources.sqlServerName, 
                resources.sqlDatabaseName,
                resources.redisCacheName
            )
            // 🆕 Add new data fetchers here
        ]);
        
        console.log('✅ Data fetching completed successfully!');
        console.log('');
        console.log('📄 Generating Word document...');
        
        // Generate the document
        generateDocument();
        
        console.log('');
        console.log('🎉 Process completed successfully!');
        console.log(`📁 Output file: ${CONFIG.outputFilename}`);
        console.log('');
        
    } catch (error) {
        console.error('❌ An error occurred during the process:', error);
        process.exit(1);
    }
}

// 🔄 Additional utility functions

/**
 * Regenerate document only (without fetching new data)
 */
export async function regenerateDocumentOnly() {
    try {
        console.log('📄 Regenerating document from existing data...');
        generateDocument();
        console.log(`✅ Document regenerated: ${CONFIG.outputFilename}`);
    } catch (error) {
        console.error('❌ Error regenerating document:', error);
        throw error;
    }
}

/**
 * Display configuration without running the main process
 */
export function showConfig() {
    displayCurrentConfig();
}

// Run main function if this file is executed directly
if (require.main === module) {
    const command = process.argv[2];
    
    switch (command) {
        case 'config':
        case 'show-config':
            showConfig();
            break;
        case 'doc-only':
        case 'document-only':
            regenerateDocumentOnly();
            break;
        default:
            main();
    }
}
