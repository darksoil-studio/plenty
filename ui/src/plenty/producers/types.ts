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
import { msg } from "@lit/localize";

export type ProducersSignal = ActionCommittedSignal<EntryTypes, LinkTypes>;

export type EntryTypes =
  | ({ type: "Product" } & Product)
  | ({ type: "Producer" } & Producer);

export type LinkTypes = string;

export type ProducerEditors =
  | {
      type: "Liason";
    }
  | { type: "AllMembers" }
  | { type: "Members"; members: Array<AgentPubKey> };
export type ProducerSorters =
  | {
      type: "Liason";
    }
  | { type: "Members"; members: Array<AgentPubKey> };

export interface Producer {
  name: string;

  photo: EntryHash;

  contact_email: string;

  phone_number: string;

  location: string;

  producer_details: string;

  liason: AgentPubKey;

  editors: ProducerEditors;

  sorters: ProducerSorters;
}

export function renderPackaging(packaging: Packaging) {
  return `${packaging.amount}${renderPackagingUnit(packaging.unit, packaging.amount !== 1)}`;
}

export function renderPackagingUnit(unit: PackagingUnit, plural: boolean) {
  switch (unit) {
    case "Piece":
      return plural ? msg("pieces") : msg("piece");
    case "Kilograms":
      return msg("Kg");
    case "Grams":
      return msg("g");
    case "Liters":
      return msg("L");
    case "Ounces":
      return msg("oz");
  }
}

export type PackagingUnit =
  | "Piece"
  | "Kilograms"
  | "Grams"
  | "Liters"
  | "Pounds"
  | "Ounces";

export interface Packaging {
  unit: PackagingUnit;
  amount: number;
  estimate: boolean;
}

export interface Product {
  producer_hash: ActionHash;

  name: string;

  product_id: string;

  description: string;

  categories: Array<string>;

  packaging: Packaging;

  maximum_available: number | undefined;

  price: number;

  vat_percentage: number;

  margin_percentage: number | undefined;

  origin: string | undefined;

  ingredients: string | undefined;
}
