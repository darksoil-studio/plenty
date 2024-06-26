import { hashProperty, sharedStyles } from "@holochain-open-dev/elements";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import { EntryRecord } from "@holochain-open-dev/utils";
import { ActionHash, EntryHash, Record } from "@holochain/client";
import { consume } from "@lit/context";
import { localized, msg } from "@lit/localize";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { SignalWatcher } from "@holochain-open-dev/signals";

import { householdsStoreContext } from "../context.js";
import { HouseholdsStore } from "../households-store.js";
import { Household } from "../types.js";

/**
 * @element household-summary
 * @fires household-selected: detail will contain { householdHash }
 */
@localized()
@customElement("household-summary")
export class HouseholdSummary extends SignalWatcher(LitElement) {
  // REQUIRED. The hash of the Household to show
  @property(hashProperty("household-hash"))
  householdHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  renderSummary(entryRecord: EntryRecord<Household>) {
    return html`
      <div class="column" style="gap: 16px;">
        <div class="column" style="gap: 8px">
          <span><strong>${msg("Name")}</strong></span>
          <span style="white-space: pre-line">${entryRecord.entry.name}</span>
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Avatar")}</strong></span>
          <span style="white-space: pre-line"
            ><show-image
              .imageHash=${entryRecord.entry.avatar}
              style="width: 300px; height: 200px"
            ></show-image
          ></span>
        </div>
      </div>
    `;
  }

  renderHousehold() {
    const latestVersion = this.householdsStore.households
      .get(this.householdHash)
      .latestVersion.get();

    switch (latestVersion.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the household")}
          .error=${latestVersion.error}
        ></display-error>`;
      case "completed":
        return this.renderSummary(latestVersion.value);
    }
  }

  render() {
    return html`<sl-card
      style="flex: 1; cursor: grab;"
      @click=${() =>
        this.dispatchEvent(
          new CustomEvent("household-selected", {
            composed: true,
            bubbles: true,
            detail: {
              householdHash: this.householdHash,
            },
          }),
        )}
    >
      ${this.renderHousehold()}
    </sl-card>`;
  }

  static styles = [sharedStyles];
}
