import { TableClient, TableEntity, AzureNamedKeyCredential } from "@azure/data-tables";
import { OrderRecord, NewOrder } from '../types/order';

// Initialize Table Client
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set');
}

const tableClient = TableClient.fromConnectionString(connectionString, "orders");

// Helper to convert OrderRecord to TableEntity
function orderToEntity(order: NewOrder, id: string): TableEntity {
    const partitionKey = `${order.symbol}_${order.strategy}`;
    const rowKey = id;

    return {
        partitionKey,
        rowKey,
        userAddress: order.user_address,
        symbol: order.symbol,
        strategy: order.strategy,
        quantity: order.quantity.toString(), // Store as string to avoid precision issues
        orderType: order.order_type || '',
        action: order.action,
        price: order.price.toString(),
        pnl: '',
        oid: order.oid || '',
        status: order.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

// Helper to convert TableEntity to OrderRecord
function entityToOrder(entity: any): OrderRecord {
    return {
        id: entity.rowKey as string,
        user_address: entity.userAddress as string,
        symbol: entity.symbol as string,
        strategy: entity.strategy as string,
        quantity: parseFloat(entity.quantity as string),
        order_type: entity.orderType as string,
        action: entity.action as string,
        price: parseFloat(entity.price as string),
        pnl: entity.pnl ? parseFloat(entity.pnl as string) : undefined,
        oid: entity.oid as string,
        status: entity.status as string,
        created_at: new Date(entity.createdAt as string),
        updated_at: new Date(entity.updatedAt as string),
    };
}

/**
 * Find an open order by symbol and strategy
 * Uses efficient partition key query
 */
export async function findOpenOrder(
    symbol: string,
    strategy: string
): Promise<OrderRecord | null> {
    const partitionKey = `${symbol}_${strategy}`;

    try {
        // Query by partition key and filter by status
        const entities = tableClient.listEntities({
            queryOptions: {
                filter: `PartitionKey eq '${partitionKey}' and status eq 'open'`
            }
        });

        // Get the first (most recent) open order
        for await (const entity of entities) {
            return entityToOrder(entity);
        }

        return null;
    } catch (error) {
        console.error('Error finding open order:', error);
        throw error;
    }
}

/**
 * Insert a new order
 */
export async function insertOrder(order: NewOrder): Promise<OrderRecord> {
    try {
        // Generate UUID for row key
        const id = crypto.randomUUID();
        const entity = orderToEntity(order, id);

        await tableClient.createEntity(entity);

        return entityToOrder(entity);
    } catch (error) {
        console.error('Error inserting order:', error);
        throw error;
    }
}

/**
 * Update order OID
 */
export async function updateOrderOid(
    orderId: string,
    oid: string
): Promise<void> {
    try {
        // We need to find the entity first to get its partition key
        // This is a limitation of Table Storage - we need both keys to update
        const entities = tableClient.listEntities({
            queryOptions: {
                filter: `RowKey eq '${orderId}'`
            }
        });

        for await (const entity of entities) {
            const updateEntity = {
                partitionKey: entity.partitionKey!,
                rowKey: entity.rowKey!,
                oid,
                updatedAt: new Date().toISOString(),
            };

            await tableClient.updateEntity(updateEntity, "Merge");
            return;
        }

        throw new Error(`Order with ID ${orderId} not found`);
    } catch (error) {
        console.error('Error updating order OID:', error);
        throw error;
    }
}

/**
 * Close an order by ID
 */
export async function closeOrder(
    orderId: string,
    pnl: number
): Promise<void> {
    try {
        const entities = tableClient.listEntities({
            queryOptions: {
                filter: `RowKey eq '${orderId}'`
            }
        });

        for await (const entity of entities) {
            const updateEntity = {
                partitionKey: entity.partitionKey!,
                rowKey: entity.rowKey!,
                status: 'closed',
                pnl: pnl.toString(),
                updatedAt: new Date().toISOString(),
            };

            await tableClient.updateEntity(updateEntity, "Merge");
            return;
        }

        throw new Error(`Order with ID ${orderId} not found`);
    } catch (error) {
        console.error('Error closing order:', error);
        throw error;
    }
}

/**
 * Close all open orders for a symbol and strategy
 */
export async function closeAllOrders(
    symbol: string,
    strategy: string,
    pnl: number
): Promise<void> {
    const partitionKey = `${symbol}_${strategy}`;

    try {
        const entities = tableClient.listEntities({
            queryOptions: {
                filter: `PartitionKey eq '${partitionKey}' and status eq 'open'`
            }
        });

        const updatePromises: Promise<any>[] = [];

        for await (const entity of entities) {
            const updateEntity = {
                partitionKey: entity.partitionKey!,
                rowKey: entity.rowKey!,
                status: 'closed',
                pnl: pnl.toString(),
                updatedAt: new Date().toISOString(),
            };

            updatePromises.push(tableClient.updateEntity(updateEntity, "Merge"));
        }

        await Promise.all(updatePromises);
    } catch (error) {
        console.error('Error closing all orders:', error);
        throw error;
    }
}

/**
 * Find an open order by symbol and OID
 */
export async function findOpenOrderByOid(
    symbol: string,
    oid: string
): Promise<OrderRecord | null> {
    try {
        // Query by OID and symbol
        const entities = tableClient.listEntities({
            queryOptions: {
                filter: `oid eq '${oid}' and symbol eq '${symbol}' and status eq 'open'`
            }
        });

        for await (const entity of entities) {
            return entityToOrder(entity);
        }

        return null;
    } catch (error) {
        console.error('Error finding order by OID:', error);
        throw error;
    }
}
