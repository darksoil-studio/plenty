import { HouseholdMembershipClaim } from './types.js';

import { Household } from './types.js';

import {
  collectionStore,
  liveLinksStore,
  deletedLinksStore,
  allRevisionsOfEntryStore,
  latestVersionOfEntryStore,
  immutableEntryStore,
  deletesForEntryStore,
  AsyncReadable,
  pipe
} from "@holochain-open-dev/stores";
import { slice, HashType, retype, EntryRecord, LazyHoloHashMap } from "@holochain-open-dev/utils";
import { NewEntryAction, Record, ActionHash, EntryHash, AgentPubKey } from '@holochain/client';

import { HouseholdsClient } from './households-client.js';

export class HouseholdsStore {
  constructor(public client: HouseholdsClient) { }

  /** Household */

  households = new LazyHoloHashMap((householdHash: ActionHash) => ({
    latestVersion: latestVersionOfEntryStore(this.client, () => this.client.getLatestHousehold(householdHash)),
    original: immutableEntryStore(() => this.client.getOriginalHousehold(householdHash)),
    allRevisions: allRevisionsOfEntryStore(this.client, () => this.client.getAllRevisionsForHousehold(householdHash)),
    deletes: deletesForEntryStore(this.client, householdHash, () => this.client.getAllDeletesForHousehold(householdHash)),
    requestors: {
      live: pipe(
        liveLinksStore(
          this.client,
          householdHash,
          () => this.client.getRequestorsForHousehold(householdHash),
          'HouseholdToRequestors'
        ),
        links => links.map(l => {
          l.target = retype(l.target, HashType.AGENT);
          return l;
        })
      ),
      deleted: pipe(
        deletedLinksStore(
          this.client,
          householdHash,
          () => this.client.getDeletedRequestorsForHousehold(householdHash),
          'HouseholdToRequestors'
        ),
        links => links.map(l => retype(l[0].hashed.content.target_address, HashType.AGENT))
      ),
    },
    members: {
      live: pipe(
        liveLinksStore(
          this.client,
          householdHash,
          () => this.client.getMembersForHousehold(householdHash),
          'HouseholdToMembers'
        ),
        links => links.map(l => {
          l.target = retype(l.target, HashType.AGENT);
          return l;
        })
      ),
      deleted: pipe(
        deletedLinksStore(
          this.client,
          householdHash,
          () => this.client.getDeletedMembersForHousehold(householdHash),
          'HouseholdToMembers'
        ),
        links => links.map(l => retype(l[0].hashed.content.target_address, HashType.AGENT))
      ),
    },
  })
  );
  /** Household Membership Claim */

  householdMembershipClaims = new LazyHoloHashMap((householdMembershipClaimHash: ActionHash) => ({
    entry: immutableEntryStore(() => this.client.getHouseholdMembershipClaim(householdMembershipClaimHash)),
  })
  );

  /** Active Households */

  activeHouseholds = pipe(
    collectionStore(
      this.client,
      () => this.client.getActiveHouseholds(),
      'ActiveHouseholds'
    ),
    activeHouseholds => slice(this.households, activeHouseholds.map(l => l.target))
  );
}
