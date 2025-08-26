/**
 * NEW FILE: src/doc-generators/utils/header.ts
 * Document header generation utility for IDS documents
 */

import { 
    Header, 
    Table, 
    TableRow, 
    TableCell, 
    Paragraph, 
    TextRun, 
    ImageRun, 
    AlignmentType, 
    VerticalAlign, 
    WidthType 
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import { getProductName, getVersion, getDocumentTitle, getDocumentCustomization } from '../../config';

/**
 * Generate document header for all pages except title page
 * Contains logo, document details, and title
 */
export function generateDocumentHeader(): Header {
    return new Header({
        children: [
            new Table({
                rows: [
                    new TableRow({
                        children: [
                            // First Column (Logo and Document Details)
                            new TableCell({
                                children: [
                                    // Logo paragraph
                                    generateLogoForHeader(),
                                    
                                    // Document details
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "Doc. No.: <see Cover Sheet>",
                                                size: 15, // 7.5pt font size (15 = 7.5pt * 2)
                                            }),
                                        ],
                                        alignment: AlignmentType.LEFT,
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "Revision: <see Cover Sheet>",
                                                size: 15,
                                            }),
                                        ],
                                        alignment: AlignmentType.LEFT,
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "Effective Date: <see Cover Sheet>",
                                                size: 15,
                                            }),
                                        ],
                                        alignment: AlignmentType.LEFT,
                                    }),
                                ],
                                width: {
                                    size: 50,
                                    type: WidthType.PERCENTAGE,
                                },
                            }),
                            
                            // Second Column (Document Title)
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: `${getDocumentTitle()} for ${getProductName()} Version ${getVersion()}`,
                                                size: 20, // 10pt font size (20 = 10pt * 2)
                                                bold: true,
                                            }),
                                        ],
                                        alignment: AlignmentType.CENTER,
                                    }),
                                ],
                                width: {
                                    size: 50,
                                    type: WidthType.PERCENTAGE,
                                },
                                verticalAlign: VerticalAlign.CENTER,
                            }),
                        ],
                    }),
                ],
                width: {
                    size: 100,
                    type: WidthType.PERCENTAGE,
                },
            }),
            
            // Spacing paragraph
            new Paragraph({
                text: "", // Empty paragraph for spacing
                spacing: { after: 200 }, // Spacing after header
            }),
        ],
    });
}

/**
 * Generate logo for header with error handling
 * Smaller size appropriate for header usage
 */
function generateLogoForHeader(): Paragraph {
    try {
        const logoPath = getDocumentCustomization().companyLogoPath;
        
        // Check if logo file exists
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            
            return new Paragraph({
                children: [
                    new ImageRun({
                        data: logoBuffer,
                        transformation: {
                            width: 170,  // Header-appropriate width
                            height: 30,  // Header-appropriate height
                        },
                        type: "png"
                    })
                ],
                alignment: AlignmentType.LEFT,
            });
        } else {
            console.warn(`Header logo not found at: ${logoPath}`);
            // Fallback to text if logo not found
            return new Paragraph({
                children: [
                    new TextRun({
                        text: `${getProductName()}`,
                        size: 20,
                        bold: true,
                        color: "000000"
                    })
                ],
                alignment: AlignmentType.LEFT,
            });
        }
    } catch (error) {
        console.error('Error loading header logo:', error);
        // Fallback to text on error
        return new Paragraph({
            children: [
                new TextRun({
                    text: `${getProductName()}`,
                    size: 20,
                    bold: true,
                    color: "000000"
                })
            ],
            alignment: AlignmentType.LEFT,
        });
    }
}

/**
 * Alternative header generator with custom document details
 * Use this if you want to specify custom document number, revision, etc.
 */
export function generateCustomDocumentHeader(options: {
    documentNumber?: string;
    revision?: string;
    effectiveDate?: string;
}): Header {
    const {
        documentNumber = "<see Cover Sheet>",
        revision = "<see Cover Sheet>", 
        effectiveDate = "<see Cover Sheet>"
    } = options;

    return new Header({
        children: [
            new Table({
                rows: [
                    new TableRow({
                        children: [
                            // First Column (Logo and Custom Details)
                            new TableCell({
                                children: [
                                    generateLogoForHeader(),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: `Doc. No.: ${documentNumber}`,
                                                size: 15,
                                            }),
                                        ],
                                        alignment: AlignmentType.LEFT,
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: `Revision: ${revision}`,
                                                size: 15,
                                            }),
                                        ],
                                        alignment: AlignmentType.LEFT,
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: `Effective Date: ${effectiveDate}`,
                                                size: 15,
                                            }),
                                        ],
                                        alignment: AlignmentType.LEFT,
                                    }),
                                ],
                                width: {
                                    size: 50,
                                    type: WidthType.PERCENTAGE,
                                },
                            }),
                            
                            // Second Column (Document Title)
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: `${getDocumentTitle()} for ${getProductName()} Version ${getVersion()}`,
                                                size: 20,
                                                bold: true,
                                            }),
                                        ],
                                        alignment: AlignmentType.CENTER,
                                    }),
                                ],
                                width: {
                                    size: 50,
                                    type: WidthType.PERCENTAGE,
                                },
                                verticalAlign: VerticalAlign.CENTER,
                            }),
                        ],
                    }),
                ],
                width: {
                    size: 100,
                    type: WidthType.PERCENTAGE,
                },
            }),
            
            new Paragraph({
                text: "",
                spacing: { after: 200 },
            }),
        ],
    });
}
