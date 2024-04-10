import { Household } from './types.js';

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
  hash
} from "@holochain-open-dev/utils";
import {
  decodeHashFromBase64,
  NewEntryAction,
  AgentPubKey,
  ActionHash,
  EntryHash,
  Delete,
  AppAgentClient,
  fakeAgentPubKey,
  fakeDnaHash,
  Link,
  fakeActionHash,
  SignedActionHashed,
  fakeEntryHash,
  Record,
} from "@holochain/client";
import { HouseholdClient } from './household-client.js'

export class HouseholdZomeMock extends ZomeMock implements AppAgentClient {
  constructor(
    myPubKey?: AgentPubKey
  ) {
    super("household_test", "household", myPubKey);
  }
  /** Household */
  households = new HoloHashMap<ActionHash, {
    deletes: Array<SignedActionHashed<Delete>>;
    revisions: Array<Record>;
  }>();

  async create_household(household: Household): Promise<Record> {
    const entryHash = hash(household, HashType.ENTRY);
    const record = await fakeRecord(await fakeCreateAction(entryHash), fakeEntry(household));
    
    this.households.set(record.signed_action.hashed.hash, {
      deletes: [],
      revisions: [record]
    });
  

    return record;
  }
  
  async get_latest_household(householdHash: ActionHash): Promise<Record | undefined> {
    const household = this.households.get(householdHash);
    return household ? household.revisions[household.revisions.length - 1] : undefined;
  }
  
  async get_all_revisions_for_household(householdHash: ActionHash): Promise<Record[] | undefined> {
    const household = this.households.get(householdHash);
    return household ? household.revisions : undefined;
  }
  
  async get_original_household(householdHash: ActionHash): Promise<Record | undefined> {
    const household = this.households.get(householdHash);
    return household ? household.revisions[0] : undefined;
  }
  
  async get_all_deletes_for_household(householdHash: ActionHash): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    const household = this.households.get(householdHash);
    return household ? household.deletes : undefined;
  }

  async get_oldest_delete_for_household(householdHash: ActionHash): Promise<SignedActionHashed<Delete> | undefined> {
    const household = this.households.get(householdHash);
    return household ? household.deletes[0] : undefined;
  }
  async delete_household(original_household_hash: ActionHash): Promise<ActionHash> {
    const record = await fakeRecord(await fakeDeleteEntry(original_household_hash));
    
    this.households.get(original_household_hash).deletes.push(record.signed_action as SignedActionHashed<Delete>);
    
    return record.signed_action.hashed.hash;
  }

  async update_household(input: { original_household_hash: ActionHash; previous_household_hash: ActionHash; updated_household: Household; }): Promise<Record> {
    const record = await fakeRecord(await fakeUpdateEntry(input.previous_household_hash, undefined, undefined, fakeEntry(input.updated_household)), fakeEntry(input.updated_household));

  this.households.get(input.original_household_hash).revisions.push(record);
     
    const household = input.updated_household;
    
    
    return record;
  }
  

}

export async function sampleHousehold(client: HouseholdClient, partialHousehold: Partial<Household> = {}): Promise<Household> {
    return {
        ...{
          name: "Lorem ipsum 2",
          avatar: (await fakeEntryHash()),
        },
        ...partialHousehold
    };
}