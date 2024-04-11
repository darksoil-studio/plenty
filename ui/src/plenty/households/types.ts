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
  DeleteLink
} from '@holochain/client';
import { ActionCommittedSignal } from '@holochain-open-dev/utils';

export type HouseholdsSignal = ActionCommittedSignal<EntryTypes, LinkTypes>;

export type EntryTypes =
  | ({ type: 'HouseholdMembershipClaim'; } & HouseholdMembershipClaim)
  | ({ type: 'Household'; } & Household);

export type LinkTypes = string;

export interface Household {
  name: string;
  avatar: EntryHash;
}

export interface HouseholdMembershipClaim {
  member_create_link_hash: ActionHash;
  household_hash: ActionHash;
}

