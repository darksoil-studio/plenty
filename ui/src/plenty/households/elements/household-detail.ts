import {
  hashProperty,
  notifyError,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import { EntryRecord } from "@holochain-open-dev/utils";
import { ActionHash, EntryHash, Record } from "@holochain/client";
import { consume } from "@lit/context";
import { localized, msg } from "@lit/localize";
import { mdiAlertCircleOutline, mdiDelete, mdiPencil } from "@mdi/js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { householdsStoreContext } from "../context.js";
import { HouseholdsStore } from "../households-store.js";
import { Household } from "../types.js";
import "./edit-household.js";
import { SignalWatcher } from "@holochain-open-dev/signals";

/**
 * @element household-detail
 * @fires household-deleted: detail will contain { householdHash }
 */
@localized()
@customElement("household-detail")
export class HouseholdDetail extends SignalWatcher(LitElement) {
  // REQUIRED. The hash of the Household to show
  @property(hashProperty("household-hash"))
  householdHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  /**
   * @internal
   */
  @state()
  _editing = false;

  async deleteHousehold() {
    try {
      await this.householdsStore.client.deleteHousehold(this.householdHash);

      this.dispatchEvent(
        new CustomEvent("household-deleted", {
          bubbles: true,
          composed: true,
          detail: {
            householdHash: this.householdHash,
          },
        }),
      );
    } catch (e: any) {
      console.error(e);
      notifyError(msg("Error deleting the household"));
    }
  }

  renderDetail(entryRecord: EntryRecord<Household>) {
    return html`
      <sl-card>
        <div slot="header" class="row" style="gap: 8px">
          <span style="font-size: 18px; flex: 1;">${msg("Household")}</span>

          <sl-icon-button
            .src=${wrapPathInSvg(mdiPencil)}
            @click=${() => {
              this._editing = true;
            }}
          ></sl-icon-button>
          <sl-icon-button
            .src=${wrapPathInSvg(mdiDelete)}
            @click=${() => this.deleteHousehold()}
          ></sl-icon-button>
        </div>

        <div class="column" style="gap: 16px;">
          <div class="column" style="gap: 8px;">
            <span><strong>${msg("Name")}</strong></span>
            <span style="white-space: pre-line">${entryRecord.entry.name}</span>
          </div>

          <div class="column" style="gap: 8px;">
            <span><strong>${msg("Avatar")}</strong></span>
            <span style="white-space: pre-line"
              ><show-image
                .imageHash=${entryRecord.entry.avatar}
                style="width: 300px; height: 200px"
              ></show-image
            ></span>
          </div>
        </div>
      </sl-card>
    `;
  }

  render() {
    const household = this.householdsStore.households
      .get(this.householdHash)
      .latestVersion.get();

    switch (household.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the household")}
          .error=${household.error}
        ></display-error>`;
      case "completed":
        if (this._editing) {
          return html`<edit-household
            .householdHash=${this.householdHash}
            @household-updated=${async () => {
              this._editing = false;
            }}
            @edit-canceled=${() => {
              this._editing = false;
            }}
            style="display: flex; flex: 1;"
          ></edit-household>`;
        }

        return this.renderDetail(household.value);
    }
  }

  static styles = [sharedStyles];
}
