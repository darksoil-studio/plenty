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

import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";

import "@shoelace-style/shoelace/dist/components/button/button.js";
import { appStyles } from "../../../app-styles.js";
import { OrdersStore } from "../orders-store.js";
import { ordersStoreContext } from "../context.js";
import { ProducerDelivery } from "../types.js";

/**
 * @element edit-producer-delivery
 * @fires producer-delivery-updated: detail will contain { previousProducerDeliveryHash, updatedProducerDeliveryHash }
 */
@localized()
@customElement("edit-producer-delivery")
export class EditProducerDelivery extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The hash of the original `Create` action for this ProducerDelivery
   */
  @property(hashProperty("producer-delivery-hash"))
  producerDeliveryHash!: ActionHash;

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
      this.ordersStore.producerDeliveries.get(this.producerDeliveryHash)
        .latestVersion,
    );
    setTimeout(() => {
      (this.shadowRoot?.getElementById("form") as HTMLFormElement).reset();
    });
  }

  async updateProducerDelivery(
    currentRecord: EntryRecord<ProducerDelivery>,
    fields: Partial<ProducerDelivery>,
  ) {
    const producerDelivery: ProducerDelivery = {
      order_hash: currentRecord.entry.order_hash!,
      producer_hash: currentRecord.entry.producer_hash!,
      products: currentRecord.entry.products!,
    };

    try {
      this.committing = true;
      const updateRecord = await this.ordersStore.client.updateProducerDelivery(
        currentRecord.actionHash,
        producerDelivery,
      );

      this.dispatchEvent(
        new CustomEvent("producer-delivery-updated", {
          composed: true,
          bubbles: true,
          detail: {
            previousProducerDeliveryHash: currentRecord.actionHash,
            updatedProducerDeliveryHash: updateRecord.actionHash,
          },
        }),
      );
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error updating the producer delivery"));
    }

    this.committing = false;
  }

  renderEditForm(currentRecord: EntryRecord<ProducerDelivery>) {
    return html` <sl-card>
      <span slot="header">${msg("Edit Producer Delivery")}</span>

      <form
        id="form"
        class="column"
        style="flex: 1; gap: 16px;"
        ${onSubmit((fields) =>
          this.updateProducerDelivery(currentRecord, fields),
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
    const producerDelivery = this.ordersStore.producerDeliveries
      .get(this.producerDeliveryHash)
      .latestVersion.get();

    switch (producerDelivery.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the producer delivery")}
          .error=${producerDelivery.error}
        ></display-error>`;
      case "completed":
        return this.renderEditForm(producerDelivery.value);
    }
  }

  static styles = appStyles;
}
