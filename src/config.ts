// SIMPLE SOLUTION: src/config.ts
// Auto-generates ALL resource names with individual override capability

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

// 🎯 MAIN CONFIGURATION - Only 3 core values needed
export const CONFIG: ProjectConfig = {
    // Product Information
    productName: process.env.product_name || 'default-product',
    version: process.env.version || '1.0.0',

    // Project Information
    siteName: process.env.site_name || 'default-site',
    environment: process.env.env_name || 'development',
    
    // Auto-generated base name for standard pattern
    baseResourceName: `${sanitizeForFilename(process.env.product_name || '')}-${sanitizeForFilename(process.env.site_name || '')}-${sanitizeForFilename(process.env.env_name || '')}`.toLowerCase(),
    
    // Document Settings
    documentType: process.env.documentType || 'Specification',
    outputFilename: `${sanitizeForFilename(process.env.product_name || '')}-${sanitizeForFilename(process.env.site_name || '')}-${sanitizeForFilename(process.env.env_name || '')}-${sanitizeForFilename(process.env.documentType || '')}-report.docx`.toLowerCase(),
    
    // Document Generation Mode
    useAutoDiscovery: false,
    
    // Document Sections
    documentSections: [
        { filename: 'web-server-data.json', title: 'Web Server Specification', sectionNumber: '3.1', enabled: true },
        { filename: 'database-data.json', title: 'SQL Azure Database Specification', sectionNumber: '3.2', enabled: true },
        { filename: 'redis-data.json', title: 'Redis Cache Specification', sectionNumber: '3.3', enabled: true },
        { filename: 'storage-data.json', title: 'Azure Storage Specification', sectionNumber: '3.4', enabled: true },
        { filename: 'alert-data.json', title: 'Performance Monitoring', sectionNumber: '3.5', enabled: true },
    ],
    
    // Document customization options
    documentCustomization: {
        companyLogoPath: 'src/assets/images/batchline-logo.png',
        architectureDiagramPath: 'src/assets/images/overview_bl.png',
        includeGlossary: true,
        includeReferences: true,
        customGlossaryItems: [],
        customReferences: [],
    }
};

// 🤖 SIMPLE RESOURCE NAME GENERATION WITH OVERRIDES
export function getResourceNames() {
    const base = CONFIG.baseResourceName;
    
    // 🎯 AUTO-GENERATED DEFAULTS (from product_name-site_name-env_name pattern)
    const defaults = {
        resourceGroupName: base,
        webAppName: `${base}-legacy`,
        legacyPlanName: `${base}-legacy`,
        sqlServerName: base,
        sqlDatabaseName: `${base}-legacy`,
        redisCacheName: base,
        storageAccountName: base.replace(/-/g, '').toLowerCase() // Remove hyphens for storage
    };
    
    // 🚀 OVERRIDE WITH USER VALUES (use exact user input if provided)
    return {
        resourceGroupName: process.env.resource_group_name || defaults.resourceGroupName,
        webAppName: process.env.web_app_name || defaults.webAppName,
        legacyPlanName: process.env.app_service_plan_name || defaults.legacyPlanName,
        sqlServerName: process.env.sql_server_name || defaults.sqlServerName,
        sqlDatabaseName: process.env.sql_database_name || defaults.sqlDatabaseName,
        redisCacheName: process.env.redis_cache_name || defaults.redisCacheName,
        storageAccountName: process.env.storage_account_name || defaults.storageAccountName
    };
}

// 📄 Export functions (unchanged)
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

export function isSectionEnabled(filename: string): boolean {
    if (CONFIG.useAutoDiscovery) return true;
    
    const section = CONFIG.documentSections.find(s => s.filename === filename);
    return section ? section.enabled : false;
}

// 🆕 SIMPLE CONFIGURATION DISPLAY
export function displayCurrentConfig(): void {
    console.log('🎯 Current Project Configuration:');
    console.log(`   Product: ${CONFIG.productName}`);
    console.log(`   Client: ${CONFIG.siteName}`);
    console.log(`   Environment: ${CONFIG.environment}`);
    console.log(`   Version: ${CONFIG.version}`);
    console.log('');
    
    const resources = getResourceNames();
    const base = CONFIG.baseResourceName;
    
    console.log('📋 Generated Resource Names:');
    console.log('─'.repeat(50));
    
    // Show each resource with override status
    console.log(`🏢 resourceGroupName: ${resources.resourceGroupName} ${process.env.resource_group_name ? '✅ (overridden)' : '⚙️ (auto-generated)'}`);
    console.log(`🌐 webAppName: ${resources.webAppName} ${process.env.web_app_name ? '✅ (overridden)' : '⚙️ (auto-generated)'}`);
    console.log(`📊 legacyPlanName: ${resources.legacyPlanName} ${process.env.app_service_plan_name ? '✅ (overridden)' : '⚙️ (auto-generated)'}`);
    console.log(`🗄️ sqlServerName: ${resources.sqlServerName} ${process.env.sql_server_name ? '✅ (overridden)' : '⚙️ (auto-generated)'}`);
    console.log(`💾 sqlDatabaseName: ${resources.sqlDatabaseName} ${process.env.sql_database_name ? '✅ (overridden)' : '⚙️ (auto-generated)'}`);
    console.log(`⚡ redisCacheName: ${resources.redisCacheName} ${process.env.redis_cache_name ? '✅ (overridden)' : '⚙️ (auto-generated)'}`);
    console.log(`📦 storageAccountName: ${resources.storageAccountName} ${process.env.storage_account_name ? '✅ (overridden)' : '⚙️ (auto-generated)'}`);
    
    console.log('\n' + '─'.repeat(50));
    console.log(`📄 Document: ${CONFIG.outputFilename}`);
    console.log(`🔧 Auto-Discovery Mode: ${CONFIG.useAutoDiscovery ? 'ON' : 'OFF'}`);
    
    // Show override count
    const overrideCount = [
        process.env.resource_group_name,
        process.env.web_app_name,
        process.env.app_service_plan_name,
        process.env.sql_server_name,
        process.env.sql_database_name,
        process.env.redis_cache_name,
        process.env.storage_account_name
    ].filter(Boolean).length;
    
    console.log(`🎛️  Resource Overrides: ${overrideCount}/7`);
    
    if (!CONFIG.useAutoDiscovery) {
        const enabledSections = CONFIG.documentSections.filter(s => s.enabled);
        console.log(`📊 Enabled Sections: ${enabledSections.length}`);
        enabledSections.forEach(section => {
            console.log(`   ${section.sectionNumber} - ${section.title}`);
        });
    }
}
