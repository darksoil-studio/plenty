import { LitElement, html } from 'lit';
import { repeat } from "lit/directives/repeat.js";
import { state, customElement, property } from 'lit/decorators.js';
import { ActionHash, Record, EntryHash, AgentPubKey } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { hashState, notifyError, hashProperty, wrapPathInSvg, onSubmit } from '@holochain-open-dev/elements';
import { SignalWatcher, toPromise } from '@holochain-open-dev/signals';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiDelete } from '@mdi/js';

import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';

import { appStyles } from '../../../app-styles.js';
import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { ProducerInvoice } from '../types.js';

/**
 * @element edit-producer-invoice
 * @fires producer-invoice-updated: detail will contain { previousProducerInvoiceHash, updatedProducerInvoiceHash }
 */
@localized()
@customElement('edit-producer-invoice')
export class EditProducerInvoice extends SignalWatcher(LitElement) {

  /**
   * REQUIRED. The hash of the original `Create` action for this ProducerInvoice
   */
  @property(hashProperty('producer-invoice-hash'))
  producerInvoiceHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: ordersStoreContext })
  ordersStore!: OrdersStore;

  /**
   * @internal
   */
  @state()
  committing = false;
   

  async firstUpdated() {
    const currentRecord = await toPromise(this.ordersStore.producerInvoices.get(this.producerInvoiceHash).latestVersion);
    setTimeout(() => {
      (this.shadowRoot?.getElementById('form') as HTMLFormElement).reset();
    });
  }

  async updateProducerInvoice(currentRecord: EntryRecord<ProducerInvoice>, fields: Partial<ProducerInvoice>) {  
    const producerInvoice: ProducerInvoice = { 
      order_hash: currentRecord.entry.order_hash!,
      invoice: fields.invoice!,
    };

    try {
      this.committing = true;
      const updateRecord = await this.ordersStore.client.updateProducerInvoice(
        currentRecord.actionHash,
        producerInvoice
      );
  
      this.dispatchEvent(new CustomEvent('producer-invoice-updated', {
        composed: true,
        bubbles: true,
        detail: {
          previousProducerInvoiceHash: currentRecord.actionHash,
          updatedProducerInvoiceHash: updateRecord.actionHash
        }
      }));
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error updating the producer invoice"));
    }
    
    this.committing = false;
  }

  renderEditForm(currentRecord: EntryRecord<ProducerInvoice>) {
    return html`
      <sl-card>
        <span slot="header">${msg("Edit Producer Invoice")}</span>

        <form
          id="form"
          class="column"
          style="flex: 1; gap: 16px;"
          ${onSubmit(fields => this.updateProducerInvoice(currentRecord, fields))}
        >  
        <upload-files name="invoice" one-file accepted-files="image/jpeg,image/png,image/gif" required .defaultValue=${ currentRecord.entry.invoice }></upload-files>

          <div class="row" style="gap: 8px;">
            <sl-button
              @click=${() => this.dispatchEvent(new CustomEvent('edit-canceled', {
                bubbles: true,
                composed: true
              }))}
              style="flex: 1;"
            >${msg("Cancel")}</sl-button>
            <sl-button
              type="submit"
              variant="primary"
              style="flex: 1;"
              .loading=${this.committing}
            >${msg("Save")}</sl-button>

          </div>
        </form>
      </sl-card>`;
  }

  render() {
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
        return this.renderEditForm(producerInvoice.value);
    }
  }

  static styles = appStyles;
}
