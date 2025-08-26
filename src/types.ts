// MODIFIED FILE: src/types.ts
// Enhanced types with document customization support

// A generic type for a single specification entry
export type Specification = {
    section: string;
    title: string;
    value: string;
};

// A generic type for a set of specification data
export type SpecificationData = Specification[];

// Document customization options
export interface DocumentCustomization {
    companyLogoPath: string; // Path to company logo image file (optional)
    architectureDiagramPath: string; // Path to architecture diagram (optional)
    includeGlossary: boolean; // Whether to include glossary section
    includeReferences: boolean; // Whether to include references section
    customGlossaryItems: GlossaryItem[]; // Additional glossary items
    customReferences: ReferenceItem[]; // Additional references
}

// Glossary item structure
export interface GlossaryItem {
    term: string;
    definition: string;
}

// Reference item structure
export interface ReferenceItem {
    number: string; // e.g., "[2]"
    title: string;
    infoCard: string; // Document number or identifier
}

// Enhanced project configuration
export interface ProjectConfig {
    // Product Information
    productName: string;
    version: string; // e.g., '1.0.0'
    
    // Project Information
    clientName: string;
    environment: string; // 'test', 'staging', 'production', etc.
    
    // Azure Resource Base Name - all other names will be auto-generated from this
    baseResourceName: string;
    
    // Document Settings
    documentTitle: string;
    outputFilename: string;
    useAutoDiscovery: boolean; // true = auto-discover all JSON files, false = use manual sections
    
    // Manual sections (only used if useAutoDiscovery = false)
    documentSections: DocumentSection[];
    
    // Document customization options
    documentCustomization: DocumentCustomization;
}

// Document section configuration
export interface DocumentSection {
    filename: string;
    title: string;
    sectionNumber: string;
    enabled: boolean;
}

// Environment-specific configuration
export interface EnvironmentConfig {
    name: string;
    description: string;
    purpose: string;
}

// Export commonly used environment configurations
export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
    test: {
        name: 'Test',
        description: 'Testing Environment',
        purpose: 'testing and validation during product qualification'
    },
    staging: {
        name: 'Staging',
        description: 'Staging Environment', 
        purpose: 'staging and pre-production testing during product validation'
    },
    production: {
        name: 'Production',
        description: 'Production Environment',
        purpose: 'production operations and live deployment'
    },
    development: {
        name: 'Development',
        description: 'Development Environment',
        purpose: 'development and testing during product development'
    }
};
