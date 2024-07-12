import { LitElement, css, html } from "lit";
import { state, property, customElement } from "lit/decorators.js";
import {
  EntryHash,
  ActionHash,
  encodeHashToBase64,
  ActionHashB64,
} from "@holochain/client";
import { EntryRecord, HoloHashMap, mapValues } from "@holochain-open-dev/utils";
import {
  SignalWatcher,
  joinAsyncMap,
  uniquify,
} from "@holochain-open-dev/signals";
import {
  hashProperty,
  wrapPathInSvg,
  notifyError,
} from "@holochain-open-dev/elements";
import { consume } from "@lit/context";
import { localized, msg, str } from "@lit/localize";
import {
  mdiAlertCircleOutline,
  mdiPencil,
  mdiDelete,
  mdiInformationOutline,
} from "@mdi/js";

import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/tag/tag.js";

import "@holochain-open-dev/elements/dist/elements/display-error.js";

import { appStyles } from "../../../app-styles.js";
import "./edit-order.js";
import "./available-products-for-order.js";
import "./my-household-order.js";

import { OrdersStore } from "../orders-store.js";
import { ordersStoreContext } from "../context.js";
import {
  AvailableProducts,
  Order,
  OrderStatus,
  renderStatus,
} from "../types.js";
import { producersStoreContext } from "../../producers/context.js";
import { ProducersStore } from "../../producers/producers-store.js";
import { Producer } from "../../producers/types.js";

/**
 * @element order-detail
 * @fires order-deleted: detail will contain { orderHash }
 */
@localized()
@customElement("order-detail")
export class OrderDetail extends SignalWatcher(LitElement) {
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

  /**
   * @internal
   */
  @consume({ context: producersStoreContext, subscribe: true })
  producersStore!: ProducersStore;

  /**
   * @internal
   */
  @state()
  _editing = false;

  async deleteOrder() {
    try {
      await this.ordersStore.client.deleteOrder(this.orderHash);

      this.dispatchEvent(
        new CustomEvent("order-deleted", {
          bubbles: true,
          composed: true,
          detail: {
            orderHash: this.orderHash,
          },
        })
      );
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error deleting the order"));
    }
  }

  async openOrder(order: EntryRecord<Order>, available_products: ActionHash[]) {
    try {
      await this.ordersStore.client.updateOrder(
        this.orderHash,
        order.actionHash,
        {
          name: order.entry.name,
          status: {
            type: "Open",
            available_products,
            deadline: Date.now(), // TODO
          },
        }
      );

      this.dispatchEvent(
        new CustomEvent("order-opened", {
          bubbles: true,
          composed: true,
          detail: {
            orderHash: this.orderHash,
          },
        })
      );
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error opening the order"));
    }
  }

  canOrderBeOpened() {
    const producers = this.producersStore.allProducers.get();
    const availableProducts = this.ordersStore.orders
      .get(this.orderHash)
      .availableProducts.live.get();
    if (producers.status !== "completed") return producers;

    const producersLatestVersion = joinAsyncMap(
      mapValues(producers.value, (p) => p.latestVersion.get())
    );
    if (availableProducts.status !== "completed") return availableProducts;
    const availableProductsLatestVersion = joinAsyncMap(
      mapValues(availableProducts.value, (p) => p.latestVersion.get())
    );
    if (availableProductsLatestVersion.status !== "completed")
      return availableProductsLatestVersion;
    if (producersLatestVersion.status !== "completed")
      return producersLatestVersion;

    const producersForWhichAvailabilityWasSet = uniquify(
      Array.from(availableProductsLatestVersion.value.values()).map(
        (ap) => ap.entry.original_producer_hash
      )
    ).map(encodeHashToBase64);

    const canOrderBeOpen = Array.from(producers.value.keys()).every(
      (producerHash) =>
        producersForWhichAvailabilityWasSet.includes(
          encodeHashToBase64(producerHash)
        )
    );
    const availableProductsByProducer: Record<
      ActionHashB64,
      Array<ActionHash>
    > = {};

    for (const availableProducts of Array.from(
      availableProductsLatestVersion.value.values()
    )) {
      if (availableProducts.entry.producer_availability.type === "Available") {
        availableProductsByProducer[
          encodeHashToBase64(availableProducts.entry.original_producer_hash)
        ] = availableProducts.entry.producer_availability.available_products;
      }
    }

    return {
      status: "completed" as const,
      value: {
        canOrderBeOpen,
        availableProducts: Array.from(
          availableProductsLatestVersion.value.keys()
        ),
      },
    };
  }

  renderOpenOrderButton(order: EntryRecord<Order>) {
    const orderBeOpen = this.canOrderBeOpened();
    if (orderBeOpen.status !== "completed" || !orderBeOpen.value.canOrderBeOpen)
      return html``;
    return html`
      <sl-button
        @click=${() =>
          this.openOrder(order, orderBeOpen.value.availableProducts)}
        >${msg("Open Order")}</sl-button
      >
    `;
  }

  renderPreparing(order: EntryRecord<Order>) {
    return html`
      <div class="column" style="align-items: center">
        <div class="column" style="gap: 16px; width: 1000px;">
          <div class="row">
            <span class="title">${order.entry.name}</span>
            <span style="flex: 1"></span>
            <div class="column" style="gap: 12px">
              ${renderStatus(order.entry.status)}
              ${this.renderOpenOrderButton(order)}
            </div>
          </div>
          <div class="column" style="flex: 1; align-items: center">
            <div class="column" style="width: 700px; gap: 16px; ">
              <available-products-for-order
                style="flex: 1"
                .orderHash=${this.orderHash}
              ></available-products-for-order>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderDetail(entryRecord: EntryRecord<Order>) {
    switch (entryRecord.entry.status.type) {
      case "Preparing":
        return this.renderPreparing(entryRecord);
      case "Open":
        return html`
          <my-household-order
            .orderHash=${this.orderHash}
            style="flex: 1"
          ></my-household-order>
        `;
      case "Closed":
      case "Processed":
      case "Finished":
    }
    return html`
      <sl-card>
        <div slot="header" class="row" style="gap: 8px">
          <span style="font-size: 18px; flex: 1;">${msg("Order")}</span>

          <sl-icon-button
            .src=${wrapPathInSvg(mdiPencil)}
            @click=${() => {
              this._editing = true;
            }}
          ></sl-icon-button>
          <sl-icon-button
            .src=${wrapPathInSvg(mdiDelete)}
            @click=${() => this.deleteOrder()}
          ></sl-icon-button>
        </div>

        <div class="column" style="gap: 16px;">
          <div class="column" style="gap: 8px;">
            <span><strong>${msg("Name")}</strong></span>
            <span style="white-space: pre-line">${entryRecord.entry.name}</span>
          </div>
        </div>
      </sl-card>
    `;
  }

  render() {
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
        if (this._editing) {
          return html`<edit-order
            .orderHash=${this.orderHash}
            @order-updated=${async () => {
              this._editing = false;
            }}
            @edit-canceled=${() => {
              this._editing = false;
            }}
            style="display: flex; flex: 1;"
          ></edit-order>`;
        }

        return this.renderDetail(order.value);
    }
  }

  static styles = [
    ...appStyles,
    css`
      :host {
        display: flex;
      }
    `,
  ];
}
