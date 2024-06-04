import { ActionCommittedSignal } from "@holochain-open-dev/utils";
import { ActionHash, EntryHash } from "@holochain/client";

export type HouseholdsSignal = ActionCommittedSignal<EntryTypes, LinkTypes>;

export type EntryTypes =
  | ({ type: "HouseholdMembershipClaim" } & HouseholdMembershipClaim)
  | ({ type: "Household" } & Household);

export type LinkTypes = string;

export interface Household {
  name: string;
  avatar: EntryHash;
}

export interface HouseholdMembershipClaim {
  member_create_link_hash: ActionHash;
  household_hash: ActionHash;
}
