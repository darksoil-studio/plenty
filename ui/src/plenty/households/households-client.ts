import {
  EntryRecord,
  HashType,
  ZomeClient,
  pickBy,
  retype,
} from "@holochain-open-dev/utils";
import {
  ActionHash,
  AgentPubKey,
  AppClient,
  CreateLink,
  Delete,
  DeleteLink,
  Link,
  Record,
  SignedActionHashed,
  encodeHashToBase64,
} from "@holochain/client";
import { NotificationsStore } from "@darksoil-studio/notifications";
import { encode } from "@msgpack/msgpack";
import { toPromise } from "@holochain-open-dev/signals";

import { HouseholdMembershipClaim } from "./types.js";
import { Household } from "./types.js";
import { HouseholdsSignal } from "./types.js";
import {
  NOTIFICATIONS_TYPES,
  encodeRequestNotificationGroup,
} from "./notifications.js";

export class HouseholdsClient extends ZomeClient<HouseholdsSignal> {
  constructor(
    private notificationsStore: NotificationsStore,
    public client: AppClient,
    public roleName: string,
    public zomeName = "households",
  ) {
    super(client, roleName, zomeName);
  }
  /** Household */

  async createHousehold(household: Household): Promise<EntryRecord<Household>> {
    const record: Record = await this.callZome("create_household", household);
    return new EntryRecord(record);
  }

  async getLatestHousehold(
    householdHash: ActionHash,
  ): Promise<EntryRecord<Household> | undefined> {
    const record: Record = await this.callZome(
      "get_latest_household",
      householdHash,
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async getOriginalHousehold(
    householdHash: ActionHash,
  ): Promise<EntryRecord<Household> | undefined> {
    const record: Record = await this.callZome(
      "get_original_household",
      householdHash,
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async getAllRevisionsForHousehold(
    householdHash: ActionHash,
  ): Promise<Array<EntryRecord<Household>>> {
    const records: Record[] = await this.callZome(
      "get_all_revisions_for_household",
      householdHash,
    );
    return records.map((r) => new EntryRecord(r));
  }

  async updateHousehold(
    originalHouseholdHash: ActionHash,
    previousHouseholdHash: ActionHash,
    updatedHousehold: Household,
  ): Promise<EntryRecord<Household>> {
    const record: Record = await this.callZome("update_household", {
      original_household_hash: originalHouseholdHash,
      previous_household_hash: previousHouseholdHash,
      updated_household: updatedHousehold,
    });
    return new EntryRecord(record);
  }

  deleteHousehold(originalHouseholdHash: ActionHash): Promise<ActionHash> {
    return this.callZome("delete_household", originalHouseholdHash);
  }

  getAllDeletesForHousehold(
    originalHouseholdHash: ActionHash,
  ): Promise<Array<SignedActionHashed<Delete>>> {
    return this.callZome(
      "get_all_deletes_for_household",
      originalHouseholdHash,
    );
  }

  getOldestDeleteForHousehold(
    originalHouseholdHash: ActionHash,
  ): Promise<SignedActionHashed<Delete> | undefined> {
    return this.callZome(
      "get_oldest_delete_for_household",
      originalHouseholdHash,
    );
  }

  /** Requestors for Household */

  async getRequestorsForHousehold(
    householdHash: ActionHash,
  ): Promise<Array<Link>> {
    return this.callZome("get_requestors_for_household", householdHash);
  }

  async getJoinHouseholdRequestsForAgent(
    agent: AgentPubKey,
  ): Promise<Array<Link>> {
    return this.callZome("get_join_household_requests_for_agent", agent);
  }

  async getDeletedRequestorsForHousehold(
    householdHash: ActionHash,
  ): Promise<
    Array<[SignedActionHashed<CreateLink>, SignedActionHashed<DeleteLink>[]]>
  > {
    return this.callZome("get_deleted_requestors_for_household", householdHash);
  }

  private async createNotificationForHouseholdMembers(
    householdHash: ActionHash,
    notificationType: string,
    notificationGroup: string,
    notification: any,
    persistent: boolean,
  ): Promise<void> {
    const links = await this.getMembersForHousehold(householdHash);
    const members = links.map((l) => retype(l.target, HashType.AGENT));
    const recipients = members.filter(
      (m) => m.toString() !== this.client.myPubKey.toString(),
    );

    await this.notificationsStore.client.createNotification({
      content: notification,
      notification_group: notificationGroup,
      notification_type: notificationType,
      persistent,
      recipients,
    });
  }

  private async createRequestNotificationForHouseholdMembers(
    householdHash: ActionHash,
    requestor: AgentPubKey,
    notificationType: string,
    notification: any,
    persistent: boolean,
  ) {
    await this.createNotificationForHouseholdMembers(
      householdHash,
      notificationType,
      encodeRequestNotificationGroup(householdHash, requestor),
      notification,
      persistent,
    );
  }

  async requestToJoinHousehold(householdHash: ActionHash): Promise<void> {
    await this.callZome("request_to_join_household", householdHash);

    await this.createRequestNotificationForHouseholdMembers(
      householdHash,
      this.client.myPubKey,
      NOTIFICATIONS_TYPES.REQUEST_TO_JOIN_HOUSEHOLD,
      encode(householdHash),
      true,
    );
  }

  async rejectJoinRequest(
    householdHash: ActionHash,
    requestor: AgentPubKey,
  ): Promise<void> {
    await this.callZome("reject_join_request", {
      requestor,
      household_hash: householdHash,
    });

    const notificationsToJoinMyHousehold =
      this.notificationsStore.notificationsByTypeAndGroup
        .get(NOTIFICATIONS_TYPES.REQUEST_TO_JOIN_HOUSEHOLD)
        .get(encodeRequestNotificationGroup(householdHash, requestor));

    const read = await toPromise(notificationsToJoinMyHousehold.read);
    const unread = await toPromise(notificationsToJoinMyHousehold.unread);

    const readNotificationsForThisRequestor = pickBy(
      read,
      (n) => n.action.author.toString() === requestor.toString(),
    );
    const unreadNotificationsForThisRequestor = pickBy(
      unread,
      (n) => n.action.author.toString() === requestor.toString(),
    );

    await this.notificationsStore.client.dismissNotifications([
      ...Array.from(readNotificationsForThisRequestor.keys()),
      ...Array.from(unreadNotificationsForThisRequestor.keys()),
    ]);
    await this.createRequestNotificationForHouseholdMembers(
      householdHash,
      requestor,
      NOTIFICATIONS_TYPES.REQUEST_REJECTED,
      encode(householdHash),
      false,
    );
  }

  async acceptJoinRequest(
    householdHash: ActionHash,
    requestor: AgentPubKey,
  ): Promise<void> {
    await this.callZome("accept_join_request", {
      requestor,
      household_hash: householdHash,
    });
    const notificationsToJoinMyHousehold =
      this.notificationsStore.notificationsByTypeAndGroup
        .get(NOTIFICATIONS_TYPES.REQUEST_TO_JOIN_HOUSEHOLD)
        .get(encodeRequestNotificationGroup(householdHash, requestor));

    const read = await toPromise(notificationsToJoinMyHousehold.read);
    const unread = await toPromise(notificationsToJoinMyHousehold.unread);

    const readNotificationsForThisRequestor = pickBy(
      read,
      (n) => n.action.author.toString() === requestor.toString(),
    );
    const unreadNotificationsForThisRequestor = pickBy(
      unread,
      (n) => n.action.author.toString() === requestor.toString(),
    );

    await this.notificationsStore.client.dismissNotifications([
      ...Array.from(readNotificationsForThisRequestor.keys()),
      ...Array.from(unreadNotificationsForThisRequestor.keys()),
    ]);
    await this.createRequestNotificationForHouseholdMembers(
      householdHash,
      requestor,
      NOTIFICATIONS_TYPES.REQUEST_ACCEPTED,
      encode(householdHash),
      false,
    );
  }

  async cancelJoinRequest(householdHash: ActionHash): Promise<void> {
    await this.callZome("cancel_join_request", householdHash);

    await this.createRequestNotificationForHouseholdMembers(
      householdHash,
      this.client.myPubKey,
      NOTIFICATIONS_TYPES.REQUEST_CANCELLED,
      encode(householdHash),
      false,
    );
  }

  /** Members for Household */

  async getMembersForHousehold(
    householdHash: ActionHash,
  ): Promise<Array<Link>> {
    return this.callZome("get_members_for_household", householdHash);
  }

  async getDeletedMembersForHousehold(
    householdHash: ActionHash,
  ): Promise<
    Array<[SignedActionHashed<CreateLink>, SignedActionHashed<DeleteLink>[]]>
  > {
    return this.callZome("get_deleted_members_for_household", householdHash);
  }

  addMemberForHousehold(
    householdHash: ActionHash,
    member: AgentPubKey,
  ): Promise<void> {
    return this.callZome("add_member_for_household", {
      household_hash: householdHash,
      member,
    });
  }

  removeMemberForHousehold(
    householdHash: ActionHash,
    member: AgentPubKey,
  ): Promise<void> {
    return this.callZome("remove_member_for_household", {
      household_hash: householdHash,
      member,
    });
  }

  async leaveHousehold(householdHash: ActionHash): Promise<void> {
    await this.callZome("leave_household", householdHash);
  }

  /** Household Membership Claim */

  async createHouseholdMembershipClaim(
    householdMembershipClaim: HouseholdMembershipClaim,
  ): Promise<EntryRecord<HouseholdMembershipClaim>> {
    const record: Record = await this.callZome(
      "create_household_membership_claim",
      householdMembershipClaim,
    );
    return new EntryRecord(record);
  }

  async getHouseholdMembershipClaim(
    householdMembershipClaimHash: ActionHash,
  ): Promise<EntryRecord<HouseholdMembershipClaim> | undefined> {
    const record: Record = await this.callZome(
      "get_household_membership_claim",
      householdMembershipClaimHash,
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async queryMyHouseholdMembershipClaims(): Promise<
    Array<EntryRecord<HouseholdMembershipClaim>>
  > {
    const records: Array<Record> = await this.callZome(
      "query_my_household_membership_claims",
      null,
    );
    return records.map((r) => new EntryRecord(r));
  }

  /** Active Households */

  async getActiveHouseholds(): Promise<Array<Link>> {
    return this.callZome("get_active_households", undefined);
  }

  /** Households for Member */

  async getHouseholdsForMember(member: AgentPubKey): Promise<Array<Link>> {
    return this.callZome("get_households_for_member", member);
  }
}
