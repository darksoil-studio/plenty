import { LitElement, html, nothing } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { state, customElement, property } from "lit/decorators.js";
import { ActionHash, Record, EntryHash, AgentPubKey } from "@holochain/client";
import { EntryRecord, mapValues } from "@holochain-open-dev/utils";
import {
  hashState,
  notifyError,
  sharedStyles,
  hashProperty,
  wrapPathInSvg,
  onSubmit,
} from "@holochain-open-dev/elements";
import {
  AsyncComputed,
  SignalWatcher,
  joinAsyncMap,
  toPromise,
} from "@holochain-open-dev/signals";
import { consume } from "@lit/context";
import { localized, msg } from "@lit/localize";
import { mdiAlertCircleOutline, mdiDelete } from "@mdi/js";

import "@shoelace-style/shoelace/dist/components/alert/alert.js";

import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/textarea/textarea.js";
import "@shoelace-style/shoelace/dist/components/option/option.js";
import "@shoelace-style/shoelace/dist/components/select/select.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import { ProducersStore } from "../producers-store.js";
import { producersStoreContext } from "../context.js";
import { Product, PackagingUnit, Packaging } from "../types.js";

/**
 * @element edit-product
 * @fires product-updated: detail will contain { originalProductHash, previousProductHash, updatedProductHash }
 */
@localized()
@customElement("edit-product")
export class EditProduct extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The hash of the original `Create` action for this Product
   */
  @property(hashProperty("product-hash"))
  productHash!: ActionHash;

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

  /**
   * @internal
   */
  @state()
  _categoriesFields: Array<number> = [];

  async firstUpdated() {
    const currentRecord = await toPromise(
      this.producersStore.products.get(this.productHash).latestVersion
    );
    this._categoriesFields = currentRecord.entry.categories.map(
      (_, index) => index
    );
    setTimeout(() => {
      (this.shadowRoot?.getElementById("form") as HTMLFormElement).reset();
    });
  }

  otherProductsIds(producerHash: ActionHash) {
    const products = this.producersStore.producers
      .get(producerHash)
      .products.live.get();
    if (products.status !== "completed") return products;

    const productsLatestVersion = joinAsyncMap(
      mapValues(products.value, (p) => p.latestVersion.get())
    );
    if (productsLatestVersion.status !== "completed")
      return productsLatestVersion;

    const productsIds = Array.from(productsLatestVersion.value.entries())
      .filter(
        ([productHash]) =>
          productHash.toString() !== this.productHash.toString()
      )
      .map(([, p]) => p.entry.product_id);

    return {
      status: "completed" as "completed",
      value: productsIds,
    };
  }

  async updateProduct(
    currentRecord: EntryRecord<Product>,
    fields: Partial<Product>
  ) {
    const productsIds = await toPromise(
      new AsyncComputed(() =>
        this.otherProductsIds(currentRecord.entry.producer_hash)
      )
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
      producer_hash: currentRecord.entry.producer_hash!,
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
      const updateRecord = await this.producersStore.client.updateProduct(
        this.productHash,
        currentRecord.actionHash,
        product
      );

      this.dispatchEvent(
        new CustomEvent("product-updated", {
          composed: true,
          bubbles: true,
          detail: {
            originalProductHash: this.productHash,
            previousProductHash: currentRecord.actionHash,
            updatedProductHash: updateRecord.actionHash,
          },
        })
      );
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error updating the product"));
    }

    this.committing = false;
  }

  renderEditForm(currentRecord: EntryRecord<Product>) {
    const categories = this.producersStore.allCategories.get();
    return html` <sl-card>
      <form
        id="form"
        class="column"
        style="flex: 1; gap: 16px;"
        ${onSubmit((fields) => this.updateProduct(currentRecord, fields))}
      >
        <span class="title">${msg("Product Details")}</span>
        <div class="row" style="flex: 1; gap: 24px">
          <div class="column" style="flex: 1; gap: 12px">
            <sl-input
              name="name"
              .label=${msg("Name")}
              required
              .defaultValue=${currentRecord.entry.name}
            ></sl-input>

            <sl-input
              name="product_id"
              .label=${msg("Product Id")}
              required
              .defaultValue=${currentRecord.entry.product_id}
            ></sl-input>

            <sl-textarea
              name="description"
              .label=${msg("Description")}
              required
              .defaultValue=${currentRecord.entry.description}
            ></sl-textarea>

            <sl-combobox
              no-repeated-values
              .label=${msg("Categories")}
              multiple
              .options=${categories.status === "completed"
                ? categories.value
                : []}
              name="categories"
              .defaultValue=${currentRecord.entry.categories}
            >
            </sl-combobox>
            <sl-input
              name="origin"
              .label=${msg("Origin")}
              .defaultValue=${currentRecord.entry.origin}
            ></sl-input>

            <sl-textarea
              name="ingredients"
              .label=${msg("Ingredients")}
              .defaultValue=${currentRecord.entry.ingredients}
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
                  .defaultValue=${currentRecord.entry.packaging
                    .number_of_packages}
                  style="width: 3rem"
                >
                </sl-input>
                <span>${msg("packages of")}</span>
                <sl-input
                  type="number"
                  name="amount_per_package"
                  .defaultValue=${currentRecord.entry.packaging
                    .amount_per_package}
                  required
                  style="width: 3rem"
                >
                </sl-input>
                <div class="row" style="gap: 12px; align-items: center">
                  <sl-select
                    name="packaging_unit"
                    .defaultValue=${currentRecord.entry.packaging.unit}
                  >
                    <sl-option value="Piece">${msg("Piece")}</sl-option>
                    <sl-option value="Kilograms">${msg("Kilograms")}</sl-option>
                    <sl-option value="Grams">${msg("Grams")}</sl-option>
                    <sl-option value="Liters">${msg("Liters")}</sl-option>
                    <sl-option value="Milliliters"
                      >${msg("Milliliters")}</sl-option
                    >
                    <sl-option value="Pounds">${msg("Pounds")}</sl-option>
                    <sl-option value="Ounces">${msg("Ounces")}</sl-option>
                  </sl-select>
                  <sl-checkbox
                    name="estimate"
                    .defaultValue=${currentRecord.entry.packaging.estimate}
                    >${msg("Estimate")}</sl-checkbox
                  >
                </div>
              </div>
            </div>

            <sl-input
              type="number"
              name="maximum_available"
              .label=${msg("Maximum Available")}
              .defaultValue=${currentRecord.entry.maximum_available || nothing}
            ></sl-input>

            <div class="row" style="gap: 12px">
              <sl-input
                type="number"
                name="price"
                .label=${msg("Price (Excluding VAT)")}
                required
                no-spin-buttons
                style="flex: 1"
                .defaultValue=${currentRecord.entry.price}
              ></sl-input>

              <sl-input
                type="number"
                name="vat_percentage"
                .label=${msg("VAT")}
                required
                no-spin-buttons
                style="width: 6rem"
                .defaultValue=${currentRecord.entry.vat_percentage}
                ><span slot="suffix">%</span></sl-input
              >
            </div>

            <sl-input
              type="number"
              name="margin_percentage"
              .label=${msg("Margin")}
              no-spin-buttons
              .defaultValue=${currentRecord.entry.margin_percentage || nothing}
              ><span slot="suffix">%</span></sl-input
            >
          </div>
        </div>

        <div class="row" style="gap: 8px;">
          <sl-button
            @click=${() =>
              this.dispatchEvent(
                new CustomEvent("edit-canceled", {
                  bubbles: true,
                  composed: true,
                })
              )}
            style="flex: 1;"
            >${msg("Cancel")}</sl-button
          >
          <sl-button
            type="submit"
            variant="primary"
            style="flex: 1;"
            .loading=${this.committing}
            >${msg("Save")}</sl-button
          >
        </div>
      </form>
    </sl-card>`;
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
        return this.renderEditForm(product.value);
    }
  }

  static styles = [sharedStyles];
}
