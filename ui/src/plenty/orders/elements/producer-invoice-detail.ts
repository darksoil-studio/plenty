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
import '@holochain-open-dev/file-storage/dist/elements/show-image.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

import { appStyles } from '../../../app-styles.js';
import './edit-producer-invoice.js';

import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { ProducerInvoice } from '../types.js';

/**
 * @element producer-invoice-detail
 * @fires producer-invoice-deleted: detail will contain { producerInvoiceHash }
 */
@localized()
@customElement('producer-invoice-detail')
export class ProducerInvoiceDetail extends SignalWatcher(LitElement) {

  /**
   * REQUIRED. The hash of the ProducerInvoice to show
   */
  @property(hashProperty('producer-invoice-hash'))
  producerInvoiceHash!: ActionHash;

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

  async deleteProducerInvoice() {
    try {
      await this.ordersStore.client.deleteProducerInvoice(this.producerInvoiceHash);
 
      this.dispatchEvent(new CustomEvent('producer-invoice-deleted', {
        bubbles: true,
        composed: true,
        detail: {
          producerInvoiceHash: this.producerInvoiceHash
        }
      }));
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error deleting the producer invoice"));
    }
  }

  renderDetail(entryRecord: EntryRecord<ProducerInvoice>) {
    return html`
      <sl-card>
      	<div slot="header" class="row" style="gap: 8px">
          <span style="font-size: 18px; flex: 1;">${msg("Producer Invoice")}</span>

          <sl-icon-button .src=${wrapPathInSvg(mdiPencil)} @click=${() => { this._editing = true; } }></sl-icon-button>
          <sl-icon-button .src=${wrapPathInSvg(mdiDelete)} @click=${() => this.deleteProducerInvoice()}></sl-icon-button>
        </div>

        <div class="column" style="gap: 16px;">
  
          <div class="column" style="gap: 8px;">
	        <span><strong>${msg("Invoice")}</strong></span>
 	        <span style="white-space: pre-line"><show-image .imageHash=${ entryRecord.entry.invoice } style="width: 300px; height: 200px"></show-image></span>
	  </div>

      </div>
      </sl-card>
    `;
  }
  
  render() {
    const producerInvoice = this.ordersStore.producerInvoices.get(this.producerInvoiceHash).latestVersion.get();

    switch (producerInvoice.status) {
      case 'pending': 
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error': 
        return html`<display-error
          .headline=${msg("Error fetching the producer invoice")}
          .error=${ producerInvoice.error}
        ></display-error>`;
      case 'completed':
        if (this._editing) {
      	  return html`<edit-producer-invoice
      	    .producerInvoiceHash=${this.producerInvoiceHash}
            @producer-invoice-updated=${async () => { this._editing = false; } }
    	    @edit-canceled=${() => { this._editing = false; } }
      	    style="display: flex; flex: 1;"
      	  ></edit-producer-invoice>`;
        }

          return this.renderDetail(producerInvoice.value);
    }
  }
  
  static styles = appStyles;
}
