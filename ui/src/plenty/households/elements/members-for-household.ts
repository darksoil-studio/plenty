import {
  hashProperty,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
import { ActionHash, AgentPubKey, EntryHash, Record } from "@holochain/client";
import { consume } from "@lit/context";
import { localized, msg } from "@lit/localize";
import { mdiInformationOutline } from "@mdi/js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { SignalWatcher } from "@holochain-open-dev/signals";

import { householdsStoreContext } from "../context.js";
import { HouseholdsStore } from "../households-store.js";

/**
 * @element members-for-household
 */
@localized()
@customElement("members-for-household")
export class MembersForHousehold extends SignalWatcher(LitElement) {
  // REQUIRED. The HouseholdHash for which the Members should be fetched
  @property(hashProperty("household-hash"))
  householdHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  firstUpdated() {
    if (this.householdHash === undefined) {
      throw new Error(
        `The householdHash property is required for the members-for-household element`,
      );
    }
  }

  renderList(hashes: Array<AgentPubKey>) {
    if (hashes.length === 0)
      return html` <div class="column center-content" style="gap: 16px;">
        <sl-icon
          style="color: grey; height: 64px; width: 64px;"
          .src=${wrapPathInSvg(mdiInformationOutline)}
        ></sl-icon>
        <span class="placeholder"
          >${msg("No members found for this household")}</span
        >
      </div>`;

    return html`
      <div class="column" style="gap: 16px;">
        ${hashes.map(
          (hash) => html`<agent-avatar .agentPubKey=${hash}></agent-avatar>`,
        )}
      </div>
    `;
  }

  render() {
    const members = this.householdsStore.households
      .get(this.householdHash)
      .members.live.get();

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
        return this.renderList(members.value.map((l) => l.target));
    }
  }

  static styles = [sharedStyles];
}
