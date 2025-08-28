// src/data-fetchers/redis.ts - Simplified Redis Data Fetcher
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables at the very top
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { RedisManagementClient } from "@azure/arm-rediscache";
import { MonitorClient } from "@azure/arm-monitor";
import { DefaultAzureCredential } from "@azure/identity";
import { SpecificationData } from "../../types";
import * as fs from 'fs';

/**
 * Maps a Redis SKU to its corresponding memory size and connection limit.
 * Based on Azure Redis Cache pricing tiers.
 */
function getSkuDetails(skuName?: string, skuFamily?: string, skuCapacity?: number): { memory: string; connections: string } {
    if (!skuName || !skuFamily || skuCapacity === undefined) {
        return { memory: '-', connections: '-' };
    }

    // Basic tier (C family)
    if (skuFamily === 'C' && skuName === 'Basic') {
        switch (skuCapacity) {
            case 0: return { memory: '250 MB', connections: 'Up to 256' };
            case 1: return { memory: '1 GB', connections: 'Up to 1,000' };
            case 2: return { memory: '2.5 GB', connections: 'Up to 2,000' };
            case 3: return { memory: '6 GB', connections: 'Up to 5,000' };
            case 4: return { memory: '13 GB', connections: 'Up to 10,000' };
            case 5: return { memory: '26 GB', connections: 'Up to 15,000' };
            case 6: return { memory: '53 GB', connections: 'Up to 20,000' };
        }
    }

    // Standard tier (C family)
    if (skuFamily === 'C' && skuName === 'Standard') {
        switch (skuCapacity) {
            case 0: return { memory: '250 MB', connections: 'Up to 256' };
            case 1: return { memory: '1 GB', connections: 'Up to 1,000' };
            case 2: return { memory: '2.5 GB', connections: 'Up to 2,000' };
            case 3: return { memory: '6 GB', connections: 'Up to 5,000' };
            case 4: return { memory: '13 GB', connections: 'Up to 10,000' };
            case 5: return { memory: '26 GB', connections: 'Up to 15,000' };
            case 6: return { memory: '53 GB', connections: 'Up to 20,000' };
        }
    }

    // Premium tier (P family)
    if (skuFamily === 'P' && skuName === 'Premium') {
        switch (skuCapacity) {
            case 1: return { memory: '6 GB', connections: 'Up to 7,500' };
            case 2: return { memory: '13 GB', connections: 'Up to 15,000' };
            case 3: return { memory: '26 GB', connections: 'Up to 30,000' };
            case 4: return { memory: '53 GB', connections: 'Up to 40,000' };
            case 5: return { memory: '120 GB', connections: 'Up to 40,000' };
        }
    }

    return { memory: `${skuName} ${skuFamily}${skuCapacity}`, connections: '-' };
}

/**
 * Determines the SLA based on the Redis Cache tier.
 */
function getSLA(skuName?: string): string {
    if (!skuName) return '-';
    
    switch (skuName.toLowerCase()) {
        case 'basic':
            return '99.9%';
        case 'standard':
            return '99.9%';
        case 'premium':
            return '99.95%';
        default:
            return 'At least 99.9%';
    }
}

/**
 * Fetches and saves all relevant details for a given Azure Redis Cache.
 * @param resourceGroupName The name of the resource group.
 * @param cacheName The name of the Redis Cache.
 */
export async function fetchAndSaveRedisDetails(
    resourceGroupName: string, 
    cacheName: string
): Promise<void> {
    try {
        console.log(`📡 Fetching Redis Cache details for ${cacheName}...`);

        // Initialize Azure clients
        const subscriptionId = process.env.azure_subscription_id;
        if (!subscriptionId) {
            throw new Error('azure_subscription_id environment variable is not set');
        }

        const credential = new DefaultAzureCredential();
        const redisClient = new RedisManagementClient(credential, subscriptionId);
        const monitorClient = new MonitorClient(credential, subscriptionId);

        // --- PRIMARY DATA FETCHING ---
        console.log(`📋 Getting Redis Cache information...`);
        const redisCache = await redisClient.redis.get(resourceGroupName, cacheName);

        // --- LOGIC FOR DERIVED VALUES ---
        console.log(`⚙️  Processing Redis configuration...`);
        
        // Get SKU details (memory and connections)
        const skuDetails = getSkuDetails(redisCache.sku?.name, redisCache.sku?.family, redisCache.sku?.capacity);
        
        // Get SLA based on tier
        const slaValue = getSLA(redisCache.sku?.name);

        // Format encryption details
        const tlsVersion = redisCache.minimumTlsVersion || '1.2';
        const sslPort = redisCache.sslPort || 6380;
        const encryptionValue = `SSL TLS${tlsVersion}, SSL port ${sslPort}, ${redisCache.enableNonSslPort ? 'Enable' : 'Disable'} Non-SSL port`;

        // SSL access policy
        const sslOnlyValue = redisCache.enableNonSslPort ? 'No' : 'Yes';

        // Port configurations
        const nonSslPortValue = redisCache.enableNonSslPort ? 'Enabled' : 'Disabled';
        const sslPortValue = sslPort.toString();

        // Maxmemory policy
        const maxMemoryPolicy = redisCache.redisConfiguration?.['maxmemory-policy'] || 'volatile-lru';

        // Fetch diagnostic settings
        console.log(`📊 Checking diagnostic settings...`);
        let diagnosticSettingsValue = 'Disabled';
        let destinationDetailsValue = '-';
        
        try {
            const diagnosticSettingsCollection = await monitorClient.diagnosticSettings.list(redisCache.id!);
            if (diagnosticSettingsCollection.value && diagnosticSettingsCollection.value.length > 0) {
                diagnosticSettingsValue = 'Enable all logs';
                const firstSetting = diagnosticSettingsCollection.value[0];
                if (firstSetting.workspaceId) {
                    destinationDetailsValue = `Log analytics workspace: ${firstSetting.workspaceId.split('/').pop()}`;
                } else if (firstSetting.storageAccountId) {
                    destinationDetailsValue = `Storage Account: ${firstSetting.storageAccountId.split('/').pop()}`;
                } else if (firstSetting.eventHubAuthorizationRuleId) {
                    destinationDetailsValue = `Event Hub: ${firstSetting.eventHubName || 'Default'}`;
                }
            }
        } catch (error) {
            console.warn('⚠️  Could not fetch diagnostic settings:', error);
        }

        // --- SUMMARY LOGGING ---
        console.log(`📈 Redis Cache Configuration Summary:`);
        console.log(`   SKU: ${redisCache.sku?.name} ${redisCache.sku?.family}${redisCache.sku?.capacity}`);
        console.log(`   Memory: ${skuDetails.memory}`);
        console.log(`   Connections: ${skuDetails.connections}`);
        console.log(`   SLA: ${slaValue}`);
        console.log(`   SSL Only: ${sslOnlyValue}`);
        console.log(`   TLS Version: ${tlsVersion}`);
        console.log(`   Max Memory Policy: ${maxMemoryPolicy}`);
        console.log(`   Diagnostic Settings: ${diagnosticSettingsValue}`);

        // --- DATA ASSEMBLY ---
        const data: SpecificationData = [
            { section: 'General', title: 'Memory', value: skuDetails.memory },
            { section: 'General', title: 'SLA', value: slaValue },
            { section: 'General', title: 'Encryption in transit', value: encryptionValue },
            { section: 'General', title: 'Connections', value: skuDetails.connections },
            { section: 'General', title: 'Allow access only via SSL', value: sslOnlyValue },
            { section: 'General', title: 'Location', value: redisCache.location || '-' },
            { section: 'General', title: 'Pricing Tier', value: `${redisCache.sku?.name || '-'} (${redisCache.sku?.family || '-'}${redisCache.sku?.capacity || '-'})` },
            { section: 'Advanced settings', title: 'Non-SSL Port', value: nonSslPortValue },
            { section: 'Advanced settings', title: 'SSL Port', value: sslPortValue },
            { section: 'Advanced settings', title: 'Minimum TLS version', value: tlsVersion },
            { section: 'Advanced settings', title: 'Maxmemory policy', value: maxMemoryPolicy },
            { section: 'Advanced settings', title: 'Redis Version', value: redisCache.redisVersion || '-' },
            { section: 'Security', title: 'Access Keys', value: redisCache.accessKeys ? 'Configured' : '-' },
            { section: 'Monitoring', title: 'Diagnostic settings', value: diagnosticSettingsValue },
            { section: 'Monitoring', title: 'Destination details', value: destinationDetailsValue },
        ];

        // --- SAVE TO FILE ---
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = 'redis-data.json';
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        console.log(`✅ Redis Cache data saved to ${filePath}`);

    } catch (error) {
        console.error(`❌ Error fetching Redis Cache details for ${cacheName}:`, error);
        throw error;
    }
}

// 🧪 MANUAL TESTING SECTION
// This block allows the script to be run directly for testing purposes.
// Usage: ts-node src/data-fetchers/redis.ts
if (require.main === module) {
    console.log('🧪 Running Redis Cache Fetcher in Test Mode');
    console.log('===========================================');
    
    (async () => {
        // Test configurations for different environments
        const testConfigs = [
            {
                name: "Test Environment Redis Cache",
                resourceGroupName: "batchline-orbia-test",
                cacheName: "batchline-orbia-test"
            },
            // 🔧 Uncomment to test production environment
            // {
            //     name: "Production Environment Redis Cache",
            //     resourceGroupName: "batchline-orbia-prod",
            //     cacheName: "batchline-orbia-prod"
            // }
        ];

        try {
            for (const config of testConfigs) {
                console.log(`\n🎯 Processing ${config.name}`);
                console.log('─'.repeat(50));
                
                await fetchAndSaveRedisDetails(
                    config.resourceGroupName,
                    config.cacheName
                );
                
                console.log(`✅ Completed ${config.name}`);
            }
            
            console.log('\n🎉 All test configurations completed successfully!');
            console.log('📁 Check the output/ directory for generated JSON files');
            
        } catch (error) {
            console.error('\n❌ Test failed:', error);
            process.exit(1);
        }
    })();
}
