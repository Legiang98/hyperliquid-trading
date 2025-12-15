import * as pulumi from "@pulumi/pulumi";
import * as storage from "@pulumi/azure-native/storage";
import { resourceGroup } from "../shared";

// Storage Account for Table Storage
const storageAccount = new storage.StorageAccount("hyperliquidStorage", {
    resourceGroupName: resourceGroup.name,
    accountName: "hyperliquidstore", // Must be globally unique, lowercase, no hyphens
    location: resourceGroup.location,
    sku: {
        name: storage.SkuName.Standard_LRS, // Locally redundant storage (cheapest)
    },
    kind: storage.Kind.StorageV2,
    enableHttpsTrafficOnly: true,
    minimumTlsVersion: storage.MinimumTlsVersion.TLS1_2,
    allowBlobPublicAccess: false,
});

// Create Orders Table
const ordersTable = new storage.Table("ordersTable", {
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    tableName: "orders",
});

// Get storage account keys
const storageAccountKeys = pulumi.all([resourceGroup.name, storageAccount.name]).apply(
    ([resourceGroupName, accountName]) =>
        storage.listStorageAccountKeys({
            resourceGroupName,
            accountName,
        })
);

const primaryStorageKey = storageAccountKeys.apply((keys) => keys.keys[0].value);

// Connection string for Table Storage
export const tableStorageConnectionString = pulumi.interpolate`DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${primaryStorageKey};EndpointSuffix=core.windows.net`;

// Exports
export const storageAccountName = storageAccount.name;
export const ordersTableName = ordersTable.name;
