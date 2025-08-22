// src/data-fetchers/web-server.ts - Simplified Web Server Data Fetcher
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables at the very top
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { WebSiteManagementClient } from "@azure/arm-appservice";
import { MonitorClient, AutoscaleSettingResource } from "@azure/arm-monitor";
import { SecurityCenter } from "@azure/arm-security";
import { DefaultAzureCredential } from "@azure/identity";
import { SpecificationData } from "../types";
import * as fs from 'fs';

/**
 * Fetches and saves all relevant details for a given Web App and its associated resources.
 * @param resourceGroupName The name of the resource group.
 * @param webAppName The name of the Web App.
 * @param planName The name of the App Service Plan.
 */
export async function fetchAndSaveWebServerDetails(
    resourceGroupName: string, 
    webAppName: string, 
    planName: string
): Promise<void> {
    try {
        console.log(`📡 Fetching Web Server details for ${webAppName}...`);

        // Initialize Azure clients
        const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
        if (!subscriptionId) {
            throw new Error('AZURE_SUBSCRIPTION_ID environment variable is not set');
        }

        const credential = new DefaultAzureCredential();
        const webClient = new WebSiteManagementClient(credential, subscriptionId);
        const monitorClient = new MonitorClient(credential, subscriptionId);
        const securityClient = new SecurityCenter(credential, subscriptionId);

        // --- PRIMARY DATA FETCHING ---
        console.log(`📋 Getting App Service Plan and Web App information...`);
        const plan = await webClient.appServicePlans.get(resourceGroupName, planName);
        const webApp = await webClient.webApps.get(resourceGroupName, webAppName);
        const config = await webClient.webApps.getConfiguration(resourceGroupName, webAppName);

        console.log(`💾 Checking backup configuration...`);
        let backupConfig;
        try {
            backupConfig = await webClient.webApps.getBackupConfiguration(resourceGroupName, webAppName);
        } catch (error) {
            console.warn('⚠️  Could not fetch backup configuration:', error);
        }

        console.log(`📝 Checking logging configuration...`);
        let appServiceLogsConfig;
        try {
            appServiceLogsConfig = await webClient.webApps.getDiagnosticLogsConfiguration(resourceGroupName, webAppName);
        } catch (error) {
            console.warn('⚠️  Could not fetch diagnostic logs configuration:', error);
        }

        // --- LOGIC FOR DERIVED VALUES ---
        console.log(`⚙️  Processing Web App configuration...`);

        // Determine the scaling method by checking for autoscale rules or elastic scaling
        console.log(`🔍 Checking autoscale settings...`);
        let autoscaleSetting: AutoscaleSettingResource | undefined;
        try {
            const autoscaleSettingsIterator = monitorClient.autoscaleSettings.listByResourceGroup(resourceGroupName);
            for await (const setting of autoscaleSettingsIterator) {
                if (setting.targetResourceUri === plan.id) {
                    autoscaleSetting = setting;
                    break;
                }
            }
        } catch (error) {
            console.warn('⚠️  Could not fetch autoscale settings:', error);
        }

        let scaleOutMethod: string;
        if (autoscaleSetting) {
            scaleOutMethod = "Rules Based";
        } else if (plan.elasticScaleEnabled) {
            scaleOutMethod = "Automatic";
        } else {
            scaleOutMethod = `Manual (${plan.sku?.capacity || 'N/A'} instance(s))`;
        }

        // Check if any custom domain has SNI SSL enabled by checking the SSL state
        const hasSniSsl = webApp.hostNameSslStates?.some(state => state.sslState === 'SniEnabled');

        // Format the backup schedule time into a readable UTC string
        let backupScheduleValue = '-';
        if (backupConfig?.backupSchedule) {
            const backupTime = backupConfig.backupSchedule.startTime
                ? ` at ${new Date(backupConfig.backupSchedule.startTime).toUTCString().substring(17, 25)} UTC`
                : '';
            backupScheduleValue = `Recurring${backupTime}`;
        }

        // Determine if Application Logging to Blob Storage is active
        let appLogsValue = '-';
        if (appServiceLogsConfig?.applicationLogs?.azureBlobStorage?.level && 
            appServiceLogsConfig.applicationLogs.azureBlobStorage.level !== 'Off') {
            appLogsValue = 'Blob';
        }

        // Determine the destination for Web Server (HTTP) logs
        let webServerLoggingValue = 'Off';
        if (appServiceLogsConfig?.httpLogs?.fileSystem?.enabled) {
            webServerLoggingValue = 'File System';
        } else if (appServiceLogsConfig?.httpLogs?.azureBlobStorage?.enabled) {
            webServerLoggingValue = 'Storage';
        }

        // Fetch Defender for Cloud status for App Services
        console.log(`🛡️  Checking Microsoft Defender status...`);
        let defenderStatus = 'Disabled';
        try {
            const defenderPricing = await securityClient.pricings.get("AppServices");
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
            const diagnosticSettingsCollection = await monitorClient.diagnosticSettings.list(webApp.id!);
            
            if (diagnosticSettingsCollection.value) {
                for (const setting of diagnosticSettingsCollection.value) {
                    diagnosticSettingsList.push(setting);
                }
            }
        } catch (error) {
            console.warn('⚠️  Could not fetch diagnostic settings:', error);
        }

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

        // --- SUMMARY LOGGING ---
        console.log(`📈 Web Server Configuration Summary:`);
        console.log(`   App Service Plan: ${plan.sku?.name} (${plan.sku?.capacity} instances)`);
        console.log(`   Scaling Method: ${scaleOutMethod}`);
        console.log(`   Location: ${plan.location}`);
        console.log(`   .NET Framework: ${config.netFrameworkVersion}`);
        console.log(`   HTTPS Only: ${webApp.httpsOnly ? 'Enabled' : 'Disabled'}`);
        console.log(`   Always On: ${config.alwaysOn ? 'Enabled' : 'Disabled'}`);
        console.log(`   Platform: ${config.use32BitWorkerProcess ? '32-bit' : '64-bit'}`);
        console.log(`   Custom Domain SSL: ${hasSniSsl ? 'SNI SSL' : 'None'}`);
        console.log(`   Backup Schedule: ${backupScheduleValue}`);
        console.log(`   Application Logs: ${appLogsValue}`);
        console.log(`   Web Server Logs: ${webServerLoggingValue}`);
        console.log(`   Defender Status: ${defenderStatus}`);
        console.log(`   Diagnostic Settings: ${diagnosticSettingsValue}`);

        // --- DATA ASSEMBLY ---
        const data: SpecificationData = [
            { section: 'General', title: 'Number of Azure Compute Units', value: plan.sku?.name || '-' },
            { section: 'General', title: 'Custom domain', value: hasSniSsl ? 'SNI SSL' : '-' },
            { section: 'General', title: 'Microsoft Defender for Cloud', value: defenderStatus },
            { section: 'Services', title: 'Geographical Location', value: plan.location || '-' },
            { section: 'Configuration', title: 'Scale out', value: scaleOutMethod },
            { section: 'Services', title: 'Data backup', value: `Daily, Retention ${backupConfig?.backupSchedule?.retentionPeriodInDays || '-'} Days` },
            { section: 'Services', title: 'Backup schedule', value: backupScheduleValue },
            { section: 'Services', title: 'Application Logs', value: appLogsValue },
            { section: 'Services', title: 'Web server logging', value: webServerLoggingValue },
            { section: 'Monitoring', title: 'Diagnostic settings', value: diagnosticSettingsValue },
            { section: 'Monitoring', title: 'Destination details', value: destinationDetailsValue },
            { section: 'General settings', title: 'Stack and version', value: `.NET, ASP.NET ${config.netFrameworkVersion || '-'}` },
            { section: 'General settings', title: 'FTP state', value: config.ftpsState || '-' },
            { section: 'Platform settings', title: 'HTTP version', value: config.http20Enabled ? '2.0' : '1.1' },
            { section: 'Platform settings', title: 'Platform', value: config.use32BitWorkerProcess ? '32 bit' : '64 bit' },
            { section: 'Platform settings', title: 'Web sockets', value: config.webSocketsEnabled ? 'On' : 'Off' },
            { section: 'Platform settings', title: 'Always on', value: config.alwaysOn ? 'On' : 'Off' },
            { section: 'Platform settings', title: 'HTTPS Only', value: webApp.httpsOnly ? 'On' : 'Off' },
            { section: 'Platform settings', title: 'Minimum TLS Version', value: config.minTlsVersion || '-' },
            { section: 'Incoming client certificates', title: 'Client certificate mode', value: webApp.clientCertEnabled ? (webApp.clientCertMode ?? 'Ignore') : 'Ignore' },
        ];

        // --- SAVE TO FILE ---
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = 'web-server-data.json';
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        console.log(`✅ Web Server data saved to ${filePath}`);

    } catch (error) {
        console.error(`❌ Error fetching Web Server details for ${webAppName}:`, error);
        throw error;
    }
}

// 🧪 MANUAL TESTING SECTION
// This block allows the script to be run directly for testing purposes.
// Usage: ts-node src/data-fetchers/web-server.ts
if (require.main === module) {
    console.log('🧪 Running Web Server Fetcher in Test Mode');
    console.log('==========================================');
    
    (async () => {
        // Test configurations for different environments
        const testConfigs = [
            {
                name: "Test Environment Web Server",
                resourceGroupName: "batchline-orbia-test",
                webAppName: "batchline-orbia-test-legacy",
                planName: "batchline-orbia-test-legacy"
            },
            // 🔧 Uncomment to test production environment
            // {
            //     name: "Production Environment Web Server",
            //     resourceGroupName: "batchline-orbia-prod",
            //     webAppName: "batchline-orbia-prod-legacy",
            //     planName: "batchline-orbia-prod-legacy"
            // }
        ];

        try {
            for (const config of testConfigs) {
                console.log(`\n🎯 Processing ${config.name}`);
                console.log('─'.repeat(50));
                
                await fetchAndSaveWebServerDetails(
                    config.resourceGroupName,
                    config.webAppName,
                    config.planName
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
