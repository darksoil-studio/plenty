import {
  AgentPubKeyMap,
  HashType,
  HoloHashMap,
  RecordBag,
  ZomeMock,
  decodeEntry,
  entryState,
  fakeCreateAction,
  fakeDeleteEntry,
  fakeEntry,
  fakeRecord,
  fakeUpdateEntry,
  hash,
  pickBy,
} from '@holochain-open-dev/utils';
import {
  ActionHash,
  AgentPubKey,
  AppAgentClient,
  Delete,
  EntryHash,
  Link,
  NewEntryAction,
  Record,
  SignedActionHashed,
  decodeHashFromBase64,
  fakeActionHash,
  fakeAgentPubKey,
  fakeDnaHash,
  fakeEntryHash,
} from '@holochain/client';

import { HouseholdsClient } from './households-client.js';
import { HouseholdMembershipClaim } from './types.js';
import { Household } from './types.js';

export class HouseholdsZomeMock extends ZomeMock implements AppAgentClient {
  constructor(myPubKey?: AgentPubKey) {
    super('household_test', 'households', myPubKey);
  }

  /** Household */
  households = new HoloHashMap<
    ActionHash,
    {
      deletes: Array<SignedActionHashed<Delete>>;
      revisions: Array<Record>;
    }
  >();

  async create_household(household: Household): Promise<Record> {
    const entryHash = hash(household, HashType.ENTRY);
    const record = await fakeRecord(
      await fakeCreateAction(entryHash),
      fakeEntry(household),
    );

    this.households.set(record.signed_action.hashed.hash, {
      deletes: [],
      revisions: [record],
    });

    return record;
  }

  async get_latest_household(
    householdHash: ActionHash,
  ): Promise<Record | undefined> {
    const household = this.households.get(householdHash);
    return household
      ? household.revisions[household.revisions.length - 1]
      : undefined;
  }

  async get_all_revisions_for_household(
    householdHash: ActionHash,
  ): Promise<Record[] | undefined> {
    const household = this.households.get(householdHash);
    return household ? household.revisions : undefined;
  }

  async get_original_household(
    householdHash: ActionHash,
  ): Promise<Record | undefined> {
    const household = this.households.get(householdHash);
    return household ? household.revisions[0] : undefined;
  }

  async get_all_deletes_for_household(
    householdHash: ActionHash,
  ): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    const household = this.households.get(householdHash);
    return household ? household.deletes : undefined;
  }

  async get_oldest_delete_for_household(
    householdHash: ActionHash,
  ): Promise<SignedActionHashed<Delete> | undefined> {
    const household = this.households.get(householdHash);
    return household ? household.deletes[0] : undefined;
  }

  async delete_household(
    original_household_hash: ActionHash,
  ): Promise<ActionHash> {
    const record = await fakeRecord(
      await fakeDeleteEntry(original_household_hash),
    );

    this.households
      .get(original_household_hash)
      .deletes.push(record.signed_action as SignedActionHashed<Delete>);

    return record.signed_action.hashed.hash;
  }

  async update_household(input: {
    original_household_hash: ActionHash;
    previous_household_hash: ActionHash;
    updated_household: Household;
  }): Promise<Record> {
    const record = await fakeRecord(
      await fakeUpdateEntry(
        input.previous_household_hash,
        undefined,
        undefined,
        fakeEntry(input.updated_household),
      ),
      fakeEntry(input.updated_household),
    );

    this.households.get(input.original_household_hash).revisions.push(record);

    const household = input.updated_household;

    return record;
  }

  /** Requestors for Household */
  householdToRequestor = new HoloHashMap<ActionHash, Link[]>();

  async get_requestors_for_household(
    householdHash: ActionHash,
  ): Promise<Array<Link>> {
    return this.householdToRequestor.get(householdHash) || [];
  }

  async add_requestor_for_household(input: {
    household_hash: ActionHash;
    requestor: AgentPubKey;
  }): Promise<void> {
    const existing = this.householdToRequestor.get(input.household_hash) || [];
    this.householdToRequestor.set(input.household_hash, [
      ...existing,
      {
        target: input.requestor,
        author: this.myPubKey,
        timestamp: Date.now() * 1000,
        zome_index: 0,
        link_type: 0,
        tag: new Uint8Array(),
        create_link_hash: await fakeActionHash(),
      },
    ]);
  }

  /** Members for Household */
  householdToMember = new HoloHashMap<ActionHash, Link[]>();

  async get_members_for_household(
    householdHash: ActionHash,
  ): Promise<Array<Link>> {
    return this.householdToMember.get(householdHash) || [];
  }

  async add_member_for_household(input: {
    household_hash: ActionHash;
    member: AgentPubKey;
  }): Promise<void> {
    const existing = this.householdToMember.get(input.household_hash) || [];
    this.householdToMember.set(input.household_hash, [
      ...existing,
      {
        target: input.member,
        author: this.myPubKey,
        timestamp: Date.now() * 1000,
        zome_index: 0,
        link_type: 0,
        tag: new Uint8Array(),
        create_link_hash: await fakeActionHash(),
      },
    ]);
  }

  /** Household Membership Claim */
  householdMembershipClaims = new HoloHashMap<
    ActionHash,
    {
      deletes: Array<SignedActionHashed<Delete>>;
      revisions: Array<Record>;
    }
  >();

  async create_household_membership_claim(
    householdMembershipClaim: HouseholdMembershipClaim,
  ): Promise<Record> {
    const entryHash = hash(householdMembershipClaim, HashType.ENTRY);
    const record = await fakeRecord(
      await fakeCreateAction(entryHash),
      fakeEntry(householdMembershipClaim),
    );

    this.householdMembershipClaims.set(record.signed_action.hashed.hash, {
      deletes: [],
      revisions: [record],
    });

    return record;
  }

  async get_household_membership_claim(
    householdMembershipClaimHash: ActionHash,
  ): Promise<Record | undefined> {
    const householdMembershipClaim = this.householdMembershipClaims.get(
      householdMembershipClaimHash,
    );
    return householdMembershipClaim
      ? householdMembershipClaim.revisions[0]
      : undefined;
  }

  async get_active_households(_: any): Promise<Array<Link>> {
    const records: Record[] = Array.from(this.households.values()).map(
      r => r.revisions[r.revisions.length - 1],
    );
    return Promise.all(
      records.map(async record => ({
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

  /** Households for Member */
  memberToHousehold = new HoloHashMap<AgentPubKey, Link[]>();

  async get_households_for_member(member: AgentPubKey): Promise<Array<Link>> {
    return this.memberToHousehold.get(member) || [];
  }

  async add_household_for_member(input: {
    member: AgentPubKey;
    household_hash: ActionHash;
  }): Promise<void> {
    const existing = this.memberToHousehold.get(input.member) || [];
    this.memberToHousehold.set(input.member, [
      ...existing,
      {
        target: input.household_hash,
        author: this.myPubKey,
        timestamp: Date.now() * 1000,
        zome_index: 0,
        link_type: 0,
        tag: new Uint8Array(),
        create_link_hash: await fakeActionHash(),
      },
    ]);
  }
}

export async function sampleHousehold(
  client: HouseholdsClient,
  partialHousehold: Partial<Household> = {},
): Promise<Household> {
  return {
    ...{
      name: 'Lorem ipsum 2',
      avatar: await fakeEntryHash(),
    },
    ...partialHousehold,
  };
}

export async function sampleHouseholdMembershipClaim(
  client: HouseholdsClient,
  partialHouseholdMembershipClaim: Partial<HouseholdMembershipClaim> = {},
): Promise<HouseholdMembershipClaim> {
  return {
    ...{
      member_create_link_hash: await fakeActionHash(),
      household_hash: await fakeActionHash(),
    },
    ...partialHouseholdMembershipClaim,
  };
}
