import { AvailableProducts } from "./types.js";

import { ProducerInvoice, ProductDelivery } from "./types.js";

import { ProducerDelivery } from "./types.js";

import { HouseholdOrder } from "./types.js";

import { Order } from "./types.js";

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
  hash,
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
import { OrdersClient } from "./orders-client.js";

export class OrdersZomeMock extends ZomeMock implements AppClient {
  constructor(myPubKey?: AgentPubKey) {
    super("orders_test", "orders", myPubKey);
  }
  /** Order */
  orders = new HoloHashMap<
    ActionHash,
    {
      deletes: Array<SignedActionHashed<Delete>>;
      revisions: Array<Record>;
    }
  >();

  async create_order(order: Order): Promise<Record> {
    const entryHash = hash(order, HashType.ENTRY);
    const record = await fakeRecord(
      await fakeCreateAction(entryHash),
      fakeEntry(order),
    );

    this.orders.set(record.signed_action.hashed.hash, {
      deletes: [],
      revisions: [record],
    });

    return record;
  }

  async get_latest_order(orderHash: ActionHash): Promise<Record | undefined> {
    const order = this.orders.get(orderHash);
    return order ? order.revisions[order.revisions.length - 1] : undefined;
  }

  async get_all_revisions_for_order(
    orderHash: ActionHash,
  ): Promise<Record[] | undefined> {
    const order = this.orders.get(orderHash);
    return order ? order.revisions : undefined;
  }

  async get_original_order(orderHash: ActionHash): Promise<Record | undefined> {
    const order = this.orders.get(orderHash);
    return order ? order.revisions[0] : undefined;
  }

  async get_all_deletes_for_order(
    orderHash: ActionHash,
  ): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    const order = this.orders.get(orderHash);
    return order ? order.deletes : undefined;
  }

  async get_oldest_delete_for_order(
    orderHash: ActionHash,
  ): Promise<SignedActionHashed<Delete> | undefined> {
    const order = this.orders.get(orderHash);
    return order ? order.deletes[0] : undefined;
  }
  async delete_order(original_order_hash: ActionHash): Promise<ActionHash> {
    const record = await fakeRecord(await fakeDeleteEntry(original_order_hash));

    this.orders
      .get(original_order_hash)
      .deletes.push(record.signed_action as SignedActionHashed<Delete>);

    return record.signed_action.hashed.hash;
  }

  async update_order(input: {
    original_order_hash: ActionHash;
    previous_order_hash: ActionHash;
    updated_order: Order;
  }): Promise<Record> {
    const record = await fakeRecord(
      await fakeUpdateEntry(
        input.previous_order_hash,
        undefined,
        undefined,
        fakeEntry(input.updated_order),
      ),
      fakeEntry(input.updated_order),
    );

    this.orders.get(input.original_order_hash).revisions.push(record);

    const order = input.updated_order;

    return record;
  }
  /** Household Order */
  householdOrders = new HoloHashMap<
    ActionHash,
    {
      deletes: Array<SignedActionHashed<Delete>>;
      revisions: Array<Record>;
    }
  >();
  householdOrdersForOrder = new HoloHashMap<ActionHash, Link[]>();

  async create_household_order(
    householdOrder: HouseholdOrder,
  ): Promise<Record> {
    const entryHash = hash(householdOrder, HashType.ENTRY);
    const record = await fakeRecord(
      await fakeCreateAction(entryHash),
      fakeEntry(householdOrder),
    );

    this.householdOrders.set(record.signed_action.hashed.hash, {
      deletes: [],
      revisions: [record],
    });

    const existingOrderHash =
      this.householdOrdersForOrder.get(householdOrder.order_hash) || [];
    this.householdOrdersForOrder.set(householdOrder.order_hash, [
      ...existingOrderHash,
      {
        target: record.signed_action.hashed.hash,
        author: this.myPubKey,
        timestamp: Date.now() * 1000,
        zome_index: 0,
        link_type: 0,
        tag: new Uint8Array(),
        create_link_hash: await fakeActionHash(),
      },
    ]);

    return record;
  }

  async get_latest_household_order(
    householdOrderHash: ActionHash,
  ): Promise<Record | undefined> {
    const householdOrder = this.householdOrders.get(householdOrderHash);
    return householdOrder
      ? householdOrder.revisions[householdOrder.revisions.length - 1]
      : undefined;
  }

  async get_all_revisions_for_household_order(
    householdOrderHash: ActionHash,
  ): Promise<Record[] | undefined> {
    const householdOrder = this.householdOrders.get(householdOrderHash);
    return householdOrder ? householdOrder.revisions : undefined;
  }

  async get_original_household_order(
    householdOrderHash: ActionHash,
  ): Promise<Record | undefined> {
    const householdOrder = this.householdOrders.get(householdOrderHash);
    return householdOrder ? householdOrder.revisions[0] : undefined;
  }

  async get_all_deletes_for_household_order(
    householdOrderHash: ActionHash,
  ): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    const householdOrder = this.householdOrders.get(householdOrderHash);
    return householdOrder ? householdOrder.deletes : undefined;
  }

  async get_oldest_delete_for_household_order(
    householdOrderHash: ActionHash,
  ): Promise<SignedActionHashed<Delete> | undefined> {
    const householdOrder = this.householdOrders.get(householdOrderHash);
    return householdOrder ? householdOrder.deletes[0] : undefined;
  }
  async delete_household_order(
    original_household_order_hash: ActionHash,
  ): Promise<ActionHash> {
    const record = await fakeRecord(
      await fakeDeleteEntry(original_household_order_hash),
    );

    this.householdOrders
      .get(original_household_order_hash)
      .deletes.push(record.signed_action as SignedActionHashed<Delete>);

    return record.signed_action.hashed.hash;
  }

  async update_household_order(input: {
    original_household_order_hash: ActionHash;
    previous_household_order_hash: ActionHash;
    updated_household_order: HouseholdOrder;
  }): Promise<Record> {
    const record = await fakeRecord(
      await fakeUpdateEntry(
        input.previous_household_order_hash,
        undefined,
        undefined,
        fakeEntry(input.updated_household_order),
      ),
      fakeEntry(input.updated_household_order),
    );

    this.householdOrders
      .get(input.original_household_order_hash)
      .revisions.push(record);

    const householdOrder = input.updated_household_order;

    const existingOrderHash =
      this.householdOrdersForOrder.get(householdOrder.order_hash) || [];
    this.householdOrdersForOrder.set(householdOrder.order_hash, [
      ...existingOrderHash,
      {
        target: record.signed_action.hashed.hash,
        author: record.signed_action.hashed.content.author,
        timestamp: record.signed_action.hashed.content.timestamp,
        zome_index: 0,
        link_type: 0,
        tag: new Uint8Array(),
        create_link_hash: await fakeActionHash(),
      },
    ]);

    return record;
  }

  async get_household_orders_for_order(
    orderHash: ActionHash,
  ): Promise<Array<Link>> {
    return this.householdOrdersForOrder.get(orderHash) || [];
  }
  /** Producer Delivery */
  producerDeliveries = new HoloHashMap<
    ActionHash,
    {
      deletes: Array<SignedActionHashed<Delete>>;
      revisions: Array<Record>;
    }
  >();
  producerDeliveriesForOrder = new HoloHashMap<ActionHash, Link[]>();

  async create_producer_delivery(
    producerDelivery: ProducerDelivery,
  ): Promise<Record> {
    const entryHash = hash(producerDelivery, HashType.ENTRY);
    const record = await fakeRecord(
      await fakeCreateAction(entryHash),
      fakeEntry(producerDelivery),
    );

    this.producerDeliveries.set(record.signed_action.hashed.hash, {
      deletes: [],
      revisions: [record],
    });

    const existingOrderHash =
      this.producerDeliveriesForOrder.get(producerDelivery.order_hash) || [];
    this.producerDeliveriesForOrder.set(producerDelivery.order_hash, [
      ...existingOrderHash,
      {
        target: record.signed_action.hashed.hash,
        author: this.myPubKey,
        timestamp: Date.now() * 1000,
        zome_index: 0,
        link_type: 0,
        tag: new Uint8Array(),
        create_link_hash: await fakeActionHash(),
      },
    ]);

    return record;
  }

  async get_latest_producer_delivery(
    producerDeliveryHash: ActionHash,
  ): Promise<Record | undefined> {
    const producerDelivery = this.producerDeliveries.get(producerDeliveryHash);
    return producerDelivery
      ? producerDelivery.revisions[producerDelivery.revisions.length - 1]
      : undefined;
  }

  async get_all_revisions_for_producer_delivery(
    producerDeliveryHash: ActionHash,
  ): Promise<Record[] | undefined> {
    const producerDelivery = this.producerDeliveries.get(producerDeliveryHash);
    return producerDelivery ? producerDelivery.revisions : undefined;
  }

  async get_original_producer_delivery(
    producerDeliveryHash: ActionHash,
  ): Promise<Record | undefined> {
    const producerDelivery = this.producerDeliveries.get(producerDeliveryHash);
    return producerDelivery ? producerDelivery.revisions[0] : undefined;
  }

  async get_all_deletes_for_producer_delivery(
    producerDeliveryHash: ActionHash,
  ): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    const producerDelivery = this.producerDeliveries.get(producerDeliveryHash);
    return producerDelivery ? producerDelivery.deletes : undefined;
  }

  async get_oldest_delete_for_producer_delivery(
    producerDeliveryHash: ActionHash,
  ): Promise<SignedActionHashed<Delete> | undefined> {
    const producerDelivery = this.producerDeliveries.get(producerDeliveryHash);
    return producerDelivery ? producerDelivery.deletes[0] : undefined;
  }
  async delete_producer_delivery(
    original_producer_delivery_hash: ActionHash,
  ): Promise<ActionHash> {
    const record = await fakeRecord(
      await fakeDeleteEntry(original_producer_delivery_hash),
    );

    this.producerDeliveries
      .get(original_producer_delivery_hash)
      .deletes.push(record.signed_action as SignedActionHashed<Delete>);

    return record.signed_action.hashed.hash;
  }

  async update_producer_delivery(input: {
    previous_producer_delivery_hash: ActionHash;
    updated_producer_delivery: ProducerDelivery;
  }): Promise<Record> {
    const record = await fakeRecord(
      await fakeUpdateEntry(
        input.previous_producer_delivery_hash,
        undefined,
        undefined,
        fakeEntry(input.updated_producer_delivery),
      ),
      fakeEntry(input.updated_producer_delivery),
    );

    for (const [originalHash, producerDelivery] of Array.from(
      this.producerDeliveries.entries(),
    )) {
      if (
        producerDelivery.revisions.find(
          (r) =>
            r.signed_action.hashed.hash.toString() ===
            input.previous_producer_delivery_hash.toString(),
        )
      ) {
        producerDelivery.revisions.push(record);
      }
    }

    const producerDelivery = input.updated_producer_delivery;

    const existingOrderHash =
      this.producerDeliveriesForOrder.get(producerDelivery.order_hash) || [];
    this.producerDeliveriesForOrder.set(producerDelivery.order_hash, [
      ...existingOrderHash,
      {
        target: record.signed_action.hashed.hash,
        author: record.signed_action.hashed.content.author,
        timestamp: record.signed_action.hashed.content.timestamp,
        zome_index: 0,
        link_type: 0,
        tag: new Uint8Array(),
        create_link_hash: await fakeActionHash(),
      },
    ]);

    return record;
  }

  async get_producer_deliveries_for_order(
    orderHash: ActionHash,
  ): Promise<Array<Link>> {
    return this.producerDeliveriesForOrder.get(orderHash) || [];
  }
  /** Producer Invoice */
  producerInvoices = new HoloHashMap<
    ActionHash,
    {
      deletes: Array<SignedActionHashed<Delete>>;
      revisions: Array<Record>;
    }
  >();
  producerInvoicesForOrder = new HoloHashMap<ActionHash, Link[]>();

  async create_producer_invoice(
    producerInvoice: ProducerInvoice,
  ): Promise<Record> {
    const entryHash = hash(producerInvoice, HashType.ENTRY);
    const record = await fakeRecord(
      await fakeCreateAction(entryHash),
      fakeEntry(producerInvoice),
    );

    this.producerInvoices.set(record.signed_action.hashed.hash, {
      deletes: [],
      revisions: [record],
    });

    const existingOrderHash =
      this.producerInvoicesForOrder.get(producerInvoice.order_hash) || [];
    this.producerInvoicesForOrder.set(producerInvoice.order_hash, [
      ...existingOrderHash,
      {
        target: record.signed_action.hashed.hash,
        author: this.myPubKey,
        timestamp: Date.now() * 1000,
        zome_index: 0,
        link_type: 0,
        tag: new Uint8Array(),
        create_link_hash: await fakeActionHash(),
      },
    ]);

    return record;
  }

  async get_latest_producer_invoice(
    producerInvoiceHash: ActionHash,
  ): Promise<Record | undefined> {
    const producerInvoice = this.producerInvoices.get(producerInvoiceHash);
    return producerInvoice
      ? producerInvoice.revisions[producerInvoice.revisions.length - 1]
      : undefined;
  }

  async get_all_revisions_for_producer_invoice(
    producerInvoiceHash: ActionHash,
  ): Promise<Record[] | undefined> {
    const producerInvoice = this.producerInvoices.get(producerInvoiceHash);
    return producerInvoice ? producerInvoice.revisions : undefined;
  }

  async get_original_producer_invoice(
    producerInvoiceHash: ActionHash,
  ): Promise<Record | undefined> {
    const producerInvoice = this.producerInvoices.get(producerInvoiceHash);
    return producerInvoice ? producerInvoice.revisions[0] : undefined;
  }

  async get_all_deletes_for_producer_invoice(
    producerInvoiceHash: ActionHash,
  ): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    const producerInvoice = this.producerInvoices.get(producerInvoiceHash);
    return producerInvoice ? producerInvoice.deletes : undefined;
  }

  async get_oldest_delete_for_producer_invoice(
    producerInvoiceHash: ActionHash,
  ): Promise<SignedActionHashed<Delete> | undefined> {
    const producerInvoice = this.producerInvoices.get(producerInvoiceHash);
    return producerInvoice ? producerInvoice.deletes[0] : undefined;
  }
  async delete_producer_invoice(
    original_producer_invoice_hash: ActionHash,
  ): Promise<ActionHash> {
    const record = await fakeRecord(
      await fakeDeleteEntry(original_producer_invoice_hash),
    );

    this.producerInvoices
      .get(original_producer_invoice_hash)
      .deletes.push(record.signed_action as SignedActionHashed<Delete>);

    return record.signed_action.hashed.hash;
  }

  async update_producer_invoice(input: {
    previous_producer_invoice_hash: ActionHash;
    updated_producer_invoice: ProducerInvoice;
  }): Promise<Record> {
    const record = await fakeRecord(
      await fakeUpdateEntry(
        input.previous_producer_invoice_hash,
        undefined,
        undefined,
        fakeEntry(input.updated_producer_invoice),
      ),
      fakeEntry(input.updated_producer_invoice),
    );

    for (const [originalHash, producerInvoice] of Array.from(
      this.producerInvoices.entries(),
    )) {
      if (
        producerInvoice.revisions.find(
          (r) =>
            r.signed_action.hashed.hash.toString() ===
            input.previous_producer_invoice_hash.toString(),
        )
      ) {
        producerInvoice.revisions.push(record);
      }
    }

    const producerInvoice = input.updated_producer_invoice;

    const existingOrderHash =
      this.producerInvoicesForOrder.get(producerInvoice.order_hash) || [];
    this.producerInvoicesForOrder.set(producerInvoice.order_hash, [
      ...existingOrderHash,
      {
        target: record.signed_action.hashed.hash,
        author: record.signed_action.hashed.content.author,
        timestamp: record.signed_action.hashed.content.timestamp,
        zome_index: 0,
        link_type: 0,
        tag: new Uint8Array(),
        create_link_hash: await fakeActionHash(),
      },
    ]);

    return record;
  }

  async get_producer_invoices_for_order(
    orderHash: ActionHash,
  ): Promise<Array<Link>> {
    return this.producerInvoicesForOrder.get(orderHash) || [];
  }

  async get_all_orders(): Promise<Array<Link>> {
    const records: Record[] = Array.from(this.orders.values()).map(
      (r) => r.revisions[r.revisions.length - 1],
    );
    return Promise.all(
      records.map(async (record) => ({
        target: record.signed_action.hashed.hash,
        author: record.signed_action.hashed.content.author,
        timestamp: record.signed_action.hashed.content.timestamp,
        zome_index: 0,
        link_type: 0,
        tag: new Uint8Array(),
        create_link_hash: await fakeActionHash(),
      })),
    );
  }
  /** Available Products */
  availableProducts = new HoloHashMap<
    ActionHash,
    {
      deletes: Array<SignedActionHashed<Delete>>;
      revisions: Array<Record>;
    }
  >();
  availableProductsForOrder = new HoloHashMap<ActionHash, Link[]>();

  async create_available_products(
    availableProducts: AvailableProducts,
  ): Promise<Record> {
    const entryHash = hash(availableProducts, HashType.ENTRY);
    const record = await fakeRecord(
      await fakeCreateAction(entryHash),
      fakeEntry(availableProducts),
    );

    this.availableProducts.set(record.signed_action.hashed.hash, {
      deletes: [],
      revisions: [record],
    });

    const existingOrderHash =
      this.availableProductsForOrder.get(availableProducts.order_hash) || [];
    this.availableProductsForOrder.set(availableProducts.order_hash, [
      ...existingOrderHash,
      {
        target: record.signed_action.hashed.hash,
        author: this.myPubKey,
        timestamp: Date.now() * 1000,
        zome_index: 0,
        link_type: 0,
        tag: new Uint8Array(),
        create_link_hash: await fakeActionHash(),
      },
    ]);

    return record;
  }

  async get_latest_available_products(
    availableProductsHash: ActionHash,
  ): Promise<Record | undefined> {
    const availableProducts = this.availableProducts.get(availableProductsHash);
    return availableProducts
      ? availableProducts.revisions[availableProducts.revisions.length - 1]
      : undefined;
  }

  async get_all_revisions_for_available_products(
    availableProductsHash: ActionHash,
  ): Promise<Record[] | undefined> {
    const availableProducts = this.availableProducts.get(availableProductsHash);
    return availableProducts ? availableProducts.revisions : undefined;
  }

  async get_original_available_products(
    availableProductsHash: ActionHash,
  ): Promise<Record | undefined> {
    const availableProducts = this.availableProducts.get(availableProductsHash);
    return availableProducts ? availableProducts.revisions[0] : undefined;
  }

  async get_all_deletes_for_available_products(
    availableProductsHash: ActionHash,
  ): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    const availableProducts = this.availableProducts.get(availableProductsHash);
    return availableProducts ? availableProducts.deletes : undefined;
  }

  async get_oldest_delete_for_available_products(
    availableProductsHash: ActionHash,
  ): Promise<SignedActionHashed<Delete> | undefined> {
    const availableProducts = this.availableProducts.get(availableProductsHash);
    return availableProducts ? availableProducts.deletes[0] : undefined;
  }
  async delete_available_products(
    original_available_products_hash: ActionHash,
  ): Promise<ActionHash> {
    const record = await fakeRecord(
      await fakeDeleteEntry(original_available_products_hash),
    );

    this.availableProducts
      .get(original_available_products_hash)
      .deletes.push(record.signed_action as SignedActionHashed<Delete>);

    return record.signed_action.hashed.hash;
  }

  async update_available_products(input: {
    original_available_products_hash: ActionHash;
    previous_available_products_hash: ActionHash;
    updated_available_products: AvailableProducts;
  }): Promise<Record> {
    const record = await fakeRecord(
      await fakeUpdateEntry(
        input.previous_available_products_hash,
        undefined,
        undefined,
        fakeEntry(input.updated_available_products),
      ),
      fakeEntry(input.updated_available_products),
    );

    this.availableProducts
      .get(input.original_available_products_hash)
      .revisions.push(record);

    const availableProducts = input.updated_available_products;

    const existingOrderHash =
      this.availableProductsForOrder.get(availableProducts.order_hash) || [];
    this.availableProductsForOrder.set(availableProducts.order_hash, [
      ...existingOrderHash,
      {
        target: record.signed_action.hashed.hash,
        author: record.signed_action.hashed.content.author,
        timestamp: record.signed_action.hashed.content.timestamp,
        zome_index: 0,
        link_type: 0,
        tag: new Uint8Array(),
        create_link_hash: await fakeActionHash(),
      },
    ]);

    return record;
  }

  async get_available_products_for_order(
    orderHash: ActionHash,
  ): Promise<Array<Link>> {
    return this.availableProductsForOrder.get(orderHash) || [];
  }
}

export async function sampleOrder(
  client: OrdersClient,
  partialOrder: Partial<Order> = {},
): Promise<Order> {
  return {
    ...{
      name: "Lorem ipsum 2",
      status: { type: "Preparing" },
    },
    ...partialOrder,
  };
}

export async function sampleHouseholdOrder(
  client: OrdersClient,
  household_hash: ActionHash,
  partialHouseholdOrder: Partial<HouseholdOrder> = {},
): Promise<HouseholdOrder> {
  const productHash = await fakeActionHash();

  return {
    ...{
      order_hash:
        partialHouseholdOrder.order_hash ||
        (await client.createOrder(await sampleOrder(client))).actionHash,
      household_hash,
      products: [
        {
          amount: 3,
          ordered_product_hash: productHash,
          original_product_hash: productHash,
        },
      ],
    },
    ...partialHouseholdOrder,
  };
}

export async function sampleProducerDelivery(
  client: OrdersClient,
  producer_hash: ActionHash,
  partialProducerDelivery: Partial<ProducerDelivery> = {},
): Promise<ProducerDelivery> {
  const productHash = await fakeActionHash();
  const products: HoloHashMap<ActionHash, ProductDelivery> = new HoloHashMap();
  products.set(productHash, {
    type: "Delivered",
    delivered_amount: {
      type: "FixedAmountProduct",
      delivered_products: [
        {
          amount: 1,
          households_hashes: [],
          products: [1],
        },
      ],
      price_per_unit_changed: undefined,
    },
  });
  return {
    ...{
      order_hash:
        partialProducerDelivery.order_hash ||
        (await client.createOrder(await sampleOrder(client))).actionHash,
      producer_hash,
      products,
    },
    ...partialProducerDelivery,
  };
}

export async function sampleProducerInvoice(
  client: OrdersClient,
  producer_hash: ActionHash,
  partialProducerInvoice: Partial<ProducerInvoice> = {},
): Promise<ProducerInvoice> {
  return {
    ...{
      order_hash:
        partialProducerInvoice.order_hash ||
        (await client.createOrder(await sampleOrder(client))).actionHash,
      producer_hash,
      invoice: await fakeEntryHash(),
    },
    ...partialProducerInvoice,
  };
}

export async function sampleAvailableProducts(
  client: OrdersClient,
  original_producer_hash: ActionHash,
  latest_producer_hash: ActionHash,
  partialAvailableProducts: Partial<AvailableProducts> = {},
): Promise<AvailableProducts> {
  return {
    ...{
      order_hash:
        partialAvailableProducts.order_hash ||
        (await client.createOrder(await sampleOrder(client))).actionHash,
      original_producer_hash,
      latest_producer_hash,
      producer_availability: {
        type: "Available",
        available_products: [await fakeActionHash()],
      },
    },
    ...partialAvailableProducts,
  };
}
