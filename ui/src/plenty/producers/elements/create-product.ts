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
import { EntryRecord, mapValues } from "@holochain-open-dev/utils";
import {
  AsyncComputed,
  SignalWatcher,
  joinAsyncMap,
  toPromise,
} from "@holochain-open-dev/signals";
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
import "@shoelace-style/shoelace/dist/components/checkbox/checkbox.js";

import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/textarea/textarea.js";
import "@shoelace-style/shoelace/dist/components/option/option.js";
import { ProducersStore } from "../producers-store.js";
import { producersStoreContext } from "../context.js";
import { Product, PackagingUnit, Packaging } from "../types.js";
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
        "Cannot create a new Product without its producer_hash field"
      );

    const productsIds = await toPromise(
      new AsyncComputed(() => this.allProductsIds())
    );

    if (productsIds.includes(fields.product_id!)) {
      notifyError(msg("There already is a product with this product ID."));
      return;
    }

    const packaging: Packaging = {
      unit: (fields as any).packaging_unit!,
      amount_per_package: parseFloat((fields as any).amount_per_package),
      number_of_packages: parseInt((fields as any).number_of_packages),
      estimate: (fields as any).estimate === "on",
    };

    const product: Product = {
      producer_hash: this.producerHash!,
      name: fields.name!,
      product_id: fields.product_id!,
      description: fields.description!,
      categories: (Array.isArray(fields.categories!)
        ? fields.categories!
        : fields.categories
        ? ([fields.categories!] as unknown as Array<string>)
        : []
      ).map((el) => el),
      packaging,
      maximum_available: fields.maximum_available
        ? parseInt(fields.maximum_available as any)
        : undefined,
      price: parseInt(fields.price as any),
      vat_percentage: parseInt(fields.vat_percentage as any),
      margin_percentage: fields.margin_percentage
        ? parseInt(fields.margin_percentage as any)
        : undefined,
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
        })
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
        no-repeated-values
        .label=${msg("Categories")}
        multiple
        .options=${categories.status === "completed" ? categories.value : []}
        name="categories"
      >
      </sl-combobox>
    `;
  }

  allProductsIds() {
    const products = this.producersStore.producers
      .get(this.producerHash)
      .products.live.get();
    if (products.status !== "completed") return products;

    const productsLatestVersion = joinAsyncMap(
      mapValues(products.value, (p) => p.latestVersion.get())
    );
    if (productsLatestVersion.status !== "completed")
      return productsLatestVersion;

    const productsIds = Array.from(productsLatestVersion.value.values()).map(
      (p) => p.entry.product_id
    );

    return {
      status: "completed" as "completed",
      value: productsIds,
    };
  }

  render() {
    return html`
      <sl-card>
        <form
          id="create-form"
          class="column"
          style="flex: 1; gap: 24px;"
          ${onSubmit((fields) => this.createProduct(fields))}
        >
          <span class="title">${msg("Product Details")}</span>
          <div class="row" style="flex: 1; gap: 24px">
            <div class="column" style="flex: 1; gap: 12px">
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

              <sl-input name="origin" .label=${msg("Origin")}></sl-input>

              <sl-textarea
                name="ingredients"
                .label=${msg("Ingredients")}
              ></sl-textarea>
            </div>

            <div class="column" style="flex: 1; gap: 12px">
              <div class="column" style="gap: 12px">
                <span style="font-size: 16px">${msg("Packaging")}</span>
                <div class="row" style="gap: 12px; align-items: end">
                  <sl-input
                    type="number"
                    name="number_of_packages"
                    required
                    min="1"
                    value="1"
                    style="width: 3rem"
                  >
                  </sl-input>
                  <span>${msg("packages of")}</span>
                  <sl-input
                    type="number"
                    name="amount_per_package"
                    required
                    style="width: 3rem"
                  >
                  </sl-input>
                  <div class="row" style="gap: 12px; align-items: center">
                    <sl-select name="packaging_unit" value="Kilograms">
                      <sl-option value="Piece">${msg("Piece")}</sl-option>
                      <sl-option value="Kilograms"
                        >${msg("Kilograms")}</sl-option
                      >
                      <sl-option value="Grams">${msg("Grams")}</sl-option>
                      <sl-option value="Liters">${msg("Liters")}</sl-option>
                      <sl-option value="Milliliters"
                        >${msg("Milliliters")}</sl-option
                      >
                      <sl-option value="Pounds">${msg("Pounds")}</sl-option>
                      <sl-option value="Ounces">${msg("Ounces")}</sl-option>
                    </sl-select>
                    <sl-checkbox name="estimate"
                      >${msg("Estimate")}</sl-checkbox
                    >
                  </div>
                </div>
              </div>

              <sl-input
                type="number"
                name="maximum_available"
                .label=${msg("Maximum Available")}
              ></sl-input>

              <div class="row" style="gap: 12px">
                <sl-input
                  type="number"
                  name="price"
                  .label=${msg("Price (Excluding VAT)")}
                  required
                  no-spin-buttons
                  style="flex: 1"
                ></sl-input>

                <sl-input
                  type="number"
                  name="vat_percentage"
                  .label=${msg("VAT")}
                  required
                  no-spin-buttons
                  style="width: 6rem"
                  ><span slot="suffix">%</span></sl-input
                >
              </div>

              <sl-input
                type="number"
                no-spin-buttons
                name="margin_percentage"
                .label=${msg("Margin")}
                ><span slot="suffix">%</span></sl-input
              >
            </div>
          </div>

          <sl-button variant="primary" type="submit" .loading=${this.committing}
            >${msg("Create Product")}</sl-button
          >
        </form>
      </sl-card>
    `;
  }

  static styles = appStyles;
}
