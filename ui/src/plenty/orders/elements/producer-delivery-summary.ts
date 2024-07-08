import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { EntryHash, Record, ActionHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { hashProperty } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';

import { localized, msg } from '@lit/localize';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

import { appStyles } from '../../../app-styles.js';
import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { ProducerDelivery } from '../types.js';

/**
 * @element producer-delivery-summary
 * @fires producer-delivery-selected: detail will contain { producerDeliveryHash }
 */
@localized()
@customElement('producer-delivery-summary')
export class ProducerDeliverySummary extends SignalWatcher(LitElement) {

  /**
   * REQUIRED. The hash of the ProducerDelivery to show
   */
  @property(hashProperty('producer-delivery-hash'))
  producerDeliveryHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: ordersStoreContext, subscribe: true })
  ordersStore!: OrdersStore;

  renderSummary(entryRecord: EntryRecord<ProducerDelivery>) {
    return html`
      <div class="column" style="gap: 16px;">

      </div>
    `;
  }
  
  renderProducerDelivery() {
    const producerDelivery = this.ordersStore.producerDeliveries.get(this.producerDeliveryHash).latestVersion.get();

    switch (producerDelivery.status) {
      case 'pending':
        return html`<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error':
        return html`<display-error
          .headline=${msg("Error fetching the producer delivery")}
          .error=${ producerDelivery.error}
        ></display-error>`;
      case 'completed':
        return this.renderSummary(producerDelivery.value);
    }
  }
  
  render() {
    return html`<sl-card style="flex: 1; cursor: grab;" @click=${() => this.dispatchEvent(new CustomEvent('producer-delivery-selected', {
      composed: true,
      bubbles: true,
      detail: {
        producerDeliveryHash: this.producerDeliveryHash
      }
    }))}>
      ${this.renderProducerDelivery()}
    </sl-card>`;
  }

  
  static styles = appStyles;
}
