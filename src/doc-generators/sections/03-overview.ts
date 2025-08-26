/**
 * NEW FILE: src/doc-generators/sections/overview.ts
 * Overview section generation for IDS documents
 */

import { Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from 'docx';
import { getProductName, getClientName, getDocumentCustomization } from '../../config';
import * as fs from 'fs';

/**
 * Generate Section 2: Overview
 */
export function generateOverview(): Paragraph[] {
    return [
        new Paragraph({
            text: "2. OVERVIEW",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400, before: 200 }
        }),
        
        new Paragraph({
            text: "2.1 System Architecture Overview",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200, before: 300 }
        }),
        
        new Paragraph({
            children: [
                new TextRun(`The ${getProductName()} application shall be installed and managed on the cloud 'Platform as a Service' provided by Microsoft Azure. Only an authorized person from ${getClientName()} can access to execute the development, maintenance, configuration, and installation. Access to the cloud service provider is only available via secure internet connection as illustrated in Figure 1.`)
            ],
            spacing: { after: 200 }
        }),
        
        // Diagram
        new Paragraph({
                    children: [
                        new ImageRun({
                            data: fs.readFileSync(getDocumentCustomization().architectureDiagramPath),
                            transformation: {
                                width: 500,  // Fixed width in pixels
                                height: 300, // Fixed height in pixels
                            },
                            type: "png"
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                }),
        
        new Paragraph({
            children: [
                new TextRun({
                    text: `Figure 1. ${getProductName()} Topology`,
                    italics: true
                })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        }),
        
        new Paragraph({
            children: [
                new TextRun(`As illustrated in Fig.1, ${getProductName()} consists of three main parties which are the ${getClientName()} company, ${getProductName()} clients and Cloud Service Provider (Microsoft Azure). The ${getProductName()} application works in a client-server model. Therefore, for each ${getProductName()} client, they must ensure that the basic infrastructure is correctly provided and evidently documented in an Infrastructure Design Report as defined in the ${getProductName()} Qualification Plan [1].`)
            ],
            spacing: { after: 200 }
        }),
        
        new Paragraph({
            text: "2.2 Partner Systems",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200, before: 400 }
        }),
        
        new Paragraph({
            children: [
                new TextRun(`Currently, there is no interface to other software via ${getProductName()} application.`)
            ],
            spacing: { after: 200 }
        }),
    ];
}
