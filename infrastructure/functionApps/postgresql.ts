import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";
import * as dbforpostgresql from "@pulumi/azure-native/dbforpostgresql";
import { resourceGroup } from "./hyperliquid";

// Configuration
const config = new pulumi.Config();
const environment = pulumi.getStack();

// PostgreSQL Flexible Server
const postgresServer = new dbforpostgresql.Server("hyperliquid-postgres", {
    serverName: "hyperliquid-dev",
    resourceGroupName: "hyperliquid-dev-rg",
    location: "Southeast Asia",
    sku: {
        name: "Standard_B2s",
        tier: "Burstable"
    },
    storage: {
        storageSizeGB: 32
    },
    administratorLogin: "hypeUser",
    availabilityZone: "2",
    backup: {
        backupRetentionDays: 7,
        geoRedundantBackup: dbforpostgresql.GeoRedundantBackupEnum.Disabled
    },
    highAvailability: {
        mode: dbforpostgresql.HighAvailabilityMode.Disabled
    },
    network: {
        publicNetworkAccess: dbforpostgresql.ServerPublicNetworkAccessState.Enabled
    },
    tags: {
        Environment: environment,
        Project: "HyperliquidTrading"
    }
}, { 
    ignoreChanges: [
        "version",
        "administratorLoginPassword",
        "authConfig",
        "dataEncryption",
        "maintenanceWindow",
        "replica",
        "replicationRole",
        "storage.autoGrow",
        "storage.iops",
        "storage.tier",
        "storage.type",
        "highAvailability.standbyAvailabilityZone"
    ],
    import: "/subscriptions/59769386-04d8-4563-af08-31e2d068b693/resourceGroups/hyperliquid-dev-rg/providers/Microsoft.DBforPostgreSQL/flexibleServers/hyperliquid-dev" 
});


// Firewall rules - commented out until server import is complete
// const azureServicesFirewallRule = new dbforpostgresql.FirewallRule("allow-azure-services", {
//     firewallRuleName: "AllowAllAzureServicesAndResourcesWithinAzureIps",
//     resourceGroupName: "hyperliquid-dev-rg",
//     serverName: "hyperliquid-dev",
//     startIpAddress: "0.0.0.0",
//     endIpAddress: "0.0.0.0"
// });

// Create the hyperliquid database
const database = new dbforpostgresql.Database("hyperliquid-db", {
    databaseName: "hyperliquid",
    resourceGroupName: "hyperliquid-dev-rg",
    serverName: "hyperliquid-dev",
    charset: "UTF8",
    collation: "en_US.utf8"
}, { import: "/subscriptions/59769386-04d8-4563-af08-31e2d068b693/resourceGroups/hyperliquid-dev-rg/providers/Microsoft.DBforPostgreSQL/flexibleServers/hyperliquid-dev/databases/hyperliquid" });

// Construct connection string for the application
export const postgresConnectionString = pulumi.interpolate`postgresql://hypeUser:${config.requireSecret("postgres-admin-password")}@${postgresServer.fullyQualifiedDomainName}:5432/hyperliquid?sslmode=require`;

// Export outputs
export const postgresServerName = postgresServer.name;
export const postgresServerFqdn = postgresServer.fullyQualifiedDomainName;
export const postgresDatabaseName = database.name;
export const postgresAdminUsername = "hypeUser";

// Export individual connection details for Function App settings
export const postgresHost = postgresServer.fullyQualifiedDomainName;
export const postgresPort = "5432";
export const postgresDatabase = "hyperliquid";
export const postgresUsername = "hypeUser";
export const postgresPassword = config.requireSecret("postgres-admin-password");
