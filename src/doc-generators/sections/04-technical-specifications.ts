/**
 * NEW FILE: src/doc-generators/sections/technical-specifications.ts
 * Technical specifications section generation for IDS documents
 */

import { Paragraph, TextRun, HeadingLevel, Table } from 'docx';
import { LoadedData } from '../utils/data-loader';
import { generateSpecificationTable, generateClientSpecificationTable } from '../utils/table-generators';
import { getProductName } from '../../config';

/**
 * Generate Section 3: Technical Specifications
 * Returns an array containing both paragraphs and tables
 */
export function generateTechnicalSpecifications(loadedData: LoadedData[]): (Paragraph | Table)[] {
    // Generate specification sections dynamically
    const specificationSections: (Paragraph | Table)[] = loadedData.map(item => [
        new Paragraph({
            text: `${item.sectionNumber} ${item.title}`,
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 200, before: 400 }
        }),
        generateSpecificationTable(item.data)
    ]).flat();

    // Add client specification section
    const clientSpecSection: (Paragraph | Table)[] = [
        new Paragraph({
            text: `3.${loadedData.length + 1} Client Specification Requirements`,
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 200, before: 400 }
        }),
        generateClientSpecificationTable()
    ];

    return [
        new Paragraph({
            text: "3. HARDWARE, SOFTWARE AND APPLICATIONS DESIGN SPECIFICATIONS",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400, before: 200 }
        }),
        
        new Paragraph({
            children: [
                new TextRun("This section specifies the virtual and physical infrastructure to be provided, maintained, and managed by the cloud service provider. These are the minimum requirements to setup and run the "),
                new TextRun(`${getProductName()} `),
                new TextRun("application for the usage requirement as defined in the in the URS and FS.")
            ],
            spacing: { after: 200 }
        }),
        
        new Paragraph({
            children: [
                new TextRun(`The virtual and physical infrastructure deployed shall be scaled according to the usage and capacity required by ${getProductName()}'s clients/users in such a way that there will always be more resources available than demand.`)
            ],
            spacing: { after: 400 }
        }),
        
        // Dynamic specification sections
        ...specificationSections,
        
        // Client specification section
        ...clientSpecSection
    ];
}
