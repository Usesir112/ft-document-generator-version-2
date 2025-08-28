/**
 * MODIFIED FILE: src/doc-generators/document-generator.ts
 * Main Document Generator - Orchestrates all document sections
 * 
 * CHANGES MADE:
 * - Split large file into modular sections
 * - Imports all section generators
 * - Main orchestration function
 * - Cleaner, more maintainable structure
 * - Fixed type compatibility for Paragraph and Table elements
 */

import { Document, Packer, SectionType, Paragraph, Table } from 'docx';
import * as fs from 'fs';
import * as path from 'path';

// Import all section generators
import { generateTitlePage } from './sections/00-title-page';
import { generateTableOfContents } from './sections/01-table-of-contents';
import { generateIntroduction } from './sections/02-introduction';
import { generateOverview } from './sections/03-overview';
import { generateTechnicalSpecifications } from './sections/04-technical-specifications';
import { generateGlossary } from './sections/05-glossary';
import { generateReferences } from './sections/06-references';

// Import utilities
import { loadDataFiles } from './utils/data-loader';
import { generateDocumentHeader } from './utils/header';
import { CONFIG } from '../config';

/**
 * Main document generation function
 * Orchestrates all sections to create complete IDS document
 */
export function generateDocument(): void {
    console.log(`📊 Generating complete IDS document: ${CONFIG.documentType}`);
    
    // Load specification data
    const loadedData = loadDataFiles();

    if (loadedData.length === 0) {
        console.warn('⚠️  No data files found. Please ensure data files exist in the output directory.');
        return;
    }

    console.log(`📄 Creating document with ${loadedData.length} specification sections...`);

    // Create shared header for all pages except title page
    const documentHeader = generateDocumentHeader();

    // Create document with all sections
    const doc = new Document({
        styles: { 
            default: { 
                document: { 
                    run: { font: 'Arial', size: 22 } // 11pt font
                } 
            } 
        },
        sections: [
            // Title Page (no header)
            {
                children: generateTitlePage()
            },
            
            // Table of Contents (with header)
            {
                properties: { type: SectionType.NEXT_PAGE },
                headers: { default: documentHeader },
                children: generateTableOfContents(loadedData)
            },
            
            // Section 1: Introduction (with header)
            {
                properties: { type: SectionType.NEXT_PAGE },
                headers: { default: documentHeader },
                children: generateIntroduction()
            },
            
            // Section 2: Overview (with header)
            {
                properties: { type: SectionType.NEXT_PAGE },
                headers: { default: documentHeader },
                children: generateOverview()
            },
            
            // Section 3: Technical Specifications (with header)
            {
                properties: { type: SectionType.NEXT_PAGE },
                headers: { default: documentHeader },
                children: generateTechnicalSpecifications(loadedData) as (Paragraph | Table)[]
            },
            
            // Section 4: Glossary (with header)
            {
                properties: { type: SectionType.NEXT_PAGE },
                headers: { default: documentHeader },
                children: generateGlossary() as (Paragraph | Table)[]
            },
            
            // Section 5: References (with header)
            {
                properties: { type: SectionType.NEXT_PAGE },
                headers: { default: documentHeader },
                children: generateReferences() as (Paragraph | Table)[]
            },
        ],
    });

    // Generate and save the document
    Packer.toBuffer(doc).then((buffer) => {
        fs.writeFileSync(CONFIG.outputFilename, buffer);
        console.log(`✅ Complete IDS document created: ${CONFIG.outputFilename}`);
        console.log(`📊 Document structure:`);
        console.log(`   - Title Page (no header)`);
        console.log(`   - Table of Contents (with header)`);
        console.log(`   - Section 1: Introduction (with header)`);
        console.log(`   - Section 2: Overview (with header)`);
        console.log(`   - Section 3: Technical Specifications (${loadedData.length + 1} subsections, with header)`);
        console.log(`   - Section 4: Glossary (with header)`);
        console.log(`   - Section 5: References (with header)`);
        console.log(`📋 Headers include: Logo, document details, and title`);
    }).catch((error) => {
        console.error('❌ Error generating document:', error);
        throw error;
    });
}
