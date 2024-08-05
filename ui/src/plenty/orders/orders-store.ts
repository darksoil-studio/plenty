import { AvailableProducts } from "./types.js";

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
    availableProducts: {
      live: mapCompleted(
        liveLinksSignal(
          this.client,
          orderHash,
          () => this.client.getAvailableProductsForOrder(orderHash),
          "OrderToAvailableProducts",
        ),
        (links) =>
          slice(
            this.availableProducts,
            links.map((l) => l.target),
          ),
      ),
      deleted: pipe(
        deletedLinksSignal(
          this.client,
          orderHash,
          () => this.client.getDeletedAvailableProductsForOrder(orderHash),
          "OrderToAvailableProducts",
        ),
        (links) =>
          slice(
            this.availableProducts,
            links.map((l) => l[0].hashed.content.target_address),
          ),
      ),
    },
  }));

  /** Household Order */

  householdOrders = new LazyHoloHashMap((householdOrderHash: ActionHash) => ({
    latestVersion: latestVersionOfEntrySignal(
      this.client,
      () => this.client.getLatestHouseholdOrder(householdOrderHash),
      3000,
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
        3000,
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
        allOrders
          .sort((l1, l2) => l2.timestamp - l1.timestamp)
          .map((l) => l.target),
      ),
  );
  /** Available Products */

  availableProducts = new LazyHoloHashMap(
    (availableProductsHash: ActionHash) => ({
      latestVersion: latestVersionOfEntrySignal(this.client, () =>
        this.client.getLatestAvailableProducts(availableProductsHash),
      ),
      original: immutableEntrySignal(() =>
        this.client.getOriginalAvailableProducts(availableProductsHash),
      ),
      allRevisions: allRevisionsOfEntrySignal(this.client, () =>
        this.client.getAllRevisionsForAvailableProducts(availableProductsHash),
      ),
      deletes: deletesForEntrySignal(this.client, availableProductsHash, () =>
        this.client.getAllDeletesForAvailableProducts(availableProductsHash),
      ),
    }),
  );
}
