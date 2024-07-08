import { HouseholdOrder } from './types.js';

import { Order } from './types.js';

import { 
  collectionSignal, 
  liveLinksSignal, 
  deletedLinksSignal, 
  allRevisionsOfEntrySignal,
  latestVersionOfEntrySignal, 
  immutableEntrySignal, 
  deletesForEntrySignal,
  pipe,
  AsyncComputed
} from "@holochain-open-dev/signals";
import { slice, HashType, retype, EntryRecord, LazyHoloHashMap } from "@holochain-open-dev/utils";
import { NewEntryAction, Record, ActionHash, EntryHash, AgentPubKey } from '@holochain/client';

import { OrdersClient } from './orders-client.js';

export class OrdersStore {



  constructor(public client: OrdersClient) {}
  
  /** Order */

  orders = new LazyHoloHashMap((orderHash: ActionHash) => ({
    latestVersion: latestVersionOfEntrySignal(this.client, () => this.client.getLatestOrder(orderHash)),
    original: immutableEntrySignal(() => this.client.getOriginalOrder(orderHash)),
    allRevisions: allRevisionsOfEntrySignal(this.client, () => this.client.getAllRevisionsForOrder(orderHash)),
    deletes: deletesForEntrySignal(this.client, orderHash, () => this.client.getAllDeletesForOrder(orderHash)),
    householdOrders: {
      live: pipe(
        liveLinksSignal(
          this.client,
          orderHash,
          () => this.client.getHouseholdOrdersForOrder(orderHash),
          'OrderToHouseholdOrders'
        ), 
        links => slice(this.householdOrders, links.map(l => l.target))
      ),
      deleted: pipe(
        deletedLinksSignal(
          this.client,
          orderHash,
          () => this.client.getDeletedHouseholdOrdersForOrder(orderHash),
          'OrderToHouseholdOrders'
        ), links => slice(this.householdOrders, links.map(l => l[0].hashed.content.target_address))
      ),
    },
  }));

  /** Household Order */

  householdOrders = new LazyHoloHashMap((householdOrderHash: ActionHash) => ({
    latestVersion: latestVersionOfEntrySignal(this.client, () => this.client.getLatestHouseholdOrder(householdOrderHash)),
    original: immutableEntrySignal(() => this.client.getOriginalHouseholdOrder(householdOrderHash)),
    allRevisions: allRevisionsOfEntrySignal(this.client, () => this.client.getAllRevisionsForHouseholdOrder(householdOrderHash)),
    deletes: deletesForEntrySignal(this.client, householdOrderHash, () => this.client.getAllDeletesForHouseholdOrder(householdOrderHash)),
  }));

}
