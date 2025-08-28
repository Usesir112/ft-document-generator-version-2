# 📊 Data Fetchers Developer Guide

This guide explains how the Azure data fetchers work, how to modify them, and how to add new ones.

## 🎯 Overview

Data fetchers are responsible for connecting to Azure APIs, collecting resource information, and saving structured data as JSON files. Each fetcher handles one type of Azure resource.

## 📁 Current Data Fetchers

| File | Azure Resource | Output File | Description |
|------|----------------|-------------|-------------|
| `web-server.ts` | App Service + Plan | `web-server-data.json` | Web app configuration, scaling, security |
| `database.ts` | SQL Database + Server | `database-data.json` | Database specs, encryption, backup |
| `redis.ts` | Redis Cache | `redis-data.json` | Cache configuration, memory, security |
| `storage.ts` | Storage Account | `storage-data.json` | Storage type, replication, access |
| `alert.ts` | Monitor Alerts | `alert-data.json` | Alert rules and monitoring setup |

## 🏗️ Data Fetcher Architecture

### Basic Structure

Every data fetcher follows this pattern:

```typescript
// 1. Environment Setup
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 2. Azure SDK Imports
import { AzureServiceClient } from "@azure/arm-service";
import { DefaultAzureCredential } from "@azure/identity";
import { SpecificationData } from "../types";

// 3. Main Function
export async function fetchAndSaveResourceDetails(
    resourceGroupName: string,
    resourceName: string
): Promise<void> {
    // Implementation here
}

// 4. Testing Section
if (require.main === module) {
    // Independent testing code
}
```

### Data Flow

```
Azure API → Raw Data → Processing → Structured Data → JSON File
     ↓         ↓          ↓            ↓             ↓
  REST calls  Objects   Logic       SpecData     output/*.json
```

## 🧪 Testing Data Fetchers

### Independent Testing

Each data fetcher can be tested independently:

```bash
# Test individual fetchers
ts-node src/data-fetchers/web-server.ts
ts-node src/data-fetchers/database.ts
ts-node src/data-fetchers/redis.ts
ts-node src/data-fetchers/storage.ts
ts-node src/data-fetchers/alert.ts
```

### Test Configuration

Each fetcher includes a test section at the bottom:

```typescript
if (require.main === module) {
    console.log('🧪 Running [Resource] Fetcher in Test Mode');
    
    const testConfigs = [
        {
            name: "Test Environment",
            resourceGroupName: "batchline-orbia-test",
            resourceName: "batchline-orbia-test"
        }
    ];
    
    // Test execution logic
}
```

### Debugging Output

All fetchers provide detailed logging:
- 📡 Progress indicators
- 📋 Configuration summaries  
- ⚠️ Warning messages for missing optional features
- ✅ Success confirmations

## 🔧 Modifying Existing Fetchers

### Adding New Data Points

To add a new specification to an existing fetcher:

1. **Fetch the data** in the "PRIMARY DATA FETCHING" section:
```typescript
const newData = await client.someService.getNewProperty(resourceGroupName, resourceName);
```

2. **Process the data** in the "LOGIC FOR DERIVED VALUES" section:
```typescript
const processedValue = newData.someProperty ? 'Enabled' : 'Disabled';
```

3. **Add to data assembly**:
```typescript
const data: SpecificationData = [
    // ... existing data
    { section: 'New Section', title: 'New Property', value: processedValue },
];
```

### Example: Adding TLS Version to Redis

```typescript
// In redis.ts, add to data assembly:
{ section: 'Security', title: 'TLS Version', value: redisCache.minimumTlsVersion || '1.2' },
```

### Handling Optional Features

Always wrap optional API calls in try-catch:

```typescript
let optionalData;
try {
    optionalData = await client.getOptionalFeature(resourceName);
} catch (error) {
    console.warn('⚠️  Could not fetch optional feature:', error);
}

const optionalValue = optionalData?.property || 'Not configured';
```

## 🆕 Adding New Data Fetchers

### Step 1: Create the Fetcher File

Create `src/data-fetchers/new-resource.ts`:

```typescript
// src/data-fetchers/new-resource.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables at the very top
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { NewResourceManagementClient } from "@azure/arm-newresource";
import { DefaultAzureCredential } from "@azure/identity";
import { SpecificationData } from "../types";
import * as fs from 'fs';

export async function fetchAndSaveNewResourceDetails(
    resourceGroupName: string,
    resourceName: string
): Promise<void> {
    try {
        console.log(`📡 Fetching New Resource details for ${resourceName}...`);

        // Initialize Azure clients
        const subscriptionId = process.env.azure_subscription_id;
        if (!subscriptionId) {
            throw new Error('azure_subscription_id environment variable is not set');
        }

        const credential = new DefaultAzureCredential();
        const client = new NewResourceManagementClient(credential, subscriptionId);

        // --- PRIMARY DATA FETCHING ---
        console.log(`📋 Getting resource information...`);
        const resource = await client.resources.get(resourceGroupName, resourceName);

        // --- LOGIC FOR DERIVED VALUES ---
        console.log(`⚙️  Processing configuration...`);
        
        // Process your data here
        const processedValue = resource.someProperty || 'Default';

        // --- SUMMARY LOGGING ---
        console.log(`📈 Resource Configuration Summary:`);
        console.log(`   Property: ${processedValue}`);

        // --- DATA ASSEMBLY ---
        const data: SpecificationData = [
            { section: 'General', title: 'Property Name', value: processedValue },
            { section: 'Configuration', title: 'Location', value: resource.location || '-' },
        ];

        // --- SAVE TO FILE ---
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = 'new-resource-data.json';
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        console.log(`✅ New Resource data saved to ${filePath}`);

    } catch (error) {
        console.error(`❌ Error fetching New Resource details for ${resourceName}:`, error);
        throw error;
    }
}

// 🧪 MANUAL TESTING SECTION
if (require.main === module) {
    console.log('🧪 Running New Resource Fetcher in Test Mode');
    console.log('============================================');
    
    (async () => {
        const testConfigs = [
            {
                name: "Test Environment New Resource",
                resourceGroupName: "batchline-orbia-test",
                resourceName: "batchline-orbia-test-newresource"
            }
        ];

        try {
            for (const config of testConfigs) {
                console.log(`\n🎯 Processing ${config.name}`);
                console.log('─'.repeat(50));
                
                await fetchAndSaveNewResourceDetails(
                    config.resourceGroupName,
                    config.resourceName
                );
                
                console.log(`✅ Completed ${config.name}`);
            }
            
            console.log('\n🎉 All test configurations completed successfully!');
            console.log('📁 Check the output/ directory for generated JSON files');
            
        } catch (error) {
            console.error('\n❌ Test failed:', error);
            process.exit(1);
        }
    })();
}
```

### Step 2: Add to Main Process

Add the fetcher call to `main.ts`:

```typescript
import { fetchAndSaveNewResourceDetails } from './data-fetchers/new-resource';

// In main() function, add to Promise.all:
await fetchAndSaveNewResourceDetails(
    resources.resourceGroupName,
    resources.newResourceName  // Add this to getResourceNames()
);
```

### Step 3: Update Resource Names

Add the new resource name to `config.ts`:

```typescript
export function getResourceNames() {
    const base = CONFIG.baseResourceName;
    
    return {
        // ... existing names
        newResourceName: `${base}-newresource`,
    };
}
```

### Step 4: Add to Document Configuration

Add to document sections in `config.ts`:

```typescript
documentSections: [
    // ... existing sections
    { filename: 'new-resource-data.json', title: 'New Resource Specification', sectionNumber: '2.2.7', enabled: true },
]
```

## 🎨 Best Practices

### Error Handling

```typescript
// ✅ Good: Specific error handling
try {
    const data = await client.getData(resourceName);
} catch (error) {
    console.warn('⚠️  Could not fetch optional data:', error);
    // Continue with default values
}

// ❌ Bad: Silent failures
const data = await client.getData(resourceName).catch(() => null);
```

### User Feedback

```typescript
// ✅ Good: Clear progress
console.log(`📡 Fetching Resource details for ${resourceName}...`);
console.log(`📋 Getting basic information...`);
console.log(`🔍 Checking security settings...`);
console.log(`📊 Processing configuration...`);
console.log(`✅ Resource data saved to ${filePath}`);
```

### Data Processing

```typescript
// ✅ Good: Clear data transformation
const sslEnabled = resource.enableSsl ? 'Enabled' : 'Disabled';
const memorySize = resource.memorySizeInMB ? `${resource.memorySizeInMB} MB` : '-';

// ✅ Good: Handle undefined values
const location = resource.location || 'Unknown';
const version = resource.version?.toString() || '-';
```

### Configuration Summary

Always provide a summary of what was found:

```typescript
console.log(`📈 Resource Configuration Summary:`);
console.log(`   Type: ${resource.type}`);
console.log(`   Size: ${memorySize}`);
console.log(`   SSL: ${sslEnabled}`);
console.log(`   Location: ${location}`);
```

## 🔍 Understanding the Data Structure

### SpecificationData Type

All fetchers use the same data structure:

```typescript
interface SpecificationItem {
    section: string;    // Groups related items (e.g., 'General', 'Security')
    title: string;      // The specification name
    value: string;      // The actual value or configuration
}

type SpecificationData = SpecificationItem[];
```

### Common Sections

Use these standard section names for consistency:

- **General**: Basic information (size, location, type)
- **Configuration**: Settings and options
- **Security**: Encryption, access controls, certificates
- **Services**: Backup, logging, additional services
- **Monitoring**: Diagnostic settings, alerts
- **Advanced settings**: Technical configuration
- **Platform settings**: Runtime and platform options

### Value Formatting

Follow these conventions for values:

```typescript
// Boolean values
value: enabled ? 'Enabled' : 'Disabled'
value: sslOnly ? 'Yes' : 'No'
value: feature ? 'On' : 'Off'

// Numeric values with units
value: `${capacity} DTUs`
value: `${memory} GB`
value: `${retention} Days`

// Lists and multiple values
value: 'Primary – East US\nSecondary – West US'
value: 'SSL TLS1.2, SSL port 6380, Disable Non-SSL port'

// Missing or unknown values
value: property || '-'
value: property || 'Not configured'
value: property || 'Unknown'
```

## 🐛 Debugging Tips

### Common Issues

1. **Environment variables not loaded**
   - Solution: Ensure dotenv.config() is at the very top

2. **Azure permissions insufficient**
   - Solution: Check Azure roles and permissions

3. **Resource not found**
   - Solution: Verify resource names match exactly

### Debugging Techniques

```typescript
// Add debug logging
console.log("--- RAW AZURE API DATA ---");
console.log("Resource object:", resource);
console.log("Configuration:", resource.configuration);
console.log("--------------------------");

// Test individual API calls
console.log(`Testing API call for ${resourceName}...`);
const result = await client.getResource(resourceGroupName, resourceName);
console.log('API result:', result);
```

### Testing Checklist

- [ ] Test with valid resource names
- [ ] Test with invalid/missing resources
- [ ] Test with minimal Azure permissions
- [ ] Test with missing optional features
- [ ] Verify JSON output structure
- [ ] Check all data points are populated

## 📦 Azure SDK Resources

### Common Azure Management Clients

```typescript
// App Service
import { WebSiteManagementClient } from "@azure/arm-appservice";

// SQL Database
import { SqlManagementClient } from "@azure/arm-sql";

// Storage
import { StorageManagementClient } from "@azure/arm-storage";

// Redis
import { RedisManagementClient } from "@azure/arm-rediscache";

// Monitoring
import { MonitorClient } from "@azure/arm-monitor";

// Security
import { SecurityCenter } from "@azure/arm-security";

// Cosmos DB
import { CosmosDBManagementClient } from "@azure/arm-cosmosdb";

// Key Vault
import { KeyVaultManagementClient } from "@azure/arm-keyvault";

// Virtual Machines
import { ComputeManagementClient } from "@azure/arm-compute";
```

### Finding Azure SDK Documentation

1. **Official docs**: https://docs.microsoft.com/en-us/javascript/api/
2. **Package search**: https://www.npmjs.com/search?q=%40azure%2Farm-
3. **GitHub samples**: https://github.com/Azure-Samples/

## 🚀 Advanced Patterns

### Multi-Resource Fetchers

Some fetchers need to query multiple related resources:

```typescript
// Get main resource
const mainResource = await client.getMain(resourceGroupName, mainName);

// Get related resources
const relatedResources = [];
for await (const item of client.listRelated(resourceGroupName)) {
    if (item.parentId === mainResource.id) {
        relatedResources.push(item);
    }
}
```

### Environment-Aware Processing

Some fetchers adapt based on detected environment:

```typescript
function detectEnvironment(resourceName: string): string {
    if (resourceName.includes('prod')) return 'production';
    if (resourceName.includes('test')) return 'test';
    return 'unknown';
}

const environment = detectEnvironment(resourceName);
const alertsToCheck = environment === 'production' ? prodAlerts : testAlerts;
```

### Async Iteration Patterns

Many Azure APIs return iterators:

```typescript
// Standard pattern for listing resources
const items = [];
const iterator = client.listByResourceGroup(resourceGroupName);
for await (const item of iterator) {
    if (meetsCriteria(item)) {
        items.push(item);
    }
}
```

---

**Happy coding! 🎉** 

For questions or issues, test your changes independently and check the generated JSON files in the `output/` directory.