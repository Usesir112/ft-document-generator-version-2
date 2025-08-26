// MODIFIED FILE: src/config.ts
// Enhanced configuration file for the entire project with full document support
import { ProjectConfig } from './types'; 

// 🎯 MAIN CONFIGURATION - CHANGE THESE VALUES FOR YOUR PROJECT
export const CONFIG: ProjectConfig = {
    // Product Information
    productName: 'BatchLine',
    version: '1.0.0',

    // Project Information
    clientName: 'Orbia',
    environment: 'test',
    
    // 🔧 MAIN SETTING: Change this base name and everything else is auto-generated
    baseResourceName: 'batchline-orbia-test',
    
    // Document Settings
    documentTitle: 'Infrastructure Design Reports (IDR)',
    outputFilename: 'orbia_test_infrastructure_report.docx',
    
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
    
    // 🎨 NEW: Document customization options
    documentCustomization: {
        companyLogoPath: 'src/assets/images/batchline-logo.png', // Path to company logo image file (optional)
        architectureDiagramPath: 'src/assets/images/overview_bl.png', // Path to architecture diagram (optional)
        includeGlossary: true,
        includeReferences: true,
        customGlossaryItems: [], // Additional glossary items
        customReferences: [], // Additional references
    }
};

// 🤖 AUTO-GENERATED RESOURCE NAMES (Don't change these functions)
export function getResourceNames() {
    const base = CONFIG.baseResourceName;
    
    // Remove hyphens for storage account (Azure requirement)
    const storageAccountName = base.replace(/-/g, '').toLowerCase();
    
    return {
        resourceGroupName: base,
        webAppName: `${base}-legacy`,
        legacyPlanName: `${base}-legacy`,
        sqlServerName: base,
        sqlDatabaseName: `${base}-legacy`,
        redisCacheName: base,
        storageAccountName: storageAccountName
    };
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
export function getClientName(): string {
    return CONFIG.clientName;
}

// 📄 Get environment
export function getEnvironment(): string {
    return CONFIG.environment;
}

// 📄 Get document title
export function getDocumentTitle(): string {
    return CONFIG.documentTitle;
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
    console.log(`   Project: ${CONFIG.productName}`);
    console.log(`   Client: ${CONFIG.clientName}`);
    console.log(`   Environment: ${CONFIG.environment}`);
    console.log(`   Version: ${CONFIG.version}`);
    console.log(`   Base Resource Name: ${CONFIG.baseResourceName}`);
    console.log('');
    
    const resources = getResourceNames();
    console.log('📋 Generated Resource Names:');
    Object.entries(resources).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });
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
}
