import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { EntryHash, Record, ActionHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { hashProperty } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';

import { localized, msg } from '@lit/localize';

import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';

import { appStyles } from '../../../app-styles.js';
import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { HouseholdOrder } from '../types.js';

/**
 * @element household-order-summary
 * @fires household-order-selected: detail will contain { householdOrderHash }
 */
@localized()
@customElement('household-order-summary')
export class HouseholdOrderSummary extends SignalWatcher(LitElement) {

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

  renderSummary(entryRecord: EntryRecord<HouseholdOrder>) {
    return html`
      <div class="column" style="gap: 16px;">

      </div>
    `;
  }
  
  renderHouseholdOrder() {
    const householdOrder = this.ordersStore.householdOrders.get(this.householdOrderHash).latestVersion.get();

    switch (householdOrder.status) {
      case 'pending':
        return html`<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error':
        return html`<display-error
          .headline=${msg("Error fetching the household order")}
          .error=${ householdOrder.error}
        ></display-error>`;
      case 'completed':
        return this.renderSummary(householdOrder.value);
    }
  }
  
  render() {
    return html`<sl-card style="flex: 1; cursor: grab;" @click=${() => this.dispatchEvent(new CustomEvent('household-order-selected', {
      composed: true,
      bubbles: true,
      detail: {
        householdOrderHash: this.householdOrderHash
      }
    }))}>
      ${this.renderHouseholdOrder()}
    </sl-card>`;
  }

  
  static styles = appStyles;
}
