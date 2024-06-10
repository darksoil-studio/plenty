import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { EntryHash, Record, ActionHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { hashProperty, sharedStyles } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';

import { localized, msg } from '@lit/localize';


import '@holochain-open-dev/file-storage/dist/elements/show-image.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import { ProducersStore } from '../producers-store.js';
import { producersStoreContext } from '../context.js';
import { Producer, ProducerEditors, ProducerSorters } from '../types.js';

/**
 * @element producer-summary
 * @fires producer-selected: detail will contain { producerHash }
 */
@localized()
@customElement('producer-summary')
export class ProducerSummary extends SignalWatcher(LitElement) {

  /**
   * REQUIRED. The hash of the Producer to show
   */
  @property(hashProperty('producer-hash'))
  producerHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: producersStoreContext, subscribe: true })
  producersStore!: ProducersStore;

  renderSummary(entryRecord: EntryRecord<Producer>) {
    return html`
      <div class="column" style="gap: 16px;">

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Name")}</strong></span>
          <span style="white-space: pre-line">${ entryRecord.entry.name }</span>
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Photo")}</strong></span>
          <span style="white-space: pre-line"><show-image .imageHash=${ entryRecord.entry.photo } style="width: 300px; height: 200px"></show-image></span>
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Contact Email")}</strong></span>
          <span style="white-space: pre-line">${ entryRecord.entry.contact_email }</span>
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Phone Number")}</strong></span>
          <span style="white-space: pre-line">${ entryRecord.entry.phone_number }</span>
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Location")}</strong></span>
          <span style="white-space: pre-line">${ entryRecord.entry.location }</span>
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Producer Details")}</strong></span>
          <span style="white-space: pre-line">${ entryRecord.entry.producer_details }</span>
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Editors")}</strong></span>
          <span style="white-space: pre-line">${  entryRecord.entry.editors.type === 'Liason' ? "Liason" :  entryRecord.entry.editors.type === 'AllMembers' ? "All Members" :  "Members"  }</span>
        </div>

        <div class="column" style="gap: 8px">
          <span><strong>${msg("Sorters")}</strong></span>
          <span style="white-space: pre-line">${  entryRecord.entry.sorters.type === 'Liason' ? "Liason" :  "Members"  }</span>
        </div>

      </div>
    `;
  }
  
  renderProducer() {
    const producer = this.producersStore.producers.get(this.producerHash).latestVersion.get();

    switch (producer.status) {
      case 'pending':
        return html`<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error':
        return html`<display-error
          .headline=${msg("Error fetching the producer")}
          .error=${ producer.error}
        ></display-error>`;
      case 'completed':
        return this.renderSummary(producer.value);
    }
  }
  
  render() {
    return html`<sl-card style="flex: 1; cursor: grab;" @click=${() => this.dispatchEvent(new CustomEvent('producer-selected', {
      composed: true,
      bubbles: true,
      detail: {
        producerHash: this.producerHash
      }
    }))}>
      ${this.renderProducer()}
    </sl-card>`;
  }

  
  static styles = [sharedStyles];
}
