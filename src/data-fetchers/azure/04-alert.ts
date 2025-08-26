// src/data-fetchers/alert.ts - Simplified Alert Data Fetcher
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { MonitorClient, MetricAlertResource, ActivityLogAlertResource } from "@azure/arm-monitor";
import { WebSiteManagementClient } from "@azure/arm-appservice";
import { SqlManagementClient } from "@azure/arm-sql";
import { RedisManagementClient } from "@azure/arm-rediscache";
import { DefaultAzureCredential } from "@azure/identity";
import { SpecificationData } from "../types";
import * as fs from 'fs';

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

/**
 * Fetches and saves all alert configurations for Azure resources.
 * @param resourceGroupName The name of the resource group.
 * @param webAppName The name of the Web App.
 * @param sqlServerName The name of the SQL Server.
 * @param sqlDatabaseName The name of the SQL Database.
 * @param redisCacheName The name of the Redis Cache.
 */
export async function fetchAndSaveAlertDetails(
    resourceGroupName: string,
    webAppName: string,
    sqlServerName: string,
    sqlDatabaseName: string,
    redisCacheName: string
): Promise<void> {
    try {
        console.log(`📡 Fetching Alert configurations...`);
        
        // Initialize Azure clients
        const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
        if (!subscriptionId) {
            throw new Error('AZURE_SUBSCRIPTION_ID environment variable is not set');
        }

        const credential = new DefaultAzureCredential();
        const monitorClient = new MonitorClient(credential, subscriptionId);
        const webClient = new WebSiteManagementClient(credential, subscriptionId);
        const sqlClient = new SqlManagementClient(credential, subscriptionId);
        const redisClient = new RedisManagementClient(credential, subscriptionId);
        
        // --- DETECT ENVIRONMENT ---
        const detectedEnvFromRG = detectEnvironment(resourceGroupName);
        const detectedEnvFromWebApp = detectEnvironment(webAppName);
        const detectedEnvFromSQL = detectEnvironment(sqlServerName);
        
        // Use the most specific environment detection (prefer resource-level over resource group)
        const targetEnvironment = detectedEnvFromWebApp !== 'unknown' ? detectedEnvFromWebApp :
                                 detectedEnvFromSQL !== 'unknown' ? detectedEnvFromSQL :
                                 detectedEnvFromRG;
        
        console.log(`🎯 Detected environment: ${getEnvironmentDisplayName(targetEnvironment)}`);
        
        // --- GET RESOURCE IDs ---
        console.log(`📋 Getting resource IDs...`);
        const webApp = await webClient.webApps.get(resourceGroupName, webAppName);
        const database = await sqlClient.databases.get(resourceGroupName, sqlServerName, sqlDatabaseName);
        const redisCache = await redisClient.redis.get(resourceGroupName, redisCacheName);

        const webAppResourceId = webApp.id!;
        const databaseResourceId = database.id!;
        const redisResourceId = redisCache.id!;

        // --- FETCH ALERT RULES ---
        console.log(`🔍 Fetching alert rules...`);
        const metricAlerts: MetricAlertResource[] = [];

        // Get all metric alerts in the subscription
        const metricAlertsIterator = monitorClient.metricAlerts.listBySubscription();
        for await (const alert of metricAlertsIterator) {
            // Filter alerts by environment
            if (isAlertForEnvironment(alert.name || '', targetEnvironment)) {
                metricAlerts.push(alert);
            }
        }

        // --- HELPER FUNCTIONS ---
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

        // --- FIND ALERTS BY PATTERNS ---
        console.log(`📊 Analyzing alerts...`);
        
        // App Service CPU alerts (80% and 90%)
        const cpuAlerts80 = findAlertsByNamePattern('cpu-usage-80');
        const cpuAlerts90 = findAlertsByNamePattern('cpu-usage-90');
        
        // App Service Memory alerts  
        const memoryAlerts = findAlertsByNamePattern('memory-appservice');
        
        // Database alerts
        const dbCpuAlerts = findAlertsByResourceAndMetric(databaseResourceId, 'dtu_consumption_percent');
        const dbConnectionAlerts = findAlertsByResourceAndMetric(databaseResourceId, 'connection_failed');
        const dbSizeAlerts = findAlertsByResourceAndMetric(databaseResourceId, 'storage_percent');

        // Redis alerts
        const redisMemoryAlerts = findAlertsByResourceAndMetric(redisResourceId, 'usedmemorypercentage');
        const redisCpuAlerts = findAlertsByResourceAndMetric(redisResourceId, 'CpuPercentage');
        const redisServerLoadAlerts = findAlertsByResourceAndMetric(redisResourceId, 'serverLoad');

        // --- DATA ASSEMBLY ---
        const data: SpecificationData = [];

        // Helper function to add alerts to data
        const addAlertsToData = (alerts: MetricAlertResource[], sectionName: string) => {
            alerts.forEach((alert) => {
                const environment = getEnvironmentFromAlertName(alert.name || '');
                data.push({
                    section: sectionName,
                    title: `${environment} - ${alert.name}`,
                    value: getAlertStatus(alert)
                });
            });
        };

        // Add all alert types to data
        addAlertsToData(cpuAlerts90, 'App Service CPU 90%');
        addAlertsToData(cpuAlerts80, 'App Service CPU 80%');
        addAlertsToData(memoryAlerts, 'App Service Memory');
        addAlertsToData(dbCpuAlerts, 'Database CPU');
        addAlertsToData(dbConnectionAlerts, 'Database Connections');
        addAlertsToData(dbSizeAlerts, 'Database Storage');
        addAlertsToData(redisMemoryAlerts, 'Redis Memory');
        addAlertsToData(redisCpuAlerts, 'Redis CPU');
        addAlertsToData(redisServerLoadAlerts, 'Redis Server Load');

        // --- SUMMARY LOGGING ---
        console.log(`📈 Alert Summary for ${getEnvironmentDisplayName(targetEnvironment)} Environment:`);
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

        // --- SAVE TO FILE ---
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = 'alert-data.json';
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        console.log(`✅ Alert data saved to ${filePath}`);

    } catch (error) {
        console.error('❌ Error fetching alert details:', error);
        throw error;
    }
}

// 🧪 MANUAL TESTING SECTION
// This block allows the script to be run directly for testing purposes.
// Usage: ts-node src/data-fetchers/alert.ts
if (require.main === module) {
    console.log('🧪 Running Alert Fetcher in Test Mode');
    console.log('=====================================');
    
    (async () => {
        // Test configurations for different environments
        const testConfigs = [
            {
                name: "Test Environment",
                resourceGroupName: "batchline-orbia-test",
                webAppName: "batchline-orbia-test-legacy",
                sqlServerName: "batchline-orbia-test",
                sqlDatabaseName: "batchline-orbia-test-legacy",
                redisCacheName: "batchline-orbia-test"
            },
            // 🔧 Uncomment to test production environment
            // {
            //     name: "Production Environment", 
            //     resourceGroupName: "batchline-orbia-prod",
            //     webAppName: "batchline-orbia-prod-legacy",
            //     sqlServerName: "batchline-orbia-prod",
            //     sqlDatabaseName: "batchline-orbia-prod-legacy",
            //     redisCacheName: "batchline-orbia-prod"
            // }
        ];

        try {
            for (const config of testConfigs) {
                console.log(`\n🎯 Processing ${config.name}`);
                console.log('─'.repeat(50));
                
                await fetchAndSaveAlertDetails(
                    config.resourceGroupName,
                    config.webAppName,
                    config.sqlServerName,
                    config.sqlDatabaseName,
                    config.redisCacheName
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
