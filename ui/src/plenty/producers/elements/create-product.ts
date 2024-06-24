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
  sharedStyles,
  onSubmit,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { consume } from "@lit/context";
import { localized, msg } from "@lit/localize";
import { mdiAlertCircleOutline, mdiClose, mdiDelete } from "@mdi/js";

import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/select/select.js";

import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/textarea/textarea.js";
import "@shoelace-style/shoelace/dist/components/option/option.js";
import { ProducersStore } from "../producers-store.js";
import { producersStoreContext } from "../context.js";
import { Product, PackagingUnit } from "../types.js";
import { appStyles } from "../../../app-styles.js";

import "../../../sl-combobox.js";

/**
 * @element create-product
 * @fires product-created: detail will contain { productHash }
 */
@localized()
@customElement("create-product")
export class CreateProduct extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The producer hash for this Product
   */
  @property(hashProperty("producer-hash"))
  producerHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: producersStoreContext, subscribe: true })
  producersStore!: ProducersStore;

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

  /**
   * @internal
   */
  @state()
  _categoriesFields = [0];

  async createProduct(fields: Partial<Product>) {
    if (this.producerHash === undefined)
      throw new Error(
        "Cannot create a new Product without its producer_hash field",
      );

    const product: Product = {
      producer_hash: this.producerHash!,
      name: fields.name!,
      product_id: fields.product_id!,
      description: fields.description!,
      categories: (Array.isArray(fields.categories!)
        ? fields.categories!
        : ([fields.categories!] as unknown as Array<string>)
      ).map((el) => el),
      packaging: fields.packaging!, // TODO HEEEERE
      maximum_available: fields.maximum_available!,
      price: fields.price!,
      vat_percentage: fields.vat_percentage!,
      margin_percentage: fields.margin_percentage!,
      origin: fields.origin!,
      ingredients: fields.ingredients!,
    };

    try {
      this.committing = true;
      const record: EntryRecord<Product> =
        await this.producersStore.client.createProduct(product);

      this.dispatchEvent(
        new CustomEvent("product-created", {
          composed: true,
          bubbles: true,
          detail: {
            productHash: record.actionHash,
          },
        }),
      );

      this.form.reset();
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error creating the product"));
    }
    this.committing = false;
  }

  renderCategoriesSelect() {
    const categories = this.producersStore.allCategories.get();

    return html`
      <sl-combobox
        .label=${msg("Categories")}
        multiple
        .options=${categories.status === "completed" ? categories.value : []}
        name="categories"
      >
      </sl-combobox>
    `;
  }

  render() {
    return html` <div class="column fill">
      <div class="row top-bar">
        <sl-icon-button
          @click=${() => this.dispatchEvent(new CustomEvent("close-requested"))}
          .src=${wrapPathInSvg(mdiClose)}
        ></sl-icon-button>
        <span>${msg("Create Product")}</span>
      </div>

      <sl-card style="align-self: center; width: 50rem; margin-top: 12px">
        <form
          id="create-form"
          class="column"
          style="flex: 1; gap: 16px;"
          ${onSubmit((fields) => this.createProduct(fields))}
        >
          <div class="row" style="flex: 1; gap: 16px">
            <div class="column" style="flex: 1; gap: 12px">
              <span class="title">${msg("Product Details")}</span>
              <sl-input name="name" .label=${msg("Name")} required></sl-input>

              <sl-input
                name="product_id"
                .label=${msg("Product Id")}
                required
              ></sl-input>

              <sl-textarea
                name="description"
                .label=${msg("Description")}
                required
              ></sl-textarea>

              ${this.renderCategoriesSelect()}
            </div>

            <div class="column" style="flex: 1; gap: 12px">
              <sl-select name="packaging" .label=${msg("Packaging")} required>
                <sl-option value="Piece">${msg("Piece")}</sl-option>
                <sl-option value="Kilograms">${msg("Kilograms")}</sl-option>
                <sl-option value="Grams">${msg("Grams")}</sl-option>
                <sl-option value="Liters">${msg("Liters")}</sl-option>
                <sl-option value="Pounds">${msg("Pounds")}</sl-option>
                <sl-option value="Ounces">${msg("Ounces")}</sl-option>
              </sl-select>

              <sl-input
                type="number"
                name="maximum_available"
                .label=${msg("Maximum Available")}
              ></sl-input>

              <sl-input
                type="number"
                name="price"
                .label=${msg("Price")}
                required
              ></sl-input>

              <sl-input
                type="number"
                name="vat_percentage"
                .label=${msg("Vat Percentage")}
                required
              ></sl-input>

              <sl-input
                type="number"
                name="margin_percentage"
                .label=${msg("Margin Percentage")}
              ></sl-input>

              <sl-input name="origin" .label=${msg("Origin")}></sl-input>

              <sl-textarea
                name="ingredients"
                .label=${msg("Ingredients")}
              ></sl-textarea>
            </div>
          </div>

          <sl-button variant="primary" type="submit" .loading=${this.committing}
            >${msg("Create Product")}</sl-button
          >
        </form>
      </sl-card>
    </div>`;
  }

  static styles = appStyles;
}
