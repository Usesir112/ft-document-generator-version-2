// src/data-fetchers/database/00-connect-db.ts
// Database connection management for CAT queries
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { SqlManagementClient } from "@azure/arm-sql";
import { DefaultAzureCredential } from "@azure/identity";
import * as sql from 'mssql';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
    server: string;
    port: number;
    database: string;
    user: string;
    password: string;
    options: {
        encrypt: boolean;
        trustServerCertificate: boolean;
        enableArithAbort: boolean;
    };
    connectionTimeout: number;
    requestTimeout: number;
}

/**
 * Database connection manager class
 */
export class DatabaseConnectionManager {
    private config: DatabaseConfig;
    private pool: sql.ConnectionPool | null = null;
    private currentIP: string | null = null;

    constructor() {
        // Validate required environment variables
        const requiredEnvVars = {
            server: process.env.DB_SERVER,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        };

        // Check for missing environment variables
        const missingVars = Object.entries(requiredEnvVars)
            .filter(([key, value]) => !value)
            .map(([key]) => `DB_${key.toUpperCase()}`);

        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        this.config = {
            server: process.env.DB_SERVER!,
            port: parseInt(process.env.DB_PORT || '1433'),
            database: process.env.DB_NAME!,
            user: process.env.DB_USER!,
            password: process.env.DB_PASSWORD!,
            options: {
                encrypt: true,
                trustServerCertificate: false,
                enableArithAbort: true,
            },
            connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
            requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '30000'),
        };
    }

    /**
     * Get current public IP address
     */
    async getCurrentPublicIP(): Promise<string> {
        if (this.currentIP) {
            return this.currentIP;
        }

        try {
            console.log('🌐 Getting current public IP address...');
            
            // Try primary service
            const fetch = (await import('node-fetch')).default;
            const response = await fetch('https://ipinfo.io/ip');
            const ip = await response.text();
            this.currentIP = ip.trim();
            
            console.log(`✅ Current public IP: ${this.currentIP}`);
            return this.currentIP;
            
        } catch (error) {
            console.warn('⚠️  Could not fetch public IP from primary service, trying alternative...');
            
            try {
                const fetch = (await import('node-fetch')).default;
                const response = await fetch('https://api.ipify.org');
                const ip = await response.text();
                this.currentIP = ip.trim();
                
                console.log(`✅ Current public IP (alternative): ${this.currentIP}`);
                return this.currentIP;
                
            } catch (altError) {
                console.error('❌ Could not fetch public IP from any service:', altError);
                throw new Error('Unable to determine public IP address');
            }
        }
    }

    /**
     * Add current IP to Azure SQL firewall rules
     */
    async ensureFirewallAccess(): Promise<void> {
        try {
            const currentIP = await this.getCurrentPublicIP();
            console.log(`🔒 Ensuring firewall access for IP: ${currentIP}`);
            
            const subscriptionId = process.env.azure_subscription_id;
            if (!subscriptionId) {
                console.warn('⚠️  azure_subscription_id not set, skipping firewall management');
                return;
            }

            const credential = new DefaultAzureCredential();
            const sqlClient = new SqlManagementClient(credential, subscriptionId);
            
            // Create a unique rule name based on current timestamp
            const ruleName = `AutoRule-CAT-${Date.now()}`;
            const resourceGroupName = 'batchline-orbia-test';
            const serverName = 'batchline-orbia-test';
            
            // Check if a rule for this IP already exists
            let existingRule = null;
            try {
                const firewallRules = sqlClient.firewallRules.listByServer(resourceGroupName, serverName);
                for await (const rule of firewallRules) {
                    if (rule.startIpAddress === currentIP && rule.endIpAddress === currentIP) {
                        existingRule = rule;
                        console.log(`✅ Firewall rule already exists: ${rule.name}`);
                        break;
                    }
                }
            } catch (error) {
                console.warn('⚠️  Could not check existing firewall rules:', error);
            }
            
            // Create new rule if none exists
            if (!existingRule) {
                await sqlClient.firewallRules.createOrUpdate(
                    resourceGroupName,
                    serverName,
                    ruleName,
                    {
                        startIpAddress: currentIP,
                        endIpAddress: currentIP
                    }
                );
                console.log(`✅ Created firewall rule: ${ruleName} for IP: ${currentIP}`);
            }
            
        } catch (error) {
            console.error('❌ Error managing firewall rules:', error);
            console.log('⚠️  Continuing without automatic firewall management...');
            // Don't throw here - let the connection attempt proceed
        }
    }

    /**
     * Clean up old auto-generated CAT firewall rules
     */
    async cleanupOldFirewallRules(): Promise<void> {
        try {
            console.log('🧹 Cleaning up old CAT firewall rules...');
            
            const subscriptionId = process.env.azure_subscription_id;
            if (!subscriptionId) return;

            const credential = new DefaultAzureCredential();
            const sqlClient = new SqlManagementClient(credential, subscriptionId);
            
            const resourceGroupName = 'batchline-orbia-test';
            const serverName = 'batchline-orbia-test';
            
            const firewallRules = sqlClient.firewallRules.listByServer(resourceGroupName, serverName);
            const currentTime = Date.now();
            const oneHourAgo = currentTime - (60 * 60 * 1000); // 1 hour in milliseconds
            
            for await (const rule of firewallRules) {
                // Clean up auto-generated CAT rules older than 1 hour
                if (rule.name?.startsWith('AutoRule-CAT-')) {
                    const ruleTimestamp = parseInt(rule.name.split('-')[2] || '0');
                    if (ruleTimestamp < oneHourAgo) {
                        try {
                            await sqlClient.firewallRules.delete(resourceGroupName, serverName, rule.name);
                            console.log(`🗑️  Deleted old CAT firewall rule: ${rule.name}`);
                        } catch (deleteError) {
                            console.warn(`⚠️  Could not delete old rule ${rule.name}:`, deleteError);
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️  Could not clean up old firewall rules:', error);
        }
    }

    /**
     * Connect to the database
     */
    async connect(): Promise<void> {
        try {
            console.log('📡 Connecting to database...');
            console.log(`   Server: ${this.config.server}`);
            console.log(`   Database: ${this.config.database}`);
            console.log(`   User: ${this.config.user}`);
            
            // Ensure firewall access before connecting
            await this.ensureFirewallAccess();
            
            // Create connection pool
            this.pool = await sql.connect(this.config);
            console.log('✅ Database connection established');
            
        } catch (error) {
            console.error('❌ Database connection error:', error);
            throw error;
        }
    }

    /**
     * Execute a query
     */
    async executeQuery<T = any>(query: string, description?: string): Promise<T[]> {
        if (!this.pool) {
            throw new Error('Database connection not established. Call connect() first.');
        }

        try {
            console.log(`📋 Executing query: ${description || 'Database query'}`);
            console.log(`   SQL: ${query}`);
            
            const result = await this.pool.request().query(query);
            console.log(`📊 Query returned ${result.recordset.length} records`);
            
            return result.recordset as T[];
            
        } catch (error) {
            console.error(`❌ Query execution error (${description || 'Unknown query'}):`, error);
            throw error;
        }
    }

    /**
     * Execute a parameterized query
     */
    async executeParameterizedQuery<T = any>(
        query: string, 
        parameters: { [key: string]: any }, 
        description?: string
    ): Promise<T[]> {
        if (!this.pool) {
            throw new Error('Database connection not established. Call connect() first.');
        }

        try {
            console.log(`📋 Executing parameterized query: ${description || 'Database query'}`);
            console.log(`   SQL: ${query}`);
            console.log(`   Parameters:`, parameters);
            
            const request = this.pool.request();
            
            // Add parameters to the request
            Object.entries(parameters).forEach(([key, value]) => {
                request.input(key, value);
            });
            
            const result = await request.query(query);
            console.log(`📊 Query returned ${result.recordset.length} records`);
            
            return result.recordset as T[];
            
        } catch (error) {
            console.error(`❌ Parameterized query execution error (${description || 'Unknown query'}):`, error);
            throw error;
        }
    }

    /**
     * Test the database connection
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.connect();
            const result = await this.executeQuery('SELECT 1 as test', 'Connection test');
            return result.length > 0 && result[0].test === 1;
        } catch (error) {
            console.error('❌ Database connection test failed:', error);
            return false;
        }
    }

    /**
     * Close the database connection
     */
    async disconnect(): Promise<void> {
        if (this.pool) {
            try {
                await this.pool.close();
                this.pool = null;
                console.log('🔌 Database connection closed');
            } catch (closeError) {
                console.warn('⚠️  Error closing database connection:', closeError);
            }
        }
    }

    /**
     * Get connection info (for debugging)
     */
    getConnectionInfo(): { server: string; database: string; user: string; currentIP: string | null } {
        return {
            server: this.config.server,
            database: this.config.database,
            user: this.config.user,
            currentIP: this.currentIP
        };
    }
}

// Export a singleton instance
export const dbManager = new DatabaseConnectionManager();

// 🧪 MANUAL TESTING SECTION
if (require.main === module) {
    console.log('🧪 Testing Database Connection Manager');
    console.log('====================================');
    
    (async () => {
        try {
            const testManager = new DatabaseConnectionManager();
            
            console.log('\n🔍 Testing connection...');
            const isConnected = await testManager.testConnection();
            
            if (isConnected) {
                console.log('✅ Connection test passed!');
                
                // Test basic query
                console.log('\n📊 Testing sample query...');
                const tables = await testManager.executeQuery(
                    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'",
                    'List all tables'
                );
                
                console.log(`📋 Found ${tables.length} tables in database`);
                tables.forEach((table: any) => {
                    console.log(`   - ${table.TABLE_NAME}`);
                });
                
            } else {
                console.log('❌ Connection test failed!');
            }
            
            await testManager.disconnect();
            console.log('\n🎉 Database connection manager test completed!');
            
        } catch (error) {
            console.error('\n❌ Database connection manager test failed:', error);
            process.exit(1);
        }
    })();
}
