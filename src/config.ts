// ENHANCED FILE: src/config.ts
// Enhanced configuration file with cross-resource-group support
import { ProjectConfig } from './types';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables at the very top
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 🧹 Helper function to sanitize strings for filenames
const sanitizeForFilename = (str: string): string => {
    return (str || '')
        .replace(/\s+/g, '-')           // Replace spaces with hyphens
        .replace(/[()[\]{}]/g, '')      // Remove brackets and parentheses
        .replace(/[<>:"/\\|?*]/g, '')   // Remove invalid filename characters
        .replace(/-+/g, '-')            // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, '');       // Remove leading/trailing hyphens
};

// 🎯 MAIN CONFIGURATION - CHANGE THESE VALUES FOR YOUR PROJECT
export const CONFIG: ProjectConfig = {
    // Product Information
    productName: process.env.product_name || 'default-product',
    version: process.env.version || '1.0.0',

    // Project Information
    siteName: process.env.site_name || 'default-site',
    environment: process.env.env_name || 'development',
    
    // 🔧 MAIN SETTING: Change this base name and everything else is auto-generated
    baseResourceName: `${sanitizeForFilename(process.env.product_name || '')}-${sanitizeForFilename(process.env.site_name || '')}-${sanitizeForFilename(process.env.env_name || '')}`.toLowerCase(),
    
    // Document Settings
    documentType: process.env.documentType || 'Specification',
    outputFilename: `${sanitizeForFilename(process.env.product_name || '')}-${sanitizeForFilename(process.env.site_name || '')}-${sanitizeForFilename(process.env.env_name || '')}-${sanitizeForFilename(process.env.documentType || '')}-report.docx`.toLowerCase(),
    
    // 📊 Document Generation Mode
    useAutoDiscovery: false, // Set to true to automatically include all *-data.json files
    
    // 📋 Manual Document Sections (only used if useAutoDiscovery = false)
    documentSections: [
        { filename: 'web-server-data.json', title: 'Web Server Specification', sectionNumber: '3.1', enabled: true },
        { filename: 'database-data.json', title: 'SQL Azure Database Specification', sectionNumber: '3.2', enabled: true },
        { filename: 'redis-data.json', title: 'Redis Cache Specification', sectionNumber: '3.3', enabled: true },
        { filename: 'storage-data.json', title: 'Azure Storage Specification', sectionNumber: '3.4', enabled: true },
        { filename: 'alert-data.json', title: 'Performance Monitoring', sectionNumber: '3.5', enabled: true },
        // 🆕 Add new sections here as needed
        // { filename: 'sendgrid-data.json', title: 'SendGrid Email Delivery', sectionNumber: '3.6', enabled: true },
        // { filename: 'cosmosdb-data.json', title: 'Cosmos DB Configuration', sectionNumber: '3.7', enabled: true },
    ],
    
    // 🎨 Document customization options
    documentCustomization: {
        companyLogoPath: 'src/assets/images/batchline-logo.png', // Path to company logo image file (optional)
        architectureDiagramPath: 'src/assets/images/overview_bl.png', // Path to architecture diagram (optional)
        includeGlossary: true,
        includeReferences: true,
        customGlossaryItems: [], // Additional glossary items
        customReferences: [], // Additional references
    }
};

// 🚀 ENHANCED RESOURCE NAMES WITH CROSS-RESOURCE-GROUP SUPPORT
export interface ResourceConfiguration {
    // Primary resource group (fallback for resources that don't specify their own)
    resourceGroupName: string;
    
    // Web App resources (might be in different resource groups)
    webAppName: string;
    webAppResourceGroup?: string;
    legacyPlanName: string;
    appServicePlanResourceGroup?: string;
    
    // SQL resources (might be in different resource groups)
    sqlServerName: string;
    sqlServerResourceGroup?: string;
    sqlDatabaseName: string;
    
    // Redis resources (might be in different resource groups)
    redisCacheName: string;
    redisCacheResourceGroup?: string;
    
    // Storage resources (might be in different resource groups)
    storageAccountName: string;
    storageAccountResourceGroup?: string;
}

export function getResourceNames(): ResourceConfiguration {
    // Get all resource names and resource groups from environment variables
    const resourceConfig: ResourceConfiguration = {
        // Primary resource group
        resourceGroupName: process.env.resource_group_name || CONFIG.baseResourceName,
        
        // Web App configuration
        webAppName: process.env.web_app_name || `${CONFIG.baseResourceName}-legacy`,
        webAppResourceGroup: process.env.web_app_resource_group,
        legacyPlanName: process.env.app_service_plan_name || `${CONFIG.baseResourceName}-legacy`,
        appServicePlanResourceGroup: process.env.app_service_plan_resource_group,
        
        // SQL configuration
        sqlServerName: process.env.sql_server_name || CONFIG.baseResourceName,
        sqlServerResourceGroup: process.env.sql_server_resource_group,
        sqlDatabaseName: process.env.sql_database_name || `${CONFIG.baseResourceName}-legacy`,
        
        // Redis configuration
        redisCacheName: process.env.redis_cache_name || CONFIG.baseResourceName,
        redisCacheResourceGroup: process.env.redis_cache_resource_group,
        
        // Storage configuration (remove hyphens for storage account naming requirements)
        storageAccountName: process.env.storage_account_name || CONFIG.baseResourceName.replace(/-/g, '').toLowerCase(),
        storageAccountResourceGroup: process.env.storage_account_resource_group,
    };
    
    return resourceConfig;
}

// Helper function to get the actual resource group for a specific resource
export function getResourceGroup(resourceType: 'webapp' | 'plan' | 'sql' | 'redis' | 'storage'): string {
    const config = getResourceNames();
    
    switch (resourceType) {
        case 'webapp':
            return config.webAppResourceGroup || config.resourceGroupName;
        case 'plan':
            return config.appServicePlanResourceGroup || config.resourceGroupName;
        case 'sql':
            return config.sqlServerResourceGroup || config.resourceGroupName;
        case 'redis':
            return config.redisCacheResourceGroup || config.resourceGroupName;
        case 'storage':
            return config.storageAccountResourceGroup || config.resourceGroupName;
        default:
            return config.resourceGroupName;
    }
}

// 📄 Get product name
export function getProductName(): string {
    return CONFIG.productName;
}

// 📄 Get version
export function getVersion(): string {
    return CONFIG.version;
}

// 📄 Get client name
export function getsiteName(): string {
    return CONFIG.siteName;
}

// 📄 Get environment
export function getEnvironment(): string {
    return CONFIG.environment;
}

// 📄 Get document title
export function getdocumentType(): string {
    return CONFIG.documentType;
}

// 🎨 Get document customization options
export function getDocumentCustomization() {
    return CONFIG.documentCustomization;
}

// 📝 Get document purpose description
export function getDocumentPurpose(): string {
    const envDescription = CONFIG.environment === 'test' ? 'testing and validation' : 
                          CONFIG.environment === 'staging' ? 'staging and pre-production testing' :
                          CONFIG.environment === 'production' ? 'production operations' :
                          'development and testing';
    
    return `${envDescription} during product ${CONFIG.environment === 'production' ? 'deployment' : 'qualification'}`;
}

// 🔍 Helper function to check if a section is enabled
export function isSectionEnabled(filename: string): boolean {
    if (CONFIG.useAutoDiscovery) return true;
    
    const section = CONFIG.documentSections.find(s => s.filename === filename);
    return section ? section.enabled : false;
}

// 📋 Display current configuration (for debugging)
export function displayCurrentConfig(): void {
    console.log('🎯 Current Project Configuration:');
    console.log(`   Product: ${CONFIG.productName}`);
    console.log(`   Client: ${CONFIG.siteName}`);
    console.log(`   Environment: ${CONFIG.environment}`);
    console.log(`   Version: ${CONFIG.version}`);
    console.log(`   Base Resource Name: ${CONFIG.baseResourceName}`);
    console.log('');
    
    const resources = getResourceNames();
    console.log('📋 Generated Resource Configuration:');
    console.log(`   Primary Resource Group: ${resources.resourceGroupName}`);
    console.log('');
    console.log('🌐 Web App Resources:');
    console.log(`   Web App: ${resources.webAppName} (RG: ${getResourceGroup('webapp')})`);
    console.log(`   App Service Plan: ${resources.legacyPlanName} (RG: ${getResourceGroup('plan')})`);
    console.log('');
    console.log('🗄️ SQL Resources:');
    console.log(`   SQL Server: ${resources.sqlServerName} (RG: ${getResourceGroup('sql')})`);
    console.log(`   SQL Database: ${resources.sqlDatabaseName}`);
    console.log('');
    console.log('⚡ Redis Resources:');
    console.log(`   Redis Cache: ${resources.redisCacheName} (RG: ${getResourceGroup('redis')})`);
    console.log('');
    console.log('💾 Storage Resources:');
    console.log(`   Storage Account: ${resources.storageAccountName} (RG: ${getResourceGroup('storage')})`);
    console.log('');
    
    console.log(`📄 Document: ${CONFIG.outputFilename}`);
    console.log(`🔧 Auto-Discovery Mode: ${CONFIG.useAutoDiscovery ? 'ON' : 'OFF'}`);
    console.log(`📖 Include Glossary: ${CONFIG.documentCustomization.includeGlossary ? 'YES' : 'NO'}`);
    console.log(`📚 Include References: ${CONFIG.documentCustomization.includeReferences ? 'YES' : 'NO'}`);
    
    if (!CONFIG.useAutoDiscovery) {
        const enabledSections = CONFIG.documentSections.filter(s => s.enabled);
        console.log(`📊 Enabled Sections: ${enabledSections.length}`);
        enabledSections.forEach(section => {
            console.log(`   ${section.sectionNumber} - ${section.title}`);
        });
    }
    
    console.log('');
    console.log('💡 Cross-Resource-Group Support: ENABLED');
    console.log('   Resources can be discovered across different resource groups automatically');
}
