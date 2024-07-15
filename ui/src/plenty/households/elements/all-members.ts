import {
  SignalWatcher,
  joinAsync,
  joinAsyncMap,
} from "@holochain-open-dev/signals";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { consume } from "@lit/context";
import { EntryRecord, mapValues } from "@holochain-open-dev/utils";
import { ActionHash, AgentPubKey } from "@holochain/client";
import { msg } from "@lit/localize";

import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/divider/divider.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import "@holochain-open-dev/profiles/dist/elements/profile-list-item.js";
import "@darksoil-studio/roles/dist/elements/roles-for-agent.js";

import { Household } from "../types.js";
import { appStyles } from "../../../app-styles.js";
import { householdsStoreContext } from "../context.js";
import { HouseholdsStore } from "../households-store.js";
import { Routes } from "../../../router.js";

@customElement("all-members")
export class AllMembers extends SignalWatcher(LitElement) {
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  membersByHouseholds() {
    const activeHouseholds = this.householdsStore.activeHouseholds.get();
    if (activeHouseholds.status !== "completed") return activeHouseholds;
    return joinAsyncMap(
      mapValues(activeHouseholds.value, (h) =>
        joinAsync([h.latestVersion.get(), h.members.live.get()]),
      ),
    );
  }

  renderHousehold(
    householdHash: ActionHash,
    household: EntryRecord<Household>,
    members: Array<AgentPubKey>,
  ) {
    return html`
      <sl-card style="max-width: 300px">
        <span slot="image"
          ><show-image
            style="width: 100%; height: 200px"
            .imageHash=${household.entry.avatar}
          ></show-image
        ></span>
        <span slot="header">${household.entry.name}</span>
        <div class="column" style="flex: 1; gap: 16px">
          ${members.map(
            (member) =>
              html` <div class="row" style="align-items: center; gap: 12px">
                <profile-list-item .agentPubKey=${member}></profile-list-item>
                <span style="flex: 1"></span>

                <roles-for-agent .agent=${member}></roles-for-agent>
              </div>`,
          )}
        </div>
      </sl-card>
    `;
  }

  render() {
    const members = this.membersByHouseholds();

    switch (members.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the members")}
          .error=${members.error}
        ></display-error>`;
      case "completed":
        return html`
          <div class="row" style="flex-wrap: wrap; gap: 20px">
            ${Array.from(members.value.entries()).map(
              ([householdHash, [household, members]]) =>
                this.renderHousehold(
                  householdHash,
                  household,
                  members.map((m) => m.target),
                ),
            )}
          </div>
        `;
    }
  }

  static styles = appStyles;
}
