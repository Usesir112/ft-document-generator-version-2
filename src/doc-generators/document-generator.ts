/**
 * Document Generator for Infrastructure Design Reports
 * 
 * This module creates professional Word documents containing infrastructure specifications
 * in a clean, tabular format. It reads JSON data files and converts them into formatted
 * documents with title pages and specification tables.
 * 
 * Key Features:
 * - Dynamic title page generation using configuration functions
 * - Auto-discovery of JSON data files or manual configuration
 * - Professional table formatting with sections, specifications, and values
 * - Clean document structure focused on presenting results
 */

// Import Word document creation libraries
import {
  Document,        // Main document class
  Packer,         // Converts document to buffer for file saving
  Paragraph,      // Text paragraphs with formatting
  Table,          // Table creation and formatting
  TableRow,       // Individual table rows
  TableCell,      // Individual table cells
  WidthType,      // Width measurement types (percentage, points, etc.)
  HeadingLevel,   // Predefined heading styles (H1, H2, H3, etc.)
  ShadingType,    // Background shading for cells
  SectionType,    // Page break and section types
  AlignmentType,  // Text alignment (center, left, right)
  BorderStyle,    // Border styles for tables
} from 'docx';

// Node.js file system and path utilities
import * as fs from 'fs';
import * as path from 'path';

// Custom types and configuration
import { SpecificationData } from '../types';
import { 
    CONFIG, 
    getProductName, 
    getVersion, 
    getClientName, 
    getEnvironment, 
    getDocumentTitle 
} from '../config';

/**
 * Structure for holding loaded specification data
 * Each LoadedData represents one section of specifications that will become a table
 */
interface LoadedData {
    filename: string;        // Original JSON filename (e.g., "network-data.json")
    title: string;          // Human-readable title for the section (e.g., "Network Specification")
    sectionNumber: string;  // Section numbering for document (e.g., "2.2.1")
    data: SpecificationData; // The actual specification items from JSON file
}

/**
 * Load specification data files from the output directory
 * 
 * This function supports two modes:
 * 1. Auto-discovery: Automatically finds all *-data.json files
 * 2. Manual configuration: Uses predefined list from CONFIG.documentSections
 * 
 * @returns Array of LoadedData containing all successfully loaded specifications
 */
function loadDataFiles(): LoadedData[] {
    const loadedData: LoadedData[] = [];
    const outputDir = path.join(process.cwd(), 'output'); // Look in ./output directory

    if (CONFIG.useAutoDiscovery) {
        // MODE 1: Auto-discovery - find all JSON data files automatically
        console.log('🔍 Auto-discovering data files...');
        
        // Check if output directory exists
        if (!fs.existsSync(outputDir)) {
            console.warn(`⚠️  Output directory not found: ${outputDir}`);
            return loadedData;
        }

        // Find all files ending with '-data.json' and sort them alphabetically
        const files = fs.readdirSync(outputDir)
            .filter(file => file.endsWith('-data.json'))
            .sort();

        // Process each discovered file
        files.forEach((filename, index) => {
            try {
                const filePath = path.join(outputDir, filename);
                const data: SpecificationData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                // Convert filename to human-readable title
                // Example: "network-security-data.json" → "Network Security Specification"
                const title = filename
                    .replace('-data.json', '')           // Remove file extension
                    .split('-')                         // Split on hyphens
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
                    .join(' ') + ' Specification';      // Join with spaces and add "Specification"

                loadedData.push({
                    filename,
                    title,
                    sectionNumber: `2.2.${index + 1}`,  // Auto-generate section numbers
                    data
                });
                
                console.log(`   ✅ ${title} (${filename})`);
            } catch (error) {
                console.warn(`   ❌ Could not load ${filename}:`, error);
            }
        });
    } else {
        // MODE 2: Manual configuration - use predefined sections from config
        console.log('📋 Loading configured sections...');
        
        for (const section of CONFIG.documentSections) {
            // Skip disabled sections
            if (!section.enabled) {
                console.log(`   ⏭️  Skipped: ${section.title} (disabled)`);
                continue;
            }

            try {
                const filePath = path.join(outputDir, section.filename);
                
                // Check if the configured file actually exists
                if (fs.existsSync(filePath)) {
                    const data: SpecificationData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    loadedData.push({
                        filename: section.filename,
                        title: section.title,
                        sectionNumber: section.sectionNumber,
                        data: data
                    });
                    console.log(`   ✅ ${section.title} (${section.filename})`);
                } else {
                    console.warn(`   ⚠️  File not found: ${section.filename}`);
                }
            } catch (error) {
                console.warn(`   ❌ Could not load ${section.title}:`, error);
            }
        }
    }

    return loadedData;
}

/**
 * Main document generation function
 */
export function generateDocument(): void {
    console.log(`📊 Generating document: ${CONFIG.documentTitle}`);
    
    // Load data files
    const loadedData = loadDataFiles();

    if (loadedData.length === 0) {
        console.warn('⚠️  No data files found. Please ensure data files exist in the output directory.');
        return;
    }

    console.log(`📄 Creating document with ${loadedData.length} sections...`);

    // Generate specification sections dynamically
    const specificationSections = loadedData.map(item => [
        new Paragraph({
            text: `${item.sectionNumber} ${item.title}`,
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 200, before: 400 }
        }),
        generateSpecificationTable(item.data)
    ]).flat();

    const doc = new Document({
        styles: { 
            default: { 
                document: { 
                    run: { font: 'Arial', size: 22 } // 11pt font
                } 
            } 
        },
        sections: [
            // Title page
            {
                children: [
                    // Title
                    new Paragraph({ 
                        text: getProductName().toUpperCase(), 
                        heading: HeadingLevel.TITLE, 
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 300, before: 800 }
                    }),
                    // Subtitle
                    new Paragraph({ 
                        text: getDocumentTitle(), 
                        heading: HeadingLevel.HEADING_2, 
                        alignment: AlignmentType.CENTER, 
                        spacing: { after: 800 } 
                    }),
                    // Environment/Client info
                    new Paragraph({ 
                        text: `${getClientName()} - ${getEnvironment()} Environment - Version ${getVersion()}`, 
                        heading: HeadingLevel.HEADING_1, 
                        alignment: AlignmentType.CENTER, 
                        spacing: { after: 800 } 
                    }),
                ],
            },
            // Content pages - only results section
            {
                properties: { type: SectionType.NEXT_PAGE },
                children: [
                    // Results section header
                    new Paragraph({
                        text: 'RESULTS',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { after: 400 }
                    }),
                    
                    // Dynamically generated specification sections
                    ...specificationSections
                ],
            },
        ],
    });

    // Generate the document
    Packer.toBuffer(doc).then((buffer) => {
        fs.writeFileSync(CONFIG.outputFilename, buffer);
        console.log(`✅ Document created successfully: ${CONFIG.outputFilename}`);
        console.log(`📊 Generated ${loadedData.length} specification sections`);
    }).catch((error) => {
        console.error('❌ Error generating document:', error);
        throw error;
    });
}

/**
 * Creates a professional specification table with 3 columns: Section | Specification | Value
 * 
 * The table groups specifications by section and uses row spanning for section names.
 * This creates a clean, organized layout where each section name appears once and
 * spans multiple rows for all its specifications.
 * 
 * Table Structure:
 * ┌─────────────┬─────────────────┬─────────────┐
 * │   Section   │  Specification  │    Value    │
 * ├─────────────┼─────────────────┼─────────────┤
 * │             │ CPU Cores       │ 4           │
 * │ Hardware    ├─────────────────┼─────────────┤
 * │             │ RAM             │ 16 GB       │
 * ├─────────────┼─────────────────┼─────────────┤
 * │ Network     │ Bandwidth       │ 1 Gbps      │
 * └─────────────┴─────────────────┴─────────────┘
 * 
 * @param data - Array of specification items from JSON file
 * @returns Formatted Word table ready for document insertion
 */
function generateSpecificationTable(data: SpecificationData | null): Table {
    // Handle empty or missing data gracefully
    if (!data || data.length === 0) {
        return new Table({ 
            rows: [
                new TableRow({ 
                    children: [
                        new TableCell({ 
                            children: [new Paragraph('Data not available')],
                            columnSpan: 3  // Span all 3 columns
                        })
                    ] 
                })
            ] 
        });
    }

    const rows: TableRow[] = [];
    
    // Group specifications by their section (e.g., "Hardware", "Network", etc.)
    const groupedData = groupBySection(data);

    // Process each section and create table rows
    Object.entries(groupedData).forEach(([sectionName, items]) => {
        items.forEach((item, index) => {
            const isFirstInSection = index === 0;
            const cells: TableCell[] = [];

            // Add section cell only for the first row of each section (with rowSpan)
            if (isFirstInSection) {
                cells.push(new TableCell({
                    children: [new Paragraph({ text: sectionName, style: 'strong' })],
                    rowSpan: items.length,  // Span across all rows in this section
                    shading: { fill: 'D9D9D9', type: ShadingType.CLEAR }, // Light gray background
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    },
                }));
            }

            // Specification name cell (e.g., "CPU Cores", "RAM", etc.)
            cells.push(new TableCell({
                children: [new Paragraph(item.title)],
                width: { size: 50, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                },
            }));

            // Specification value cell (e.g., "4", "16 GB", etc.)
            cells.push(new TableCell({
                children: [new Paragraph(item.value)],
                width: { size: 25, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                },
            }));

            // Create the row with all cells
            rows.push(new TableRow({ children: cells }));
        });
    });

    // Create the header row with column titles
    const headerRow = new TableRow({
        children: [
            new TableCell({
                children: [new Paragraph({ text: "Section", style: 'strong' })],
                shading: { fill: 'CCCCCC', type: ShadingType.CLEAR }, // Medium gray background
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                },
            }),
            new TableCell({
                children: [new Paragraph({ text: "Specification", style: 'strong' })],
                shading: { fill: 'CCCCCC', type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                },
            }),
            new TableCell({
                children: [new Paragraph({ text: "Value", style: 'strong' })],
                shading: { fill: 'CCCCCC', type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                },
            })
        ]
    });

    // Return the complete table with header and data rows
    return new Table({
        rows: [headerRow, ...rows],
        width: { size: 100, type: WidthType.PERCENTAGE }, // Use full page width
    });
}

/**
 * Helper function to organize specification data by section
 * 
 * Takes a flat array of specifications and groups them by their section property.
 * This enables the table generator to create section headers that span multiple rows.
 * 
 * Example Input:
 * [
 *   { section: "Hardware", title: "CPU Cores", value: "4" },
 *   { section: "Hardware", title: "RAM", value: "16 GB" },
 *   { section: "Network", title: "Bandwidth", value: "1 Gbps" }
 * ]
 * 
 * Example Output:
 * {
 *   "Hardware": [
 *     { section: "Hardware", title: "CPU Cores", value: "4" },
 *     { section: "Hardware", title: "RAM", value: "16 GB" }
 *   ],
 *   "Network": [
 *     { section: "Network", title: "Bandwidth", value: "1 Gbps" }
 *   ]
 * }
 * 
 * @param data - Array of specification items from JSON file
 * @returns Object with section names as keys and arrays of specifications as values
 */
function groupBySection(data: SpecificationData): Record<string, SpecificationData> {
    return data.reduce((acc, item) => {
        // If this section doesn't exist in our accumulator, create it
        if (!acc[item.section]) {
            acc[item.section] = [];
        }
        // Add the current item to its section group
        acc[item.section].push(item);
        return acc;
    }, {} as Record<string, SpecificationData>);
}
