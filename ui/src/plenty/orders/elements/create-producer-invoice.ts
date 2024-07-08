import { LitElement, html } from 'lit';
import { repeat } from "lit/directives/repeat.js";
import { state, property, query, customElement } from 'lit/decorators.js';
import { ActionHash, Record, DnaHash, AgentPubKey, EntryHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { hashProperty, notifyError, hashState, onSubmit, wrapPathInSvg } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiDelete } from "@mdi/js";

import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';

import { appStyles } from '../../../app-styles.js';
import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { ProducerInvoice } from '../types.js';

/**
 * @element create-producer-invoice
 * @fires producer-invoice-created: detail will contain { producerInvoiceHash }
 */
@localized()
@customElement('create-producer-invoice')
export class CreateProducerInvoice extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The order hash for this ProducerInvoice
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
  committing = false;

  /**
   * @internal
   */
  @query('#create-form')
  form!: HTMLFormElement;


  async createProducerInvoice(fields: Partial<ProducerInvoice>) {
    if (this.orderHash === undefined) throw new Error('Cannot create a new Producer Invoice without its order_hash field');
  
    const producerInvoice: ProducerInvoice = {
      order_hash: this.orderHash!,
      invoice: fields.invoice!,
    };

    try {
      this.committing = true;
      const record: EntryRecord<ProducerInvoice> = await this.ordersStore.client.createProducerInvoice(producerInvoice);

      this.dispatchEvent(new CustomEvent('producer-invoice-created', {
        composed: true,
        bubbles: true,
        detail: {
          producerInvoiceHash: record.actionHash
        }
      }));
      
      this.form.reset();
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error creating the producer invoice"));
    }
    this.committing = false;
  }

  render() {
    return html`
      <sl-card style="flex: 1;">
        <span slot="header">${msg("Create Producer Invoice")}</span>

        <form 
          id="create-form"
          class="column"
          style="flex: 1; gap: 16px;"
          ${onSubmit(fields => this.createProducerInvoice(fields))}
        >  
          <upload-files name="invoice" one-file accepted-files="image/jpeg,image/png,image/gif" required></upload-files>

          <sl-button
            variant="primary"
            type="submit"
            .loading=${this.committing}
          >${msg("Create Producer Invoice")}</sl-button>
        </form> 
      </sl-card>`;
  }
  
  static styles = appStyles;
}
