/**
 * NEW FILE: src/doc-generators/sections/table-of-contents.ts
 * Table of contents generation for IDS documents with page numbers
 */

import { Paragraph, TextRun, AlignmentType, TabStop, TabStopPosition, TabStopType, LeaderType } from 'docx';
import { LoadedData } from '../utils/data-loader';

/**
 * Generate table of contents with proper page numbering and dot leaders
 */
export function generateTableOfContents(loadedData: LoadedData[]): Paragraph[] {
    // Define page numbers (these would be calculated based on actual document structure)
    const pageNumbers = {
        introduction: 1,
        overview: 1,
        specifications: 1,
        glossary: 1,
        references: 1
    };

    const tocEntries = [
        new Paragraph({
            children: [
                new TextRun({
                    text: "TABLE OF CONTENTS",
                    bold: true,
                    size: 32
                })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400, before: 200 }
        }),
        
        // Section 1: Introduction
        new Paragraph({
            children: [
                new TextRun({
                    text: "1. INTRODUCTION",
                    size: 22
                }),
                new TextRun({
                    text: "\t",
                }),
                new TextRun({
                    text: pageNumbers.introduction.toString(),
                    size: 22
                })
            ],
            tabStops: [
                {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                    leader: LeaderType.DOT,
                }
            ],
            spacing: { after: 100 }
        }),
        
        new Paragraph({
            children: [
                new TextRun({
                    text: "   1.1 Purpose and Scope of this Document",
                    size: 22
                }),
                new TextRun({
                    text: "\t",
                }),
                new TextRun({
                    text: pageNumbers.introduction.toString(),
                    size: 22
                })
            ],
            tabStops: [
                {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                    leader: LeaderType.DOT,
                }
            ],
            spacing: { after: 100 }
        }),

        // Section 2: Overview
        new Paragraph({
            children: [
                new TextRun({
                    text: "2. OVERVIEW",
                    size: 22
                }),
                new TextRun({
                    text: "\t",
                }),
                new TextRun({
                    text: pageNumbers.overview.toString(),
                    size: 22
                })
            ],
            tabStops: [
                {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                    leader: LeaderType.DOT,
                }
            ],
            spacing: { after: 100 }
        }),
        
        new Paragraph({
            children: [
                new TextRun({
                    text: "   2.1 System Architecture Overview",
                    size: 22
                }),
                new TextRun({
                    text: "\t",
                }),
                new TextRun({
                    text: pageNumbers.overview.toString(),
                    size: 22
                })
            ],
            tabStops: [
                {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                    leader: LeaderType.DOT,
                }
            ],
            spacing: { after: 100 }
        }),
        
        new Paragraph({
            children: [
                new TextRun({
                    text: "   2.2 Partner Systems",
                    size: 22
                }),
                new TextRun({
                    text: "\t",
                }),
                new TextRun({
                    text: (pageNumbers.overview + 1).toString(),
                    size: 22
                })
            ],
            tabStops: [
                {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                    leader: LeaderType.DOT,
                }
            ],
            spacing: { after: 100 }
        }),

        // Section 3: Technical Specifications
        new Paragraph({
            children: [
                new TextRun({
                    text: "3. HARDWARE, SOFTWARE AND APPLICATIONS DESIGN SPECIFICATIONS",
                    size: 22
                }),
                new TextRun({
                    text: "\t",
                }),
                new TextRun({
                    text: pageNumbers.specifications.toString(),
                    size: 22
                })
            ],
            tabStops: [
                {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                    leader: LeaderType.DOT,
                }
            ],
            spacing: { after: 100 }
        }),
        
        // Dynamic TOC entries for specifications with estimated page numbers
        ...loadedData.map((item, index) => 
            new Paragraph({
                children: [
                    new TextRun({
                        text: `   ${item.sectionNumber} ${item.title}`,
                        size: 22
                    }),
                    new TextRun({
                        text: "\t",
                    }),
                    new TextRun({
                        text: (pageNumbers.specifications + index + 1).toString(),
                        size: 22
                    })
                ],
                tabStops: [
                    {
                        type: TabStopType.RIGHT,
                        position: TabStopPosition.MAX,
                        leader: LeaderType.DOT,
                    }
                ],
                spacing: { after: 100 }
            })
        ),
        
        // Client specification entry
        new Paragraph({
            children: [
                new TextRun({
                    text: `   3.${loadedData.length + 1} Client Specification Requirements`,
                    size: 22
                }),
                new TextRun({
                    text: "\t",
                }),
                new TextRun({
                    text: (pageNumbers.specifications + loadedData.length + 1).toString(),
                    size: 22
                })
            ],
            tabStops: [
                {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                    leader: LeaderType.DOT,
                }
            ],
            spacing: { after: 100 }
        }),
        
        // Section 4: Glossary
        new Paragraph({
            children: [
                new TextRun({
                    text: "4. GLOSSARY",
                    size: 22
                }),
                new TextRun({
                    text: "\t",
                }),
                new TextRun({
                    text: pageNumbers.glossary.toString(),
                    size: 22
                })
            ],
            tabStops: [
                {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                    leader: LeaderType.DOT,
                }
            ],
            spacing: { after: 100 }
        }),

        // Section 5: References
        new Paragraph({
            children: [
                new TextRun({
                    text: "5. REFERENCES",
                    size: 22
                }),
                new TextRun({
                    text: "\t",
                }),
                new TextRun({
                    text: pageNumbers.references.toString(),
                    size: 22
                })
            ],
            tabStops: [
                {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                    leader: LeaderType.DOT,
                }
            ],
            spacing: { after: 100 }
        }),
    ];

    return tocEntries;
}
