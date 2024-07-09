import { LitElement, html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { state, property, query, customElement } from "lit/decorators.js";
import {
  ActionHash,
  Record,
  DnaHash,
  AgentPubKey,
  EntryHash,
} from "@holochain/client";
import { EntryRecord } from "@holochain-open-dev/utils";
import { SignalWatcher } from "@holochain-open-dev/signals";
import {
  hashProperty,
  notifyError,
  hashState,
  onSubmit,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { consume } from "@lit/context";
import { localized, msg } from "@lit/localize";
import { mdiAlertCircleOutline, mdiDelete } from "@mdi/js";

import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";

import { appStyles } from "../../../app-styles.js";
import { OrdersStore } from "../orders-store.js";
import { ordersStoreContext } from "../context.js";
import { Order, OrderStatus } from "../types.js";

/**
 * @element create-order
 * @fires order-created: detail will contain { orderHash }
 */
@localized()
@customElement("create-order")
export class CreateOrder extends SignalWatcher(LitElement) {
  /**
   * @internal
   */
  @consume({ context: ordersStoreContext, subscribe: true })
  ordersStore!: OrdersStore;

  /**
   * @internal
   */
  @state()
  committing = false;

  /**
   * @internal
   */
  @query("#create-form")
  form!: HTMLFormElement;

  async createOrder(fields: Partial<Order>) {
    const order: Order = {
      name: fields.name!,
      status: {
        type: "Preparing",
      },
    };

    try {
      this.committing = true;
      const record: EntryRecord<Order> =
        await this.ordersStore.client.createOrder(order);

      this.dispatchEvent(
        new CustomEvent("order-created", {
          composed: true,
          bubbles: true,
          detail: {
            orderHash: record.actionHash,
          },
        }),
      );

      this.form.reset();
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error creating the order"));
    }
    this.committing = false;
  }

  render() {
    return html` <sl-card style="flex: 1;">
      <span slot="header">${msg("Create Order")}</span>

      <form
        id="create-form"
        class="column"
        style="flex: 1; gap: 16px;"
        ${onSubmit((fields) => this.createOrder(fields))}
      >
        <sl-input name="name" .label=${msg("Name")} required></sl-input>

        <sl-button variant="primary" type="submit" .loading=${this.committing}
          >${msg("Create Order")}</sl-button
        >
      </form>
    </sl-card>`;
  }

  static styles = appStyles;
}
