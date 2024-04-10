import { Household } from './types.js';

import { 
  SignedActionHashed,
  CreateLink,
  Link,
  DeleteLink,
  Delete,
  AppAgentClient, 
  Record, 
  ActionHash, 
  EntryHash, 
  AgentPubKey,
} from '@holochain/client';
import { isSignalFromCellWithRole, EntryRecord, ZomeClient } from '@holochain-open-dev/utils';

import { HouseholdSignal } from './types.js';

export class HouseholdClient extends ZomeClient<HouseholdSignal> {
  constructor(public client: AppAgentClient, public roleName: string, public zomeName = 'household') {
    super(client, roleName, zomeName);
  }
  /** Household */

  async createHousehold(household: Household): Promise<EntryRecord<Household>> {
    const record: Record = await this.callZome('create_household', household);
    return new EntryRecord(record);
  }
  
  async getLatestHousehold(householdHash: ActionHash): Promise<EntryRecord<Household> | undefined> {
    const record: Record = await this.callZome('get_latest_household', householdHash);
    return record ? new EntryRecord(record) : undefined;
  }

  async getOriginalHousehold(householdHash: ActionHash): Promise<EntryRecord<Household> | undefined> {
    const record: Record = await this.callZome('get_original_household', householdHash);
    return record ? new EntryRecord(record) : undefined;
  }

  async getAllRevisionsForHousehold(householdHash: ActionHash): Promise<Array<EntryRecord<Household>>> {
    const records: Record[] = await this.callZome('get_all_revisions_for_household', householdHash);
    return records.map(r => new EntryRecord(r));
  }

  async updateHousehold(originalHouseholdHash: ActionHash, previousHouseholdHash: ActionHash, updatedHousehold: Household): Promise<EntryRecord<Household>> {
    const record: Record = await this.callZome('update_household', {
      original_household_hash: originalHouseholdHash,
      previous_household_hash: previousHouseholdHash,
      updated_household: updatedHousehold
    });
    return new EntryRecord(record);
  }

  deleteHousehold(originalHouseholdHash: ActionHash): Promise<ActionHash> {
    return this.callZome('delete_household', originalHouseholdHash);
  }

  getAllDeletesForHousehold(originalHouseholdHash: ActionHash): Promise<Array<SignedActionHashed<Delete>>> {
    return this.callZome('get_all_deletes_for_household', originalHouseholdHash);
  }

  getOldestDeleteForHousehold(originalHouseholdHash: ActionHash): Promise<SignedActionHashed<Delete> | undefined> {
    return this.callZome('get_oldest_delete_for_household', originalHouseholdHash);
  }
  
}
