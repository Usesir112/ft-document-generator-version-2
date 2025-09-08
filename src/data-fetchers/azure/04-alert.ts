// ENHANCED FILE: src/data-fetchers/azure/04-alert.ts - Cross-resource-group support
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { MonitorClient, MetricAlertResource, ActivityLogAlertResource } from "@azure/arm-monitor";
import { WebSiteManagementClient } from "@azure/arm-appservice";
import { SqlManagementClient } from "@azure/arm-sql";
import { RedisManagementClient } from "@azure/arm-rediscache";
import { DefaultAzureCredential } from "@azure/identity";
import { SpecificationData } from "../../types";
import * as fs from 'fs';

/**
 * Interface for cross-resource-group configuration
 */
interface CrossResourceGroupConfig {
    webAppResourceGroup?: string;
    sqlResourceGroup?: string;
    redisResourceGroup?: string;
}

/**
 * Enhanced function to fetch and save alert details with cross-resource-group support
 * @param primaryResourceGroupName The primary resource group (used as fallback)
 * @param webAppName The name of the Web App
 * @param sqlServerName The name of the SQL Server
 * @param sqlDatabaseName The name of the SQL Database
 * @param redisCacheName The name of the Redis Cache
 * @param crossRGConfig Cross-resource-group configuration (optional)
 */
export async function fetchAndSaveAlertDetails(
    primaryResourceGroupName: string,
    webAppName: string,
    sqlServerName: string,
    sqlDatabaseName: string,
    redisCacheName: string,
    crossRGConfig?: CrossResourceGroupConfig
): Promise<void> {
    try {
        console.log(`📡 Fetching Alert configurations with cross-resource-group support...`);
        console.log(`   Primary Resource Group: ${primaryResourceGroupName}`);
        
        if (crossRGConfig) {
            console.log(`   Web App RG: ${crossRGConfig.webAppResourceGroup || primaryResourceGroupName}`);
            console.log(`   SQL RG: ${crossRGConfig.sqlResourceGroup || primaryResourceGroupName}`);
            console.log(`   Redis RG: ${crossRGConfig.redisResourceGroup || primaryResourceGroupName}`);
        }
        
        // Initialize Azure clients
        const subscriptionId = process.env.azure_subscription_id;
        if (!subscriptionId) {
            throw new Error('azure_subscription_id environment variable is not set');
        }

        const credential = new DefaultAzureCredential();
        const monitorClient = new MonitorClient(credential, subscriptionId);
        const webClient = new WebSiteManagementClient(credential, subscriptionId);
        const sqlClient = new SqlManagementClient(credential, subscriptionId);
        const redisClient = new RedisManagementClient(credential, subscriptionId);
        
        // Determine actual resource groups
        const webAppResourceGroup = crossRGConfig?.webAppResourceGroup || primaryResourceGroupName;
        const sqlResourceGroup = crossRGConfig?.sqlResourceGroup || primaryResourceGroupName;
        const redisResourceGroup = crossRGConfig?.redisResourceGroup || primaryResourceGroupName;
        
        // --- DETECT ENVIRONMENT ---
        const detectedEnvFromRG = detectEnvironment(primaryResourceGroupName);
        const detectedEnvFromWebApp = detectEnvironment(webAppName);
        const detectedEnvFromSQL = detectEnvironment(sqlServerName);
        
        // Use the most specific environment detection (prefer resource-level over resource group)
        const targetEnvironment = detectedEnvFromWebApp !== 'unknown' ? detectedEnvFromWebApp :
                                 detectedEnvFromSQL !== 'unknown' ? detectedEnvFromSQL :
                                 detectedEnvFromRG;
        
        console.log(`🎯 Detected environment: ${getEnvironmentDisplayName(targetEnvironment)}`);
        
        // --- GET RESOURCE IDs FROM THEIR RESPECTIVE RESOURCE GROUPS ---
        console.log(`📋 Getting resource IDs from different resource groups...`);
        
        const webApp = await webClient.webApps.get(webAppResourceGroup, webAppName);
        const database = await sqlClient.databases.get(sqlResourceGroup, sqlServerName, sqlDatabaseName);
        const redisCache = await redisClient.redis.get(redisResourceGroup, redisCacheName);

        const webAppResourceId = webApp.id!;
        const databaseResourceId = database.id!;
        const redisResourceId = redisCache.id!;

        console.log(`✅ Resource IDs obtained:`);
        console.log(`   Web App ID: ${webAppResourceId}`);
        console.log(`   Database ID: ${databaseResourceId}`);
        console.log(`   Redis ID: ${redisResourceId}`);

        // --- FETCH ALERT RULES ACROSS ALL RESOURCE GROUPS ---
        console.log(`🔍 Fetching alert rules across all resource groups...`);
        const metricAlerts: MetricAlertResource[] = [];

        // Get all metric alerts in the subscription (they can be in any resource group)
        const metricAlertsIterator = monitorClient.metricAlerts.listBySubscription();
        for await (const alert of metricAlertsIterator) {
            // Filter alerts by environment
            if (isAlertForEnvironment(alert.name || '', targetEnvironment)) {
                metricAlerts.push(alert);
            }
        }

        console.log(`📊 Found ${metricAlerts.length} relevant alerts across all resource groups`);

        // --- ENHANCED HELPER FUNCTIONS FOR CROSS-RESOURCE-GROUP SCENARIOS ---
        const findAlertsByResourceAndMetric = (resourceId: string, metricName: string): MetricAlertResource[] => {
            return metricAlerts.filter(alert => 
                alert.scopes?.some(scope => scope.includes(resourceId)) && 
                alert.criteria?.allOf?.some((criterion: any) => 
                    criterion.metricName?.toLowerCase().includes(metricName.toLowerCase())
                ) &&
                isAlertForEnvironment(alert.name || '', targetEnvironment)
            );
        };

        const findAlertsByNamePattern = (namePattern: string): MetricAlertResource[] => {
            return metricAlerts.filter(alert => 
                alert.name?.toLowerCase().includes(namePattern.toLowerCase()) &&
                isAlertForEnvironment(alert.name || '', targetEnvironment)
            );
        };

        const getAlertStatus = (alert: MetricAlertResource | undefined): string => {
            return alert?.enabled ? 'Enabled' : 'Disabled';
        };

        const getEnvironmentFromAlertName = (alertName: string): string => {
            const detectedEnv = detectEnvironment(alertName);
            return getEnvironmentDisplayName(detectedEnv);
        };

        const getAlertResourceGroup = (alert: MetricAlertResource): string => {
            // Extract resource group from alert ID
            const alertId = alert.id || '';
            const match = alertId.match(/resourceGroups\/([^\/]+)\//);
            return match ? match[1] : 'Unknown';
        };

        // --- FIND ALERTS BY PATTERNS WITH RESOURCE GROUP TRACKING ---
        console.log(`📊 Analyzing alerts across resource groups...`);
        
        // App Service CPU alerts (80% and 90%)
        const cpuAlerts80 = findAlertsByNamePattern('cpu-usage-80');
        const cpuAlerts90 = findAlertsByNamePattern('cpu-usage-90');
        
        // App Service Memory alerts  
        const memoryAlerts = findAlertsByNamePattern('memory-appservice');
        
        // Database alerts (might be in different resource groups)
        const dbCpuAlerts = findAlertsByResourceAndMetric(databaseResourceId, 'dtu_consumption_percent');
        const dbConnectionAlerts = findAlertsByResourceAndMetric(databaseResourceId, 'connection_failed');
        const dbSizeAlerts = findAlertsByResourceAndMetric(databaseResourceId, 'storage_percent');

        // Redis alerts (might be in different resource groups)
        const redisMemoryAlerts = findAlertsByResourceAndMetric(redisResourceId, 'usedmemorypercentage');
        const redisCpuAlerts = findAlertsByResourceAndMetric(redisResourceId, 'CpuPercentage');
        const redisServerLoadAlerts = findAlertsByResourceAndMetric(redisResourceId, 'serverLoad');

        // --- DATA ASSEMBLY WITH CROSS-RESOURCE-GROUP INFORMATION ---
        const data: SpecificationData = [];

        // Helper function to add alerts to data with resource group information
        const addAlertsToData = (alerts: MetricAlertResource[], sectionName: string) => {
            alerts.forEach((alert) => {
                const environment = getEnvironmentFromAlertName(alert.name || '');
                const alertResourceGroup = getAlertResourceGroup(alert);
                const status = getAlertStatus(alert);
                
                // Enhanced title with resource group information
                const title = `${environment} - ${alert.name} (RG: ${alertResourceGroup})`;
                
                data.push({
                    section: sectionName,
                    title: title,
                    value: status
                });
            });
        };

        // Add all alert types to data with enhanced information
        addAlertsToData(cpuAlerts90, 'App Service CPU 90%');
        addAlertsToData(cpuAlerts80, 'App Service CPU 80%');
        addAlertsToData(memoryAlerts, 'App Service Memory');
        addAlertsToData(dbCpuAlerts, 'Database CPU');
        addAlertsToData(dbConnectionAlerts, 'Database Connections');
        addAlertsToData(dbSizeAlerts, 'Database Storage');
        addAlertsToData(redisMemoryAlerts, 'Redis Memory');
        addAlertsToData(redisCpuAlerts, 'Redis CPU');
        addAlertsToData(redisServerLoadAlerts, 'Redis Server Load');

        // Add cross-resource-group configuration summary
        data.push({
            section: 'Configuration',
            title: 'Cross-Resource-Group Setup',
            value: (webAppResourceGroup !== primaryResourceGroupName || 
                   sqlResourceGroup !== primaryResourceGroupName || 
                   redisResourceGroup !== primaryResourceGroupName) ? 'Enabled (Advanced Setup)' : 'Standard Setup'
        });

        data.push({
            section: 'Resource Groups',
            title: 'Primary Resource Group',
            value: primaryResourceGroupName
        });

        data.push({
            section: 'Resource Groups',
            title: 'Web App Resource Group',
            value: webAppResourceGroup
        });

        data.push({
            section: 'Resource Groups',
            title: 'SQL Resource Group',
            value: sqlResourceGroup
        });

        data.push({
            section: 'Resource Groups',
            title: 'Redis Resource Group',
            value: redisResourceGroup
        });

        // --- SUMMARY LOGGING ---
        console.log(`📈 Alert Summary for ${getEnvironmentDisplayName(targetEnvironment)} Environment:`);
        console.log(`   Primary Resource Group: ${primaryResourceGroupName}`);
        console.log(`   Web App Resource Group: ${webAppResourceGroup}`);
        console.log(`   SQL Resource Group: ${sqlResourceGroup}`);
        console.log(`   Redis Resource Group: ${redisResourceGroup}`);
        console.log(`   Total Metric Alerts Found: ${metricAlerts.length}`);
        console.log(`   App Service CPU 80% Alerts: ${cpuAlerts80.length}`);
        console.log(`   App Service CPU 90% Alerts: ${cpuAlerts90.length}`);
        console.log(`   App Service Memory Alerts: ${memoryAlerts.length}`);
        console.log(`   Database CPU Alerts: ${dbCpuAlerts.length}`);
        console.log(`   Database Connection Alerts: ${dbConnectionAlerts.length}`);
        console.log(`   Database Storage Alerts: ${dbSizeAlerts.length}`);
        console.log(`   Redis Memory Alerts: ${redisMemoryAlerts.length}`);
        console.log(`   Redis CPU Alerts: ${redisCpuAlerts.length}`);
        console.log(`   Redis Server Load Alerts: ${redisServerLoadAlerts.length}`);
        console.log(`   Total Data Points Generated: ${data.length}`);
        console.log(`   Cross-Resource-Group Configuration: ${webAppResourceGroup !== primaryResourceGroupName || sqlResourceGroup !== primaryResourceGroupName || redisResourceGroup !== primaryResourceGroupName ? 'Yes' : 'No'}`);

        // Log alert distribution by resource group
        const alertsByRG = new Map<string, number>();
        metricAlerts.forEach(alert => {
            const rg = getAlertResourceGroup(alert);
            alertsByRG.set(rg, (alertsByRG.get(rg) || 0) + 1);
        });

        console.log(`📊 Alert Distribution by Resource Group:`);
        alertsByRG.forEach((count, rg) => {
            console.log(`   ${rg}: ${count} alerts`);
        });

        // --- SAVE TO FILE ---
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = 'alert-data.json';
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        console.log(`✅ Alert data saved to ${filePath}`);
        console.log(`🌐 Cross-resource-group alert analysis completed successfully!`);

    } catch (error) {
        console.error('❌ Error fetching alert details:', error);
        throw error;
    }
}

/**
 * Extracts environment from resource name
 * @param resourceName The name of the resource (e.g., "batchline-orbia-test", "batchline-orbia-prod-legacy")
 * @returns The detected environment ("test", "prod", or "unknown")
 */
function detectEnvironment(resourceName: string): string {
    const normalizedName = resourceName.toLowerCase();
    
    // Check for prod environment
    if (normalizedName.includes('-prod-') || normalizedName.endsWith('-prod') || normalizedName.includes('prod')) {
        return 'prod';
    }
    
    // Check for test environment  
    if (normalizedName.includes('-test-') || normalizedName.endsWith('-test') || normalizedName.includes('test')) {
        return 'test';
    }
    
    return 'unknown';
}

/**
 * Checks if an alert belongs to the specified environment
 * @param alertName The name of the alert
 * @param targetEnvironment The target environment to filter by
 * @returns True if the alert matches the environment
 */
function isAlertForEnvironment(alertName: string, targetEnvironment: string): boolean {
    if (!alertName || targetEnvironment === 'unknown') {
        return true; // Include all alerts if environment is unknown
    }
    
    const normalizedAlertName = alertName.toLowerCase();
    const normalizedTargetEnv = targetEnvironment.toLowerCase();
    
    // Check for exact environment matches in alert names
    if (normalizedTargetEnv === 'prod') {
        return normalizedAlertName.includes('prod') && !normalizedAlertName.includes('test');
    }
    
    if (normalizedTargetEnv === 'test') {
        return normalizedAlertName.includes('test') || 
               (!normalizedAlertName.includes('prod') && !normalizedAlertName.includes('production'));
    }
    
    return true;
}

/**
 * Gets environment display name
 * @param env The environment string
 * @returns Capitalized environment name
 */
function getEnvironmentDisplayName(env: string): string {
    switch (env.toLowerCase()) {
        case 'prod': return 'Production';
        case 'test': return 'Test';
        default: return 'Unknown';
    }
}

// 🧪 MANUAL TESTING SECTION with cross-resource-group examples
if (require.main === module) {
    console.log('🧪 Running Enhanced Alert Fetcher in Test Mode');
    console.log('================================================');
    
    (async () => {
        const testConfigs = [
            {
                name: "Same Resource Group (Standard Setup)",
                primaryResourceGroup: "batchline-unison-main",
                webAppName: "batchline-unison-test-legacy",
                sqlServerName: "batchline-unison-test",
                sqlDatabaseName: "batchline-unison-test-legacy",
                redisCacheName: "batchline-unison-test",
                crossRGConfig: undefined
            },
            {
                name: "Cross Resource Group (Advanced Setup)",
                primaryResourceGroup: "batchline-unison-main",
                webAppName: "batchline-unison-test-legacy",
                sqlServerName: "batchline-unison-test",
                sqlDatabaseName: "batchline-unison-test-legacy",
                redisCacheName: "batchline-unison-test",
                crossRGConfig: {
                    webAppResourceGroup: "batchline-unison-main",
                    sqlResourceGroup: "batchline-unison-data",
                    redisResourceGroup: "batchline-unison-cache"
                }
            }
        ];

        try {
            for (const config of testConfigs) {
                console.log(`\n🎯 Processing ${config.name}`);
                console.log('─'.repeat(60));
                
                await fetchAndSaveAlertDetails(
                    config.primaryResourceGroup,
                    config.webAppName,
                    config.sqlServerName,
                    config.sqlDatabaseName,
                    config.redisCacheName,
                    config.crossRGConfig
                );
                
                console.log(`✅ Completed ${config.name}`);
            }
            
            console.log('\n🎉 All test configurations completed successfully!');
            console.log('📁 Check the output/ directory for generated JSON files');
            console.log('💡 Cross-resource-group alert monitoring tested and working!');
            
        } catch (error) {
            console.error('\n❌ Test failed:', error);
            process.exit(1);
        }
    })();
}
