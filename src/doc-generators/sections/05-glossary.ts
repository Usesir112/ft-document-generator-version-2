/**
 * NEW FILE: src/doc-generators/sections/glossary.ts
 * Glossary section generation for IDS documents
 */

import { Paragraph, HeadingLevel, Table } from 'docx';
import { generateGlossaryTable } from '../utils/table-generators';

/**
 * Generate Section 4: Glossary
 * Returns an array containing both paragraphs and tables
 */
export function generateGlossary(): (Paragraph | Table)[] {
    return [
        new Paragraph({
            text: "4. GLOSSARY",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400, before: 200 }
        }),
        
        generateGlossaryTable()
    ];
}