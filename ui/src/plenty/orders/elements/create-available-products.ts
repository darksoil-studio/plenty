import { css, LitElement, html, render } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { repeat } from "lit/directives/repeat.js";
import { state, property, query, customElement } from "lit/decorators.js";
import {
  ActionHash,
  Record,
  DnaHash,
  AgentPubKey,
  EntryHash,
  encodeHashToBase64,
  decodeHashFromBase64,
} from "@holochain/client";
import { EntryRecord, HoloHashMap, mapValues } from "@holochain-open-dev/utils";
import { SignalWatcher, joinAsyncMap } from "@holochain-open-dev/signals";
import {
  hashProperty,
  notifyError,
  hashState,
  onSubmit,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { consume } from "@lit/context";
import { localized, msg, str } from "@lit/localize";
import {
  mdiAlertCircleOutline,
  mdiDelete,
  mdiInformationOutline,
  mdiPencil,
} from "@mdi/js";

import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/checkbox/checkbox.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";

import "@shoelace-style/shoelace/dist/components/card/card.js";
import { appStyles } from "../../../app-styles.js";
import { OrdersStore } from "../orders-store.js";
import { ordersStoreContext } from "../context.js";
import { AvailableProducts, ProducerAvailability } from "../types.js";
import { producersStoreContext } from "../../producers/context.js";
import { ProducersStore } from "../../producers/producers-store.js";
import { Producer, Product, renderPackaging } from "../../producers/types.js";
import SlCheckbox from "@shoelace-style/shoelace/dist/components/checkbox/checkbox.js";
import { styleMap } from "lit/directives/style-map.js";
import { GridDataProviderCallback } from "@vaadin/grid";

/**
 * @element create-available-products
 * @fires available-products-created: detail will contain { availableProductsHash }
 */
@localized()
@customElement("create-available-products")
export class CreateAvailableProducts extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The order hash for this AvailableProducts
   */
  @property(hashProperty("order-hash"))
  orderHash!: ActionHash;

  /**
   * REQUIRED. The order hash for this AvailableProducts
   */
  @property(hashProperty("producer-hash"))
  producerHash!: ActionHash;

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

  async createAvailableProducts(
    latestProducerHash: ActionHash,
    allProducts: Array<ActionHash>,
  ) {
    if (this.orderHash === undefined)
      throw new Error(
        "Cannot create a new Available Products without its order_hash field",
      );
    if (this.producerHash === undefined)
      throw new Error(
        "Cannot create a new Available Products without its order_hash field",
      );

    const available_products: Array<ActionHash> = allProducts.filter(
      (productHash) =>
        this.availableProducts.has(productHash)
          ? this.availableProducts.get(productHash)
          : true,
    );

    const producer_availability: ProducerAvailability = this.producerAvailable
      ? {
          type: "Available",
          available_products,
        }
      : {
          type: "Unavailable",
        };

    const availableProducts: AvailableProducts = {
      order_hash: this.orderHash!,
      original_producer_hash: this.producerHash!,
      latest_producer_hash: latestProducerHash,
      producer_availability,
    };

    try {
      this.committing = true;
      const record: EntryRecord<AvailableProducts> =
        await this.ordersStore.client.createAvailableProducts(
          availableProducts,
        );

      this.dispatchEvent(
        new CustomEvent("available-products-created", {
          composed: true,
          bubbles: true,
          detail: {
            availableProductsHash: record.actionHash,
          },
        }),
      );
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error creating the available products"));
    }
    this.committing = false;
  }

  /**
   * @internal
   */
  @consume({ context: producersStoreContext, subscribe: true })
  producersStore!: ProducersStore;

  @state()
  producerAvailable = true;

  @state()
  availableProducts = new HoloHashMap<ActionHash, boolean>();

  renderProducts(
    producer: EntryRecord<Producer>,
    map: ReadonlyMap<ActionHash, EntryRecord<Product>>,
  ) {
    if (map.size === 0)
      return html` <div
        class="column center-content"
        style="gap: 16px; flex: 1"
      >
        <sl-icon
          style="color: grey; height: 64px; width: 64px;"
          .src=${wrapPathInSvg(mdiInformationOutline)}
        ></sl-icon>
        <span class="placeholder"
          >${msg("No products found for this producer")}</span
        >
        <span class="placeholder"
          >${msg(
            "Create products for this producer to be able to set its availability.",
          )}</span
        >
      </div>`;
    const items = Array.from(map.entries()).map(([productHash, p]) => ({
      ...p.entry,
      productHash,
      id: encodeHashToBase64(productHash),
    }));

    const dataProvider: GridDataProviderCallback<any> = (
      params: any,
      callback: any,
    ) => {
      callback(items, items.length);
    };

    return html`
      <div class="column" style="flex: 1; gap: 16px;">
        <span class="title" style="margin-bottom: 8px"
          >${msg("Set Available Products")}</span
        >
        <vaadin-grid
          style=${styleMap({
            opacity: this.producerAvailable ? "1" : "0.4",
            "pointer-events": this.producerAvailable ? "auto" : "none",
          })}
          .dataProvider=${dataProvider}
          multi-sort
          .itemIdPath="id"
        >
          <vaadin-grid-sort-column
            .header=${msg("Product ID")}
            path="product_id"
          ></vaadin-grid-sort-column>
          <vaadin-grid-column
            .header=${msg("Name")}
            path="name"
          ></vaadin-grid-column>
          <vaadin-grid-column
            .header=${msg("Description")}
            path="description"
          ></vaadin-grid-column>
          <vaadin-grid-column
            .header=${msg("Categories")}
            .renderer=${(root: any, __: any, model: any) => {
              const product: Product = model.item;
              root.textContent = product.categories.join(", ");
            }}
          ></vaadin-grid-column>
          <vaadin-grid-column
            .header=${msg("Packaging")}
            .renderer=${(root: any, __: any, model: any) => {
              const product: Product = model.item;
              root.textContent = renderPackaging(product.packaging);
            }}
          ></vaadin-grid-column>
          <vaadin-grid-sort-column
            .header=${msg("Price")}
            path="price"
          ></vaadin-grid-sort-column>
          <vaadin-grid-sort-column
            .header=${msg("Maximum Available")}
            path="maximum_available"
          ></vaadin-grid-sort-column>
          <vaadin-grid-column
            .header=${msg("VAT (%)")}
            path="vat_percentage"
          ></vaadin-grid-column>
          <vaadin-grid-column
            .header=${msg("Available")}
            .renderer=${(root: any, _: any, model: any) => {
              render(
                keyed(
                  encodeHashToBase64(model.item.productHash),
                  html` <div
                    class="column"
                    style="flex: 1; align-items: center"
                  >
                    <sl-checkbox
                      @sl-change=${(e: CustomEvent) => {
                        const available = (e.target as SlCheckbox).checked;
                        this.availableProducts.set(
                          model.item.productHash,
                          available,
                        );
                      }}
                      .checked=${this.availableProducts.has(
                        model.item.productHash,
                      )
                        ? this.availableProducts.get(model.item.productHash)
                        : true}
                    ></sl-checkbox>
                  </div>`,
                ),
                root,
              );
            }}
          ></vaadin-grid-column>
        </vaadin-grid>
        <sl-button
          style="align-self: end"
          variant="primary"
          type="submit"
          .loading=${this.committing}
          @click=${() =>
            this.createAvailableProducts(
              producer.actionHash,
              Array.from(map.keys()),
            )}
          >${msg("Set Available Products")}</sl-button
        >
      </div>
    `;
  }

  rendered = new HoloHashMap();

  productsLatestVersion() {
    const map = this.producersStore.producers
      .get(this.producerHash)
      .products.live.get();
    const producerLatestVersion = this.producersStore.producers
      .get(this.producerHash)
      .latestVersion.get();
    const order = this.ordersStore.orders
      .get(this.orderHash)
      .latestVersion.get();
    if (map.status !== "completed") return map;
    if (order.status !== "completed") return order;
    if (producerLatestVersion.status !== "completed")
      return producerLatestVersion;

    const latestVersion = joinAsyncMap(
      mapValues(map.value, (p) => p.latestVersion.get()),
    );
    if (latestVersion.status !== "completed") return latestVersion;

    return {
      status: "completed" as "completed",
      value: {
        producer: producerLatestVersion.value,
        products: latestVersion.value,
        order: order.value,
      },
    };
  }

  render() {
    const products = this.productsLatestVersion();

    switch (products.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the products")}
          .error=${products.error}
        ></display-error>`;
      case "completed":
        return html`
          <div class="column" style="flex: 1; gap: 24px">
            <div class="row" style="align-items: center; gap: 12px; flex: 1">
              <show-image
                .imageHash=${products.value.producer.entry.photo}
                style="height: 100px; width: 100px"
              ></show-image>
              <div class="column" style="gap: 12px">
                <span class="title">${products.value.producer.entry.name}</span>

                <div class="row" style="gap: 8px; align-items: center">
                  <span>${msg("Liason")}:</span>
                  <profile-list-item
                    .agentPubKey=${products.value.producer.entry.liason}
                  ></profile-list-item>
                </div>
              </div>
            </div>

            <sl-checkbox
              checked
              id="producer-available"
              class="title"
              style="font-size: 20px"
              @sl-change=${(e: CustomEvent) => {
                this.producerAvailable = (e.target as SlCheckbox).checked;
              }}
              >${msg(
                str`Producer is available for the ${products.value.order.entry.name} order`,
              )}</sl-checkbox
            >

            <span class="title"
              >${msg(
                str`Available Products for the "${products.value.order.entry.name}" order`,
              )}</span
            >
            <sl-card>
              ${this.renderProducts(
                products.value.producer,
                products.value.products,
              )}
            </sl-card>
          </div>
        `;
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
