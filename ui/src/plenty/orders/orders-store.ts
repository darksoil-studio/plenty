import {
  collectionSignal,
  liveLinksSignal,
  deletedLinksSignal,
  allRevisionsOfEntrySignal,
  latestVersionOfEntrySignal,
  immutableEntrySignal,
  deletesForEntrySignal,
  pipe,
  mapCompleted,
  uniquify,
  Signal,
} from "@holochain-open-dev/signals";
import { slice, LazyHoloHashMap, HoloHashMap } from "@holochain-open-dev/utils";
import { ActionHash, encodeHashToBase64 } from "@holochain/client";

import { OrdersClient } from "./orders-client.js";
import { HouseholdsStore } from "../households/households-store.js";

export class OrdersStore {
  constructor(public client: OrdersClient) {
    // effect(() => {
    //   const myHousehold = this.householdStore.myHousehold.get();
    //   if (myHousehold.status !== "completed" || !myHousehold.value) return;
    //   const orders = this.ordersForHousehold
    //     .get(myHousehold.value.householdHash)
    //     .get();
    //   if (orders.status !== "completed") return;
    // });
  }

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
      live: mapCompleted(
        liveLinksSignal(
          this.client,
          orderHash,
          () => this.client.getHouseholdOrdersForOrder(orderHash),
          "OrderToHouseholdOrders",
        ),
        (links) => {
          const all = slice(
            this.householdOrders,
            links.map((l) => l.target),
          );

          const householdHashes = uniquify(links.map((link) => link.tag));
          const byHousehold = new HoloHashMap(
            householdHashes.map((householdHash) => [
              householdHash,
              slice(
                this.householdOrders,
                links
                  .filter(
                    (link) =>
                      encodeHashToBase64(link.tag) ===
                      encodeHashToBase64(householdHash),
                  )
                  .map((link) => link.target),
              ),
            ]),
          );

          return {
            all,
            byHousehold,
          };
        },
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

// NOTE: This scheduling logic is too basic to be useful. Do not copy/paste.
// This function would usually live in a library/framework, not application code
let pending = false;

const w = new Signal.subtle.Watcher(() => {
  if (!pending) {
    pending = true;
    queueMicrotask(() => {
      pending = false;
      for (const s of w.getPending()) s.get();
      w.watch();
    });
  }
});

// TODO: why do we need to use this complicated effect method?
// An effect effect Signal which evaluates to cb, which schedules a read of
// itself on the microtask queue whenever one of its dependencies might change
function effect(cb: any) {
  let destructor: any;
  const c = new Signal.Computed(() => {
    if (typeof destructor === "function") {
      destructor();
    }
    destructor = cb();
  });
  w.watch(c);
  c.get();
  return () => {
    if (typeof destructor === "function") {
      destructor();
    }
    w.unwatch(c);
  };
}
