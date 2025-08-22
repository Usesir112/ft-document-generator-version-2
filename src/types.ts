// A generic type for a single specification entry
export type Specification = {
    section: string;
    title: string;
    value: string;
};

// A generic type for a set of specification data
export type SpecificationData = Specification[];

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
}

export interface DocumentSection {
    filename: string;
    title: string;
    sectionNumber: string;
    enabled: boolean;
}
