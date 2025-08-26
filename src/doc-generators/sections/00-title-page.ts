/**
 * NEW FILE: src/doc-generators/sections/title-page.ts
 * Title page generation for IDS documents
 */

import { Paragraph, TextRun, AlignmentType, BorderStyle, ImageRun} from 'docx';
import { getProductName, getDocumentTitle, getVersion, getClientName, getEnvironment, getDocumentCustomization } from '../../config';
import * as fs from 'fs';
/**
 * Generate professional title page
 */
export function generateTitlePage(): Paragraph[] {

    return [

        // Logo
        new Paragraph({
            children: [
                new ImageRun({
                    data: fs.readFileSync(getDocumentCustomization().companyLogoPath),
                    transformation: {
                        width: 250,  // Fixed width in pixels
                        height: 30, // Fixed height in pixels
                    },
                    type: "png"
                })
            ],
            alignment: AlignmentType.RIGHT,
        }),

        // Add a thick horizontal line
        new Paragraph({
            border: {
                bottom: {
                    color: "000000", // Black color
                    space: 20, // Larger spacing between the border and content
                    style: BorderStyle.SINGLE, // Correctly use 'style' instead of 'value'
                    size: 20, // Thickness of the line
                },
            },
            spacing: { after: 400 }, // Space after the line
        }),
        // Product name in bold caps
        new Paragraph({ 
            children: [
                new TextRun({
                    text: getProductName().toUpperCase(),
                    bold: true,
                    size: 70 // 35pt
                })
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 100}
        }),
        
        // Document title
        new Paragraph({ 
            children: [
                new TextRun({
                    text: getDocumentTitle().toUpperCase(),
                    bold: true,
                    size: 48 // 24pt
                })
            ],
            alignment: AlignmentType.RIGHT, 
            spacing: { after: 600 } 
        }),
        
        // Version and environment info
        new Paragraph({ 
            children: [
                new TextRun({
                    text: `Infrastructure Design Specification for ${getProductName()} Version ${getVersion()}`,
                    bold: true,
                    size: 36 // 16pt
                })
            ],
            alignment: AlignmentType.RIGHT, 
            spacing: { after: 400 } 
        }),
        
        // Environment
        new Paragraph({ 
            children: [
                new TextRun({
                    text: `${getClientName()} - ${getEnvironment().charAt(0).toUpperCase() + getEnvironment().slice(1)} Environment`,
                    bold: true,
                    size: 36 // 14pt
                })
            ],
            alignment: AlignmentType.RIGHT, 
            spacing: { after: 400 } 
        }),
    ];
}
