import { Order } from './types.js';

import { 
  SignedActionHashed,
  CreateLink,
  Link,
  DeleteLink,
  Delete,
  AppClient, 
  Record, 
  ActionHash, 
  EntryHash, 
  AgentPubKey,
} from '@holochain/client';
import { isSignalFromCellWithRole, EntryRecord, ZomeClient } from '@holochain-open-dev/utils';

import { OrdersSignal } from './types.js';

export class OrdersClient extends ZomeClient<OrdersSignal> {
  constructor(public client: AppClient, public roleName: string, public zomeName = 'orders') {
    super(client, roleName, zomeName);
  }
  /** Order */

  async createOrder(order: Order): Promise<EntryRecord<Order>> {
    const record: Record = await this.callZome('create_order', order);
    return new EntryRecord(record);
  }
  
  async getLatestOrder(orderHash: ActionHash): Promise<EntryRecord<Order> | undefined> {
    const record: Record = await this.callZome('get_latest_order', orderHash);
    return record ? new EntryRecord(record) : undefined;
  }

  async getOriginalOrder(orderHash: ActionHash): Promise<EntryRecord<Order> | undefined> {
    const record: Record = await this.callZome('get_original_order', orderHash);
    return record ? new EntryRecord(record) : undefined;
  }

  async getAllRevisionsForOrder(orderHash: ActionHash): Promise<Array<EntryRecord<Order>>> {
    const records: Record[] = await this.callZome('get_all_revisions_for_order', orderHash);
    return records.map(r => new EntryRecord(r));
  }

  async updateOrder(originalOrderHash: ActionHash, previousOrderHash: ActionHash, updatedOrder: Order): Promise<EntryRecord<Order>> {
    const record: Record = await this.callZome('update_order', {
      original_order_hash: originalOrderHash,
      previous_order_hash: previousOrderHash,
      updated_order: updatedOrder
    });
    return new EntryRecord(record);
  }

  deleteOrder(originalOrderHash: ActionHash): Promise<ActionHash> {
    return this.callZome('delete_order', originalOrderHash);
  }

  getAllDeletesForOrder(originalOrderHash: ActionHash): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    return this.callZome('get_all_deletes_for_order', originalOrderHash);
  }

  getOldestDeleteForOrder(originalOrderHash: ActionHash): Promise<SignedActionHashed<Delete> | undefined> {
    return this.callZome('get_oldest_delete_for_order', originalOrderHash);
  }
  
}
