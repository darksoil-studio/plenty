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
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

import { appStyles } from '../../../app-styles.js';
import './edit-household-order.js';

import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { HouseholdOrder } from '../types.js';

/**
 * @element household-order-detail
 * @fires household-order-deleted: detail will contain { householdOrderHash }
 */
@localized()
@customElement('household-order-detail')
export class HouseholdOrderDetail extends SignalWatcher(LitElement) {

  /**
   * REQUIRED. The hash of the HouseholdOrder to show
   */
  @property(hashProperty('household-order-hash'))
  householdOrderHash!: ActionHash;

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

  async deleteHouseholdOrder() {
    try {
      await this.ordersStore.client.deleteHouseholdOrder(this.householdOrderHash);
 
      this.dispatchEvent(new CustomEvent('household-order-deleted', {
        bubbles: true,
        composed: true,
        detail: {
          householdOrderHash: this.householdOrderHash
        }
      }));
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error deleting the household order"));
    }
  }

  renderDetail(entryRecord: EntryRecord<HouseholdOrder>) {
    return html`
      <sl-card>
      	<div slot="header" class="row" style="gap: 8px">
          <span style="font-size: 18px; flex: 1;">${msg("Household Order")}</span>

          <sl-icon-button .src=${wrapPathInSvg(mdiPencil)} @click=${() => { this._editing = true; } }></sl-icon-button>
          <sl-icon-button .src=${wrapPathInSvg(mdiDelete)} @click=${() => this.deleteHouseholdOrder()}></sl-icon-button>
        </div>

        <div class="column" style="gap: 16px;">
  
      </div>
      </sl-card>
    `;
  }
  
  render() {
    const householdOrder = this.ordersStore.householdOrders.get(this.householdOrderHash).latestVersion.get();

    switch (householdOrder.status) {
      case 'pending': 
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error': 
        return html`<display-error
          .headline=${msg("Error fetching the household order")}
          .error=${ householdOrder.error}
        ></display-error>`;
      case 'completed':
        if (this._editing) {
      	  return html`<edit-household-order
      	    .householdOrderHash=${this.householdOrderHash}
            @household-order-updated=${async () => { this._editing = false; } }
    	    @edit-canceled=${() => { this._editing = false; } }
      	    style="display: flex; flex: 1;"
      	  ></edit-household-order>`;
        }

          return this.renderDetail(householdOrder.value);
    }
  }
  
  static styles = appStyles;
}
