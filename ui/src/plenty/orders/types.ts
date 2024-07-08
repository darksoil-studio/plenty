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
  products: HoloHashMap<ActionHash, ProducerDelivery>;
}

export interface ProducerInvoice {
  order_hash: ActionHash;
  producer_hash: ActionHash;
  invoice: EntryHash;
}
