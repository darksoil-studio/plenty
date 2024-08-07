import { LitElement, html, css, render } from "lit";
import { state, customElement, property } from "lit/decorators.js";
import { Record, EntryHash, ActionHash, AgentPubKey } from "@holochain/client";
import {
  AsyncComputed,
  SignalWatcher,
  joinAsyncMap,
} from "@holochain-open-dev/signals";
import { EntryRecord, mapValues, slice } from "@holochain-open-dev/utils";
import {
  hashProperty,
  notifyError,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { consume } from "@lit/context";
import { localized, msg, str } from "@lit/localize";
import { mdiDelete, mdiInformationOutline, mdiPencil } from "@mdi/js";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";

import "@vaadin/grid/vaadin-grid.js";
import "@vaadin/grid/vaadin-grid-selection-column.js";
import "@vaadin/grid/vaadin-grid-sort-column.js";

import { ProducersStore } from "../producers-store.js";
import { producersStoreContext } from "../context.js";
import { Producer, Product, renderPackaging } from "../types.js";

import "./product-summary.js";
import { appStyles } from "../../../app-styles.js";
import { SlDialog } from "@shoelace-style/shoelace";

/**
 * @element products-for-producer
 */
@localized()
@customElement("products-for-producer")
export class ProductsForProducer extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The ProducerHash for which the Products should be fetched
   */
  @property(hashProperty("producer-hash"))
  producerHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: producersStoreContext, subscribe: true })
  producersStore!: ProducersStore;

  @state()
  productToDelete: [ActionHash, string] | undefined;

  @state()
  deleting = false;

  async deleteProduct(productHash: ActionHash) {
    try {
      this.deleting = true;
      await this.producersStore.client.deleteProduct(productHash);

      this.dispatchEvent(
        new CustomEvent("product-deleted", {
          bubbles: true,
          composed: true,
          detail: {
            productHash,
          },
        }),
      );
      (this.shadowRoot?.getElementById("delete-product") as SlDialog).hide();
      this.productToDelete = undefined;
    } catch (e: any) {
      console.error(e);
      notifyError(msg("Error deleting the product"));
    }
    this.deleting = false;
  }

  renderList(
    producer: EntryRecord<Producer>,
    map: ReadonlyMap<ActionHash, EntryRecord<Product>>,
  ) {
    if (map.size === 0)
      return html` <sl-card class="column" style="flex: 1; height: 250px">
        <div class="column center-content" style="gap: 16px; flex: 1">
          <sl-icon
            style="color: grey; height: 64px; width: 64px;"
            .src=${wrapPathInSvg(mdiInformationOutline)}
          ></sl-icon>
          <span class="placeholder"
            >${msg("No products found for this producer")}</span
          >
        </div></sl-card
      >`;

    return html`
      <sl-dialog id="delete-product" .label=${msg("Delete Product")}>
        <span
          >${msg(
            str`Are you sure you want to delete the product "${
              this.productToDelete ? this.productToDelete[1] : ""
            }"?`,
          )}</span
        >

        <sl-button
          slot="footer"
          @click=${() => {
            (
              this.shadowRoot?.getElementById("delete-product") as SlDialog
            ).hide();
          }}
          >${msg("Cancel")}</sl-button
        >
        <sl-button
          slot="footer"
          variant="danger"
          .loading=${this.deleting}
          @click=${async () => this.deleteProduct(this.productToDelete![0])}
          >${msg("Delete Product")}</sl-button
        >
      </sl-dialog>

      <vaadin-grid
        multi-sort
        .items=${Array.from(map.entries()).map(([productHash, p]) => ({
          ...p.entry,
          productHash,
          price: p.entry.price_cents / 100,
        }))}
        style="height: 100%"
      >
        <vaadin-grid-sort-column
          .header=${msg("Product ID")}
          path="product_id"
        ></vaadin-grid-sort-column>
        <vaadin-grid-column
          .header=${msg("Name")}
          path="name"
          width="300px"
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
        ${this.producersStore.canIEditProducts(producer)
          ? html` <vaadin-grid-column
                .header=${msg("Edit")}
                .renderer=${(root: any, _: any, model: any) => {
                  render(
                    html`<sl-icon-button
                      .src=${wrapPathInSvg(mdiPencil)}
                      @click=${() =>
                        this.dispatchEvent(
                          new CustomEvent("edit-product-requested", {
                            bubbles: true,
                            composed: true,
                            detail: {
                              productHash: model.item.productHash,
                            },
                          }),
                        )}
                    ></sl-icon-button>`,
                    root,
                  );
                }}
              ></vaadin-grid-column>
              <vaadin-grid-column
                .header=${msg("Delete")}
                .renderer=${(root: any, _: any, model: any) => {
                  render(
                    html`<sl-icon-button
                      .src=${wrapPathInSvg(mdiDelete)}
                      @click=${() => {
                        this.productToDelete = [
                          model.item.productHash,
                          model.item.name,
                        ];
                        (
                          this.shadowRoot?.getElementById(
                            "delete-product",
                          ) as SlDialog
                        ).show();
                      }}
                    ></sl-icon-button>`,
                    root,
                  );
                }}
              ></vaadin-grid-column>`
          : html``}
      </vaadin-grid>
    `;
  }

  productsLatestVersion() {
    const map = this.producersStore.producers
      .get(this.producerHash)
      .products.live.get();
    const producerLatestVersion = this.producersStore.producers
      .get(this.producerHash)
      .latestVersion.get();
    if (map.status !== "completed") return map;
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
        return this.renderList(
          products.value.producer,
          products.value.products,
        );
    }
  }

  static styles = [
    ...appStyles,
    css`
      :host {
        display: flex;
        flex-direction: row;
        justify-content: center;
      }
    `,
  ];
}
