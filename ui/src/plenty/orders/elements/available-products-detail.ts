import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { EntryHash, Record, ActionHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { hashProperty, wrapPathInSvg, notifyError } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiPencil, mdiDelete } from '@mdi/js';


import '@shoelace-style/shoelace/dist/components/card/card.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import { appStyles } from '../../../app-styles.js';
import './edit-available-products.js';

import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { AvailableProducts } from '../types.js';

/**
 * @element available-products-detail
 * @fires available-products-deleted: detail will contain { availableProductsHash }
 */
@localized()
@customElement('available-products-detail')
export class AvailableProductsDetail extends SignalWatcher(LitElement) {

  /**
   * REQUIRED. The hash of the AvailableProducts to show
   */
  @property(hashProperty('available-products-hash'))
  availableProductsHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: ordersStoreContext, subscribe: true })
  ordersStore!: OrdersStore;

  /**
   * @internal
   */
  @state()
  _editing = false;

  async deleteAvailableProducts() {
    try {
      await this.ordersStore.client.deleteAvailableProducts(this.availableProductsHash);
 
      this.dispatchEvent(new CustomEvent('available-products-deleted', {
        bubbles: true,
        composed: true,
        detail: {
          availableProductsHash: this.availableProductsHash
        }
      }));
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error deleting the available products"));
    }
  }

  renderDetail(entryRecord: EntryRecord<AvailableProducts>) {
    return html`
      <sl-card>
      	<div slot="header" class="row" style="gap: 8px">
          <span style="font-size: 18px; flex: 1;">${msg("Available Products")}</span>

          <sl-icon-button .src=${wrapPathInSvg(mdiPencil)} @click=${() => { this._editing = true; } }></sl-icon-button>
          <sl-icon-button .src=${wrapPathInSvg(mdiDelete)} @click=${() => this.deleteAvailableProducts()}></sl-icon-button>
        </div>

        <div class="column" style="gap: 16px;">
  
      </div>
      </sl-card>
    `;
  }
  
  render() {
    const availableProducts = this.ordersStore.availableProducts.get(this.availableProductsHash).latestVersion.get();

    switch (availableProducts.status) {
      case 'pending': 
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error': 
        return html`<display-error
          .headline=${msg("Error fetching the available products")}
          .error=${ availableProducts.error}
        ></display-error>`;
      case 'completed':
        if (this._editing) {
      	  return html`<edit-available-products
      	    .availableProductsHash=${this.availableProductsHash}
            @available-products-updated=${async () => { this._editing = false; } }
    	    @edit-canceled=${() => { this._editing = false; } }
      	    style="display: flex; flex: 1;"
      	  ></edit-available-products>`;
        }

          return this.renderDetail(availableProducts.value);
    }
  }
  
  static styles = appStyles;
}
