/**
 * NEW FILE: src/doc-generators/utils/data-loader.ts
 * Data loading utility for specification files
 */

import * as fs from 'fs';
import * as path from 'path';
import { SpecificationData } from '../../types';
import { CONFIG } from '../../config';

/**
 * Structure for holding loaded specification data
 */
export interface LoadedData {
    filename: string;
    title: string;
    sectionNumber: string;
    data: SpecificationData;
}

/**
 * Load specification data files from the output directory
 */
export function loadDataFiles(): LoadedData[] {
    const loadedData: LoadedData[] = [];
    const outputDir = path.join(process.cwd(), 'output');

    if (CONFIG.useAutoDiscovery) {
        console.log('🔍 Auto-discovering data files...');
        
        if (!fs.existsSync(outputDir)) {
            console.warn(`⚠️  Output directory not found: ${outputDir}`);
            return loadedData;
        }

        const files = fs.readdirSync(outputDir)
            .filter(file => file.endsWith('-data.json'))
            .sort();

        files.forEach((filename, index) => {
            try {
                const filePath = path.join(outputDir, filename);
                const data: SpecificationData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                const title = filename
                    .replace('-data.json', '')
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ') + ' Specification';

                loadedData.push({
                    filename,
                    title,
                    sectionNumber: `3.${index + 1}`,
                    data
                });
                
                console.log(`   ✅ ${title} (${filename})`);
            } catch (error) {
                console.warn(`   ❌ Could not load ${filename}:`, error);
            }
        });
    } else {
        console.log('📋 Loading configured sections...');
        
        for (const [index, section] of CONFIG.documentSections.entries()) {
            if (!section.enabled) {
                console.log(`   ⭕ Skipped: ${section.title} (disabled)`);
                continue;
            }

            try {
                const filePath = path.join(outputDir, section.filename);
                
                if (fs.existsSync(filePath)) {
                    const data: SpecificationData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    loadedData.push({
                        filename: section.filename,
                        title: section.title,
                        sectionNumber: `3.${index + 1}`,
                        data: data
                    });
                    console.log(`   ✅ ${section.title} (${section.filename})`);
                } else {
                    console.warn(`   ⚠️  File not found: ${section.filename}`);
                }
            } catch (error) {
                console.warn(`   ❌ Could not load ${section.title}:`, error);
            }
        }
    }

    return loadedData;
}
