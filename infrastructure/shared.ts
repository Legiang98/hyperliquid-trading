import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";

const environment = pulumi.getStack();
const location = "southeastasia";

const commonTags = {
    Environment: environment,
    Project: "HyperliquidTrading",
    ManagedBy: "Pulumi"
};

export const resourceGroup = new resources.ResourceGroup("hyperliquid-rg", {
    resourceGroupName: "hyperliquid-dev-rg",
    location,
    tags: commonTags
});

export { location, environment, commonTags };
