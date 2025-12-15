import * as pulumi from "@pulumi/pulumi";
import * as apimanagement from "@pulumi/azure-native/apimanagement";

const resourceGroupName = "hyperliquid-dev-rg";
const apimServiceName = "hyperliquid-dev-func-apim";
const subscriptionId = "59769386-04d8-4563-af08-31e2d068b693";

const existingApimResourceId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.ApiManagement/service/${apimServiceName}`;

const importedApim = new apimanagement.ApiManagementService("importedApimService", {
    location: "southeastasia",
    publisherEmail: "levugiang1998@gmail.com",
    publisherName: "giangle",
    sku: {
        name: "Consumption",
        capacity: 0,
    },
    resourceGroupName: resourceGroupName,
    serviceName: apimServiceName,
}, {
    import: existingApimResourceId,
});

export const importedApimName = importedApim.name;
export const importedApimGatewayUrl = importedApim.gatewayUrl;
