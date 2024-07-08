import {
  collectionSignal,
  liveLinksSignal,
  deletedLinksSignal,
  allRevisionsOfEntrySignal,
  latestVersionOfEntrySignal,
  immutableEntrySignal,
  deletesForEntrySignal,
  pipe,
  AsyncComputed,
  mapCompleted,
} from "@holochain-open-dev/signals";
import {
  slice,
  HashType,
  retype,
  EntryRecord,
  LazyHoloHashMap,
} from "@holochain-open-dev/utils";
import {
  NewEntryAction,
  Record,
  ActionHash,
  EntryHash,
  AgentPubKey,
} from "@holochain/client";

import { OrdersClient } from "./orders-client.js";

export class OrdersStore {
  constructor(public client: OrdersClient) {}

  /** Order */

  orders = new LazyHoloHashMap((orderHash: ActionHash) => ({
    latestVersion: latestVersionOfEntrySignal(this.client, () =>
      this.client.getLatestOrder(orderHash),
    ),
    original: immutableEntrySignal(() =>
      this.client.getOriginalOrder(orderHash),
    ),
    allRevisions: allRevisionsOfEntrySignal(this.client, () =>
      this.client.getAllRevisionsForOrder(orderHash),
    ),
    deletes: deletesForEntrySignal(this.client, orderHash, () =>
      this.client.getAllDeletesForOrder(orderHash),
    ),
    householdOrders: {
      live: pipe(
        liveLinksSignal(
          this.client,
          orderHash,
          () => this.client.getHouseholdOrdersForOrder(orderHash),
          "OrderToHouseholdOrders",
        ),
        (links) =>
          slice(
            this.householdOrders,
            links.map((l) => l.target),
          ),
      ),
      deleted: pipe(
        deletedLinksSignal(
          this.client,
          orderHash,
          () => this.client.getDeletedHouseholdOrdersForOrder(orderHash),
          "OrderToHouseholdOrders",
        ),
        (links) =>
          slice(
            this.householdOrders,
            links.map((l) => l[0].hashed.content.target_address),
          ),
      ),
    },
    producerDeliveries: {
      live: pipe(
        liveLinksSignal(
          this.client,
          orderHash,
          () => this.client.getProducerDeliveriesForOrder(orderHash),
          "OrderToProducerDeliveries",
        ),
        (links) =>
          slice(
            this.producerDeliveries,
            links.map((l) => l.target),
          ),
      ),
      deleted: pipe(
        deletedLinksSignal(
          this.client,
          orderHash,
          () => this.client.getDeletedProducerDeliveriesForOrder(orderHash),
          "OrderToProducerDeliveries",
        ),
        (links) =>
          slice(
            this.producerDeliveries,
            links.map((l) => l[0].hashed.content.target_address),
          ),
      ),
    },
    producerInvoices: {
      live: pipe(
        liveLinksSignal(
          this.client,
          orderHash,
          () => this.client.getProducerInvoicesForOrder(orderHash),
          "OrderToProducerInvoices",
        ),
        (links) =>
          slice(
            this.producerInvoices,
            links.map((l) => l.target),
          ),
      ),
      deleted: pipe(
        deletedLinksSignal(
          this.client,
          orderHash,
          () => this.client.getDeletedProducerInvoicesForOrder(orderHash),
          "OrderToProducerInvoices",
        ),
        (links) =>
          slice(
            this.producerInvoices,
            links.map((l) => l[0].hashed.content.target_address),
          ),
      ),
    },
  }));

  /** Household Order */

  householdOrders = new LazyHoloHashMap((householdOrderHash: ActionHash) => ({
    latestVersion: latestVersionOfEntrySignal(this.client, () =>
      this.client.getLatestHouseholdOrder(householdOrderHash),
    ),
    original: immutableEntrySignal(() =>
      this.client.getOriginalHouseholdOrder(householdOrderHash),
    ),
    allRevisions: allRevisionsOfEntrySignal(this.client, () =>
      this.client.getAllRevisionsForHouseholdOrder(householdOrderHash),
    ),
    deletes: deletesForEntrySignal(this.client, householdOrderHash, () =>
      this.client.getAllDeletesForHouseholdOrder(householdOrderHash),
    ),
  }));

  ordersForHousehold = new LazyHoloHashMap((householdHash: ActionHash) =>
    mapCompleted(
      liveLinksSignal(
        this.client,
        householdHash,
        () => this.client.getHouseholdOrdersForHousehold(householdHash),
        "HouseholdToHouseholdOrders",
      ),
      (links) =>
        slice(
          this.householdOrders,
          links.map((l) => l.target),
        ),
    ),
  );

  /** Producer Delivery */

  producerDeliveries = new LazyHoloHashMap(
    (producerDeliveryHash: ActionHash) => ({
      latestVersion: latestVersionOfEntrySignal(this.client, () =>
        this.client.getLatestProducerDelivery(producerDeliveryHash),
      ),
      original: immutableEntrySignal(() =>
        this.client.getOriginalProducerDelivery(producerDeliveryHash),
      ),
      allRevisions: allRevisionsOfEntrySignal(this.client, () =>
        this.client.getAllRevisionsForProducerDelivery(producerDeliveryHash),
      ),
      deletes: deletesForEntrySignal(this.client, producerDeliveryHash, () =>
        this.client.getAllDeletesForProducerDelivery(producerDeliveryHash),
      ),
    }),
  );

  /** Producer Invoice */

  producerInvoices = new LazyHoloHashMap((producerInvoiceHash: ActionHash) => ({
    latestVersion: latestVersionOfEntrySignal(this.client, () =>
      this.client.getLatestProducerInvoice(producerInvoiceHash),
    ),
    original: immutableEntrySignal(() =>
      this.client.getOriginalProducerInvoice(producerInvoiceHash),
    ),
    allRevisions: allRevisionsOfEntrySignal(this.client, () =>
      this.client.getAllRevisionsForProducerInvoice(producerInvoiceHash),
    ),
    deletes: deletesForEntrySignal(this.client, producerInvoiceHash, () =>
      this.client.getAllDeletesForProducerInvoice(producerInvoiceHash),
    ),
  }));

  /** All Orders */

  allOrders = mapCompleted(
    collectionSignal(
      this.client,
      () => this.client.getAllOrders(),
      "AllOrders",
    ),
    (allOrders) =>
      slice(
        this.orders,
        allOrders.map((l) => l.target),
      ),
  );
}
