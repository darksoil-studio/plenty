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
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';

import '@shoelace-style/shoelace/dist/components/card/card.js';
import { appStyles } from '../../../app-styles.js';
import { OrdersStore } from '../orders-store.js';
import { ordersStoreContext } from '../context.js';
import { AvailableProducts } from '../types.js';

/**
 * @element create-available-products
 * @fires available-products-created: detail will contain { availableProductsHash }
 */
@localized()
@customElement('create-available-products')
export class CreateAvailableProducts extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The order hash for this AvailableProducts
   */
  @property(hashProperty('order-hash'))
  orderHash!: ActionHash;

  /**
   * REQUIRED. The products for this AvailableProducts
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


  async createAvailableProducts(fields: Partial<AvailableProducts>) {
    if (this.orderHash === undefined) throw new Error('Cannot create a new Available Products without its order_hash field');
    if (this.products === undefined) throw new Error('Cannot create a new Available Products without its products field');
  
    const availableProducts: AvailableProducts = {
      order_hash: this.orderHash!,
      products: this.products!,
    };

    try {
      this.committing = true;
      const record: EntryRecord<AvailableProducts> = await this.ordersStore.client.createAvailableProducts(availableProducts);

      this.dispatchEvent(new CustomEvent('available-products-created', {
        composed: true,
        bubbles: true,
        detail: {
          availableProductsHash: record.actionHash
        }
      }));
      
      this.form.reset();
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error creating the available products"));
    }
    this.committing = false;
  }

  render() {
    return html`
      <sl-card style="flex: 1;">
        <span slot="header">${msg("Create Available Products")}</span>

        <form 
          id="create-form"
          class="column"
          style="flex: 1; gap: 16px;"
          ${onSubmit(fields => this.createAvailableProducts(fields))}
        >  

          <sl-button
            variant="primary"
            type="submit"
            .loading=${this.committing}
          >${msg("Create Available Products")}</sl-button>
        </form> 
      </sl-card>`;
  }
  
  static styles = appStyles;
}
