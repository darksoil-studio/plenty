import {
  Record,
  ActionHash,
  DnaHash,
  SignedActionHashed,
  EntryHash,
  AgentPubKey,
  Create,
  Update,
  Delete,
  CreateLink,
  DeleteLink,
} from "@holochain/client";
import { ActionCommittedSignal, HoloHashMap } from "@holochain-open-dev/utils";
import { msg } from "@lit/localize";
import { TemplateResult, html } from "lit";

export type OrdersSignal = ActionCommittedSignal<EntryTypes, LinkTypes>;

export type EntryTypes =
  | ({ type: "ProducerInvoice" } & ProducerInvoice)
  | ({ type: "ProducerDelivery" } & ProducerDelivery)
  | ({ type: "HouseholdOrder" } & HouseholdOrder)
  | ({ type: "Order" } & Order);

export type LinkTypes = string;

export type OrderStatus =
  | {
      type: "Preparing";
    }
  | {
      type: "Open";
      deadline: number;
      available_producers: ActionHash[];
    }
  | {
      type: "Closed";
      household_orders: ActionHash[];
    }
  | {
      type: "Processed";
      producers_deliveries: ActionHash[];
    }
  | {
      type: "Finished";
      household_payments: ActionHash[];
      producers_invoices: ActionHash[];
    };

export function renderStatus(status: OrderStatus): TemplateResult {
  let variant = "primary";
  switch (status.type) {
    case "Preparing":
    case "Open":
    case "Closed":
    case "Processed":
    case "Finished":
  }
  return html`<sl-tag .variant=${variant}>${statusMsg(status)}</sl-tag>`;
}

export function statusMsg(status: OrderStatus): string {
  switch (status.type) {
    case "Preparing":
      return msg("Preparing");
    case "Open":
      return msg("Open");
    case "Closed":
      return msg("Closed");
    case "Processed":
      return msg("Processed");
    case "Finished":
      return msg("Finished");
  }
}

export interface Order {
  name: string;
  status: OrderStatus;
}

export interface ProductOrder {
  original_product_hash: ActionHash;
  ordered_product_hash: ActionHash;
  amount: number;
}

export interface HouseholdOrder {
  order_hash: ActionHash;
  household_hash: ActionHash;
  products: Array<ProductOrder>;
}

export interface FixedProductDeliveryForHouseholds {
  amount: number;
  households_hashes: Array<ActionHash>;
}

export interface FixedProductDeliveryForHouseholds {
  products: Array<number>;
  households_hashes: Array<ActionHash>;
}

export type DeliveredAmount =
  | {
      type: "FixedAmountProduct";
      delivered_products: Array<FixedProductDeliveryForHouseholds>;
      price_per_unit_changed: number | undefined;
    }
  | {
      type: "EstimatedAmountProduct";
      delivered_products: Array<FixedProductDeliveryForHouseholds>;
      price_per_unit_changed: number | undefined;
    };

export type ProductDelivery =
  | {
      type: "NotAvailable";
    }
  | {
      type: "Missing";
      reason: string;
    }
  | {
      type: "Delivered";
      delivered_amount: DeliveredAmount;
    };

export interface ProducerDelivery {
  order_hash: ActionHash;
  producer_hash: ActionHash;
  products: HoloHashMap<ActionHash, ProductDelivery>;
}

export interface ProducerInvoice {
  order_hash: ActionHash;
  producer_hash: ActionHash;
  invoice: EntryHash;
}
