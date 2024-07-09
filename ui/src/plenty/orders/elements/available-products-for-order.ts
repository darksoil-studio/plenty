import { LitElement, html } from "lit";
import { state, customElement, property } from "lit/decorators.js";
import {
  Record,
  EntryHash,
  ActionHash,
  AgentPubKey,
  encodeHashToBase64,
} from "@holochain/client";
import {
  AsyncComputed,
  AsyncResult,
  SignalWatcher,
  joinAsyncMap,
} from "@holochain-open-dev/signals";
import { EntryRecord, mapValues, slice } from "@holochain-open-dev/utils";
import { hashProperty, wrapPathInSvg } from "@holochain-open-dev/elements";
import { consume } from "@lit/context";
import { localized, msg, str } from "@lit/localize";
import { mdiInformationOutline } from "@mdi/js";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";

import { appStyles } from "../../../app-styles.js";
import { OrdersStore } from "../orders-store.js";
import { ordersStoreContext } from "../context.js";
import { AvailableProducts } from "../types.js";

import "./available-products-summary.js";
import { Producer } from "../../producers/types.js";
import { ProducersStore } from "../../producers/producers-store.js";
import { producersStoreContext } from "../../producers/context.js";
import { RolesStore, rolesStoreContext } from "@darksoil-studio/roles";
import { orderManagerRoleConfig } from "../../../roles.js";

/**
 * @element available-products-for-order
 */
@localized()
@customElement("available-products-for-order")
export class AvailableProductsForOrder extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The OrderHash for which the AvailableProducts should be fetched
   */
  @property(hashProperty("order-hash"))
  orderHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: rolesStoreContext, subscribe: true })
  rolesStore!: RolesStore;

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

  availableProductsByProducer() {
    const producers = this.producersStore.allProducers.get();
    const availableProducts = this.ordersStore.orders
      .get(this.orderHash)
      .availableProducts.live.get();
    if (producers.status !== "completed") return producers;

    const producersLatestVersion = joinAsyncMap(
      mapValues(producers.value, (p) => p.latestVersion.get()),
    );
    if (availableProducts.status !== "completed") return availableProducts;
    const availableProductsLatestVersion = joinAsyncMap(
      mapValues(availableProducts.value, (p) => p.latestVersion.get()),
    );
    if (producersLatestVersion.status !== "completed")
      return producersLatestVersion;
    if (availableProductsLatestVersion.status !== "completed")
      return availableProductsLatestVersion;

    return {
      status: "completed" as const,
      value: {
        allProducers: producersLatestVersion.value,
        availableProducts: availableProductsLatestVersion.value,
      },
    };
  }

  renderProducerAvailabilityStatus(
    availableProducts: Array<[ActionHash, EntryRecord<AvailableProducts>]>,
  ) {
    if (availableProducts.length === 0)
      return html`<sl-tag variant="warning"
        >${msg("Pending Availability")}</sl-tag
      >`;
    if (availableProducts.length > 1)
      return html`<sl-tag variant="danger">${msg("Conflict!")}</sl-tag>`;

    const producerAvailability =
      availableProducts[0][1].entry.producer_availability;

    if (producerAvailability.type === "Unavailable")
      return html`<sl-tag variant="danger">${msg("Unavailable")}</sl-tag>`;

    if (producerAvailability.available_products.length === 1)
      return html`<sl-tag variant="success"
        >${msg(str`1 product available`)}</sl-tag
      >`;
    return html`<sl-tag variant="success"
      >${msg(
        str`${producerAvailability.available_products.length} products available`,
      )}</sl-tag
    >`;
  }

  canIEdit(
    producerHash: ActionHash,
    producer: EntryRecord<Producer>,
  ): AsyncResult<boolean> {
    if (
      encodeHashToBase64(this.ordersStore.client.client.myPubKey) ===
      encodeHashToBase64(producer.entry.liason)
    )
      return {
        status: "completed",
        value: true,
      };
    const myRoles = this.rolesStore.myRoles.get();
    if (myRoles.status !== "completed") return myRoles;

    const orderManager = myRoles.value.includes(orderManagerRoleConfig.role);
    return {
      status: "completed",
      value: orderManager,
    };
  }

  renderProducerAvailability(
    producerHash: ActionHash,
    producer: EntryRecord<Producer>,
    availableProducts: Array<[ActionHash, EntryRecord<AvailableProducts>]>,
  ) {
    const canIEdit = this.canIEdit(producerHash, producer);
    return html`
      <div class="row" style="align-items: center; gap: 12px">
        <span>${producer.entry.name}</span>
        <span style="flex: 1"></span>
        <span class="placeholder">${msg("Liason:")}</span>
        <agent-avatar .agentPubKey=${producer.entry.liason}></agent-avatar>
        ${this.renderProducerAvailabilityStatus(availableProducts)}
        ${canIEdit.status === "completed" && canIEdit.value
          ? availableProducts.length > 0
            ? html`<sl-button
                @click=${() =>
                  this.dispatchEvent(
                    new CustomEvent("edit-available-products-requested", {
                      bubbles: true,
                      composed: true,
                      detail: {
                        orderHash: this.orderHash,
                        producerHash,
                        availableProductsHash: availableProducts[0][0],
                      },
                    }),
                  )}
                >${msg("Edit Available Products")}</sl-button
              >`
            : html`<sl-button
                @click=${() =>
                  this.dispatchEvent(
                    new CustomEvent("set-available-products-requested", {
                      bubbles: true,
                      composed: true,
                      detail: {
                        orderHash: this.orderHash,
                        producerHash,
                      },
                    }),
                  )}
                >${msg("Set Available Products")}</sl-button
              >`
          : html``}
      </div>
    `;
  }

  renderAvailableProducersList(
    title: string,
    producers: Array<[ActionHash, EntryRecord<Producer>]>,
    availableProducts: ReadonlyMap<ActionHash, EntryRecord<AvailableProducts>>,
  ) {
    return html` <div class="column" style="gap: 12px">
      <span class="title">${title}</span>
      <sl-card>
        <div class="column" style="gap: 12px; flex: 1">
          ${producers.map(
            ([producerHash, producer], i) => html`
              ${this.renderProducerAvailability(
                producerHash,
                producer,
                Array.from(availableProducts.entries()).filter(
                  ([_, availableProducts]) =>
                    encodeHashToBase64(
                      availableProducts.entry.original_producer_hash,
                    ) == encodeHashToBase64(producerHash),
                ),
              )}${i < producers.length - 1
                ? html`<sl-divider style="--spacing: 0"></sl-divider>`
                : html``}
            `,
          )}
        </div>
      </sl-card>
    </div>`;
  }

  render() {
    const availableProducers = this.availableProductsByProducer();

    switch (availableProducers.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the available products")}
          .error=${availableProducers.error}
        ></display-error>`;
      case "completed":
        const yourProducers = Array.from(
          availableProducers.value.allProducers.entries(),
        ).filter(
          ([_, producer]) =>
            encodeHashToBase64(producer.entry.liason) ===
            encodeHashToBase64(this.ordersStore.client.client.myPubKey),
        );
        const otherProducers = Array.from(
          availableProducers.value.allProducers.entries(),
        ).filter(
          ([_, producer]) =>
            encodeHashToBase64(producer.entry.liason) !==
            encodeHashToBase64(this.ordersStore.client.client.myPubKey),
        );

        return html`
          <div class="column" style="gap: 24px">
            ${availableProducers.value.allProducers.size === 0
              ? html` <div
                  class="column center-content"
                  style="gap: 16px; margin: 24px; text-align: center"
                >
                  <sl-icon
                    .src=${wrapPathInSvg(mdiInformationOutline)}
                    style="color: grey; height: 64px; width: 64px;"
                  ></sl-icon>
                  <span class="placeholder">${msg("No producers found.")}</span>
                  <span class="placeholder" style="width: 550px; "
                    >${msg(
                      "The order cannot proceed without any producers. Go to the producers page and create a producer.",
                    )}</span
                  >
                </div>`
              : yourProducers.length > 0
                ? html`
                    ${this.renderAvailableProducersList(
                      msg("Your Producers"),
                      yourProducers,
                      availableProducers.value.availableProducts,
                    )}
                    ${otherProducers.length > 0
                      ? this.renderAvailableProducersList(
                          msg("Other Producers"),
                          otherProducers,
                          availableProducers.value.availableProducts,
                        )
                      : html``}
                  `
                : this.renderAvailableProducersList(
                    msg("Available Producers"),
                    otherProducers,
                    availableProducers.value.availableProducts,
                  )}
          </div>
        `;
    }
  }

  static styles = appStyles;
}
