import { LitElement, html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { state, customElement, property } from "lit/decorators.js";
import { ActionHash, Record, EntryHash, AgentPubKey } from "@holochain/client";
import { EntryRecord } from "@holochain-open-dev/utils";
import {
  hashState,
  notifyError,
  hashProperty,
  wrapPathInSvg,
  onSubmit,
} from "@holochain-open-dev/elements";
import { SignalWatcher, toPromise } from "@holochain-open-dev/signals";
import { consume } from "@lit/context";
import { localized, msg } from "@lit/localize";
import { mdiAlertCircleOutline, mdiDelete } from "@mdi/js";

import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";

import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import { appStyles } from "../../../app-styles.js";
import { OrdersStore } from "../orders-store.js";
import { ordersStoreContext } from "../context.js";
import { HouseholdOrder } from "../types.js";

/**
 * @element edit-household-order
 * @fires household-order-updated: detail will contain { originalHouseholdOrderHash, previousHouseholdOrderHash, updatedHouseholdOrderHash }
 */
@localized()
@customElement("edit-household-order")
export class EditHouseholdOrder extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The hash of the original `Create` action for this HouseholdOrder
   */
  @property(hashProperty("household-order-hash"))
  householdOrderHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: ordersStoreContext })
  ordersStore!: OrdersStore;

  /**
   * @internal
   */
  @state()
  committing = false;

  async firstUpdated() {
    const currentRecord = await toPromise(
      this.ordersStore.householdOrders.get(this.householdOrderHash)
        .latestVersion,
    );
    setTimeout(() => {
      (this.shadowRoot?.getElementById("form") as HTMLFormElement).reset();
    });
  }

  async updateHouseholdOrder(
    currentRecord: EntryRecord<HouseholdOrder>,
    fields: Partial<HouseholdOrder>,
  ) {
    const householdOrder: HouseholdOrder = {
      order_hash: currentRecord.entry.order_hash!,
      household_hash: currentRecord.entry.household_hash!,
      products: currentRecord.entry.products!,
    };

    try {
      this.committing = true;
      const updateRecord = await this.ordersStore.client.updateHouseholdOrder(
        this.householdOrderHash,
        currentRecord.actionHash,
        householdOrder,
      );

      this.dispatchEvent(
        new CustomEvent("household-order-updated", {
          composed: true,
          bubbles: true,
          detail: {
            originalHouseholdOrderHash: this.householdOrderHash,
            previousHouseholdOrderHash: currentRecord.actionHash,
            updatedHouseholdOrderHash: updateRecord.actionHash,
          },
        }),
      );
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error updating the household order"));
    }

    this.committing = false;
  }

  renderEditForm(currentRecord: EntryRecord<HouseholdOrder>) {
    return html` <sl-card>
      <span slot="header">${msg("Edit Household Order")}</span>

      <form
        id="form"
        class="column"
        style="flex: 1; gap: 16px;"
        ${onSubmit((fields) =>
          this.updateHouseholdOrder(currentRecord, fields),
        )}
      >
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

  render() {
    const householdOrder = this.ordersStore.householdOrders
      .get(this.householdOrderHash)
      .latestVersion.get();

    switch (householdOrder.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the household order")}
          .error=${householdOrder.error}
        ></display-error>`;
      case "completed":
        return this.renderEditForm(householdOrder.value);
    }
  }

  static styles = appStyles;
}
