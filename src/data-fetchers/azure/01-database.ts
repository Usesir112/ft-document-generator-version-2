// ENHANCED FILE: src/data-fetchers/azure/01-database.ts - Cross-resource-group support
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables at the very top
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { SqlManagementClient } from "@azure/arm-sql";
import { MonitorClient } from "@azure/arm-monitor";
import { SecurityCenter } from "@azure/arm-security";
import { DefaultAzureCredential } from "@azure/identity";
import { SpecificationData } from "../../types";
import * as fs from 'fs';

/**
 * Enhanced function to fetch and save SQL database details with cross-resource-group support
 * @param sqlResourceGroupName The resource group containing the SQL Server and Database
 * @param serverName The name of the SQL Server
 * @param databaseName The name of the database
 */
export async function fetchAndSaveSqlDatabaseDetails(
    sqlResourceGroupName: string, 
    serverName: string, 
    databaseName: string
): Promise<void> {
    try {
        console.log(`📡 Fetching SQL Database details for ${databaseName}...`);
        console.log(`   SQL Resource Group: ${sqlResourceGroupName}`);
        console.log(`   SQL Server: ${serverName}`);
        console.log(`   Database: ${databaseName}`);

        // Initialize Azure clients
        const subscriptionId = process.env.azure_subscription_id;
        if (!subscriptionId) {
            throw new Error('azure_subscription_id environment variable is not set');
        }

        const credential = new DefaultAzureCredential();
        const sqlClient = new SqlManagementClient(credential, subscriptionId);
        const monitorClient = new MonitorClient(credential, subscriptionId);
        const securityClient = new SecurityCenter(credential, subscriptionId);

        // --- PRIMARY DATA FETCHING WITH CROSS-RESOURCE-GROUP SUPPORT ---
        console.log(`📋 Getting database and server information from ${sqlResourceGroupName}...`);
        const db = await sqlClient.databases.get(sqlResourceGroupName, serverName, databaseName);
        const server = await sqlClient.servers.get(sqlResourceGroupName, serverName);
        const tde = await sqlClient.transparentDataEncryptions.get(sqlResourceGroupName, serverName, databaseName, "current");
        const retentionPolicy = await sqlClient.backupShortTermRetentionPolicies.get(sqlResourceGroupName, serverName, databaseName, "default");

        // Fetch server auditing settings
        console.log(`🔍 Checking auditing settings...`);
        let serverAuditingSettings;
        try {
            serverAuditingSettings = await sqlClient.serverBlobAuditingPolicies.get(sqlResourceGroupName, serverName);
        } catch (error) {
            console.warn('⚠️  Could not fetch server auditing settings:', error);
        }

        // Fetch database auditing settings
        let databaseAuditingSettings;
        try {
            databaseAuditingSettings = await sqlClient.databaseBlobAuditingPolicies.get(sqlResourceGroupName, serverName, databaseName);
        } catch (error) {
            console.warn('⚠️  Could not fetch database auditing settings:', error);
        }

        // Fetch firewall rules
        console.log(`🔒 Checking firewall rules...`);
        let firewallRules = [];
        try {
            const firewallRulesIterator = sqlClient.firewallRules.listByServer(sqlResourceGroupName, serverName);
            for await (const rule of firewallRulesIterator) {
                firewallRules.push(rule);
            }
        } catch (error) {
            console.warn('⚠️  Could not fetch firewall rules:', error);
        }

        // Fetch geo-replication links
        console.log(`🌍 Checking geo-replication...`);
        let replicationLinks = [];
        try {
            const replicationLinksIterator = sqlClient.replicationLinks.listByDatabase(sqlResourceGroupName, serverName, databaseName);
            for await (const link of replicationLinksIterator) {
                replicationLinks.push(link);
            }
        } catch (error) {
            console.warn('⚠️  Could not fetch replication links:', error);
        }

        // Fetch Defender for Cloud status
        console.log(`🛡️  Checking Microsoft Defender status...`);
        let defenderStatus = 'Disabled';
        try {
            const defenderPricing = await securityClient.pricings.get("SqlServers");
            defenderStatus = defenderPricing.pricingTier === 'Standard' || defenderPricing.pricingTier === 'Free' ? 'Enabled' : 'Disabled';
        } catch (error) {
            console.warn('⚠️  Could not fetch Defender status:', error);
        }

        // Fetch diagnostic settings
        console.log(`📊 Checking diagnostic settings...`);
        let diagnosticSettingsValue = 'Disabled';
        let destinationDetailsValue = '-';
        const diagnosticSettingsList = [];
        
        try {
            const diagnosticSettingsCollection = await monitorClient.diagnosticSettings.list(db.id!);
            
            if (diagnosticSettingsCollection.value) {
                for (const setting of diagnosticSettingsCollection.value) {
                    diagnosticSettingsList.push(setting);
                }
            }
        } catch (error) {
            console.warn('⚠️  Could not fetch diagnostic settings:', error);
        }

        // --- LOGIC FOR DERIVED VALUES ---
        console.log(`⚙️  Processing configuration data...`);

        // Process diagnostic settings
        if (diagnosticSettingsList.length > 0) {
            diagnosticSettingsValue = 'Enabled';
            const firstSetting = diagnosticSettingsList[0];
            if (firstSetting.workspaceId) {
                destinationDetailsValue = `Log Analytics Workspace: ${firstSetting.workspaceId.split('/').pop()}`;
            } else if (firstSetting.storageAccountId) {
                destinationDetailsValue = `Storage Account: ${firstSetting.storageAccountId.split('/').pop()}`;
            } else if (firstSetting.eventHubAuthorizationRuleId) {
                destinationDetailsValue = `Event Hub: ${firstSetting.eventHubName || 'Default'}`;
            }
        }

        // Determine DTU/vCore value
        let computeValue = '-';
        if (db.currentSku) {
            if (db.currentSku.name?.includes('DTU')) {
                computeValue = `${db.currentSku.capacity || '-'} DTUs`;
            } else {
                computeValue = `${db.currentSku.capacity || '-'} vCores (${db.currentSku.name || 'Unknown'})`;
            }
        }

        // Check geo-replication
        const geoReplicationValue = replicationLinks.length > 0 ? replicationLinks.length.toString() : '0';

        // Check auditing status (server-level takes precedence)
        let auditingValue = 'off';
        if (serverAuditingSettings?.state === 'Enabled') {
            auditingValue = 'on';
        } else if (databaseAuditingSettings?.state === 'Enabled') {
            auditingValue = 'on';
        }

        // Check firewall status
        const firewallValue = firewallRules.length > 0 ? 'on' : 'off';

        // Build replica information
        let primaryLocation = db.location || server.location || '-';
        let replicaDetails = `Primary – ${primaryLocation}`;
        
        if (replicationLinks.length > 0) {
            const secondaryLocations = replicationLinks
                .map(link => link.partnerLocation)
                .filter(Boolean)
                .join(', ');
            if (secondaryLocations) {
                replicaDetails += `\nSecondary – ${secondaryLocations}`;
            }
        }

        // Backup schedule (SQL Database uses automated backups)
        const backupScheduleValue = 'Automatic (System Managed)';

        // --- SUMMARY LOGGING ---
        console.log(`📈 Database Configuration Summary:`);
        console.log(`   SQL Resource Group: ${sqlResourceGroupName}`);
        console.log(`   Database SKU: ${db.currentSku?.name} (${computeValue})`);
        console.log(`   TDE Status: ${tde.state}`);
        console.log(`   Auditing: ${auditingValue}`);
        console.log(`   Firewall Rules: ${firewallRules.length} rules`);
        console.log(`   Geo-Replication: ${geoReplicationValue} replicas`);
        console.log(`   Diagnostic Settings: ${diagnosticSettingsValue}`);
        console.log(`   Defender Status: ${defenderStatus}`);

        // --- DATA ASSEMBLY WITH CROSS-RG INFORMATION ---
        const data: SpecificationData = [
            { section: 'General', title: 'Number of DTUs', value: computeValue },
            { section: 'Configuration', title: 'Geo-Replication', value: geoReplicationValue },
            { section: 'Services', title: 'Transparent data encryption', value: tde.state === "Enabled" ? 'on' : 'off' },
            { section: 'Services', title: 'SQL Server – Auditing logs', value: auditingValue },
            { section: 'Services', title: 'SQL Server - Firewall', value: firewallValue },
            { section: 'Services', title: 'Data backup', value: `Daily, Retention ${retentionPolicy.retentionDays || '7'} Days` },
            { section: 'Services', title: 'Backup schedule', value: backupScheduleValue },
            { section: 'Security', title: 'Microsoft Defender for Cloud', value: defenderStatus },
            { section: 'Data Management', title: 'Replicas', value: replicaDetails },
            { section: 'Monitoring', title: 'Diagnostic settings', value: diagnosticSettingsValue },
            { section: 'Monitoring', title: 'Destination details', value: destinationDetailsValue },
        ];

        // --- SAVE TO FILE ---
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = 'database-data.json';
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        console.log(`✅ Database data saved to ${filePath}`);
        console.log(`🗄️ Cross-resource-group SQL configuration handled successfully!`);

    } catch (error) {
        console.error(`❌ Error fetching SQL Database details for ${databaseName}:`, error);
        throw error;
    }
}

// 🧪 MANUAL TESTING SECTION with cross-resource-group examples
if (require.main === module) {
    console.log('🧪 Running Enhanced Database Fetcher in Test Mode');
    console.log('=================================================');
    
    (async () => {
        const testConfigs = [
            {
                name: "SQL in Main Resource Group",
                sqlResourceGroup: "batchline-unison-main",
                serverName: "batchline-unison-test",
                databaseName: "batchline-unison-test-legacy"
            },
            {
                name: "SQL in Dedicated Data Resource Group",
                sqlResourceGroup: "batchline-unison-data",
                serverName: "batchline-unison-data-server",
                databaseName: "batchline-unison-test-db"
            }
        ];

        try {
            for (const config of testConfigs) {
                console.log(`\n🎯 Processing ${config.name}`);
                console.log('─'.repeat(50));
                
                await fetchAndSaveSqlDatabaseDetails(
                    config.sqlResourceGroup,
                    config.serverName,
                    config.databaseName
                );
                
                console.log(`✅ Completed ${config.name}`);
            }
            
            console.log('\n🎉 All test configurations completed successfully!');
            console.log('📁 Check the output/ directory for generated JSON files');
            console.log('💡 Cross-resource-group SQL support tested and working!');
            
        } catch (error) {
            console.error('\n❌ Test failed:', error);
            process.exit(1);
        }
    })();
}
