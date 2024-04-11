import { HouseholdMembershipClaim } from './types.js';

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

import { HouseholdsSignal } from './types.js';

export class HouseholdsClient extends ZomeClient<HouseholdsSignal> {
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

  /** Requestors for Household */

  async getRequestorsForHousehold(householdHash: ActionHash): Promise<Array<Link>> {
    return this.callZome('get_requestors_for_household', householdHash);
  }

  async getDeletedRequestorsForHousehold(householdHash: ActionHash): Promise<Array<[SignedActionHashed<CreateLink>, SignedActionHashed<DeleteLink>[]]>> {
    return this.callZome('get_deleted_requestors_for_household', householdHash);
  }

  requestToJoinHousehold(householdHash: ActionHash): Promise<ActionHash> {
    return this.callZome('request_to_join_household', householdHash);
  }

  rejectJoinRequest(joinRequestHash: ActionHash): Promise<void> {
    return this.callZome('reject_join_request', joinRequestHash);
  }

  acceptJoinRequest(joinRequestHash: ActionHash): Promise<void> {
    return this.callZome('accept_join_request', joinRequestHash);
  }

  /** Members for Household */

  async getMembersForHousehold(householdHash: ActionHash): Promise<Array<Link>> {
    return this.callZome('get_members_for_household', householdHash);
  }

  async getDeletedMembersForHousehold(householdHash: ActionHash): Promise<Array<[SignedActionHashed<CreateLink>, SignedActionHashed<DeleteLink>[]]>> {
    return this.callZome('get_deleted_members_for_household', householdHash);
  }

  addMemberForHousehold(householdHash: ActionHash, member: AgentPubKey): Promise<void> {
    return this.callZome('add_member_for_household', {
      base_household_hash: householdHash,
      target_member: member,
    });
  }

  removeMemberForHousehold(householdHash: ActionHash, member: AgentPubKey): Promise<void> {
    return this.callZome('remove_member_for_household', {
      household_hash: householdHash,
      member: member,
    });
  }

  async leaveHousehold(householdHash: ActionHash): Promise<void> {
    await this.callZome('leave_household', householdHash);
  }

  /** Household Membership Claim */

  async createHouseholdMembershipClaim(householdMembershipClaim: HouseholdMembershipClaim): Promise<EntryRecord<HouseholdMembershipClaim>> {
    const record: Record = await this.callZome('create_household_membership_claim', householdMembershipClaim);
    return new EntryRecord(record);
  }

  async getHouseholdMembershipClaim(householdMembershipClaimHash: ActionHash): Promise<EntryRecord<HouseholdMembershipClaim> | undefined> {
    const record: Record = await this.callZome('get_household_membership_claim', householdMembershipClaimHash);
    return record ? new EntryRecord(record) : undefined;
  }
  /** Active Households */

  async getActiveHouseholds(): Promise<Array<Link>> {
    return this.callZome('get_active_households', undefined);
  }

}
