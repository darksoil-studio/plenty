import { LitElement, html, render } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { state, customElement, property } from "lit/decorators.js";
import {
  ActionHash,
  Record,
  EntryHash,
  AgentPubKey,
  encodeHashToBase64,
  decodeHashFromBase64,
} from "@holochain/client";
import { EntryRecord, mapValues } from "@holochain-open-dev/utils";
import {
  hashState,
  notifyError,
  hashProperty,
  wrapPathInSvg,
  onSubmit,
} from "@holochain-open-dev/elements";
import {
  SignalWatcher,
  joinAsyncMap,
  toPromise,
} from "@holochain-open-dev/signals";
import { consume } from "@lit/context";
import { localized, msg, str } from "@lit/localize";
import {
  mdiAlertCircleOutline,
  mdiDelete,
  mdiInformationOutline,
} from "@mdi/js";

import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";

import { appStyles } from "../../../app-styles.js";
import { OrdersStore } from "../orders-store.js";
import { ordersStoreContext } from "../context.js";
import { AvailableProducts, ProducerAvailability } from "../types.js";
import { producersStoreContext } from "../../producers/context.js";
import { ProducersStore } from "../../producers/producers-store.js";
import { SlCheckbox } from "@shoelace-style/shoelace";
import { Producer, Product, renderPackaging } from "../../producers/types.js";
import { styleMap } from "lit/directives/style-map.js";
import { ref } from "lit/directives/ref.js";

/**
 * @element edit-available-products
 * @fires available-products-updated: detail will contain { originalAvailableProductsHash, previousAvailableProductsHash, updatedAvailableProductsHash }
 */
@localized()
@customElement("edit-available-products")
export class EditAvailableProducts extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The hash of the original `Create` action for this AvailableProducts
   */
  @property(hashProperty("available-products-hash"))
  availableProductsHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: ordersStoreContext })
  ordersStore!: OrdersStore;

  /**
   * @internal
   */
  @consume({ context: producersStoreContext })
  producersStore!: ProducersStore;

  /**
   * @internal
   */
  @state()
  committing = false;

  get producerAvailable() {
    const checkbox = this.shadowRoot?.getElementById(
      "producer-available"
    ) as SlCheckbox;
    return checkbox ? checkbox.checked : undefined;
  }

  async updateAvailableProducts(
    currentRecord: EntryRecord<AvailableProducts>,
    latestProducerHash: ActionHash,
    fields: any
  ) {
    const available_products: Array<ActionHash> = Object.entries(fields)
      .filter(([key]) => key !== "producer-available")
      .filter(([_, value]) => value === "on")
      .map(([key]) => decodeHashFromBase64(key));
    const producer_availability: ProducerAvailability =
      fields["producer-available"] === "on"
        ? {
            type: "Available",
            available_products,
          }
        : {
            type: "Unavailable",
          };

    const availableProducts: AvailableProducts = {
      order_hash: currentRecord.entry.order_hash!,
      original_producer_hash: currentRecord.entry.original_producer_hash!,
      latest_producer_hash: latestProducerHash,
      producer_availability,
    };

    try {
      this.committing = true;
      const updateRecord =
        await this.ordersStore.client.updateAvailableProducts(
          this.availableProductsHash,
          currentRecord.actionHash,
          availableProducts
        );

      this.dispatchEvent(
        new CustomEvent("available-products-updated", {
          composed: true,
          bubbles: true,
          detail: {
            originalAvailableProductsHash: this.availableProductsHash,
            previousAvailableProductsHash: currentRecord.actionHash,
            updatedAvailableProductsHash: updateRecord.actionHash,
          },
        })
      );
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error updating the available products"));
    }

    this.committing = false;
  }

  renderProducts(
    availableProducts: EntryRecord<AvailableProducts>,
    producer: EntryRecord<Producer>,
    map: ReadonlyMap<ActionHash, EntryRecord<Product>>
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
            "Create products for this producer to be able to set its availability."
          )}</span
        >
      </div>`;

    const available =
      this.producerAvailable === undefined || this.producerAvailable === null
        ? availableProducts.entry.producer_availability.type === "Available"
        : this.producerAvailable;

    const productAvailable = (productHash: ActionHash) => {
      const availability = availableProducts.entry.producer_availability;
      if (availability.type === "Unavailable") return false;
      return !!availability.available_products.find(
        (p) => encodeHashToBase64(p) === encodeHashToBase64(productHash)
      );
    };

    return html`
      <div class="column" style="flex: 1; gap: 16px;">
        <span class="title" style="margin-bottom: 8px"
          >${msg("Set Available Products")}</span
        >
        <vaadin-grid
          style=${styleMap({
            opacity: available ? "1" : "0.4",
            "pointer-events": available ? "auto" : "none",
          })}
          multi-sort
          .items=${Array.from(map.entries()).map(([productHash, p]) => ({
            ...p.entry,
            productHash,
          }))}
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
                html` <div class="column" style="flex: 1; align-items: center">
                  <sl-checkbox
                    name="${encodeHashToBase64(model.item.productHash)}"
                    .defaultChecked=${productAvailable(model.item.productHash)}
                  ></sl-checkbox>
                </div>`,
                root
              );
            }}
          ></vaadin-grid-column>
        </vaadin-grid>
        <sl-button
          style="align-self: end"
          variant="primary"
          type="submit"
          .loading=${this.committing}
          >${msg("Set Available Products")}</sl-button
        >
      </div>
    `;
  }

  productsLatestVersion() {
    const latestAvailableProducts = this.ordersStore.availableProducts
      .get(this.availableProductsHash)
      .latestVersion.get();
    if (latestAvailableProducts.status !== "completed")
      return latestAvailableProducts;

    const map = this.producersStore.producers
      .get(latestAvailableProducts.value.entry.original_producer_hash)
      .products.live.get();
    const producerLatestVersion = this.producersStore.producers
      .get(latestAvailableProducts.value.entry.original_producer_hash)
      .latestVersion.get();
    const order = this.ordersStore.orders
      .get(latestAvailableProducts.value.entry.order_hash)
      .latestVersion.get();
    if (map.status !== "completed") return map;
    if (order.status !== "completed") return order;
    if (producerLatestVersion.status !== "completed")
      return producerLatestVersion;

    const latestVersion = joinAsyncMap(
      mapValues(map.value, (p) => p.latestVersion.get())
    );
    if (latestVersion.status !== "completed") return latestVersion;

    return {
      status: "completed" as "completed",
      value: {
        producer: producerLatestVersion.value,
        products: latestVersion.value,
        order: order.value,
        availableProducts: latestAvailableProducts.value,
      },
    };
  }

  resetted = false;

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
          <form
            id="edit-form"
            ${ref(
              (form) =>
                form &&
                !this.resetted &&
                setTimeout(() => {
                  this.resetted = true;
                  (form as HTMLFormElement).reset();
                })
            )}
            class="column"
            style="flex: 1; gap: 24px"
            ${onSubmit((fields) =>
              this.updateAvailableProducts(
                products.value.availableProducts,
                products.value.producer.actionHash,
                fields
              )
            )}
          >
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
              name="producer-available"
              .defaultChecked=${products.value.availableProducts.entry
                .producer_availability.type === "Available"}
              id="producer-available"
              class="title"
              style="font-size: 20px"
              @sl-change=${(e: CustomEvent) => {
                this.requestUpdate();
              }}
              >${msg(
                str`Producer is available for the ${products.value.order.entry.name} order`
              )}</sl-checkbox
            >

            <span class="title"
              >${msg(
                str`Available Products for the "${products.value.order.entry.name}" order`
              )}</span
            >
            <sl-card>
              ${this.renderProducts(
                products.value.availableProducts,
                products.value.producer,
                products.value.products
              )}
            </sl-card>
          </form>
        `;
    }
  }

  static styles = appStyles;
}
