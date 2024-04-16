import {
  AsyncReadable,
  allRevisionsOfEntryStore,
  collectionStore,
  deletedLinksStore,
  deletesForEntryStore,
  immutableEntryStore,
  latestVersionOfEntryStore,
  liveLinksStore,
  pipe,
} from '@holochain-open-dev/stores';
import {
  EntryRecord,
  HashType,
  LazyHoloHashMap,
  retype,
  slice,
} from '@holochain-open-dev/utils';
import {
  ActionHash,
  AgentPubKey,
  EntryHash,
  NewEntryAction,
  Record,
} from '@holochain/client';

import { HouseholdsClient } from './households-client.js';
import { HouseholdMembershipClaim } from './types.js';
import { Household } from './types.js';

export class HouseholdsStore {
  constructor(public client: HouseholdsClient) { }

  /** Household */

  households = new LazyHoloHashMap((householdHash: ActionHash) => ({
    latestVersion: latestVersionOfEntryStore(this.client, () =>
      this.client.getLatestHousehold(householdHash),
    ),
    original: immutableEntryStore(() =>
      this.client.getOriginalHousehold(householdHash),
    ),
    allRevisions: allRevisionsOfEntryStore(this.client, () =>
      this.client.getAllRevisionsForHousehold(householdHash),
    ),
    deletes: deletesForEntryStore(this.client, householdHash, () =>
      this.client.getAllDeletesForHousehold(householdHash),
    ),
    requestors: {
      live: pipe(
        liveLinksStore(
          this.client,
          householdHash,
          () => this.client.getRequestorsForHousehold(householdHash),
          'HouseholdToRequestors',
        ),
        links =>
          links.map(l => ({
            ...l,
            target: retype(l.target, HashType.AGENT),
          })),
      ),
      deleted: pipe(
        deletedLinksStore(
          this.client,
          householdHash,
          () => this.client.getDeletedRequestorsForHousehold(householdHash),
          'HouseholdToRequestors',
        ),
        links =>
          links.map(l =>
            retype(l[0].hashed.content.target_address, HashType.AGENT),
          ),
      ),
    },
    members: {
      live: pipe(
        liveLinksStore(
          this.client,
          householdHash,
          () => this.client.getMembersForHousehold(householdHash),
          'HouseholdToMembers',
        ),
        links =>
          links.map(l => ({
            ...l,
            target: retype(l.target, HashType.AGENT),
          })),
      ),
      deleted: pipe(
        deletedLinksStore(
          this.client,
          householdHash,
          () => this.client.getDeletedMembersForHousehold(householdHash),
          'HouseholdToMembers',
        ),
        links =>
          links.map(l =>
            retype(l[0].hashed.content.target_address, HashType.AGENT),
          ),
      ),
    },
  }));
  /** Household Membership Claim */

  householdMembershipClaims = new LazyHoloHashMap(
    (householdMembershipClaimHash: ActionHash) => ({
      entry: immutableEntryStore(() =>
        this.client.getHouseholdMembershipClaim(householdMembershipClaimHash),
      ),
    }),
  );

  /** Active Households */

  activeHouseholds = pipe(
    collectionStore(
      this.client,
      () => this.client.getActiveHouseholds(),
      'ActiveHouseholds',
      2000
    ),
    activeHouseholds =>
      slice(
        this.households,
        activeHouseholds.map(l => l.target),
      ),
  );

  /** Households for Member */

  householdsForMember = new LazyHoloHashMap((member: AgentPubKey) =>
    pipe(
      liveLinksStore(
        this.client,
        member,
        () => this.client.getHouseholdsForMember(member),
        'MemberToHouseholds',
      ),
      links =>
        slice(
          this.households,
          links.map(l => l.target),
        ),
    ),
  );

  myHousehold = pipe(
    this.householdsForMember.get(this.client.client.myPubKey),
    households => {
      if (households.size === 0) return undefined;
      if (households.size > 1)
        throw new Error('You are a member of more than one household');

      return Array.from(households.values())[0];
    },
  );
}
