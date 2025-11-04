import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";
import * as web from "@pulumi/azure-native/web";
import * as applicationinsights from "@pulumi/azure-native/applicationinsights";

// Configuration
const config = new pulumi.Config();
const location = "southeastasia";
const environment = pulumi.getStack();

// Create Resource Group for Hyperliquid function app
const hyperliquidResourceGroup = new resources.ResourceGroup("hyperliquid-rg", {
    resourceGroupName: `hyperliquid-${environment}-rg`,
    location: location,
    tags: {
        Environment: environment,
        Project: "HyperliquidTrading",
        ManagedBy: "Pulumi"
    }
});

// Create Storage Account for Hyperliquid Function App
const hyperliquidStorageAccount = new storage.StorageAccount("hyperliquidsa", {
    accountName: `hyperliquid${environment}sa`,
    resourceGroupName: hyperliquidResourceGroup.name,
    location: hyperliquidResourceGroup.location,
    sku: {
        name: storage.SkuName.Standard_LRS
    },
    kind: storage.Kind.StorageV2,
    allowBlobPublicAccess: false,
    minimumTlsVersion: storage.MinimumTlsVersion.TLS1_2,
    tags: {
        Environment: environment,
        Project: "HyperliquidTrading"
    }
});

// Create App Service Plan for Hyperliquid Function App
const hyperliquidAppServicePlan = new web.AppServicePlan("hyperliquid-plan", {
    name: `hyperliquid-${environment}-plan`,
    resourceGroupName: hyperliquidResourceGroup.name,
    location: hyperliquidResourceGroup.location,
    sku: {
        name: "Y1",
        tier: "Dynamic"
    },
    kind: "FunctionApp",
    tags: {
        Environment: environment,
        Project: "HyperliquidTrading"
    }
});

// Get storage account connection string
const hyperliquidStorageConnectionString = pulumi.all([
    hyperliquidResourceGroup.name,
    hyperliquidStorageAccount.name
]).apply(([resourceGroupName, storageAccountName]) =>
    storage.listStorageAccountKeysOutput({
        resourceGroupName: resourceGroupName,
        accountName: storageAccountName
    })
).apply(keys => {
    const primaryKey = keys.keys[0].value;
    return pulumi.interpolate`DefaultEndpointsProtocol=https;AccountName=${hyperliquidStorageAccount.name};AccountKey=${primaryKey};EndpointSuffix=core.windows.net`;
});

// Workspace 
const hyperliquidWorkspace = new azure_native.operationalinsights.Workspace("hyperliquid-workspace", {
    resourceGroupName: hyperliquidResourceGroup.name,
    workspaceName: `hyperliquid-${environment}-workspace`,
    location: hyperliquidResourceGroup.location,
    sku: {
        name: "PerGB2018"
    },
    retentionInDays: 30,
    tags: {
        Environment: environment,
        Project: "HyperliquidTrading"
    }
});

// Create Application Insights for monitoring
const hyperliquidAppInsights = new applicationinsights.Component("hyperliquid-insights", {
    resourceName: `hyperliquid-${environment}-insights`,
    resourceGroupName: hyperliquidResourceGroup.name,
    location: hyperliquidResourceGroup.location,
    applicationType: applicationinsights.ApplicationType.Web,
    workspaceResourceId: hyperliquidWorkspace.id,
    kind: "web",
    tags: {
        Environment: environment,
        Project: "HyperliquidTrading"
    }
});

// Create Function App for Hyperliquid
const hyperliquidFunctionApp = new web.WebApp("hyperliquid-function", {
    name: `hyperliquid-${environment}-func`,
    resourceGroupName: hyperliquidResourceGroup.name,
    location: hyperliquidResourceGroup.location,
    serverFarmId: hyperliquidAppServicePlan.id,
    kind: "functionapp",
    siteConfig: {
        appSettings: [
            {
                name: "AzureWebJobsStorage",
                value: hyperliquidStorageConnectionString
            },
            {
                name: "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING",
                value: hyperliquidStorageConnectionString
            },
            {
                name: "WEBSITE_CONTENTSHARE",
                value: pulumi.interpolate`hyperliquid-${environment}-func-content`
            },
            {
                name: "FUNCTIONS_EXTENSION_VERSION",
                value: "~4"
            },
            {
                name: "FUNCTIONS_WORKER_RUNTIME",
                value: "node"
            },
            {
                name: "WEBSITE_NODE_DEFAULT_VERSION",
                value: "~22"
            },
            {
                name: "WEBSITE_RUN_FROM_PACKAGE",
                value: "1"
            },
            {
                name: "APPINSIGHTS_INSTRUMENTATIONKEY",
                value: hyperliquidAppInsights.instrumentationKey
            },
            {
                name: "APPLICATIONINSIGHTS_CONNECTION_STRING",
                value: hyperliquidAppInsights.connectionString
            },
            {
                name: "HYPERLIQUID_TESTNET",
                value: config.get("hyperliquid-testnet") || "true"
            },
            {
                name: "HYPERLIQUID_PRIVATE_KEY",
                value: config.requireSecret("hyperliquid-private-key")
            }
        ],
        cors: {
            allowedOrigins: ["*"]
        },
        use32BitWorkerProcess: false,
        ftpsState: web.FtpsState.FtpsOnly,
        minTlsVersion: "1.2",
        http20Enabled: true,
        nodeVersion: "~22"
    },
    httpsOnly: true,
    tags: {
        Environment: environment,
        Project: "HyperliquidTrading"
    }
});

// Export outputs
export const hyperliquidResourceGroupName = hyperliquidResourceGroup.name;
export const hyperliquidFunctionAppName = hyperliquidFunctionApp.name;
export const hyperliquidFunctionAppUrl = pulumi.interpolate`https://${hyperliquidFunctionApp.defaultHostName}`;
export const hyperliquidStorageAccountName = hyperliquidStorageAccount.name;
export const hyperliquidAppInsightsInstrumentationKey = hyperliquidAppInsights.instrumentationKey;
export const hyperliquidAppServicePlanName = hyperliquidAppServicePlan.name;
