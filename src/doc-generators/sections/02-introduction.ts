/**
 * NEW FILE: src/doc-generators/sections/introduction.ts
 * Introduction section generation for IDS documents
 */

import { Paragraph, TextRun, HeadingLevel } from 'docx';
import { getProductName, getEnvironment } from '../../config';

/**
 * Generate Section 1: Introduction
 */
export function generateIntroduction(): Paragraph[] {
    const environmentPurpose = getEnvironment() === 'test' 
        ? 'testing and validation during product qualification'
        : getEnvironment() === 'production' 
        ? 'production operations and live deployment'
        : getEnvironment() === 'staging'
        ? 'staging and pre-production testing'
        : 'development and testing';

    return [
        new Paragraph({
            text: "1. INTRODUCTION",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400, before: 200 }
        }),
        
        new Paragraph({
            text: "1.1 Purpose and Scope of this Document",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200, before: 300 }
        }),
        
        new Paragraph({
            children: [
                new TextRun(`This document is a technical design specification of minimum requirements for the infrastructure of ${getProductName()}'s ${getEnvironment()} environment. ${getProductName()}'s ${getEnvironment()} environment is used for the purpose of ${environmentPurpose}.`)
            ],
            spacing: { after: 200 }
        }),
        
        new Paragraph({
            children: [
                new TextRun(`${getProductName()} is a cloud-based application deployed on Microsoft Azure. The Infrastructure Design Specification (IDS) is an important document to guarantee that the ${getProductName()} application is deployed smoothly and effectively.`)
            ],
            spacing: { after: 200 }
        }),
        
        new Paragraph({
            children: [
                new TextRun("Cloud based software is completely different from other local software implementations. Any software locally installed at the company shall have its own reliable physical infrastructures whereas the cloud-based solution utilizes infrastructure resources that are provided as a leased service by a cloud service provider. Security and reliability of the software shall reflect the reputation and trustworthiness of the cloud service provider.")
            ],
            spacing: { after: 200 }
        }),
        
        new Paragraph({
            children: [
                new TextRun("Section 2 provides an overview and diagram of the key components of the cloud infrastructure. Section 3 provides specifications for how the virtual infrastructure components of the cloud platform are configured to ensure security and integrity of data and the application, and to ensure that necessary infrastructure resources are available to meet the performance and availability requirements defined in the URS and FS.")
            ],
            spacing: { after: 200 }
        }),
        
        new Paragraph({
            children: [
                new TextRun("After this IDS is approved, the verification of infrastructure will be done and recorded in a document called Infrastructure Acceptance Testing (IAT) to ensure all requirements are met before installation and testing.")
            ],
            spacing: { after: 200 }
        }),
    ];
}
