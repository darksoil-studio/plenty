import { Order } from './types.js';

import {
  AgentPubKeyMap,
  decodeEntry,
  fakeEntry,
  fakeCreateAction,
  fakeUpdateEntry,
  fakeDeleteEntry,
  fakeRecord,
  pickBy,
  ZomeMock,
  RecordBag,
  entryState,
  HoloHashMap,
  HashType,
  hash
} from "@holochain-open-dev/utils";
import {
  decodeHashFromBase64,
  NewEntryAction,
  AgentPubKey,
  ActionHash,
  EntryHash,
  Delete,
  AppClient,
  fakeAgentPubKey,
  fakeDnaHash,
  Link,
  fakeActionHash,
  SignedActionHashed,
  fakeEntryHash,
  Record,
} from "@holochain/client";
import { OrdersClient } from './orders-client.js'

export class OrdersZomeMock extends ZomeMock implements AppClient {
  constructor(
    myPubKey?: AgentPubKey
  ) {
    super("orders_test", "orders", myPubKey);
  }
  /** Order */
  orders = new HoloHashMap<ActionHash, {
    deletes: Array<SignedActionHashed<Delete>>;
    revisions: Array<Record>;
  }>();

  async create_order(order: Order): Promise<Record> {
    const entryHash = hash(order, HashType.ENTRY);
    const record = await fakeRecord(await fakeCreateAction(entryHash), fakeEntry(order));
    
    this.orders.set(record.signed_action.hashed.hash, {
      deletes: [],
      revisions: [record]
    });
  

    return record;
  }
  
  async get_latest_order(orderHash: ActionHash): Promise<Record | undefined> {
    const order = this.orders.get(orderHash);
    return order ? order.revisions[order.revisions.length - 1] : undefined;
  }
  
  async get_all_revisions_for_order(orderHash: ActionHash): Promise<Record[] | undefined> {
    const order = this.orders.get(orderHash);
    return order ? order.revisions : undefined;
  }
  
  async get_original_order(orderHash: ActionHash): Promise<Record | undefined> {
    const order = this.orders.get(orderHash);
    return order ? order.revisions[0] : undefined;
  }
  
  async get_all_deletes_for_order(orderHash: ActionHash): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    const order = this.orders.get(orderHash);
    return order ? order.deletes : undefined;
  }

  async get_oldest_delete_for_order(orderHash: ActionHash): Promise<SignedActionHashed<Delete> | undefined> {
    const order = this.orders.get(orderHash);
    return order ? order.deletes[0] : undefined;
  }
  async delete_order(original_order_hash: ActionHash): Promise<ActionHash> {
    const record = await fakeRecord(await fakeDeleteEntry(original_order_hash));
    
    this.orders.get(original_order_hash).deletes.push(record.signed_action as SignedActionHashed<Delete>);
    
    return record.signed_action.hashed.hash;
  }

  async update_order(input: { original_order_hash: ActionHash; previous_order_hash: ActionHash; updated_order: Order; }): Promise<Record> {
    const record = await fakeRecord(await fakeUpdateEntry(input.previous_order_hash, undefined, undefined, fakeEntry(input.updated_order)), fakeEntry(input.updated_order));

  this.orders.get(input.original_order_hash).revisions.push(record);
     
    const order = input.updated_order;
    
    
    return record;
  }
  

}

export async function sampleOrder(client: OrdersClient, partialOrder: Partial<Order> = {}): Promise<Order> {
    return {
        ...{
          name: "Lorem ipsum 2",
          status: { type: 'Preparing' },
        },
        ...partialOrder
    };
}
