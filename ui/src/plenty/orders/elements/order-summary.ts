import { LitElement, css, html } from "lit";
import { state, property, customElement } from "lit/decorators.js";
import { EntryHash, Record, ActionHash } from "@holochain/client";
import { EntryRecord } from "@holochain-open-dev/utils";
import { SignalWatcher } from "@holochain-open-dev/signals";
import { hashProperty } from "@holochain-open-dev/elements";
import { consume } from "@lit/context";

import { localized, msg } from "@lit/localize";

import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";

import { appStyles } from "../../../app-styles.js";
import { OrdersStore } from "../orders-store.js";
import { ordersStoreContext } from "../context.js";
import { Order, OrderStatus, renderStatus, statusMsg } from "../types.js";

/**
 * @element order-summary
 * @fires order-selected: detail will contain { orderHash }
 */
@localized()
@customElement("order-summary")
export class OrderSummary extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The hash of the Order to show
   */
  @property(hashProperty("order-hash"))
  orderHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: ordersStoreContext, subscribe: true })
  ordersStore!: OrdersStore;

  renderSummary(entryRecord: EntryRecord<Order>) {
    return html`
      <div class="column" style="gap: 16px; flex: 1">
        <span style="font-size: 3rem">${entryRecord.entry.name}</span>
        <span style="flex: 1"></span>

        <div style="align-self: end">
          ${renderStatus(entryRecord.entry.status)}
        </div>
      </div>
    `;
  }

  renderOrder() {
    const order = this.ordersStore.orders
      .get(this.orderHash)
      .latestVersion.get();

    switch (order.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the order")}
          .error=${order.error}
        ></display-error>`;
      case "completed":
        return this.renderSummary(order.value);
    }
  }

  render() {
    return html`<sl-card
      style="flex: 1; cursor: grab;"
      @click=${() =>
        this.dispatchEvent(
          new CustomEvent("order-selected", {
            composed: true,
            bubbles: true,
            detail: {
              orderHash: this.orderHash,
            },
          }),
        )}
    >
      ${this.renderOrder()}
    </sl-card>`;
  }

  static styles = [
    ...appStyles,
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
  ];
}
