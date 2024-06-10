import { LitElement, html } from 'lit';
import { repeat } from "lit/directives/repeat.js";
import { state, customElement, property } from 'lit/decorators.js';
import { ActionHash, Record, EntryHash, AgentPubKey } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { hashState, notifyError, sharedStyles, hashProperty, wrapPathInSvg, onSubmit } from '@holochain-open-dev/elements';
import { SignalWatcher, toPromise } from '@holochain-open-dev/signals';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiDelete } from '@mdi/js';

import '@shoelace-style/shoelace/dist/components/alert/alert.js';

import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/elements/option/option.js';
import '@shoelace-style/shoelace/dist/elements/select/select.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import { ProducersStore } from '../producers-store.js';
import { producersStoreContext } from '../context.js';
import { Product, PackagingUnit } from '../types.js';

/**
 * @element edit-product
 * @fires product-updated: detail will contain { originalProductHash, previousProductHash, updatedProductHash }
 */
@localized()
@customElement('edit-product')
export class EditProduct extends SignalWatcher(LitElement) {

  /**
   * REQUIRED. The hash of the original `Create` action for this Product
   */
  @property(hashProperty('product-hash'))
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
    const currentRecord = await toPromise(this.producersStore.products.get(this.productHash).latestVersion);
    this._categoriesFields = currentRecord.entry.categories.map((_, index) => index);
    setTimeout(() => {
      (this.shadowRoot?.getElementById('form') as HTMLFormElement).reset();
    });
  }

  async updateProduct(currentRecord: EntryRecord<Product>, fields: Partial<Product>) {  
    const product: Product = { 
      producer_hash: currentRecord.entry.producer_hash!,
      name: fields.name!,
      product_id: fields.product_id!,
      description: fields.description!,
      categories: (Array.isArray(fields.categories!) ? fields.categories! : [fields.categories!] as unknown as Array<string>).map((el) => el),
      packaging: fields.packaging!,
      maximum_available: fields.maximum_available!,
      price: fields.price!,
      vat_percentage: fields.vat_percentage!,
      margin_percentage: fields.margin_percentage!,
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
  
      this.dispatchEvent(new CustomEvent('product-updated', {
        composed: true,
        bubbles: true,
        detail: {
          originalProductHash: this.productHash,
          previousProductHash: currentRecord.actionHash,
          updatedProductHash: updateRecord.actionHash
        }
      }));
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error updating the product"));
    }
    
    this.committing = false;
  }

  renderEditForm(currentRecord: EntryRecord<Product>) {
    return html`
      <sl-card>
        <span slot="header">${msg("Edit Product")}</span>

        <form
          id="form"
          class="column"
          style="flex: 1; gap: 16px;"
          ${onSubmit(fields => this.updateProduct(currentRecord, fields))}
        >  
          <div>
        <sl-input name="name" .label=${msg("Name")}  required .defaultValue=${ currentRecord.entry.name }></sl-input>          </div>

          <div>
        <sl-input name="product_id" .label=${msg("Product Id")}  required .defaultValue=${ currentRecord.entry.product_id }></sl-input>          </div>

          <div>
        <sl-textarea name="description" .label=${msg("Description")}  required .defaultValue=${ currentRecord.entry.description }></sl-textarea>          </div>

          <div>
        <div class="column" style="gap: 8px">
          <span>${msg("Categories")}</span>
        
          ${repeat(this._categoriesFields, i => i, index => html`<div class="row" style="align-items: center;"><sl-input name="categories" .label=${msg("")}  .defaultValue=${ currentRecord.entry.categories[index] }></sl-input> <sl-icon-button .src=${wrapPathInSvg(mdiDelete)} @click=${() => { this._categoriesFields = this._categoriesFields.filter(i => i !== index) } }></sl-icon-button></div>`)}
          <sl-button @click=${() => { this._categoriesFields = [...this._categoriesFields, Math.max(...this._categoriesFields) + 1]; } }>${msg("Add Categories")}</sl-button>
        </div>          </div>

          <div>
        <sl-select name="packaging" .helpText=${msg("Packaging")} required .defaultValue=${ currentRecord.entry.packaging }>
  <sl-option value="Piece">Piece</sl-option>
  <sl-option value="Kilograms">Kilograms</sl-option>
  <sl-option value="Grams">Grams</sl-option>
  <sl-option value="Liters">Liters</sl-option>
  <sl-option value="Pounds">Pounds</sl-option>
  <sl-option value="Ounces">Ounces</sl-option>
</sl-select>          </div>

          <div>
        <sl-input type="number" name="maximum_available" .label=${msg("Maximum Available")}  .defaultValue=${ currentRecord.entry.maximum_available }></sl-input>          </div>

          <div>
        <sl-input type="number" name="price" .label=${msg("Price")}  required .defaultValue=${ currentRecord.entry.price }></sl-input>          </div>

          <div>
        <sl-input type="number" name="vat_percentage" .label=${msg("Vat Percentage")}  required .defaultValue=${ currentRecord.entry.vat_percentage }></sl-input>          </div>

          <div>
        <sl-input type="number" name="margin_percentage" .label=${msg("Margin Percentage")}  .defaultValue=${ currentRecord.entry.margin_percentage }></sl-input>          </div>

          <div>
        <sl-input name="origin" .label=${msg("Origin")}  .defaultValue=${ currentRecord.entry.origin }></sl-input>          </div>

          <div>
        <sl-textarea name="ingredients" .label=${msg("Ingredients")}  .defaultValue=${ currentRecord.entry.ingredients }></sl-textarea>          </div>


          <div class="row" style="gap: 8px;">
            <sl-button
              @click=${() => this.dispatchEvent(new CustomEvent('edit-canceled', {
                bubbles: true,
                composed: true
              }))}
              style="flex: 1;"
            >${msg("Cancel")}</sl-button>
            <sl-button
              type="submit"
              variant="primary"
              style="flex: 1;"
              .loading=${this.committing}
            >${msg("Save")}</sl-button>

          </div>
        </form>
      </sl-card>`;
  }

  render() {
  const product = this.producersStore.products.get(this.productHash).latestVersion.get();

    switch (product.status) {
      case 'pending':
        return html`<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error':
        return html`<display-error
          .headline=${msg("Error fetching the product")}
          .error=${ product.error}
        ></display-error>`;
      case 'completed':
        return this.renderEditForm(product.value);
    }
  }

  static styles = [sharedStyles];
}
