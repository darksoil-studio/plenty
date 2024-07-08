import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { EntryHash, Record, ActionHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { hashProperty, wrapPathInSvg, notifyError } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiPencil, mdiDelete } from '@mdi/js';

import '@shoelace-style/shoelace/dist/components/button/button.js';

import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import { appStyles } from '../../../app-styles.js';
import './edit-producer-delivery.js';

import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { ProducerDelivery } from '../types.js';

/**
 * @element producer-delivery-detail
 * @fires producer-delivery-deleted: detail will contain { producerDeliveryHash }
 */
@localized()
@customElement('producer-delivery-detail')
export class ProducerDeliveryDetail extends SignalWatcher(LitElement) {

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

  /**
   * @internal
   */
  @state()
  _editing = false;

  async deleteProducerDelivery() {
    try {
      await this.ordersStore.client.deleteProducerDelivery(this.producerDeliveryHash);
 
      this.dispatchEvent(new CustomEvent('producer-delivery-deleted', {
        bubbles: true,
        composed: true,
        detail: {
          producerDeliveryHash: this.producerDeliveryHash
        }
      }));
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error deleting the producer delivery"));
    }
  }

  renderDetail(entryRecord: EntryRecord<ProducerDelivery>) {
    return html`
      <sl-card>
      	<div slot="header" class="row" style="gap: 8px">
          <span style="font-size: 18px; flex: 1;">${msg("Producer Delivery")}</span>

          <sl-icon-button .src=${wrapPathInSvg(mdiPencil)} @click=${() => { this._editing = true; } }></sl-icon-button>
          <sl-icon-button .src=${wrapPathInSvg(mdiDelete)} @click=${() => this.deleteProducerDelivery()}></sl-icon-button>
        </div>

        <div class="column" style="gap: 16px;">
  
      </div>
      </sl-card>
    `;
  }
  
  render() {
    const producerDelivery = this.ordersStore.producerDeliveries.get(this.producerDeliveryHash).latestVersion.get();

    switch (producerDelivery.status) {
      case 'pending': 
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error': 
        return html`<display-error
          .headline=${msg("Error fetching the producer delivery")}
          .error=${ producerDelivery.error}
        ></display-error>`;
      case 'completed':
        if (this._editing) {
      	  return html`<edit-producer-delivery
      	    .producerDeliveryHash=${this.producerDeliveryHash}
            @producer-delivery-updated=${async () => { this._editing = false; } }
    	    @edit-canceled=${() => { this._editing = false; } }
      	    style="display: flex; flex: 1;"
      	  ></edit-producer-delivery>`;
        }

          return this.renderDetail(producerDelivery.value);
    }
  }
  
  static styles = appStyles;
}
