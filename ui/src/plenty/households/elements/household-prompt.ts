import {
  notifyError,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import {
  EntryRecord,
  HashType,
  mapValues,
  retype,
} from "@holochain-open-dev/utils";
import { core } from "@tauri-apps/api";
import { ActionHash, Link } from "@holochain/client";
import { consume } from "@lit/context";
import { msg, str } from "@lit/localize";
import { mdiInformationOutline, mdiPlus } from "@mdi/js";
import { SlDialog } from "@shoelace-style/shoelace";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "@shoelace-style/shoelace/dist/components/radio-button/radio-button.js";
import "@shoelace-style/shoelace/dist/components/radio-group/radio-group.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/tree-item/tree-item.js";
import "@shoelace-style/shoelace/dist/components/tree/tree.js";
import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import {
  AsyncResult,
  SignalWatcher,
  joinAsyncMap,
} from "@holochain-open-dev/signals";

import "../../../overlay-page.js";
import "./create-household.js";

import { householdsStoreContext } from "../context.js";
import { HouseholdsStore } from "../households-store.js";
import { Household } from "../types.js";
import { tryAndRetry } from "../../../utils.js";
import { appStyles } from "../../../app-styles.js";

type HouseholdRequestStatus =
  | { status: "ACCEPTED_JOINING"; household: EntryRecord<Household> }
  | { status: "HOUSEHOLD_MEMBER" }
  | { status: "NOT_REQUESTED" }
  | {
      status: "REQUESTED";
      requestedHouseholds: ReadonlyMap<ActionHash, EntryRecord<Household>>;
    };

@customElement("household-prompt")
export class HouseholdPrompt extends SignalWatcher(LitElement) {
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  @state()
  creatingHousehold = false;

  @state()
  selectedHousehold: ActionHash | undefined;

  renderActiveHouseholds(
    households: ReadonlyMap<ActionHash, EntryRecord<Household>>
  ) {
    if (households.size === 0)
      return html` <div class="column center-content" style="gap: 16px;">
        <sl-icon
          .src=${wrapPathInSvg(mdiInformationOutline)}
          style="color: grey; height: 64px; width: 64px;"
        ></sl-icon>
        <span class="placeholder"
          >${msg("No active households were found")}</span
        >
      </div>`;

    return html`<div class="column" style="gap: 16px">
      ${Array.from(households.entries()).map(
        ([householdHash, h], i) => html`
          <div
            class="row"
            @click=${() => {
              this.selectedHousehold = householdHash;
            }}
            @keydown=${() => {
              this.selectedHousehold = householdHash;
            }}
            style="${styleMap({
              cursor: "pointer",
              gap: "8px",
              padding: "8px",
              "align-items": "center",
              "background-color":
                this.selectedHousehold?.toString() === householdHash.toString()
                  ? "var(--sl-color-primary-500)"
                  : "auto",
            })}"
          >
            <show-image
              style="height: 32px; width: 32px; border-radius: 10px"
              .imageHash=${h.entry.avatar}
            ></show-image>
            ${h.entry.name}
          </div>
          ${i === households.size - 1
            ? html``
            : html`<sl-divider></sl-divider>`}
        `
      )}
    </div>`;
  }

  getActiveHouseholds() {
    const activeHouseholds = this.householdsStore.activeHouseholds.get();
    if (activeHouseholds.status !== "completed") return activeHouseholds;

    return joinAsyncMap(
      mapValues(activeHouseholds.value, (h) => h.latestVersion.get())
    );
  }

  /**
   * @internal
   */
  @state()
  leavingBuyersClub = false;

  renderLeaveBuyersClubDialog() {
    return html`
      <sl-dialog
        id="leave-buyers-club-dialog"
        .label=${msg("Leave Buyers Club")}
      >
        <span>${msg("Are you sure you want to leave this buyers club?")}</span>
        <sl-button
          slot="footer"
          @click=${() => {
            (
              this.shadowRoot?.getElementById(
                "leave-buyers-club-dialog"
              ) as SlDialog
            ).hide();
          }}
          >${msg("Cancel")}</sl-button
        >
        <sl-button
          slot="footer"
          variant="danger"
          .loading=${this.leavingBuyersClub}
          @click=${async () => {
            if (this.leavingBuyersClub) return;

            this.leavingBuyersClub = true;
            try {
              await core.invoke("leave_buyers_club");
              this.leavingBuyersClub = false;
              (
                this.shadowRoot?.getElementById(
                  "leave-buyers-club-dialog"
                ) as SlDialog
              ).hide();
            } catch (e) {
              notifyError(msg("Error leaving this buyers club."));
              console.error(e);
            }
          }}
          >${msg("Leave Buyers Club")}</sl-button
        >
      </sl-dialog>
    `;
  }

  renderPrompt() {
    const activeHouseholds = this.getActiveHouseholds();

    switch (activeHouseholds.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the households")}
          .error=${activeHouseholds.error}
        ></display-error>`;
      case "completed":
        return html`
          <div
            class="column"
            style="flex: 1; align-items: center; justify-content: center;"
          >
            <sl-card>
              <div class="column" style="gap: 16px">
                <span class="title">${msg("Join Your Household")}</span>

                <span class="placeholder"
                  >${msg("Select your household and wait to be invited.")}</span
                >
                <span class="placeholder"
                  >${msg(
                    "If your household does not exist yet, create it."
                  )}</span
                >

                <div class="row" style="justify-content: end">
                  <sl-button
                    @click=${() => {
                      this.creatingHousehold = true;
                    }}
                  >
                    <sl-icon
                      slot="prefix"
                      .src=${wrapPathInSvg(mdiPlus)}
                    ></sl-icon>
                    ${msg("Create Household")}
                  </sl-button>
                </div>

                ${this.renderActiveHouseholds(activeHouseholds.value)}
                <sl-button
                  .disabled=${this.selectedHousehold === undefined}
                  variant="primary"
                  @click=${() =>
                    this.householdsStore.client.requestToJoinHousehold(
                      this.selectedHousehold!
                    )}
                  >${msg("Request To Join Household")}</sl-button
                >
              </div>
            </sl-card>
            ${this.renderLeaveBuyersClubDialog()}
            <sl-button
              style="position: fixed; bottom: 16px; right: 16px"
              variant="danger"
              @click=${() => {
                (
                  this.shadowRoot?.getElementById(
                    "leave-buyers-club-dialog"
                  ) as SlDialog
                ).show();
              }}
              >${msg("Leave Buyers Club")}</sl-button
            >
          </div>
        `;
    }
  }

  renderRequestedHouseholds(
    requestedHouseholds: ReadonlyMap<ActionHash, EntryRecord<Household>>
  ) {
    return html`
      <div
        class="column"
        style="flex: 1; gap: 16px; align-items: center; justify-content: center"
      >
        ${Array.from(requestedHouseholds.entries()).map(
          ([householdHash, household], i) => html`
            <sl-dialog
              id="cancel-join-request-${householdHash.toString()}"
              .label=${msg("Cancel join request")}
            >
              <span
                >${msg(
                  "Are you sure you want to cancel the join request to the household "
                )}${household.entry.name}?</span
              >
              <sl-button
                slot="footer"
                variant="danger"
                @click=${() =>
                  this.householdsStore.client.cancelJoinRequest(householdHash)}
                >${msg("Cancel join request")}</sl-button
              >
            </sl-dialog>
            <sl-card style="width: 400px;">
              <div class="column" style="flex: 1; gap: 16px">
                <span class="title">${msg("Waiting to get accepted...")}</span>
                <span
                  >${msg("You have requested to join this household:")}</span
                >
                <div
                  class="row"
                  style="gap: 8px; align-items: center; justify-content: center; padding: 16px"
                >
                  <show-image
                    style="height: 32px; width: 32px; border-radius: 10px"
                    .imageHash=${household.entry.avatar}
                  ></show-image>
                  <span>${household.entry.name}</span>
                </div>
                <span style="flex: 1"
                  >${msg(
                    "Waiting for a member of the household to accept you."
                  )}</span
                >
                <sl-button
                  variant="danger"
                  @click=${() =>
                    (
                      this.shadowRoot?.getElementById(
                        `cancel-join-request-${householdHash.toString()}`
                      ) as SlDialog
                    ).show()}
                  >${msg("Cancel Join Request")}</sl-button
                >
              </div>
            </sl-card>
          `
        )}
      </div>
    `;
  }

  creatingMembershipClaim = false;

  getHouseholdStatus(): AsyncResult<HouseholdRequestStatus> {
    const myHousehold = this.householdsStore.myHousehold.get();
    if (myHousehold.status !== "completed") return myHousehold;

    if (myHousehold.value !== undefined) {
      const householdHash = myHousehold.value.householdHash;

      const originalHousehold = myHousehold.value.original.get();
      if (originalHousehold.status !== "completed") return originalHousehold;
      if (
        originalHousehold.value.action.author.toString() ===
        this.householdsStore.client.client.myPubKey.toString()
      ) {
        return {
          status: "completed",
          value: {
            status: "HOUSEHOLD_MEMBER",
          },
        };
      }

      const myMembershipClaims =
        this.householdsStore.myHouseholdMembershipClaims.get();
      if (myMembershipClaims.status !== "completed") return myMembershipClaims;

      if (
        myMembershipClaims.value.find(
          (claim) =>
            claim.entry.household_hash.toString() === householdHash.toString()
        )
      ) {
        return {
          status: "completed",
          value: {
            status: "HOUSEHOLD_MEMBER",
          },
        };
      }

      const membersLinks = this.householdsStore.households
        .get(householdHash)
        .members.live.get();
      if (membersLinks.status !== "completed") return membersLinks;
      const myMembershipLink = membersLinks.value.find(
        (l) =>
          retype(l.target, HashType.AGENT).toString() ===
          this.householdsStore.client.client.myPubKey.toString()
      );
      if (myMembershipLink && !this.creatingMembershipClaim) {
        this.creatingMembershipClaim = true;
        tryAndRetry(
          () =>
            this.householdsStore.client.createHouseholdMembershipClaim({
              household_hash: householdHash,
              member_create_link_hash: myMembershipLink.create_link_hash,
            }),
          10,
          1000
        ).finally(() => {
          this.creatingMembershipClaim = false;
        });
      }

      const household = myHousehold.value.latestVersion.get();
      if (household.status !== "completed") return household;
      return {
        status: "completed",
        value: {
          status: "ACCEPTED_JOINING",
          household: household.value,
        },
      };
    } else {
      const requestedHouseholds =
        this.householdsStore.householdsIHaveRequestedToJoin.get();
      if (requestedHouseholds.status !== "completed")
        return requestedHouseholds;

      if (requestedHouseholds.value.size === 0)
        return {
          status: "completed",
          value: {
            status: "NOT_REQUESTED",
          },
        };

      const requestedHouseholdsLatestVersion = joinAsyncMap(
        mapValues(requestedHouseholds.value, (h) => h.latestVersion.get())
      );
      if (requestedHouseholdsLatestVersion.status !== "completed")
        return requestedHouseholdsLatestVersion;

      return {
        status: "completed",
        value: {
          status: "REQUESTED",
          requestedHouseholds: requestedHouseholdsLatestVersion.value,
        },
      };
    }
  }

  render() {
    if (this.creatingHousehold)
      return html`
        <overlay-page
          .title=${msg("Create Household")}
          @close-requested=${() => {
            this.creatingHousehold = false;
          }}
        >
          <div
            class="column"
            style="align-items: center; justify-content: center; flex: 1;"
          >
            <create-household
              style="width: 400px"
              @household-created=${() => {
                this.creatingHousehold = false;
              }}
            ></create-household>
          </div>
        </overlay-page>
      `;

    const householdsStatus = this.getHouseholdStatus();

    switch (householdsStatus.status) {
      case "pending":
        return html`<div
          class="row"
          style="flex: 1; height: 100%; align-items: center; justify-content: center;"
        >
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "error":
        return html`
          <div
            style="flex: 1; height: 100%; align-items: center; justify-content: center;"
          >
            <display-error
              .error=${householdsStatus.error}
              .headline=${msg("Error getting your household.")}
            >
            </display-error>
          </div>
        `;
      case "completed":
        if (householdsStatus.value.status === "HOUSEHOLD_MEMBER")
          return html`<slot></slot>`;
        if (householdsStatus.value.status === "ACCEPTED_JOINING")
          return html`
            <div
              class="row"
              style="flex: 1; flex-direction: column; height: 100%; align-items: center; justify-content: center; gap: 12px"
            >
              <sl-spinner style="font-size: 2rem"></sl-spinner>
              <span
                >${msg(
                  str`You were accepted into the household "${householdsStatus.value.household.entry.name}"! Joining...`
                )}</span
              >
            </div>
          `;
        if (householdsStatus.value.status === "NOT_REQUESTED")
          return this.renderPrompt();
        return this.renderRequestedHouseholds(
          householdsStatus.value.requestedHouseholds
        );
    }
  }

  static styles = [
    ...appStyles,
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
  ];
}
