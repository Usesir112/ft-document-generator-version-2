# 📄 Document Generator Guide

The Document Generator is the core component that transforms JSON data files into professional Word documents. It's designed to be **completely independent** of how the data was collected - whether from Azure APIs, manual input, or any other source.

## 🎯 Core Concept

The Document Generator operates on a simple principle:

```
JSON Files (output/) → Document Generator → Professional Word Document
```

**Key Features:**
- ✅ **Source agnostic** - Works with any JSON data source
- ✅ **Flexible input** - Manual or auto-discovery modes
- ✅ **Professional output** - Formatted Word documents with tables
- ✅ **Configurable** - Control sections, titles, and numbering

## 📊 Data Structure

The Document Generator expects JSON files with this exact structure:

```typescript
// Required structure for all JSON files
[
  {
    "section": "General",
    "title": "Memory",
    "value": "1 GB"
  },
  {
    "section": "Security", 
    "title": "Encryption",
    "value": "Enabled"
  }
  // ... more items
]
```

### Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `section` | string | Groups related specifications | "General", "Security", "Configuration" |
| `title` | string | The specification name | "Memory", "SSL Enabled", "Backup Schedule" |
| `value` | string | The actual value or setting | "1 GB", "Enabled", "Daily at 02:00 UTC" |

## 🔧 Configuration

### Document Generation Modes

The generator supports two modes configured in `config.ts`:

#### Mode 1: Manual Section Control (Recommended)

```typescript
export const CONFIG: ProjectConfig = {
    useAutoDiscovery: false,
    documentSections: [
        { filename: 'web-server-data.json', title: 'Web Server Specification', sectionNumber: '2.2.1', enabled: true },
        { filename: 'database-data.json', title: 'SQL Database Specification', sectionNumber: '2.2.2', enabled: true },
        { filename: 'custom-data.json', title: 'Custom Integration', sectionNumber: '2.2.3', enabled: false },
    ]
};
```

**Benefits:**
- Full control over section order and numbering
- Enable/disable specific sections
- Custom titles and section numbers
- Perfect for standardized reports

#### Mode 2: Auto-Discovery

```typescript
export const CONFIG: ProjectConfig = {
    useAutoDiscovery: true,
    // documentSections ignored in auto-discovery mode
};
```

**Benefits:**
- Automatically includes all `*-data.json` files in `output/`
- Great for development and testing
- No configuration needed for new files
- Sections numbered automatically (2.2.1, 2.2.2, etc.)

### Document Settings

```typescript
export const CONFIG: ProjectConfig = {
    documentTitle: 'Infrastructure Acceptance Testing (IAT)',
    outputFilename: 'infrastructure_report.docx',
    projectName: 'My Project',
    clientName: 'Client Name',
    environment: 'production',
};
```

## 📁 File Requirements

### Location
All JSON data files must be in the `output/` directory:

```
output/
├── web-server-data.json
├── database-data.json
├── redis-data.json
├── storage-data.json
├── alert-data.json
└── custom-data.json
```

### Naming Convention

For auto-discovery mode, files must follow the pattern:
```
{resource-name}-data.json
```

Examples:
- `web-server-data.json` → "Web Server Specification"
- `database-data.json` → "Database Specification"  
- `custom-service-data.json` → "Custom Service Specification"

## 🚀 Usage

### Generate Document

```bash
# Full process (fetch data + generate document)
npm start

# Generate document only (from existing JSON files)
npm run doc-only

# Show current configuration
npm run config
```

### Programmatic Usage

```typescript
import { generateDocumentFromConfig } from './src/doc-generators/document-generator';
import { CONFIG } from './config';

// Generate document using current configuration
await generateDocumentFromConfig({
    projectName: 'My Project',
    outputDir: 'output',
    documentConfig: CONFIG
});
```

## 📝 Creating Data Files Manually

You can create JSON data files manually without using Azure fetchers:

### Example: Custom Service Data

Create `output/custom-service-data.json`:

```json
[
  {
    "section": "General",
    "title": "Service Name",
    "value": "Custom Authentication Service"
  },
  {
    "section": "General", 
    "title": "Version",
    "value": "2.1.0"
  },
  {
    "section": "Configuration",
    "title": "Port",
    "value": "8080"
  },
  {
    "section": "Configuration",
    "title": "Protocol",
    "value": "HTTPS"
  },
  {
    "section": "Security",
    "title": "SSL Certificate",
    "value": "Wildcard certificate from DigiCert"
  },
  {
    "section": "Security",
    "title": "Authentication Method",
    "value": "OAuth 2.0 + JWT"
  },
  {
    "section": "Monitoring",
    "title": "Health Check Endpoint",
    "value": "/health"
  },
  {
    "section": "Monitoring",
    "title": "Logging Level",
    "value": "INFO"
  }
]
```

### Example: External Service Integration

Create `output/external-api-data.json`:

```json
[
  {
    "section": "Integration",
    "title": "Service Provider",
    "value": "SendGrid Email Service"
  },
  {
    "section": "Integration",
    "title": "API Version",
    "value": "v3"
  },
  {
    "section": "Configuration",
    "title": "Daily Send Limit",
    "value": "10,000 emails"
  },
  {
    "section": "Configuration",
    "title": "Retry Policy",
    "value": "3 attempts with exponential backoff"
  },
  {
    "section": "Security",
    "title": "API Key Storage",
    "value": "Azure Key Vault"
  },
  {
    "section": "Monitoring",
    "title": "Delivery Tracking",
    "value": "Enabled with webhooks"
  }
]
```

## 🎨 Document Customization

### Section Organization

The generator groups specifications by section and displays them in tables:

```
2.2.1 Web Server Specification
┌─────────────┬─────────────────────────┬─────────┬────────┐
│ Section     │ Specification           │ Value   │ Result │
├─────────────┼─────────────────────────┼─────────┼────────┤
│ General     │ Memory                  │ 2 GB    │        │
│ General     │ Location                │ East US │        │
│ Security    │ HTTPS Only              │ Enabled │        │
│ Security    │ SSL Certificate         │ Valid   │        │
└─────────────┴─────────────────────────┴─────────┴────────┘
```

### Standard Section Names

Use these standard section names for consistency:

```typescript
// Common sections across different resources
"General"           // Basic information (size, location, type)
"Configuration"     // Settings and options
"Security"          // Encryption, access controls, certificates  
"Services"          // Backup, logging, additional services
"Monitoring"        // Diagnostic settings, alerts, health checks
"Advanced settings" // Technical configuration
"Platform settings" // Runtime and platform options
"Integration"       // External service connections
"Performance"       // Scaling, capacity, optimization
"Compliance"        // Regulatory and audit requirements
```

### Value Formatting Guidelines

Follow these conventions for consistent formatting:

```typescript
// Boolean states
"Enabled" / "Disabled"
"On" / "Off" 
"Yes" / "No"

// Numeric values with units
"2 GB"
"100 DTUs"
"30 Days"
"99.9%"

// Complex configurations
"SSL TLS1.2, Port 443, Certificate: DigiCert"
"Primary – East US\nSecondary – West US"

// Missing or default values
"-"
"Not configured"
"Default"
"N/A"
```

## 🔄 Integration with Different Data Sources

### Azure API Data (Current)
```typescript
// Fetch from Azure
const webApp = await webClient.webApps.get(resourceGroupName, webAppName);

// Transform to standard format
const data = [
  { section: "General", title: "Location", value: webApp.location },
  { section: "Security", title: "HTTPS Only", value: webApp.httpsOnly ? "Enabled" : "Disabled" }
];

// Save to JSON
fs.writeFileSync('output/web-server-data.json', JSON.stringify(data, null, 2));
```

### Manual Configuration
```typescript
// Create data manually
const data = [
  { section: "General", title: "Service Type", value: "Microservice" },
  { section: "Configuration", title: "Replicas", value: "3" }
];

// Save to JSON  
fs.writeFileSync('output/manual-service-data.json', JSON.stringify(data, null, 2));
```

### CSV/Excel Import
```typescript
import * as Papa from 'papaparse';

// Read CSV file
const csvData = fs.readFileSync('input.csv', 'utf8');
const parsed = Papa.parse(csvData, { header: true });

// Transform to standard format
const data = parsed.data.map(row => ({
  section: row.section,
  title: row.specification,
  value: row.value
}));

// Save to JSON
fs.writeFileSync('output/imported-data.json', JSON.stringify(data, null, 2));
```

### Database Query Results
```typescript
// Query database
const results = await database.query('SELECT section, title, value FROM specifications');

// Transform to standard format (already matches!)
const data = results.rows;

// Save to JSON
fs.writeFileSync('output/database-data.json', JSON.stringify(data, null, 2));
```

### REST API Integration
```typescript
// Fetch from external API
const response = await fetch('https://api.service.com/config');
const apiData = await response.json();

// Transform to standard format
const data = [
  { section: "Integration", title: "API Version", value: apiData.version },
  { section: "Configuration", title: "Rate Limit", value: `${apiData.rateLimit} requests/hour` },
  { section: "Security", title: "Authentication", value: apiData.authType }
];

// Save to JSON
fs.writeFileSync('output/external-api-data.json', JSON.stringify(data, null, 2));
```

## 🧪 Testing Document Generation

### Test with Sample Data

Create test files to verify document generation:

```bash
# Create test data
mkdir -p output
cat > output/test-data.json << EOF
[
  {
    "section": "Test Section",
    "title": "Test Specification",  
    "value": "Test Value"
  }
]
EOF

# Generate document
npm run doc-only
```

### Validate JSON Structure

```typescript
// Validation function
function validateDataStructure(data: any[]): boolean {
  return data.every(item => 
    typeof item.section === 'string' &&
    typeof item.title === 'string' &&
    typeof item.value === 'string'
  );
}

// Usage
const data = JSON.parse(fs.readFileSync('output/test-data.json', 'utf8'));
if (!validateDataStructure(data)) {
  throw new Error('Invalid data structure');
}
```

## 🚨 Troubleshooting

### Common Issues

#### Empty or Missing Sections
```
Warning: No data files found in output/ directory
```
**Solution:** Ensure JSON files exist and follow naming convention

#### Invalid JSON Structure
```
Error: Cannot read property 'section' of undefined
```
**Solution:** Validate JSON structure matches required format

#### Document Generation Fails
```
Error: Cannot generate document
```
**Solutions:**
- Check file permissions in output directory
- Ensure Word document isn't open in another application
- Validate all JSON files are properly formatted

### Debug Mode

Enable detailed logging:

```typescript
// In config.ts, add debug flag
export const CONFIG = {
  // ... other settings
  debugMode: true
};
```

### Manual Validation

```bash
# Check JSON files are valid
node -e "console.log(JSON.parse(require('fs').readFileSync('output/test-data.json', 'utf8')))"

# List all data files
ls -la output/*-data.json

# Check file contents
cat output/web-server-data.json | jq '.[0]'
```

## 🎯 Best Practices

### Data Organization
- **Group related items** in the same section
- **Use consistent naming** for similar specifications across resources
- **Provide meaningful values** rather than technical IDs

### File Management
- **Use descriptive filenames** that indicate the resource type
- **Keep files focused** on single resources or logical units
- **Validate JSON** before generating documents

### Value Formatting
- **Be consistent** with units and formatting
- **Handle missing data** gracefully with "-" or "Not configured"
- **Use human-readable** values instead of technical codes

### Configuration Management
- **Use manual mode** for production documents
- **Test with auto-discovery** during development
- **Version control** your configuration settings

## 🔮 Advanced Use Cases

### Multi-Environment Reports

```typescript
// Generate separate documents for different environments
const environments = ['test', 'staging', 'production'];

for (const env of environments) {
  const config = {
    ...CONFIG,
    outputFilename: `${env}_infrastructure_report.docx`,
    documentTitle: `${env.toUpperCase()} Infrastructure Report`
  };
  
  await generateDocumentFromConfig(config);
}
```

### Custom Document Templates

```typescript
// Modify document styling and structure
const customConfig = {
  ...CONFIG,
  documentTitle: 'Security Compliance Report',
  documentSections: [
    { filename: 'security-data.json', title: 'Security Controls', sectionNumber: '1.1', enabled: true },
    { filename: 'compliance-data.json', title: 'Compliance Status', sectionNumber: '1.2', enabled: true },
  ]
};
```

### Automated Report Generation

```bash
#!/bin/bash
# Script to generate reports from multiple data sources

# Fetch data from various sources
python fetch_database_config.py > output/database-data.json
curl -s https://api.service.com/config | jq '.data' > output/external-data.json
./custom-fetcher.sh > output/custom-data.json

# Generate document
npm run doc-only

# Archive the report
cp *.docx archive/report-$(date +%Y%m%d).docx
```

---

**The Document Generator is designed to be the universal translator between any data source and professional documentation. Focus on getting your data into the right JSON format, and it handles the rest!** 📄✨