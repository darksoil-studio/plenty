import { LitElement, html } from 'lit';
import { repeat } from "lit/directives/repeat.js";
import { state, customElement, property } from 'lit/decorators.js';
import { ActionHash, Record, EntryHash, AgentPubKey } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { hashState, notifyError, hashProperty, wrapPathInSvg, onSubmit } from '@holochain-open-dev/elements';
import { SignalWatcher, toPromise } from '@holochain-open-dev/signals';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiDelete } from '@mdi/js';

import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';

import { appStyles } from '../../../app-styles.js';
import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { AvailableProducts } from '../types.js';

/**
 * @element edit-available-products
 * @fires available-products-updated: detail will contain { originalAvailableProductsHash, previousAvailableProductsHash, updatedAvailableProductsHash }
 */
@localized()
@customElement('edit-available-products')
export class EditAvailableProducts extends SignalWatcher(LitElement) {

  /**
   * REQUIRED. The hash of the original `Create` action for this AvailableProducts
   */
  @property(hashProperty('available-products-hash'))
  availableProductsHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: ordersStoreContext })
  ordersStore!: OrdersStore;

  /**
   * @internal
   */
  @state()
  committing = false;
   

  async firstUpdated() {
    const currentRecord = await toPromise(this.ordersStore.availableProducts.get(this.availableProductsHash).latestVersion);
    setTimeout(() => {
      (this.shadowRoot?.getElementById('form') as HTMLFormElement).reset();
    });
  }

  async updateAvailableProducts(currentRecord: EntryRecord<AvailableProducts>, fields: Partial<AvailableProducts>) {  
    const availableProducts: AvailableProducts = { 
      order_hash: currentRecord.entry.order_hash!,
      products: currentRecord.entry.products!,
    };

    try {
      this.committing = true;
      const updateRecord = await this.ordersStore.client.updateAvailableProducts(
        this.availableProductsHash,
        currentRecord.actionHash,
        availableProducts
      );
  
      this.dispatchEvent(new CustomEvent('available-products-updated', {
        composed: true,
        bubbles: true,
        detail: {
          originalAvailableProductsHash: this.availableProductsHash,
          previousAvailableProductsHash: currentRecord.actionHash,
          updatedAvailableProductsHash: updateRecord.actionHash
        }
      }));
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error updating the available products"));
    }
    
    this.committing = false;
  }

  renderEditForm(currentRecord: EntryRecord<AvailableProducts>) {
    return html`
      <sl-card>
        <span slot="header">${msg("Edit Available Products")}</span>

        <form
          id="form"
          class="column"
          style="flex: 1; gap: 16px;"
          ${onSubmit(fields => this.updateAvailableProducts(currentRecord, fields))}
        >  

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
  const availableProducts = this.ordersStore.availableProducts.get(this.availableProductsHash).latestVersion.get();

    switch (availableProducts.status) {
      case 'pending':
        return html`<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error':
        return html`<display-error
          .headline=${msg("Error fetching the available products")}
          .error=${ availableProducts.error}
        ></display-error>`;
      case 'completed':
        return this.renderEditForm(availableProducts.value);
    }
  }

  static styles = appStyles;
}
