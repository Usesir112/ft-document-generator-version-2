// ENHANCED FILE: src/main.ts - Enhanced main entry point with cross-resource-group support
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

// Import enhanced configuration
import { getResourceNames, getResourceGroup, displayCurrentConfig, CONFIG } from './config';

async function main() {
    try {
        console.log('🚀 Starting Enhanced Azure Infrastructure Report Generation');
        console.log('=======================================================');
        
        // Display current configuration
        displayCurrentConfig();
        
        console.log('📡 Fetching Azure resource data with cross-resource-group support...');
        
        // Get enhanced resource configuration
        const resources = getResourceNames();
        
        console.log('🎯 Resource Mapping:');
        console.log(`   Web App: ${resources.webAppName} → RG: ${getResourceGroup('webapp')}`);
        console.log(`   App Service Plan: ${resources.legacyPlanName} → RG: ${getResourceGroup('plan')}`);
        console.log(`   SQL Server: ${resources.sqlServerName} → RG: ${getResourceGroup('sql')}`);
        console.log(`   SQL Database: ${resources.sqlDatabaseName}`);
        console.log(`   Redis Cache: ${resources.redisCacheName} → RG: ${getResourceGroup('redis')}`);
        console.log(`   Storage Account: ${resources.storageAccountName} → RG: ${getResourceGroup('storage')}`);
        console.log('');
        
        // Run all data fetching operations in parallel with cross-resource-group support
        await Promise.all([
            fetchAndSaveWebServerDetails(
                getResourceGroup('webapp'),    // Web app resource group
                resources.webAppName, 
                resources.legacyPlanName,
                getResourceGroup('plan')       // App Service Plan resource group
            ),
            fetchAndSaveSqlDatabaseDetails(
                getResourceGroup('sql'),       // SQL resource group
                resources.sqlServerName, 
                resources.sqlDatabaseName
            ),
            fetchAndSaveRedisDetails(
                getResourceGroup('redis'),     // Redis resource group
                resources.redisCacheName
            ),
            fetchAndSaveStorageDetails(
                getResourceGroup('storage'),   // Storage resource group
                resources.storageAccountName
            ),
            fetchAndSaveAlertDetails(
                resources.resourceGroupName,   // Primary resource group for alerts
                resources.webAppName, 
                resources.sqlServerName, 
                resources.sqlDatabaseName,
                resources.redisCacheName,
                {
                    webAppResourceGroup: getResourceGroup('webapp'),
                    sqlResourceGroup: getResourceGroup('sql'),
                    redisResourceGroup: getResourceGroup('redis')
                }
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
        console.log('💡 Cross-resource-group discovery worked seamlessly!');
        console.log('');
        
    } catch (error) {
        console.error('❌ An error occurred during the process:', error);
        console.error('');
        console.error('🔍 Troubleshooting tips:');
        console.error('   - Verify Azure credentials and permissions');
        console.error('   - Check resource names and resource groups');
        console.error('   - Ensure resources exist and are accessible');
        console.error('   - Review the enhanced discovery output above');
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

/**
 * Test cross-resource-group discovery without running full process
 */
export function testDiscovery() {
    console.log('🧪 Testing Cross-Resource-Group Discovery');
    console.log('=========================================');
    
    const resources = getResourceNames();
    
    console.log('📋 Discovered Configuration:');
    console.log('');
    
    // Test each resource type
    const resourceTypes = [
        { type: 'webapp' as const, name: resources.webAppName, desc: 'Web Application' },
        { type: 'plan' as const, name: resources.legacyPlanName, desc: 'App Service Plan' },
        { type: 'sql' as const, name: resources.sqlServerName, desc: 'SQL Server' },
        { type: 'redis' as const, name: resources.redisCacheName, desc: 'Redis Cache' },
        { type: 'storage' as const, name: resources.storageAccountName, desc: 'Storage Account' }
    ];
    
    resourceTypes.forEach(resource => {
        const resourceGroup = getResourceGroup(resource.type);
        const isPrimary = resourceGroup === resources.resourceGroupName;
        const status = isPrimary ? '(Primary RG)' : '(Cross RG)';
        
        console.log(`🔍 ${resource.desc}:`);
        console.log(`   Name: ${resource.name}`);
        console.log(`   Resource Group: ${resourceGroup} ${status}`);
        console.log('');
    });
    
    console.log('✅ Discovery test completed!');
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
        case 'test-discovery':
        case 'discovery':
            testDiscovery();
            break;
        default:
            main();
    }
}
