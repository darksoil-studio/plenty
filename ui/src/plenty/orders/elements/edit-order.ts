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

import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';

import '@shoelace-style/shoelace/dist/components/card/card.js';
import { appStyles } from '../../../app-styles.js';
import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { Order, OrderStatus } from '../types.js';

/**
 * @element edit-order
 * @fires order-updated: detail will contain { originalOrderHash, previousOrderHash, updatedOrderHash }
 */
@localized()
@customElement('edit-order')
export class EditOrder extends SignalWatcher(LitElement) {

  /**
   * REQUIRED. The hash of the original `Create` action for this Order
   */
  @property(hashProperty('order-hash'))
  orderHash!: ActionHash;

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
    const currentRecord = await toPromise(this.ordersStore.orders.get(this.orderHash).latestVersion);
    setTimeout(() => {
      (this.shadowRoot?.getElementById('form') as HTMLFormElement).reset();
    });
  }

  async updateOrder(currentRecord: EntryRecord<Order>, fields: Partial<Order>) {  
    const order: Order = { 
      name: fields.name!,
      status: currentRecord.entry.status!,
    };

    try {
      this.committing = true;
      const updateRecord = await this.ordersStore.client.updateOrder(
        this.orderHash,
        currentRecord.actionHash,
        order
      );
  
      this.dispatchEvent(new CustomEvent('order-updated', {
        composed: true,
        bubbles: true,
        detail: {
          originalOrderHash: this.orderHash,
          previousOrderHash: currentRecord.actionHash,
          updatedOrderHash: updateRecord.actionHash
        }
      }));
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error updating the order"));
    }
    
    this.committing = false;
  }

  renderEditForm(currentRecord: EntryRecord<Order>) {
    return html`
      <sl-card>
        <span slot="header">${msg("Edit Order")}</span>

        <form
          id="form"
          class="column"
          style="flex: 1; gap: 16px;"
          ${onSubmit(fields => this.updateOrder(currentRecord, fields))}
        >  
        <sl-input name="name" .label=${msg("Name")}  required .defaultValue=${ currentRecord.entry.name }></sl-input>

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
  const order = this.ordersStore.orders.get(this.orderHash).latestVersion.get();

    switch (order.status) {
      case 'pending':
        return html`<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error':
        return html`<display-error
          .headline=${msg("Error fetching the order")}
          .error=${ order.error}
        ></display-error>`;
      case 'completed':
        return this.renderEditForm(order.value);
    }
  }

  static styles = appStyles;
}
