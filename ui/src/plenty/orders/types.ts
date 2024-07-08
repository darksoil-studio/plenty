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
import { ActionCommittedSignal } from "@holochain-open-dev/utils";

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

export interface HouseholdOrder {
  order_hash: ActionHash;
  household_hash: ActionHash;
  products: Array<ActionHash>;
}

export interface ProducerDelivery {
  order_hash: ActionHash;
  producer_hash: ActionHash;
  products: Array<ActionHash>;
}

export interface ProducerInvoice {
  order_hash: ActionHash;
  producer_hash: ActionHash;
  invoice: EntryHash;
}
