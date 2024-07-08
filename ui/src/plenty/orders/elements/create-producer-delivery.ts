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

import '@shoelace-style/shoelace/dist/components/alert/alert.js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import { appStyles } from '../../../app-styles.js';
import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { ProducerDelivery } from '../types.js';

/**
 * @element create-producer-delivery
 * @fires producer-delivery-created: detail will contain { producerDeliveryHash }
 */
@localized()
@customElement('create-producer-delivery')
export class CreateProducerDelivery extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The order hash for this ProducerDelivery
   */
  @property(hashProperty('order-hash'))
  orderHash!: ActionHash;

  /**
   * REQUIRED. The products for this ProducerDelivery
   */
  @property()
  products!: Array<ActionHash>;


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


  async createProducerDelivery(fields: Partial<ProducerDelivery>) {
    if (this.orderHash === undefined) throw new Error('Cannot create a new Producer Delivery without its order_hash field');
    if (this.products === undefined) throw new Error('Cannot create a new Producer Delivery without its products field');
  
    const producerDelivery: ProducerDelivery = {
      order_hash: this.orderHash!,
      products: this.products!,
    };

    try {
      this.committing = true;
      const record: EntryRecord<ProducerDelivery> = await this.ordersStore.client.createProducerDelivery(producerDelivery);

      this.dispatchEvent(new CustomEvent('producer-delivery-created', {
        composed: true,
        bubbles: true,
        detail: {
          producerDeliveryHash: record.actionHash
        }
      }));
      
      this.form.reset();
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error creating the producer delivery"));
    }
    this.committing = false;
  }

  render() {
    return html`
      <sl-card style="flex: 1;">
        <span slot="header">${msg("Create Producer Delivery")}</span>

        <form 
          id="create-form"
          class="column"
          style="flex: 1; gap: 16px;"
          ${onSubmit(fields => this.createProducerDelivery(fields))}
        >  

          <sl-button
            variant="primary"
            type="submit"
            .loading=${this.committing}
          >${msg("Create Producer Delivery")}</sl-button>
        </form> 
      </sl-card>`;
  }
  
  static styles = appStyles;
}
