import {
  hashProperty,
  hashState,
  notifyError,
  onSubmit,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import "@holochain-open-dev/file-storage/dist/elements/upload-files.js";
import { EntryRecord } from "@holochain-open-dev/utils";
import { ActionHash, AgentPubKey, EntryHash, Record } from "@holochain/client";
import { consume } from "@lit/context";
import { localized, msg } from "@lit/localize";
import { mdiAlertCircleOutline, mdiDelete } from "@mdi/js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import { householdsStoreContext } from "../context.js";
import { HouseholdsStore } from "../households-store.js";
import { Household } from "../types.js";
import { SignalWatcher } from "@holochain-open-dev/signals";

/**
 * @element edit-household
 * @fires household-updated: detail will contain { originalHouseholdHash, previousHouseholdHash, updatedHouseholdHash }
 */
@localized()
@customElement("edit-household")
export class EditHousehold extends SignalWatcher(LitElement) {
  // REQUIRED. The hash of the original `Create` action for this Household
  @property(hashProperty("original-household-hash"))
  originalHouseholdHash!: ActionHash;

  // REQUIRED. The current Household record that should be updated
  @property()
  currentRecord!: EntryRecord<Household>;

  /**
   * @internal
   */
  @consume({ context: householdsStoreContext })
  householdsStore!: HouseholdsStore;

  /**
   * @internal
   */
  @state()
  committing = false;

  firstUpdated() {
    this.shadowRoot?.querySelector("form")!.reset();
  }

  async updateHousehold(fields: any) {
    const household: Household = {
      name: fields.name,
      avatar: fields.avatar,
    };

    try {
      this.committing = true;
      const updateRecord = await this.householdsStore.client.updateHousehold(
        this.originalHouseholdHash,
        this.currentRecord.actionHash,
        household,
      );

      this.dispatchEvent(
        new CustomEvent("household-updated", {
          composed: true,
          bubbles: true,
          detail: {
            originalHouseholdHash: this.originalHouseholdHash,
            previousHouseholdHash: this.currentRecord.actionHash,
            updatedHouseholdHash: updateRecord.actionHash,
          },
        }),
      );
    } catch (e: any) {
      console.error(e);
      notifyError(msg("Error updating the household"));
    }

    this.committing = false;
  }

  render() {
    return html` <sl-card>
      <span slot="header">${msg("Edit Household")}</span>

      <form
        class="column"
        style="flex: 1; gap: 16px;"
        ${onSubmit((fields) => this.updateHousehold(fields))}
      >
        <div>
          <sl-input
            name="name"
            .label=${msg("Name")}
            required
            .defaultValue=${this.currentRecord.entry.name}
          ></sl-input>
        </div>

        <div>
          <upload-files
            name="avatar"
            one-file
            accepted-files="image/jpeg,image/png,image/gif"
            required
            .defaultValue=${this.currentRecord.entry.avatar}
          ></upload-files>
        </div>

        <div class="row" style="gap: 8px;">
          <sl-button
            @click=${() =>
              this.dispatchEvent(
                new CustomEvent("edit-canceled", {
                  bubbles: true,
                  composed: true,
                }),
              )}
            style="flex: 1;"
            >${msg("Cancel")}</sl-button
          >
          <sl-button
            type="submit"
            variant="primary"
            style="flex: 1;"
            .loading=${this.committing}
            >${msg("Save")}</sl-button
          >
        </div>
      </form>
    </sl-card>`;
  }

  static styles = [sharedStyles];
}
