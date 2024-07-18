import {
  hashProperty,
  notifyError,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import "@holochain-open-dev/profiles/dist/elements/profile-detail.js";
import "@holochain-open-dev/profiles/dist/elements/edit-profile.js";
import { EntryRecord } from "@holochain-open-dev/utils";
import { ActionHash, AgentPubKey, EntryHash, Record } from "@holochain/client";
import { consume } from "@lit/context";
import { localized, msg, str } from "@lit/localize";
import { mdiAlertCircleOutline, mdiDelete, mdiPencil } from "@mdi/js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@holochain-open-dev/profiles/dist/elements/profile-list-item.js";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  AsyncResult,
  SignalWatcher,
  mapCompleted,
} from "@holochain-open-dev/signals";
import { SlDialog } from "@shoelace-style/shoelace";
import {
  Profile,
  ProfilesStore,
  profilesStoreContext,
} from "@holochain-open-dev/profiles";
import { core } from "@tauri-apps/api";

import { householdsStoreContext } from "../context.js";
import { HouseholdsStore } from "../households-store.js";
import { Household } from "../types.js";
import "./edit-household.js";
import "../../../overlay-page.js";
import { appStyles } from "../../../app-styles.js";
import { sleep } from "../../../utils.js";

/**
 * @element my-household
 */
@localized()
@customElement("my-household")
export class MyHousehold extends SignalWatcher(LitElement) {
  /**
   * @internal
   */
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  /**
   * @internal
   */
  @consume({ context: profilesStoreContext, subscribe: true })
  profilesStore!: ProfilesStore;

  /**
   * @internal
   */
  @state()
  _editingHousehold = false;

  /**
   * @internal
   */
  @state()
  _editingProfile = false;

  /**
   * @internal
   */
  @state()
  accepting = false;

  /**
   * @internal
   */
  @state()
  agentToAccept: AgentPubKey | undefined;

  renderAcceptDialog(householdHash: ActionHash) {
    let profile: AsyncResult<EntryRecord<Profile> | undefined> = {
      status: "pending",
    };
    if (this.agentToAccept)
      profile = this.profilesStore.profiles.get(this.agentToAccept).get();

    return html`
      <sl-dialog id="accept-dialog" .label=${msg("Accept join request")}>
        <span
          >${msg(
            str`Are you sure you want to accept the join request by ${
              profile.status === "completed"
                ? profile.value!.entry.nickname
                : ""
            }?`
          )}</span
        >
        <sl-button
          slot="footer"
          @click=${() => {
            this.agentToAccept = undefined;
            (
              this.shadowRoot?.getElementById("accept-dialog") as SlDialog
            ).hide();
          }}
          >${msg("Cancel")}</sl-button
        >
        <sl-button
          slot="footer"
          variant="primary"
          .loading=${this.accepting}
          @click=${async () => {
            this.accepting = true;
            await this.householdsStore.client.acceptJoinRequest(
              householdHash,
              this.agentToAccept!
            );
            this.accepting = false;
            this.agentToAccept = undefined;
            (
              this.shadowRoot?.getElementById("accept-dialog") as SlDialog
            ).hide();
          }}
          >${msg("Accept join request")}</sl-button
        >
      </sl-dialog>
    `;
  }

  /**
   * @internal
   */
  @state()
  rejecting = false;

  /**
   * @internal
   */
  @state()
  agentToReject: AgentPubKey | undefined;

  renderRejectDialog(householdHash: ActionHash) {
    let profile: AsyncResult<EntryRecord<Profile> | undefined> = {
      status: "pending",
    };
    if (this.agentToReject)
      profile = this.profilesStore.profiles.get(this.agentToReject).get();

    return html`
      <sl-dialog id="reject-dialog" .label=${msg("Reject join request")}>
        <span
          >${msg(
            str`Are you sure you want to reject the join request by ${
              profile.status === "completed"
                ? profile.value!.entry.nickname
                : ""
            }?`
          )}</span
        >
        <sl-button
          slot="footer"
          @click=${() => {
            this.agentToReject = undefined;
            (
              this.shadowRoot?.getElementById("reject-dialog") as SlDialog
            ).hide();
          }}
          >${msg("Cancel")}</sl-button
        >
        <sl-button
          slot="footer"
          variant="danger"
          .loading=${this.rejecting}
          @click=${async () => {
            this.rejecting = true;

            await this.householdsStore.client.rejectJoinRequest(
              householdHash,
              this.agentToReject!
            );
            this.rejecting = false;
            this.agentToReject = undefined;
            (
              this.shadowRoot?.getElementById("reject-dialog") as SlDialog
            ).hide();
          }}
          >${msg("Reject join request")}</sl-button
        >
      </sl-dialog>
    `;
  }

  /**
   * @internal
   */
  @state()
  leaving = false;

  renderLeaveDialog(householdHash: ActionHash) {
    return html`
      <sl-dialog id="leave-dialog" .label=${msg("Leave Your Household")}>
        <span>${msg("Are you sure you want to leave your household?")}</span>
        <sl-button
          slot="footer"
          @click=${() => {
            (
              this.shadowRoot?.getElementById("leave-dialog") as SlDialog
            ).hide();
          }}
          >${msg("Cancel")}</sl-button
        >
        <sl-button
          slot="footer"
          variant="danger"
          .loading=${this.leaving}
          @click=${async () => {
            if (this.leaving) return;
            this.leaving = true;

            try {
              await this.householdsStore.client.leaveHousehold(householdHash);
              this.leaving = false;
              (
                this.shadowRoot?.getElementById("leave-dialog") as SlDialog
              ).hide();
            } catch (e) {
              notifyError(msg("Error leaving your household."));
              console.error(e);
            }
          }}
          >${msg("Leave Household")}</sl-button
        >
      </sl-dialog>
    `;
  }

  /**
   * @internal
   */
  @state()
  leavingBuyersClub = false;

  renderLeaveBuyersClubDialog(householdHash: ActionHash) {
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
              await this.householdsStore.client.leaveHousehold(householdHash);
              // Wait for the leave household actions to get propagated
              // TODO: improve this so that it's guaranteed to be propagated
              await sleep(4000);

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

  renderDetail(
    householdHash: ActionHash,
    entryRecord: EntryRecord<Household>,
    requestors: Array<AgentPubKey>,
    members: Array<AgentPubKey>
  ) {
    return html`
      ${this.renderAcceptDialog(householdHash)}
      ${this.renderRejectDialog(householdHash)}
      ${this.renderLeaveDialog(householdHash)}
      ${this.renderLeaveBuyersClubDialog(householdHash)}
      <div class="column" style="gap: 32px; width: 600px;">
        <div class="column">
          <span class="title">${msg("Your Household's Profile")}</span>
          <sl-divider></sl-divider>
          <sl-card>
            <div class="row" style="gap: 16px; align-items: center; flex: 1">
              <show-image
                .imageHash=${entryRecord.entry.avatar}
                style="width: 64px; height: 64px"
              ></show-image>
              <span style="flex: 1; white-space: pre-line"
                >${entryRecord.entry.name}</span
              >

              <sl-icon-button
                .src=${wrapPathInSvg(mdiPencil)}
                @click=${() => {
                  this._editingHousehold = true;
                }}
              ></sl-icon-button>
            </div>
          </sl-card>
        </div>

        ${requestors.length > 0
          ? html`
              <div class="column">
                <span class="title"
                  >${msg("Requests To Join Your Household")}</span
                >
                <sl-divider></sl-divider>
                <span class="placeholder" style="margin-bottom: 16px"
                  >${msg(
                    "These people have requested to join your household:"
                  )}</span
                >

                <div class="row" style="flex-wrap: wrap; gap: 8px">
                  ${requestors.map(
                    (requestor) => html`
                      <sl-card>
                        <div class="column" style="gap: 16px; flex: 1">
                          <profile-list-item
                            .agentPubKey=${requestor}
                          ></profile-list-item>

                          <div class="row" style="gap: 8px">
                            <sl-button
                              variant="danger"
                              @click=${() => {
                                this.agentToReject = requestor;
                                (
                                  this.shadowRoot?.getElementById(
                                    "reject-dialog"
                                  ) as SlDialog
                                ).show();
                              }}
                              >${msg("Reject")}</sl-button
                            >
                            <sl-button
                              variant="primary"
                              @click=${() => {
                                this.agentToAccept = requestor;
                                (
                                  this.shadowRoot?.getElementById(
                                    "accept-dialog"
                                  ) as SlDialog
                                ).show();
                              }}
                              >${msg("Accept")}</sl-button
                            >
                          </div>
                        </div>
                      </sl-card>
                    `
                  )}
                </div>
              </div>
            `
          : html``}

        <div class="column">
          <span class="title">${msg("Members")}</span>
          <sl-divider></sl-divider>
          <sl-card>
            <div class="column" style="gap: 16px; flex: 1">
              ${members.map(
                (member) => html`
                  <profile-list-item .agentPubKey=${member}></profile-list-item>
                `
              )}
            </div>
          </sl-card>
        </div>
        <div class="column">
          <span class="title">${msg("Your Profile")}</span>
          <sl-divider></sl-divider>
          <sl-card>
            <profile-detail
              .agentPubKey=${this.householdsStore.client.client.myPubKey}
              style="flex: 1"
            >
              <sl-icon-button
                slot="action"
                .src=${wrapPathInSvg(mdiPencil)}
                @click=${() => {
                  this._editingProfile = true;
                }}
              ></sl-icon-button>
            </profile-detail>
          </sl-card>
        </div>
        <div class="column" style="gap: 8px">
          <span class="title">${msg("Danger Zone")}</span>
          <sl-divider></sl-divider>
          <span>${msg("Be careful! These actions cannot be reversed.")}</span>
          <div class="row" style="justify-content: end; gap: 12px">
            <sl-button
              variant="danger"
              @click=${() => {
                (
                  this.shadowRoot?.getElementById("leave-dialog") as SlDialog
                ).show();
              }}
              >${msg("Leave Household")}</sl-button
            >
            <sl-button
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
        </div>
      </div>
    `;
  }

  myHouseholdLatestVersion() {
    const myHousehold = this.householdsStore.myHousehold.get();
    if (myHousehold.status !== "completed") return myHousehold;
    if (!myHousehold.value)
      return {
        status: "error" as const,
        error: msg("You are not part of any household yet"),
      };

    const requestors = myHousehold.value!.requestors.live.get();
    const latestVersion = myHousehold.value!.latestVersion.get();
    const members = myHousehold.value!.members.live.get();
    const myProfile = this.profilesStore.myProfile.get();

    if (requestors.status !== "completed") return requestors;
    if (latestVersion.status !== "completed") return latestVersion;
    if (members.status !== "completed") return members;
    if (myProfile.status !== "completed") return myProfile;

    return {
      status: "completed" as "completed",
      value: {
        myProfile: myProfile.value,
        householdHash: myHousehold.value!.householdHash,
        requestors: requestors.value,
        latestVersion: latestVersion.value,
        members: members.value.map((l) => l.target),
      },
    };
  }

  render() {
    const result = this.myHouseholdLatestVersion();

    switch (result.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the household")}
          .error=${result.error}
        ></display-error>`;
      case "completed":
        if (this._editingHousehold) {
          return html`
            <overlay-page
              @close-requested=${() => {
                this._editingHousehold = false;
              }}
              .title=${msg("Edit Household")}
            >
              <edit-household
                .householdHash=${result.value.latestVersion.actionHash}
                @household-updated=${async () => {
                  this._editingHousehold = false;
                }}
                style="width: 400px"
              ></edit-household>
            </overlay-page>
          `;
        }
        if (this._editingProfile) {
          return html`
            <overlay-page
              @close-requested=${() => {
                this._editingProfile = false;
              }}
              .title=${msg("Edit Profile")}
            >
              <sl-card style="width: 400px">
                <div class="column" style="gap: 16px; flex: 1">
                  <span class="title">${msg("Edit Your Profile")}</span>
                  <edit-profile
                    style="flex: 1"
                    .profile=${result.value.myProfile}
                    @save-profile=${async (e: CustomEvent) => {
                      try {
                        await this.profilesStore.client.updateProfile(
                          e.detail.profile
                        );
                        this._editingProfile = false;
                      } catch (e) {
                        notifyError(msg("Error updating your profile"));
                        console.error(e);
                      }
                    }}
                  ></edit-profile>
                </div>
              </sl-card>
            </overlay-page>
          `;
        }

        return this.renderDetail(
          result.value.householdHash,
          result.value.latestVersion,
          result.value.requestors,
          result.value.members
        );
    }
  }

  static styles = [...appStyles];
}
