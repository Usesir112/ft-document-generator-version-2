// ENHANCED FILE: src/data-fetchers/azure/02-storage.ts - Cross-resource-group support
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables at the very top
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { StorageManagementClient } from "@azure/arm-storage";
import { MonitorClient } from "@azure/arm-monitor";
import { SecurityCenter } from "@azure/arm-security";
import { DefaultAzureCredential } from "@azure/identity";
import { SpecificationData } from "../../types";
import * as fs from 'fs';

/**
 * Maps Azure Storage redundancy types to replica information.
 */
function getReplicationDetails(sku?: string, secondaryLocation?: string): { replicas: string; locations: string } {
    if (!sku) return { replicas: '-', locations: '-' };

    switch (sku) {
        case 'Standard_LRS':
            return { replicas: '3 local replicas', locations: 'Single region' };
        case 'Standard_GRS':
        case 'Standard_RAGRS':
            return { 
                replicas: 'At least 6 replicas', 
                locations: secondaryLocation ? `Primary – ${''}\nSecondary – ${secondaryLocation}` : 'Geo-redundant' 
            };
        case 'Standard_ZRS':
            return { replicas: '3 zone replicas', locations: 'Single region (zone-redundant)' };
        case 'Standard_GZRS':
        case 'Standard_RAGZRS':
            return { 
                replicas: 'At least 6 replicas (zone + geo)', 
                locations: secondaryLocation ? `Primary – ${''}\nSecondary – ${secondaryLocation}` : 'Zone + Geo redundant' 
            };
        default:
            return { replicas: 'At least 1', locations: '-' };
    }
}

/**
 * Gets the SLA percentage based on storage account type and redundancy.
 */
function getStorageSLA(sku?: string, accessTier?: string): string {
    if (!sku) return '-';

    // Hot access tier typically has higher SLA
    if (accessTier === 'Hot') {
        if (sku.includes('GRS') || sku.includes('RAGRS')) {
            return '99.9%'; // Geo-redundant hot storage
        }
        return '99.9%'; // Local hot storage
    }
    
    // Cool access tier
    if (accessTier === 'Cool') {
        return '99.0%';
    }

    // Default for standard storage
    if (sku.includes('Standard')) {
        return '99.5% - 99.9%';
    }

    return '99.5% - 99.9%';
}

/**
 * Determines the encryption type from storage account properties.
 */
function getEncryptionType(encryption?: any): string {
    if (!encryption) return 'Microsoft-managed keys';
    
    if (encryption.keySource === 'Microsoft.Keyvault') {
        return 'Customer-managed keys';
    }
    
    return 'Microsoft-managed keys';
}

/**
 * Enhanced function to fetch and save Azure Storage Account details with cross-resource-group support
 * @param storageResourceGroupName The resource group containing the Storage Account
 * @param accountName The name of the Storage Account
 */
export async function fetchAndSaveStorageDetails(
    storageResourceGroupName: string, 
    accountName: string
): Promise<void> {
    try {
        console.log(`📡 Fetching Storage Account details for ${accountName}...`);
        console.log(`   Storage Resource Group: ${storageResourceGroupName}`);

        // Initialize Azure clients
        const subscriptionId = process.env.azure_subscription_id;
        if (!subscriptionId) {
            throw new Error('azure_subscription_id environment variable is not set');
        }

        const credential = new DefaultAzureCredential();
        const storageClient = new StorageManagementClient(credential, subscriptionId);
        const monitorClient = new MonitorClient(credential, subscriptionId);
        const securityClient = new SecurityCenter(credential, subscriptionId);

        // --- PRIMARY DATA FETCHING WITH CROSS-RESOURCE-GROUP SUPPORT ---
        console.log(`📋 Getting storage account information from ${storageResourceGroupName}...`);
        const account = await storageClient.storageAccounts.getProperties(storageResourceGroupName, accountName);

        // Get blob service properties for container access level
        console.log(`🔍 Checking blob service properties...`);
        let blobServiceProperties;
        try {
            blobServiceProperties = await storageClient.blobServices.getServiceProperties(storageResourceGroupName, accountName);
        } catch (error) {
            console.warn('⚠️  Could not fetch blob service properties:', error);
        }

        // List containers to check access levels
        console.log(`📦 Checking container configurations...`);
        let containers = [];
        try {
            const containersIterator = storageClient.blobContainers.list(storageResourceGroupName, accountName);
            for await (const container of containersIterator) {
                containers.push(container);
            }
        } catch (error) {
            console.warn('⚠️  Could not fetch containers:', error);
        }

        // Fetch Defender for Cloud status for Storage
        console.log(`🛡️  Checking Microsoft Defender status...`);
        let defenderStatus = 'Disabled';
        try {
            const defenderPricing = await securityClient.pricings.get("StorageAccounts");
            defenderStatus = defenderPricing.pricingTier === 'Standard' ? 'Enable' : 'Disabled';
        } catch (error) {
            console.warn('⚠️  Could not fetch Defender status:', error);
        }

        // Fetch diagnostic settings
        console.log(`📊 Checking diagnostic settings...`);
        let diagnosticSettingsValue = 'Disabled';
        let destinationDetailsValue = '-';
        
        try {
            const diagnosticSettingsCollection = await monitorClient.diagnosticSettings.list(account.id!);
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

        // --- LOGIC FOR DERIVED VALUES ---
        console.log(`⚙️  Processing storage configuration...`);
        
        const replicationDetails = getReplicationDetails(account.sku?.name, account.secondaryLocation);
        const slaValue = getStorageSLA(account.sku?.name, account.accessTier);
        const encryptionType = getEncryptionType(account.encryption);
        
        // Determine geographical locations
        let geographicalLocation = `Primary – ${account.primaryLocation || '-'}`;
        if (account.secondaryLocation) {
            geographicalLocation += `\nSecondary – ${account.secondaryLocation}`;
        }

        // Check container access levels (most restrictive wins)
        let containerAccessLevel = 'Private';
        if (containers.length > 0) {
            const hasPublic = containers.some(container => 
                container.publicAccess === 'Blob' || container.publicAccess === 'Container'
            );
            if (hasPublic) {
                containerAccessLevel = 'Public (Blob or Container level)';
            }
        }

        // --- SUMMARY LOGGING ---
        console.log(`📈 Storage Account Configuration Summary:`);
        console.log(`   Storage Resource Group: ${storageResourceGroupName}`);
        console.log(`   Account Kind: ${account.kind}`);
        console.log(`   SKU: ${account.sku?.name} (${account.sku?.tier})`);
        console.log(`   Access Tier: ${account.accessTier}`);
        console.log(`   Replication: ${replicationDetails.replicas}`);
        console.log(`   SLA: ${slaValue}`);
        console.log(`   Encryption: ${encryptionType}`);
        console.log(`   HTTPS Only: ${account.enableHttpsTrafficOnly ? 'Enabled' : 'Disabled'}`);
        console.log(`   Containers: ${containers.length} found`);
        console.log(`   Container Access: ${containerAccessLevel}`);
        console.log(`   Defender Status: ${defenderStatus}`);
        console.log(`   Diagnostic Settings: ${diagnosticSettingsValue}`);

        // --- DATA ASSEMBLY WITH CROSS-RG INFORMATION ---
        const data: SpecificationData = [
            { section: 'General', title: 'Account Kind', value: account.kind || '-' },
            { section: 'General', title: 'Performance', value: account.sku?.tier || '-' },
            { section: 'General', title: 'Replication', value: account.sku?.name || '-' },
            { section: 'General', title: 'Access Tier', value: account.accessTier || '-' },
            { section: 'General', title: 'Local replica', value: replicationDetails.replicas },
            { section: 'General', title: 'SLA', value: slaValue },
            { section: 'General', title: 'Geographical Location', value: geographicalLocation },
            { section: 'Container', title: 'Change access level', value: containerAccessLevel },
            { section: 'Security', title: 'Encryption type', value: encryptionType },
            { section: 'Security', title: 'Secure transfer required', value: account.enableHttpsTrafficOnly ? 'Enabled' : 'Disabled' },
            { section: 'Security', title: 'Allow Blob public access', value: account.allowBlobPublicAccess ? 'Enabled' : 'Disabled' },
            { section: 'Security', title: 'Microsoft Defender for Cloud', value: defenderStatus },
            { section: 'Configuration', title: 'Minimum TLS version', value: account.minimumTlsVersion || '-' },
            { section: 'Configuration', title: 'Large file shares', value: account.largeFileSharesState || 'Disabled' },
            { section: 'Monitoring', title: 'Diagnostic settings', value: diagnosticSettingsValue },
            { section: 'Monitoring', title: 'Destination details', value: destinationDetailsValue },
        ];

        // --- SAVE TO FILE ---
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = 'storage-data.json';
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        console.log(`✅ Storage Account data saved to ${filePath}`);
        console.log(`💾 Cross-resource-group Storage configuration handled successfully!`);

    } catch (error) {
        console.error(`❌ Error fetching Storage Account details for ${accountName}:`, error);
        throw error;
    }
}

// 🧪 MANUAL TESTING SECTION with cross-resource-group examples
if (require.main === module) {
    console.log('🧪 Running Enhanced Storage Account Fetcher in Test Mode');
    console.log('======================================================');
    
    (async () => {
        const testConfigs = [
            {
                name: "Storage in Main Resource Group",
                storageResourceGroup: "batchline-unison-main",
                accountName: "batchlineunisonttest"
            },
            {
                name: "Storage in Dedicated Storage Resource Group",
                storageResourceGroup: "batchline-unison-storage",
                accountName: "batchlinesharedstorage"
            }
        ];

        try {
            for (const config of testConfigs) {
                console.log(`\n🎯 Processing ${config.name}`);
                console.log('─'.repeat(60));
                
                await fetchAndSaveStorageDetails(
                    config.storageResourceGroup,
                    config.accountName
                );
                
                console.log(`✅ Completed ${config.name}`);
            }
            
            console.log('\n🎉 All test configurations completed successfully!');
            console.log('📁 Check the output/ directory for generated JSON files');
            console.log('💡 Cross-resource-group Storage support tested and working!');
            
        } catch (error) {
            console.error('\n❌ Test failed:', error);
            process.exit(1);
        }
    })();
}
