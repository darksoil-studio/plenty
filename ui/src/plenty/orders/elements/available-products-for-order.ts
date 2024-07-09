
import { LitElement, html } from 'lit';
import { state, customElement, property } from 'lit/decorators.js';
import { Record, EntryHash, ActionHash, AgentPubKey } from '@holochain/client';
import { AsyncComputed, SignalWatcher } from '@holochain-open-dev/signals';
import { EntryRecord, slice} from '@holochain-open-dev/utils';
import { hashProperty, wrapPathInSvg } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiInformationOutline } from '@mdi/js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';


import { appStyles } from '../../../app-styles.js';
import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { AvailableProducts } from '../types.js';

import './available-products-summary.js';

/**
 * @element available-products-for-order
 */
@localized()
@customElement('available-products-for-order')
export class AvailableProductsForOrder extends SignalWatcher(LitElement) {

  /**
   * REQUIRED. The OrderHash for which the AvailableProducts should be fetched
   */
  @property(hashProperty('order-hash'))
  orderHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: ordersStoreContext, subscribe: true })
  ordersStore!: OrdersStore;
 

  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0) 
      return html` <div class="column center-content" style="gap: 16px;">
        <sl-icon
          style="color: grey; height: 64px; width: 64px;"
          .src=${wrapPathInSvg(mdiInformationOutline)}
        ></sl-icon>
        <span class="placeholder">${msg("No available products found for this order")}</span>
      </div>`;

    return html`
      <div style="display: flex; flex-direction: column">
        ${hashes.map(hash =>
          html`<available-products-summary .availableProductsHash=${hash}></available-products-summary>`
        )}
      </div>
    `;
  }

  render() {
    const map = this.ordersStore.orders.get(this.orderHash).availableProducts.live.get();

    switch (map.status) {
      case 'pending': 
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error': 
        return html`<display-error
          .headline=${msg("Error fetching the available products")}
          .error=${map.error}
        ></display-error>`;
      case 'completed':
        return this.renderList(Array.from(map.value.keys()));
    }
  }
  
  static styles = appStyles;
}
