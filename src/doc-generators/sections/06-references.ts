/**
 * NEW FILE: src/doc-generators/sections/references.ts
 * References section generation for IDS documents
 */

import { Paragraph, HeadingLevel, Table } from 'docx';
import { generateReferencesTable } from '../utils/table-generators';

/**
 * Generate Section 5: References
 * Returns an array containing both paragraphs and tables
 */
export function generateReferences(): (Paragraph | Table)[] {
    return [
        new Paragraph({
            text: "5. REFERENCES",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400, before: 200 }
        }),
        
        generateReferencesTable()
    ];
}
