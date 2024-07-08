import { HouseholdOrder } from './types.js';

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
  /** Household Order */
  householdOrders = new HoloHashMap<ActionHash, {
    deletes: Array<SignedActionHashed<Delete>>;
    revisions: Array<Record>;
  }>();
  householdOrdersForOrder = new HoloHashMap<ActionHash, Link[]>();

  async create_household_order(householdOrder: HouseholdOrder): Promise<Record> {
    const entryHash = hash(householdOrder, HashType.ENTRY);
    const record = await fakeRecord(await fakeCreateAction(entryHash), fakeEntry(householdOrder));
    
    this.householdOrders.set(record.signed_action.hashed.hash, {
      deletes: [],
      revisions: [record]
    });
  
    const existingOrderHash = this.householdOrdersForOrder.get(householdOrder.order_hash) || [];
    this.householdOrdersForOrder.set(householdOrder.order_hash, [...existingOrderHash, { 
      target: record.signed_action.hashed.hash, 
      author: this.myPubKey,
      timestamp: Date.now() * 1000,
      zome_index: 0,
      link_type: 0,
      tag: new Uint8Array(),
      create_link_hash: await fakeActionHash()
    }]);

    return record;
  }
  
  async get_latest_household_order(householdOrderHash: ActionHash): Promise<Record | undefined> {
    const householdOrder = this.householdOrders.get(householdOrderHash);
    return householdOrder ? householdOrder.revisions[householdOrder.revisions.length - 1] : undefined;
  }
  
  async get_all_revisions_for_household_order(householdOrderHash: ActionHash): Promise<Record[] | undefined> {
    const householdOrder = this.householdOrders.get(householdOrderHash);
    return householdOrder ? householdOrder.revisions : undefined;
  }
  
  async get_original_household_order(householdOrderHash: ActionHash): Promise<Record | undefined> {
    const householdOrder = this.householdOrders.get(householdOrderHash);
    return householdOrder ? householdOrder.revisions[0] : undefined;
  }
  
  async get_all_deletes_for_household_order(householdOrderHash: ActionHash): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    const householdOrder = this.householdOrders.get(householdOrderHash);
    return householdOrder ? householdOrder.deletes : undefined;
  }

  async get_oldest_delete_for_household_order(householdOrderHash: ActionHash): Promise<SignedActionHashed<Delete> | undefined> {
    const householdOrder = this.householdOrders.get(householdOrderHash);
    return householdOrder ? householdOrder.deletes[0] : undefined;
  }
  async delete_household_order(original_household_order_hash: ActionHash): Promise<ActionHash> {
    const record = await fakeRecord(await fakeDeleteEntry(original_household_order_hash));
    
    this.householdOrders.get(original_household_order_hash).deletes.push(record.signed_action as SignedActionHashed<Delete>);
    
    return record.signed_action.hashed.hash;
  }

  async update_household_order(input: { original_household_order_hash: ActionHash; previous_household_order_hash: ActionHash; updated_household_order: HouseholdOrder; }): Promise<Record> {
    const record = await fakeRecord(await fakeUpdateEntry(input.previous_household_order_hash, undefined, undefined, fakeEntry(input.updated_household_order)), fakeEntry(input.updated_household_order));

  this.householdOrders.get(input.original_household_order_hash).revisions.push(record);
     
    const householdOrder = input.updated_household_order;
    
    const existingOrderHash = this.householdOrdersForOrder.get(householdOrder.order_hash) || [];
    this.householdOrdersForOrder.set(householdOrder.order_hash, [...existingOrderHash, {
      target: record.signed_action.hashed.hash, 
      author: record.signed_action.hashed.content.author,
      timestamp: record.signed_action.hashed.content.timestamp,
      zome_index: 0,
      link_type: 0,
      tag: new Uint8Array(),
      create_link_hash: await fakeActionHash()
    }]);
    
    return record;
  }
  
  async get_household_orders_for_order(orderHash: ActionHash): Promise<Array<Link>> {
    return this.householdOrdersForOrder.get(orderHash) || [];
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

export async function sampleHouseholdOrder(client: OrdersClient, partialHouseholdOrder: Partial<HouseholdOrder> = {}): Promise<HouseholdOrder> {
    return {
        ...{
          order_hash: partialHouseholdOrder.order_hash || (await client.createOrder(await sampleOrder(client))).actionHash,
          products: [(await fakeActionHash())],
        },
        ...partialHouseholdOrder
    };
}
