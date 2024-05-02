import {
  AsyncComputed,
  AsyncState,
  allRevisionsOfEntrySignal,
  collectionSignal,
  deletedLinksSignal,
  deletesForEntrySignal,
  immutableEntrySignal,
  latestVersionOfEntrySignal,
  liveLinksSignal,
  mapCompleted,
} from "@holochain-open-dev/signals";
import {
  HashType,
  LazyHoloHashMap,
  retype,
  slice,
} from "@holochain-open-dev/utils";
import {
  ActionHash,
  AgentPubKey,
  decodeHashFromBase64,
  encodeHashToBase64,
} from "@holochain/client";

import { HouseholdsClient } from "./households-client.js";
import { NotificationsTypes } from "@darksoil-studio/notifications";
import { ProfilesStore } from "@holochain-open-dev/profiles";
import { wrapPathInSvg } from "@holochain-open-dev/elements";
import {
  mdiAccountCancel,
  mdiAccountCancelOutline,
  mdiAccountCheck,
  mdiAccountPlus,
} from "@mdi/js";
import { msg, str } from "@lit/localize";
import { decode } from "@msgpack/msgpack";
import {
  NOTIFICATIONS_TYPES,
  decodeRequestNotificationGroup,
} from "./notifications.js";

export class HouseholdsStore {
  constructor(
    public client: HouseholdsClient,
    private profilesStore: ProfilesStore,
  ) {}

  /** Household */

  households = new LazyHoloHashMap((householdHash: ActionHash) => ({
    latestVersion$: latestVersionOfEntrySignal(this.client, () =>
      this.client.getLatestHousehold(householdHash),
    ),
    original$: immutableEntrySignal(() =>
      this.client.getOriginalHousehold(householdHash),
    ),
    allRevisions$: allRevisionsOfEntrySignal(this.client, () =>
      this.client.getAllRevisionsForHousehold(householdHash),
    ),
    deletes$: deletesForEntrySignal(this.client, householdHash, () =>
      this.client.getAllDeletesForHousehold(householdHash),
    ),
    requestors: {
      live$: mapCompleted(
        liveLinksSignal(
          this.client,
          householdHash,
          () => this.client.getRequestorsForHousehold(householdHash),
          "HouseholdToRequestors",
        ),
        (links) => links.map((l) => retype(l.target, HashType.AGENT)),
      ),
      deleted$: mapCompleted(
        deletedLinksSignal(
          this.client,
          householdHash,
          () => this.client.getDeletedRequestorsForHousehold(householdHash),
          "HouseholdToRequestors",
        ),
        (links) =>
          links.map((l) =>
            retype(l[0].hashed.content.target_address, HashType.AGENT),
          ),
      ),
    },
    members: {
      live$: mapCompleted(
        liveLinksSignal(
          this.client,
          householdHash,
          () => this.client.getMembersForHousehold(householdHash),
          "HouseholdToMembers",
        ),
        (links) => links.map((l) => retype(l.target, HashType.AGENT)),
      ),
      deleted$: mapCompleted(
        deletedLinksSignal(
          this.client,
          householdHash,
          () => this.client.getDeletedMembersForHousehold(householdHash),
          "HouseholdToMembers",
        ),
        (links) =>
          links.map((l) =>
            retype(l[0].hashed.content.target_address, HashType.AGENT),
          ),
      ),
    },
  }));
  /** Household Membership Claim */

  householdMembershipClaims = new LazyHoloHashMap(
    (householdMembershipClaimHash: ActionHash) => ({
      entry$: immutableEntrySignal(() =>
        this.client.getHouseholdMembershipClaim(householdMembershipClaimHash),
      ),
    }),
  );

  /** Active Households */

  activeHouseholds$ = mapCompleted(
    collectionSignal(
      this.client,
      () => this.client.getActiveHouseholds(),
      "ActiveHouseholds",
      2000,
    ),
    (activeHouseholds) =>
      slice(
        this.households,
        activeHouseholds.map((l) => l.target),
      ),
  );

  /** Households for Member */

  householdsForMember = new LazyHoloHashMap((member: AgentPubKey) =>
    mapCompleted(
      liveLinksSignal(
        this.client,
        member,
        () => this.client.getHouseholdsForMember(member),
        "MemberToHouseholds",
      ),
      (links) =>
        slice(
          this.households,
          links.map((l) => l.target),
        ),
    ),
  );

  householdsIHaveRequestedToJoin$ = mapCompleted(
    liveLinksSignal(
      this.client,
      this.client.client.myPubKey,
      () =>
        this.client.getJoinHouseholdRequestsForAgent(
          this.client.client.myPubKey,
        ),
      "RequestorToHouseholds",
    ),
    (links) =>
      slice(
        this.households,
        links.map((l) => l.target),
      ),
  );

  myHousehold$ = mapCompleted(
    this.householdsForMember.get(this.client.client.myPubKey),
    (households) => {
      if (households.size === 0) return undefined;
      if (households.size > 1)
        throw new Error("You are a member of more than one household");

      return Array.from(households.values())[0];
    },
  );

  /** Notifications types */
  private requestNotificationTitle(notificationGroup: string) {
    const { requestor, householdHash } =
      decodeRequestNotificationGroup(notificationGroup);
    if (requestor.toString() === this.client.client.myPubKey.toString())
      return new AsyncComputed(() => {
        const household = this.households
          .get(householdHash)
          .latestVersion$.get();
        if (household.status !== "completed") return household;
        return {
          status: "completed",
          value: msg(
            str`You requested to join the household "${household.value?.entry.name}".`,
          ),
        };
      });
    return new AsyncComputed(() => {
      const profile = this.profilesStore.profiles.get(requestor).get();
      if (profile.status !== "completed") return profile;
      return {
        status: "completed",
        value: msg(
          str`${profile.value?.entry.nickname} requested to join your household.`,
        ),
      };
    });
  }

  notificationsTypes(
    onClickRequestNotificationGroup: (
      householdHash: ActionHash,
      requestor: AgentPubKey,
    ) => void,
  ): NotificationsTypes {
    const onClickForRequestNotificationTypes = (notificationGroup: string) => {
      const { requestor, householdHash } =
        decodeRequestNotificationGroup(notificationGroup);
      return onClickRequestNotificationGroup(householdHash, requestor);
    };
    return {
      [NOTIFICATIONS_TYPES.REQUEST_TO_JOIN_HOUSEHOLD]: {
        contents: (notification) => {
          const { requestor } = decodeRequestNotificationGroup(
            notification.entry.notification_group,
          );
          const iconSrc = wrapPathInSvg(mdiAccountPlus);
          return new AsyncState({
            status: "completed",
            value: {
              iconSrc,
              body: "",
            },
          });
        },
        onClick: onClickForRequestNotificationTypes,
        title: (notificationGroup) =>
          this.requestNotificationTitle(notificationGroup),
      },
      [NOTIFICATIONS_TYPES.REQUEST_ACCEPTED]: {
        contents: (notification) => {
          const acceptor = notification.action.author;
          const iconSrc = wrapPathInSvg(mdiAccountCheck);

          return new AsyncComputed(() => {
            const acceptorProfile = this.profilesStore.profiles
              .get(acceptor)
              .get();
            if (acceptorProfile.status !== "completed") return acceptorProfile;

            return {
              status: "completed",
              value: {
                iconSrc,
                body: msg(
                  str`${acceptorProfile.value?.entry.nickname} accepted the request.`,
                ),
              },
            };
          });
        },
        onClick: onClickForRequestNotificationTypes,
        title: (notificationGroup) =>
          this.requestNotificationTitle(notificationGroup),
      },
      [NOTIFICATIONS_TYPES.REQUEST_REJECTED]: {
        contents: (notification) => {
          const rejector = notification.action.author;
          const iconSrc = wrapPathInSvg(mdiAccountCancel);

          return new AsyncComputed(() => {
            const rejectorProfile = this.profilesStore.profiles
              .get(rejector)
              .get();
            if (rejectorProfile.status !== "completed") return rejectorProfile;

            return {
              status: "completed",
              value: {
                iconSrc,
                body: msg(
                  str`${rejectorProfile.value?.entry.nickname}rejected the request.`,
                ),
              },
            };
          });
        },
        onClick: onClickForRequestNotificationTypes,
        title: (notificationGroup) =>
          this.requestNotificationTitle(notificationGroup),
      },
      [NOTIFICATIONS_TYPES.REQUEST_CANCELLED]: {
        contents: (notification) => {
          const rejector = notification.action.author;
          const iconSrc = wrapPathInSvg(mdiAccountCancel);

          return new AsyncComputed(() => {
            const rejectorProfile = this.profilesStore.profiles
              .get(rejector)
              .get();
            if (rejectorProfile.status !== "completed") return rejectorProfile;

            return {
              status: "completed",
              value: {
                iconSrc,
                body: msg(
                  str`${rejectorProfile.value?.entry.nickname} cancelled the request.`,
                ),
              },
            };
          });
        },
        onClick: onClickForRequestNotificationTypes,
        title: (notificationGroup) =>
          this.requestNotificationTitle(notificationGroup),
      },
    };
  }
}
