// ENHANCED FILE: src/data-fetchers/azure/00-web-server.ts - Cross-resource-group support
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables at the very top
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { WebSiteManagementClient } from "@azure/arm-appservice";
import { MonitorClient, AutoscaleSettingResource } from "@azure/arm-monitor";
import { SecurityCenter } from "@azure/arm-security";
import { DefaultAzureCredential } from "@azure/identity";
import { SpecificationData } from "../../types";
import * as fs from 'fs';

/**
 * Enhanced function to fetch and save web server details with cross-resource-group support
 * @param webAppResourceGroupName The resource group containing the Web App
 * @param webAppName The name of the Web App
 * @param planName The name of the App Service Plan
 * @param planResourceGroupName The resource group containing the App Service Plan (optional, defaults to webAppResourceGroupName)
 */
export async function fetchAndSaveWebServerDetails(
    webAppResourceGroupName: string, 
    webAppName: string, 
    planName: string,
    planResourceGroupName?: string
): Promise<void> {
    try {
        // Use the same resource group for plan if not specified (backward compatibility)
        const actualPlanResourceGroupName = planResourceGroupName || webAppResourceGroupName;
        
        console.log(`📡 Fetching Web Server details for ${webAppName}...`);
        console.log(`   Web App Resource Group: ${webAppResourceGroupName}`);
        console.log(`   App Service Plan: ${planName} (Resource Group: ${actualPlanResourceGroupName})`);

        // Initialize Azure clients
        const subscriptionId = process.env.azure_subscription_id;
        if (!subscriptionId) {
            throw new Error('azure_subscription_id environment variable is not set');
        }

        const credential = new DefaultAzureCredential();
        const webClient = new WebSiteManagementClient(credential, subscriptionId);
        const monitorClient = new MonitorClient(credential, subscriptionId);
        const securityClient = new SecurityCenter(credential, subscriptionId);

        // --- PRIMARY DATA FETCHING WITH CROSS-RESOURCE-GROUP SUPPORT ---
        console.log(`📋 Getting App Service Plan from ${actualPlanResourceGroupName}...`);
        const plan = await webClient.appServicePlans.get(actualPlanResourceGroupName, planName);
        
        console.log(`📋 Getting Web App from ${webAppResourceGroupName}...`);
        const webApp = await webClient.webApps.get(webAppResourceGroupName, webAppName);
        const config = await webClient.webApps.getConfiguration(webAppResourceGroupName, webAppName);

        // Validate that the web app is actually using the specified plan
        if (webApp.serverFarmId && !webApp.serverFarmId.includes(planName)) {
            console.warn(`⚠️  Warning: Web app ${webAppName} may not be using plan ${planName}`);
            console.warn(`   Web app references: ${webApp.serverFarmId}`);
            console.warn(`   Continuing with specified plan...`);
        }

        console.log(`💾 Checking backup configuration...`);
        let backupConfig;
        try {
            backupConfig = await webClient.webApps.getBackupConfiguration(webAppResourceGroupName, webAppName);
        } catch (error) {
            console.warn('⚠️  Could not fetch backup configuration:', error);
        }

        console.log(`📝 Checking logging configuration...`);
        let appServiceLogsConfig;
        try {
            appServiceLogsConfig = await webClient.webApps.getDiagnosticLogsConfiguration(webAppResourceGroupName, webAppName);
        } catch (error) {
            console.warn('⚠️  Could not fetch diagnostic logs configuration:', error);
        }

        // --- LOGIC FOR DERIVED VALUES ---
        console.log(`⚙️  Processing Web App configuration...`);

        // Determine the scaling method by checking for autoscale rules or elastic scaling
        console.log(`🔍 Checking autoscale settings across resource groups...`);
        let autoscaleSetting: AutoscaleSettingResource | undefined;
        try {
            // Check autoscale settings in the plan's resource group first
            const planAutoscaleSettingsIterator = monitorClient.autoscaleSettings.listByResourceGroup(actualPlanResourceGroupName);
            for await (const setting of planAutoscaleSettingsIterator) {
                if (setting.targetResourceUri === plan.id) {
                    autoscaleSetting = setting;
                    console.log(`✅ Found autoscale setting in plan's resource group: ${actualPlanResourceGroupName}`);
                    break;
                }
            }
            
            // If not found and resource groups are different, check the web app's resource group
            if (!autoscaleSetting && webAppResourceGroupName !== actualPlanResourceGroupName) {
                const webAppAutoscaleSettingsIterator = monitorClient.autoscaleSettings.listByResourceGroup(webAppResourceGroupName);
                for await (const setting of webAppAutoscaleSettingsIterator) {
                    if (setting.targetResourceUri === plan.id) {
                        autoscaleSetting = setting;
                        console.log(`✅ Found autoscale setting in web app's resource group: ${webAppResourceGroupName}`);
                        break;
                    }
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
        console.log(`   Web App Resource Group: ${webAppResourceGroupName}`);
        console.log(`   App Service Plan Resource Group: ${actualPlanResourceGroupName}`);
        console.log(`   App Service Plan: ${plan.sku?.name} (${plan.sku?.capacity} instances)`);
        console.log(`   Scaling Method: ${scaleOutMethod}`);
        console.log(`   Location: ${plan.location}`);
        console.log(`   .NET Framework: ${config.netFrameworkVersion}`);
        console.log(`   HTTPS Only: ${webApp.httpsOnly ? 'Enabled' : 'Disabled'}`);
        console.log(`   Always On: ${config.alwaysOn ? 'Enabled' : 'Disabled'}`);
        console.log(`   Platform: ${config.use32BitWorkerProcess ? '32-bit' : '64-bit'}`);
        console.log(`   Custom Domain SSL: ${hasSniSsl ? 'SNI SSL' : 'None'}`);
        console.log(`   Cross-Resource-Group Setup: ${webAppResourceGroupName !== actualPlanResourceGroupName ? 'Yes' : 'No'}`);

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
        console.log(`🌐 Cross-resource-group configuration successfully handled!`);

    } catch (error) {
        console.error(`❌ Error fetching Web Server details for ${webAppName}:`, error);
        throw error;
    }
}

// 🧪 MANUAL TESTING SECTION with cross-resource-group examples
if (require.main === module) {
    console.log('🧪 Running Enhanced Web Server Fetcher in Test Mode');
    console.log('===================================================');
    
    (async () => {
        const testConfigs = [
            {
                name: "Same Resource Group (Standard Setup)",
                webAppResourceGroup: "batchline-unison-main",
                webAppName: "batchline-unison-test-legacy",
                planName: "batchline-unison-test-legacy",
                planResourceGroup: "batchline-unison-main"
            },
            {
                name: "Cross Resource Group (Advanced Setup)",
                webAppResourceGroup: "batchline-unison-main",
                webAppName: "batchline-unison-test-legacy",
                planName: "batchline-unison-premium-p0v3",
                planResourceGroup: "batchline-unison-prod-primary"
            }
        ];

        try {
            for (const config of testConfigs) {
                console.log(`\n🎯 Processing ${config.name}`);
                console.log('─'.repeat(60));
                
                await fetchAndSaveWebServerDetails(
                    config.webAppResourceGroup,
                    config.webAppName,
                    config.planName,
                    config.planResourceGroup
                );
                
                console.log(`✅ Completed ${config.name}`);
            }
            
            console.log('\n🎉 All test configurations completed successfully!');
            console.log('📁 Check the output/ directory for generated JSON files');
            console.log('💡 Cross-resource-group support tested and working!');
            
        } catch (error) {
            console.error('\n❌ Test failed:', error);
            process.exit(1);
        }
    })();
}
