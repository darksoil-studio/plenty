import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { EntryHash, Record, ActionHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { hashProperty } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';

import { localized, msg } from '@lit/localize';


import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { appStyles } from '../../../app-styles.js';
import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { AvailableProducts } from '../types.js';

/**
 * @element available-products-summary
 * @fires available-products-selected: detail will contain { availableProductsHash }
 */
@localized()
@customElement('available-products-summary')
export class AvailableProductsSummary extends SignalWatcher(LitElement) {

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

  renderSummary(entryRecord: EntryRecord<AvailableProducts>) {
    return html`
      <div class="column" style="gap: 16px;">

      </div>
    `;
  }
  
  renderAvailableProducts() {
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
        return this.renderSummary(availableProducts.value);
    }
  }
  
  render() {
    return html`<sl-card style="flex: 1; cursor: grab;" @click=${() => this.dispatchEvent(new CustomEvent('available-products-selected', {
      composed: true,
      bubbles: true,
      detail: {
        availableProductsHash: this.availableProductsHash
      }
    }))}>
      ${this.renderAvailableProducts()}
    </sl-card>`;
  }

  
  static styles = appStyles;
}
