import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { EntryHash, Record, ActionHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { hashProperty, wrapPathInSvg, notifyError } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiPencil, mdiDelete } from '@mdi/js';

import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import { appStyles } from '../../../app-styles.js';
import './edit-order.js';

import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { Order, OrderStatus } from '../types.js';

/**
 * @element order-detail
 * @fires order-deleted: detail will contain { orderHash }
 */
@localized()
@customElement('order-detail')
export class OrderDetail extends SignalWatcher(LitElement) {

  /**
   * REQUIRED. The hash of the Order to show
   */
  @property(hashProperty('order-hash'))
  orderHash!: ActionHash;

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

  async deleteOrder() {
    try {
      await this.ordersStore.client.deleteOrder(this.orderHash);
 
      this.dispatchEvent(new CustomEvent('order-deleted', {
        bubbles: true,
        composed: true,
        detail: {
          orderHash: this.orderHash
        }
      }));
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error deleting the order"));
    }
  }

  renderDetail(entryRecord: EntryRecord<Order>) {
    return html`
      <sl-card>
      	<div slot="header" class="row" style="gap: 8px">
          <span style="font-size: 18px; flex: 1;">${msg("Order")}</span>

          <sl-icon-button .src=${wrapPathInSvg(mdiPencil)} @click=${() => { this._editing = true; } }></sl-icon-button>
          <sl-icon-button .src=${wrapPathInSvg(mdiDelete)} @click=${() => this.deleteOrder()}></sl-icon-button>
        </div>

        <div class="column" style="gap: 16px;">
  
          <div class="column" style="gap: 8px;">
	        <span><strong>${msg("Name")}</strong></span>
 	        <span style="white-space: pre-line">${ entryRecord.entry.name }</span>
	  </div>

      </div>
      </sl-card>
    `;
  }
  
  render() {
    const order = this.ordersStore.orders.get(this.orderHash).latestVersion.get();

    switch (order.status) {
      case 'pending': 
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error': 
        return html`<display-error
          .headline=${msg("Error fetching the order")}
          .error=${ order.error}
        ></display-error>`;
      case 'completed':
        if (this._editing) {
      	  return html`<edit-order
      	    .orderHash=${this.orderHash}
            @order-updated=${async () => { this._editing = false; } }
    	    @edit-canceled=${() => { this._editing = false; } }
      	    style="display: flex; flex: 1;"
      	  ></edit-order>`;
        }

          return this.renderDetail(order.value);
    }
  }
  
  static styles = appStyles;
}
