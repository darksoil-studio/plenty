import { AvailableProducts } from "./types.js";

import { ProducerInvoice } from "./types.js";

import { ProducerDelivery } from "./types.js";

import { HouseholdOrder } from "./types.js";

import { Order } from "./types.js";

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
} from "@holochain/client";
import {
  isSignalFromCellWithRole,
  EntryRecord,
  ZomeClient,
} from "@holochain-open-dev/utils";

import { OrdersSignal } from "./types.js";

export class OrdersClient extends ZomeClient<OrdersSignal> {
  constructor(
    public client: AppClient,
    public roleName: string,
    public zomeName = "orders"
  ) {
    super(client, roleName, zomeName);
  }
  /** Order */

  async createOrder(order: Order): Promise<EntryRecord<Order>> {
    const record: Record = await this.callZome("create_order", order);
    return new EntryRecord(record);
  }

  async getLatestOrder(
    orderHash: ActionHash
  ): Promise<EntryRecord<Order> | undefined> {
    const record: Record = await this.callZome("get_latest_order", orderHash);
    return record ? new EntryRecord(record) : undefined;
  }

  async getOriginalOrder(
    orderHash: ActionHash
  ): Promise<EntryRecord<Order> | undefined> {
    const record: Record = await this.callZome("get_original_order", orderHash);
    return record ? new EntryRecord(record) : undefined;
  }

  async getAllRevisionsForOrder(
    orderHash: ActionHash
  ): Promise<Array<EntryRecord<Order>>> {
    const records: Record[] = await this.callZome(
      "get_all_revisions_for_order",
      orderHash
    );
    return records.map((r) => new EntryRecord(r));
  }

  async updateOrder(
    originalOrderHash: ActionHash,
    previousOrderHash: ActionHash,
    updatedOrder: Order
  ): Promise<EntryRecord<Order>> {
    const record: Record = await this.callZome("update_order", {
      original_order_hash: originalOrderHash,
      previous_order_hash: previousOrderHash,
      updated_order: updatedOrder,
    });
    return new EntryRecord(record);
  }

  deleteOrder(originalOrderHash: ActionHash): Promise<ActionHash> {
    return this.callZome("delete_order", originalOrderHash);
  }

  getAllDeletesForOrder(
    originalOrderHash: ActionHash
  ): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    return this.callZome("get_all_deletes_for_order", originalOrderHash);
  }

  getOldestDeleteForOrder(
    originalOrderHash: ActionHash
  ): Promise<SignedActionHashed<Delete> | undefined> {
    return this.callZome("get_oldest_delete_for_order", originalOrderHash);
  }
  /** Available Products */

  async createAvailableProducts(
    availableProducts: AvailableProducts
  ): Promise<EntryRecord<AvailableProducts>> {
    const record: Record = await this.callZome(
      "create_available_products",
      availableProducts
    );
    return new EntryRecord(record);
  }

  async getLatestAvailableProducts(
    availableProductsHash: ActionHash
  ): Promise<EntryRecord<AvailableProducts> | undefined> {
    const record: Record = await this.callZome(
      "get_latest_available_products",
      availableProductsHash
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async getOriginalAvailableProducts(
    availableProductsHash: ActionHash
  ): Promise<EntryRecord<AvailableProducts> | undefined> {
    const record: Record = await this.callZome(
      "get_original_available_products",
      availableProductsHash
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async getAllRevisionsForAvailableProducts(
    availableProductsHash: ActionHash
  ): Promise<Array<EntryRecord<AvailableProducts>>> {
    const records: Record[] = await this.callZome(
      "get_all_revisions_for_available_products",
      availableProductsHash
    );
    return records.map((r) => new EntryRecord(r));
  }

  async updateAvailableProducts(
    originalAvailableProductsHash: ActionHash,
    previousAvailableProductsHash: ActionHash,
    updatedAvailableProducts: AvailableProducts
  ): Promise<EntryRecord<AvailableProducts>> {
    const record: Record = await this.callZome("update_available_products", {
      original_available_products_hash: originalAvailableProductsHash,
      previous_available_products_hash: previousAvailableProductsHash,
      updated_available_products: updatedAvailableProducts,
    });
    return new EntryRecord(record);
  }

  deleteAvailableProducts(
    originalAvailableProductsHash: ActionHash
  ): Promise<ActionHash> {
    return this.callZome(
      "delete_available_products",
      originalAvailableProductsHash
    );
  }

  getAllDeletesForAvailableProducts(
    originalAvailableProductsHash: ActionHash
  ): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    return this.callZome(
      "get_all_deletes_for_available_products",
      originalAvailableProductsHash
    );
  }

  getOldestDeleteForAvailableProducts(
    originalAvailableProductsHash: ActionHash
  ): Promise<SignedActionHashed<Delete> | undefined> {
    return this.callZome(
      "get_oldest_delete_for_available_products",
      originalAvailableProductsHash
    );
  }

  async getAvailableProductsForOrder(
    orderHash: ActionHash
  ): Promise<Array<Link>> {
    return this.callZome("get_available_products_for_order", orderHash);
  }

  async getDeletedAvailableProductsForOrder(
    orderHash: ActionHash
  ): Promise<
    Array<[SignedActionHashed<CreateLink>, SignedActionHashed<DeleteLink>[]]>
  > {
    return this.callZome("get_deleted_available_products_for_order", orderHash);
  }

  /** Household Order */

  async createHouseholdOrder(
    householdOrder: HouseholdOrder
  ): Promise<EntryRecord<HouseholdOrder>> {
    const record: Record = await this.callZome(
      "create_household_order",
      householdOrder
    );
    return new EntryRecord(record);
  }

  async getLatestHouseholdOrder(
    householdOrderHash: ActionHash
  ): Promise<EntryRecord<HouseholdOrder> | undefined> {
    const record: Record = await this.callZome(
      "get_latest_household_order",
      householdOrderHash
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async getOriginalHouseholdOrder(
    householdOrderHash: ActionHash
  ): Promise<EntryRecord<HouseholdOrder> | undefined> {
    const record: Record = await this.callZome(
      "get_original_household_order",
      householdOrderHash
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async getAllRevisionsForHouseholdOrder(
    householdOrderHash: ActionHash
  ): Promise<Array<EntryRecord<HouseholdOrder>>> {
    const records: Record[] = await this.callZome(
      "get_all_revisions_for_household_order",
      householdOrderHash
    );
    return records.map((r) => new EntryRecord(r));
  }

  async updateHouseholdOrder(
    originalHouseholdOrderHash: ActionHash,
    previousHouseholdOrderHash: ActionHash,
    updatedHouseholdOrder: HouseholdOrder
  ): Promise<EntryRecord<HouseholdOrder>> {
    const record: Record = await this.callZome("update_household_order", {
      original_household_order_hash: originalHouseholdOrderHash,
      previous_household_order_hash: previousHouseholdOrderHash,
      updated_household_order: updatedHouseholdOrder,
    });
    return new EntryRecord(record);
  }

  deleteHouseholdOrder(
    originalHouseholdOrderHash: ActionHash
  ): Promise<ActionHash> {
    return this.callZome("delete_household_order", originalHouseholdOrderHash);
  }

  getAllDeletesForHouseholdOrder(
    originalHouseholdOrderHash: ActionHash
  ): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    return this.callZome(
      "get_all_deletes_for_household_order",
      originalHouseholdOrderHash
    );
  }

  getOldestDeleteForHouseholdOrder(
    originalHouseholdOrderHash: ActionHash
  ): Promise<SignedActionHashed<Delete> | undefined> {
    return this.callZome(
      "get_oldest_delete_for_household_order",
      originalHouseholdOrderHash
    );
  }

  async getHouseholdOrdersForOrder(
    orderHash: ActionHash
  ): Promise<Array<Link>> {
    return this.callZome("get_household_orders_for_order", orderHash);
  }

  async getHouseholdOrdersForHousehold(
    householdHash: ActionHash
  ): Promise<Array<Link>> {
    return this.callZome("get_household_orders_for_household", householdHash);
  }

  async getDeletedHouseholdOrdersForOrder(
    orderHash: ActionHash
  ): Promise<
    Array<[SignedActionHashed<CreateLink>, SignedActionHashed<DeleteLink>[]]>
  > {
    return this.callZome("get_deleted_household_orders_for_order", orderHash);
  }
  /** Producer Delivery */

  async createProducerDelivery(
    producerDelivery: ProducerDelivery
  ): Promise<EntryRecord<ProducerDelivery>> {
    const record: Record = await this.callZome(
      "create_producer_delivery",
      producerDelivery
    );
    return new EntryRecord(record);
  }

  async getLatestProducerDelivery(
    producerDeliveryHash: ActionHash
  ): Promise<EntryRecord<ProducerDelivery> | undefined> {
    const record: Record = await this.callZome(
      "get_latest_producer_delivery",
      producerDeliveryHash
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async getOriginalProducerDelivery(
    producerDeliveryHash: ActionHash
  ): Promise<EntryRecord<ProducerDelivery> | undefined> {
    const record: Record = await this.callZome(
      "get_original_producer_delivery",
      producerDeliveryHash
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async getAllRevisionsForProducerDelivery(
    producerDeliveryHash: ActionHash
  ): Promise<Array<EntryRecord<ProducerDelivery>>> {
    const records: Record[] = await this.callZome(
      "get_all_revisions_for_producer_delivery",
      producerDeliveryHash
    );
    return records.map((r) => new EntryRecord(r));
  }

  async updateProducerDelivery(
    previousProducerDeliveryHash: ActionHash,
    updatedProducerDelivery: ProducerDelivery
  ): Promise<EntryRecord<ProducerDelivery>> {
    const record: Record = await this.callZome("update_producer_delivery", {
      previous_producer_delivery_hash: previousProducerDeliveryHash,
      updated_producer_delivery: updatedProducerDelivery,
    });
    return new EntryRecord(record);
  }

  deleteProducerDelivery(
    originalProducerDeliveryHash: ActionHash
  ): Promise<ActionHash> {
    return this.callZome(
      "delete_producer_delivery",
      originalProducerDeliveryHash
    );
  }

  getAllDeletesForProducerDelivery(
    originalProducerDeliveryHash: ActionHash
  ): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    return this.callZome(
      "get_all_deletes_for_producer_delivery",
      originalProducerDeliveryHash
    );
  }

  getOldestDeleteForProducerDelivery(
    originalProducerDeliveryHash: ActionHash
  ): Promise<SignedActionHashed<Delete> | undefined> {
    return this.callZome(
      "get_oldest_delete_for_producer_delivery",
      originalProducerDeliveryHash
    );
  }

  async getProducerDeliveriesForOrder(
    orderHash: ActionHash
  ): Promise<Array<Link>> {
    return this.callZome("get_producer_deliveries_for_order", orderHash);
  }

  async getDeletedProducerDeliveriesForOrder(
    orderHash: ActionHash
  ): Promise<
    Array<[SignedActionHashed<CreateLink>, SignedActionHashed<DeleteLink>[]]>
  > {
    return this.callZome(
      "get_deleted_producer_deliveries_for_order",
      orderHash
    );
  }
  /** Producer Invoice */

  async createProducerInvoice(
    producerInvoice: ProducerInvoice
  ): Promise<EntryRecord<ProducerInvoice>> {
    const record: Record = await this.callZome(
      "create_producer_invoice",
      producerInvoice
    );
    return new EntryRecord(record);
  }

  async getLatestProducerInvoice(
    producerInvoiceHash: ActionHash
  ): Promise<EntryRecord<ProducerInvoice> | undefined> {
    const record: Record = await this.callZome(
      "get_latest_producer_invoice",
      producerInvoiceHash
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async getOriginalProducerInvoice(
    producerInvoiceHash: ActionHash
  ): Promise<EntryRecord<ProducerInvoice> | undefined> {
    const record: Record = await this.callZome(
      "get_original_producer_invoice",
      producerInvoiceHash
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async getAllRevisionsForProducerInvoice(
    producerInvoiceHash: ActionHash
  ): Promise<Array<EntryRecord<ProducerInvoice>>> {
    const records: Record[] = await this.callZome(
      "get_all_revisions_for_producer_invoice",
      producerInvoiceHash
    );
    return records.map((r) => new EntryRecord(r));
  }

  async updateProducerInvoice(
    previousProducerInvoiceHash: ActionHash,
    updatedProducerInvoice: ProducerInvoice
  ): Promise<EntryRecord<ProducerInvoice>> {
    const record: Record = await this.callZome("update_producer_invoice", {
      previous_producer_invoice_hash: previousProducerInvoiceHash,
      updated_producer_invoice: updatedProducerInvoice,
    });
    return new EntryRecord(record);
  }

  deleteProducerInvoice(
    originalProducerInvoiceHash: ActionHash
  ): Promise<ActionHash> {
    return this.callZome(
      "delete_producer_invoice",
      originalProducerInvoiceHash
    );
  }

  getAllDeletesForProducerInvoice(
    originalProducerInvoiceHash: ActionHash
  ): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    return this.callZome(
      "get_all_deletes_for_producer_invoice",
      originalProducerInvoiceHash
    );
  }

  getOldestDeleteForProducerInvoice(
    originalProducerInvoiceHash: ActionHash
  ): Promise<SignedActionHashed<Delete> | undefined> {
    return this.callZome(
      "get_oldest_delete_for_producer_invoice",
      originalProducerInvoiceHash
    );
  }

  async getProducerInvoicesForOrder(
    orderHash: ActionHash
  ): Promise<Array<Link>> {
    return this.callZome("get_producer_invoices_for_order", orderHash);
  }

  async getDeletedProducerInvoicesForOrder(
    orderHash: ActionHash
  ): Promise<
    Array<[SignedActionHashed<CreateLink>, SignedActionHashed<DeleteLink>[]]>
  > {
    return this.callZome("get_deleted_producer_invoices_for_order", orderHash);
  }

  /** All Orders */

  async getAllOrders(): Promise<Array<Link>> {
    return this.callZome("get_all_orders", undefined);
  }
}
