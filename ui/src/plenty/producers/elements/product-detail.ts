import { LitElement, html } from "lit";
import { state, property, customElement } from "lit/decorators.js";
import { EntryHash, Record, ActionHash } from "@holochain/client";
import { EntryRecord } from "@holochain-open-dev/utils";
import { SignalWatcher } from "@holochain-open-dev/signals";
import {
  sharedStyles,
  hashProperty,
  wrapPathInSvg,
  notifyError,
} from "@holochain-open-dev/elements";
import { consume } from "@lit/context";
import { localized, msg } from "@lit/localize";
import { mdiAlertCircleOutline, mdiPencil, mdiDelete } from "@mdi/js";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";

import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "./edit-product.js";

import { ProducersStore } from "../producers-store.js";
import { producersStoreContext } from "../context.js";
import { Product, PackagingUnit } from "../types.js";

/**
 * @element product-detail
 * @fires product-deleted: detail will contain { productHash }
 */
@localized()
@customElement("product-detail")
export class ProductDetail extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The hash of the Product to show
   */
  @property(hashProperty("product-hash"))
  productHash!: ActionHash;

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

  async deleteProduct() {
    try {
      await this.producersStore.client.deleteProduct(this.productHash);

      this.dispatchEvent(
        new CustomEvent("product-deleted", {
          bubbles: true,
          composed: true,
          detail: {
            productHash: this.productHash,
          },
        }),
      );
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error deleting the product"));
    }
  }

  renderDetail(entryRecord: EntryRecord<Product>) {
    return html`
      <sl-card>
        <div slot="header" class="row" style="gap: 8px">
          <span style="font-size: 18px; flex: 1;">${msg("Product")}</span>

          <sl-icon-button
            .src=${wrapPathInSvg(mdiPencil)}
            @click=${() => {
              this._editing = true;
            }}
          ></sl-icon-button>
          <sl-icon-button
            .src=${wrapPathInSvg(mdiDelete)}
            @click=${() => this.deleteProduct()}
          ></sl-icon-button>
        </div>

        <div class="column" style="gap: 16px;">
          <div class="column" style="gap: 8px;">
            <span><strong>${msg("Name")}</strong></span>
            <span style="white-space: pre-line">${entryRecord.entry.name}</span>
          </div>

          <div class="column" style="gap: 8px;">
            <span><strong>${msg("Product Id")}</strong></span>
            <span style="white-space: pre-line"
              >${entryRecord.entry.product_id}</span
            >
          </div>

          <div class="column" style="gap: 8px;">
            <span><strong>${msg("Description")}</strong></span>
            <span style="white-space: pre-line"
              >${entryRecord.entry.description}</span
            >
          </div>

          <div class="column" style="gap: 8px;">
            <span><strong>${msg("Categories")}</strong></span>
            ${entryRecord.entry.categories.map(
              (el) => html`<span style="white-space: pre-line">${el}</span>`,
            )}
          </div>

          <div class="column" style="gap: 8px;">
            <span><strong>${msg("Packaging")}</strong></span>
            <span style="white-space: pre-line"
              >${entryRecord.entry.packaging.unit === "Piece"
                ? "Piece"
                : entryRecord.entry.packaging.unit === "Kilograms"
                  ? "Kilograms"
                  : entryRecord.entry.packaging.unit === "Grams"
                    ? "Grams"
                    : entryRecord.entry.packaging.unit === "Liters"
                      ? "Liters"
                      : entryRecord.entry.packaging.unit === "Pounds"
                        ? "Pounds"
                        : "Ounces"}</span
            >
          </div>

          <div class="column" style="gap: 8px;">
            <span><strong>${msg("Maximum Available")}</strong></span>
            <span style="white-space: pre-line"
              >${entryRecord.entry.maximum_available}</span
            >
          </div>

          <div class="column" style="gap: 8px;">
            <span><strong>${msg("Price")}</strong></span>
            <span style="white-space: pre-line"
              >${entryRecord.entry.price_cents}</span
            >
          </div>

          <div class="column" style="gap: 8px;">
            <span><strong>${msg("Vat Percentage")}</strong></span>
            <span style="white-space: pre-line"
              >${entryRecord.entry.vat_percentage}</span
            >
          </div>

          <div class="column" style="gap: 8px;">
            <span><strong>${msg("Margin Percentage")}</strong></span>
            <span style="white-space: pre-line"
              >${entryRecord.entry.margin_percentage}</span
            >
          </div>

          <div class="column" style="gap: 8px;">
            <span><strong>${msg("Origin")}</strong></span>
            <span style="white-space: pre-line"
              >${entryRecord.entry.origin}</span
            >
          </div>

          <div class="column" style="gap: 8px;">
            <span><strong>${msg("Ingredients")}</strong></span>
            <span style="white-space: pre-line"
              >${entryRecord.entry.ingredients}</span
            >
          </div>
        </div>
      </sl-card>
    `;
  }

  render() {
    const product = this.producersStore.products
      .get(this.productHash)
      .latestVersion.get();

    switch (product.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the product")}
          .error=${product.error}
        ></display-error>`;
      case "completed":
        if (this._editing) {
          return html`<edit-product
            .productHash=${this.productHash}
            @product-updated=${async () => {
              this._editing = false;
            }}
            @edit-canceled=${() => {
              this._editing = false;
            }}
            style="display: flex; flex: 1;"
          ></edit-product>`;
        }

        return this.renderDetail(product.value);
    }
  }

  static styles = [sharedStyles];
}
