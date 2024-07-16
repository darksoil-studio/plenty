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
import { ref } from "lit/directives/ref.js";

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
  householdHash!: ActionHash;

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

  async updateHousehold(currentRecord: EntryRecord<Household>, fields: any) {
    const household: Household = {
      name: fields.name,
      avatar: fields.avatar,
    };

    try {
      this.committing = true;
      const updateRecord = await this.householdsStore.client.updateHousehold(
        this.householdHash,
        currentRecord.actionHash,
        household,
      );

      this.dispatchEvent(
        new CustomEvent("household-updated", {
          composed: true,
          bubbles: true,
          detail: {
            originalHouseholdHash: this.householdHash,
            previousHouseholdHash: currentRecord.actionHash,
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

  renderEditForm(currentRecord: EntryRecord<Household>) {
    return html` <sl-card>
      <form
        class="column"
        style="flex: 1; gap: 16px;"
        ${ref((form) => setTimeout(() => (form as HTMLFormElement)?.reset()))}
        ${onSubmit((fields) => this.updateHousehold(currentRecord, fields))}
      >
        <span class="title" style="margin-bottom: 8px"
          >${msg("Edit Household")}</span
        >
        <sl-input
          name="name"
          .label=${msg("Name")}
          required
          .defaultValue=${currentRecord.entry.name}
        ></sl-input>

        <upload-files
          name="avatar"
          one-file
          accepted-files="image/jpeg,image/png,image/gif"
          required
          .defaultValue=${currentRecord.entry.avatar}
        ></upload-files>

        <sl-button
          type="submit"
          variant="primary"
          style="flex: 1;"
          .loading=${this.committing}
          >${msg("Save")}</sl-button
        >
      </form>
    </sl-card>`;
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
        return this.renderEditForm(household.value);
    }
  }

  static styles = [sharedStyles];
}
