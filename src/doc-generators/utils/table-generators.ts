/**
 * NEW FILE: src/doc-generators/utils/table-generators.ts
 * Complete table generation utilities for all document sections
 */

import { Table, TableRow, TableCell, Paragraph, WidthType, ShadingType, BorderStyle } from 'docx';
import { SpecificationData } from '../../types';
import { getProductName, getsiteName, getVersion } from '../../config';

/**
 * Creates a professional specification table with 3 columns: Section | Specification | Value
 * This is the main table used for Azure resource specifications
 */
export function generateSpecificationTable(data: SpecificationData | null): Table {
    if (!data || data.length === 0) {
        return new Table({ 
            rows: [
                new TableRow({ 
                    children: [
                        new TableCell({ 
                            children: [new Paragraph('Data not available')],
                            columnSpan: 3,
                            margins: { top: 200, bottom: 200, left: 200, right: 200 }
                        })
                    ] 
                })
            ],
            width: { size: 100, type: WidthType.PERCENTAGE }
        });
    }

    const rows: TableRow[] = [];
    const groupedData = groupBySection(data);

    // Generate data rows with section grouping
    Object.entries(groupedData).forEach(([sectionName, items]) => {
        items.forEach((item, index) => {
            const isFirstInSection = index === 0;
            const cells: TableCell[] = [];

            // Add section cell only for the first row of each section (with rowSpan)
            if (isFirstInSection) {
                cells.push(new TableCell({
                    children: [new Paragraph({ text: sectionName, style: 'strong' })],
                    rowSpan: items.length,
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

            // Specification name cell
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

            // Specification value cell
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

            rows.push(new TableRow({ children: cells }));
        });
    });

    // Create header row
    const headerRow = new TableRow({
        children: [
            new TableCell({
                children: [new Paragraph({ text: "Section", style: 'strong' })],
                shading: { fill: 'CCCCCC', type: ShadingType.CLEAR }, // Medium gray background
                width: { size: 25, type: WidthType.PERCENTAGE },
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
                width: { size: 50, type: WidthType.PERCENTAGE },
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
                width: { size: 25, type: WidthType.PERCENTAGE },
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

    return new Table({
        rows: [headerRow, ...rows],
        width: { size: 100, type: WidthType.PERCENTAGE },
    });
}

/**
 * Generate client specification table (similar to AMP's client requirements section)
 */
export function generateClientSpecificationTable(): Table {
    const clientSpecs = [
        { 
            siteName: getsiteName(), 
            os: "Windows, macOS", 
            browser: "Google Chrome, Microsoft Edge, Firefox", 
            version: getVersion() 
        }
    ];

    const headerRow = new TableRow({
        children: [
            new TableCell({
                children: [new Paragraph({ text: "Client Name", style: 'strong' })],
                shading: { fill: 'CCCCCC', type: ShadingType.CLEAR },
                width: { size: 25, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                },
            }),
            new TableCell({
                children: [new Paragraph({ text: "Operating System (OS)", style: 'strong' })],
                shading: { fill: 'CCCCCC', type: ShadingType.CLEAR },
                width: { size: 25, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                },
            }),
            new TableCell({
                children: [new Paragraph({ text: "Browser", style: 'strong' })],
                shading: { fill: 'CCCCCC', type: ShadingType.CLEAR },
                width: { size: 25, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                },
            }),
            new TableCell({
                children: [new Paragraph({ text: `${getProductName()} Version`, style: 'strong' })],
                shading: { fill: 'CCCCCC', type: ShadingType.CLEAR },
                width: { size: 25, type: WidthType.PERCENTAGE },
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

    const dataRows = clientSpecs.map(spec => 
        new TableRow({
            children: [
                new TableCell({
                    children: [new Paragraph(spec.siteName)],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    },
                }),
                new TableCell({
                    children: [new Paragraph(spec.os)],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    },
                }),
                new TableCell({
                    children: [new Paragraph(spec.browser)],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    },
                }),
                new TableCell({
                    children: [new Paragraph(spec.version)],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    },
                })
            ]
        })
    );

    return new Table({
        rows: [headerRow, ...dataRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
    });
}

/**
 * Generate glossary table with technical terms and definitions
 */
export function generateGlossaryTable(): Table {
    const glossaryItems = [
        { term: "API", definition: "Application Programming Interface" },
        { term: "ARM", definition: "Azure Resource Manager" },
        { term: "CPU", definition: "Central Processing Unit" },
        { term: "DNS", definition: "Domain Name System" },
        { term: "DTU", definition: "Database Transaction Unit" },
        { term: "FS", definition: "Functional Specification" },
        { term: "GB", definition: "Gigabyte" },
        { term: "GxP", definition: "Good Practice Guidelines" },
        { term: "HTTPS", definition: "Hypertext Transfer Protocol Secure" },
        { term: "IAT", definition: "Infrastructure Acceptance Testing" },
        { term: "IDS", definition: "Infrastructure Design Specification" },
        { term: "JSON", definition: "JavaScript Object Notation" },
        { term: "LRS", definition: "Locally Redundant Storage" },
        { term: "MB", definition: "Megabyte" },
        { term: "PaaS", definition: "Platform as a Service" },
        { term: "RAM", definition: "Random Access Memory" },
        { term: "REST", definition: "Representational State Transfer" },
        { term: "SLA", definition: "Service Level Agreement" },
        { term: "SNI", definition: "Server Name Indication" },
        { term: "SQL", definition: "Structured Query Language" },
        { term: "SSL", definition: "Secure Sockets Layer" },
        { term: "TLS", definition: "Transport Layer Security" },
        { term: "URL", definition: "Uniform Resource Locator" },
        { term: "URS", definition: "User Requirements Specification" },
        { term: "UTC", definition: "Coordinated Universal Time" },
        { term: "vCore", definition: "Virtual Core" },
        { term: "VPC", definition: "Virtual Private Cloud" }
    ];

    const rows = glossaryItems.map(item => 
        new TableRow({
            children: [
                new TableCell({
                    children: [new Paragraph({ text: item.term, style: 'strong' })],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    },
                }),
                new TableCell({
                    children: [new Paragraph(item.definition)],
                    width: { size: 80, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    },
                })
            ]
        })
    );

    // Add header row
    const headerRow = new TableRow({
        children: [
            new TableCell({
                children: [new Paragraph({ text: "Term", style: 'strong' })],
                shading: { fill: 'CCCCCC', type: ShadingType.CLEAR },
                width: { size: 20, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                },
            }),
            new TableCell({
                children: [new Paragraph({ text: "Definition", style: 'strong' })],
                shading: { fill: 'CCCCCC', type: ShadingType.CLEAR },
                width: { size: 80, type: WidthType.PERCENTAGE },
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

    return new Table({
        rows: [headerRow, ...rows],
        width: { size: 100, type: WidthType.PERCENTAGE },
    });
}

/**
 * Generate references table for related documents
 */
export function generateReferencesTable(): Table {
    const references = [
        { 
            no: "[1]", 
            title: `Qualification Plan for ${getProductName()} Version ${getVersion()}`,
            infoCard: `${getProductName().toUpperCase()}-000`
        },
        { 
            no: "[2]", 
            title: `User Requirements Specification for ${getProductName()}`,
            infoCard: `${getProductName().toUpperCase()}-URS-001`
        },
        { 
            no: "[3]", 
            title: `Functional Specification for ${getProductName()}`,
            infoCard: `${getProductName().toUpperCase()}-FS-001`
        },
        { 
            no: "[4]", 
            title: "Microsoft Azure Security and Compliance Documentation",
            infoCard: "MS-AZ-SEC-001"
        }
    ];

    const headerRow = new TableRow({
        children: [
            new TableCell({
                children: [new Paragraph({ text: "No", style: 'strong' })],
                shading: { fill: 'CCCCCC', type: ShadingType.CLEAR },
                width: { size: 10, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                },
            }),
            new TableCell({
                children: [new Paragraph({ text: "Title", style: 'strong' })],
                shading: { fill: 'CCCCCC', type: ShadingType.CLEAR },
                width: { size: 65, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                },
            }),
            new TableCell({
                children: [new Paragraph({ text: "Info Card No", style: 'strong' })],
                shading: { fill: 'CCCCCC', type: ShadingType.CLEAR },
                width: { size: 25, type: WidthType.PERCENTAGE },
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

    const dataRows = references.map(ref => 
        new TableRow({
            children: [
                new TableCell({
                    children: [new Paragraph(ref.no)],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    },
                }),
                new TableCell({
                    children: [new Paragraph(ref.title)],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    },
                }),
                new TableCell({
                    children: [new Paragraph(ref.infoCard)],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    },
                })
            ]
        })
    );

    return new Table({
        rows: [headerRow, ...dataRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
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
 *   { section: "General", title: "CPU Cores", value: "4" },
 *   { section: "General", title: "RAM", value: "16 GB" },
 *   { section: "Network", title: "Bandwidth", value: "1 Gbps" }
 * ]
 * 
 * Example Output:
 * {
 *   "General": [
 *     { section: "General", title: "CPU Cores", value: "4" },
 *     { section: "General", title: "RAM", value: "16 GB" }
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
