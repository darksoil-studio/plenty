import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { EntryHash, Record, ActionHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { hashProperty } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';

import { localized, msg } from '@lit/localize';

import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';

import '@holochain-open-dev/file-storage/dist/elements/show-image.js';
import { appStyles } from '../../../app-styles.js';
import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { ProducerInvoice } from '../types.js';

/**
 * @element producer-invoice-summary
 * @fires producer-invoice-selected: detail will contain { producerInvoiceHash }
 */
@localized()
@customElement('producer-invoice-summary')
export class ProducerInvoiceSummary extends SignalWatcher(LitElement) {

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

  renderSummary(entryRecord: EntryRecord<ProducerInvoice>) {
    return html`
      <div class="column" style="gap: 16px;">

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Invoice")}</strong></span>
          <span style="white-space: pre-line"><show-image .imageHash=${ entryRecord.entry.invoice } style="width: 300px; height: 200px"></show-image></span>
        </div>

      </div>
    `;
  }
  
  renderProducerInvoice() {
    const producerInvoice = this.ordersStore.producerInvoices.get(this.producerInvoiceHash).latestVersion.get();

    switch (producerInvoice.status) {
      case 'pending':
        return html`<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error':
        return html`<display-error
          .headline=${msg("Error fetching the producer invoice")}
          .error=${ producerInvoice.error}
        ></display-error>`;
      case 'completed':
        return this.renderSummary(producerInvoice.value);
    }
  }
  
  render() {
    return html`<sl-card style="flex: 1; cursor: grab;" @click=${() => this.dispatchEvent(new CustomEvent('producer-invoice-selected', {
      composed: true,
      bubbles: true,
      detail: {
        producerInvoiceHash: this.producerInvoiceHash
      }
    }))}>
      ${this.renderProducerInvoice()}
    </sl-card>`;
  }

  
  static styles = appStyles;
}
