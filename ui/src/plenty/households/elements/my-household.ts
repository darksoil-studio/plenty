import {
  hashProperty,
  notifyError,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import { EntryRecord } from "@holochain-open-dev/utils";
import { ActionHash, AgentPubKey, EntryHash, Record } from "@holochain/client";
import { consume } from "@lit/context";
import { localized, msg, str } from "@lit/localize";
import { mdiAlertCircleOutline, mdiDelete, mdiPencil } from "@mdi/js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
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

import { householdsStoreContext } from "../context.js";
import { HouseholdsStore } from "../households-store.js";
import { Household } from "../types.js";
import "./edit-household.js";
import { SlDialog } from "@shoelace-style/shoelace";
import {
  Profile,
  ProfilesStore,
  profilesStoreContext,
} from "@holochain-open-dev/profiles";

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
  _editing = false;

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
            str`Are you sure you want to accept the join request by ${profile.status === "completed" ? profile.value!.entry.nickname : ""}?`,
          )}</span
        >
        <sl-button
          slot="footer"
          @click=${() => {
            this.agentToAccept = undefined;
            (
              this.shadowRoot?.getElementById("accept-dialog") as SlDialog
            ).show();
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
              this.agentToAccept!,
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
            str`Are you sure you want to reject the join request by ${profile.status === "completed" ? profile.value!.entry.nickname : ""}?`,
          )}</span
        >
        <sl-button
          slot="footer"
          @click=${() => {
            this.agentToReject = undefined;
            (
              this.shadowRoot?.getElementById("reject-dialog") as SlDialog
            ).show();
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
              this.agentToReject!,
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

  renderDetail(
    entryRecord: EntryRecord<Household>,
    requestors: Array<AgentPubKey>,
    members: Array<AgentPubKey>,
  ) {
    return html`
      ${this.renderAcceptDialog(entryRecord.actionHash)}
      ${this.renderRejectDialog(entryRecord.actionHash)}
      <div class="column" style="gap: 32px; width: 600px;">
        <div class="column">
          <span class="title">${msg("Profile")}</span>
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
                  this._editing = true;
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
                    "These people have requested to join your household:",
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
                                    "reject-dialog",
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
                                    "accept-dialog",
                                  ) as SlDialog
                                ).show();
                              }}
                              >${msg("Accept")}</sl-button
                            >
                          </div>
                        </div>
                      </sl-card>
                    `,
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
                `,
              )}
            </div>
          </sl-card>
        </div>
      </div>
    `;
  }

  myHouseholdLatestVersion() {
    const myHousehold = this.householdsStore.myHousehold$.get();
    if (myHousehold.status !== "completed") return myHousehold;

    const requestors = myHousehold.value!.requestors.live$.get();
    const latestVersion = myHousehold.value!.latestVersion$.get();
    const members = myHousehold.value!.members.live$.get();

    if (requestors.status !== "completed") return requestors;
    if (latestVersion.status !== "completed") return latestVersion;
    if (members.status !== "completed") return members;

    return {
      status: "completed" as "completed",
      value: {
        requestors: requestors.value,
        latestVersion: latestVersion.value,
        members: members.value,
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
        if (this._editing) {
          return html`<edit-household
            .householdHash=${result.value.latestVersion.actionHash}
            @household-updated=${async () => {
              this._editing = false;
            }}
            @edit-canceled=${() => {
              this._editing = false;
            }}
            style="display: flex; flex: 1;"
          ></edit-household>`;
        }

        return this.renderDetail(
          result.value.latestVersion,
          result.value.requestors,
          result.value.members,
        );
    }
  }

  static styles = [sharedStyles];
}
