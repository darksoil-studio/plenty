import { LitElement, html } from "lit";
import { state, property, customElement } from "lit/decorators.js";
import { EntryHash, Record, ActionHash } from "@holochain/client";
import { EntryRecord } from "@holochain-open-dev/utils";
import { SignalWatcher } from "@holochain-open-dev/signals";
import { hashProperty, sharedStyles } from "@holochain-open-dev/elements";
import { consume } from "@lit/context";

import { localized, msg } from "@lit/localize";

import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";

import { ProducersStore } from "../producers-store.js";
import { producersStoreContext } from "../context.js";
import { Product, PackagingUnit } from "../types.js";

/**
 * @element product-summary
 * @fires product-selected: detail will contain { productHash }
 */
@localized()
@customElement("product-summary")
export class ProductSummary extends SignalWatcher(LitElement) {
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

  renderSummary(entryRecord: EntryRecord<Product>) {
    return html`
      <div class="column" style="gap: 16px;">
        <div class="column" style="gap: 8px">
          <span><strong>${msg("Name")}</strong></span>
          <span style="white-space: pre-line">${entryRecord.entry.name}</span>
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Product Id")}</strong></span>
          <span style="white-space: pre-line"
            >${entryRecord.entry.product_id}</span
          >
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Description")}</strong></span>
          <span style="white-space: pre-line"
            >${entryRecord.entry.description}</span
          >
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Categories")}</strong></span>
          ${entryRecord.entry.categories.map(
            (el) => html`<span style="white-space: pre-line">${el}</span>`,
          )}
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Maximum Available")}</strong></span>
          <span style="white-space: pre-line"
            >${entryRecord.entry.maximum_available}</span
          >
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Price")}</strong></span>
          <span style="white-space: pre-line">${entryRecord.entry.price}</span>
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Vat Percentage")}</strong></span>
          <span style="white-space: pre-line"
            >${entryRecord.entry.vat_percentage}</span
          >
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Margin Percentage")}</strong></span>
          <span style="white-space: pre-line"
            >${entryRecord.entry.margin_percentage}</span
          >
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Origin")}</strong></span>
          <span style="white-space: pre-line">${entryRecord.entry.origin}</span>
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Ingredients")}</strong></span>
          <span style="white-space: pre-line"
            >${entryRecord.entry.ingredients}</span
          >
        </div>
      </div>
    `;
  }

  renderProduct() {
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
        return this.renderSummary(product.value);
    }
  }

  render() {
    return html`<sl-card
      style="flex: 1; cursor: grab;"
      @click=${() =>
        this.dispatchEvent(
          new CustomEvent("product-selected", {
            composed: true,
            bubbles: true,
            detail: {
              productHash: this.productHash,
            },
          }),
        )}
    >
      ${this.renderProduct()}
    </sl-card>`;
  }

  static styles = [sharedStyles];
}
