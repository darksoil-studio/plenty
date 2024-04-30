import {
  hashProperty,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
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
import "./household-summary.js";

/**
 * @element households-for-member
 */
@localized()
@customElement("households-for-member")
export class HouseholdsForMember extends SignalWatcher(LitElement) {
  // REQUIRED. The Member for which the Households should be fetched
  @property(hashProperty("member"))
  member!: AgentPubKey;

  /**
   * @internal
   */
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  firstUpdated() {
    if (this.member === undefined) {
      throw new Error(
        `The member property is required for the households-for-member element`,
      );
    }
  }

  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0)
      return html` <div class="column center-content" style="gap: 16px;">
        <sl-icon
          style="color: grey; height: 64px; width: 64px;"
          .src=${wrapPathInSvg(mdiInformationOutline)}
        ></sl-icon>
        <span class="placeholder"
          >${msg("No households found for this member")}</span
        >
      </div>`;

    return html`
      <div class="column" style="gap: 16px;">
        ${hashes.map(
          (hash) =>
            html`<household-summary
              .householdHash=${hash}
            ></household-summary>`,
        )}
      </div>
    `;
  }

  render() {
    const householdsForMember = this.householdsStore.householdsForMember
      .get(this.member)
      .get();

    switch (householdsForMember.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the members")}
          .error=${householdsForMember.error}
        ></display-error>`;
      case "completed":
        return this.renderList(Array.from(householdsForMember.value.keys()));
    }
  }

  static styles = [sharedStyles];
}
