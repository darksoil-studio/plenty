import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { EntryHash, Record, ActionHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { subscribe } from '@holochain-open-dev/stores';
import { renderAsyncStatus, hashProperty, sharedStyles } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';

import { localized, msg } from '@lit/localize';

import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';

import '@holochain-open-dev/file-storage/dist/elements/show-image.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import { HouseholdsStore } from '../households-store.js';
import { householdsStoreContext } from '../context.js';
import { Household } from '../types.js';

/**
 * @element household-summary
 * @fires household-selected: detail will contain { householdHash }
 */
@localized()
@customElement('household-summary')
export class HouseholdSummary extends LitElement {

  // REQUIRED. The hash of the Household to show
  @property(hashProperty('household-hash'))
  householdHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  renderSummary(entryRecord: EntryRecord<Household>) {
    return html`
      <div class="column" style="gap: 16px;">

          <div class="column" style="gap: 8px">
	        <span><strong>${msg("Name")}</strong></span>
 	        <span style="white-space: pre-line">${entryRecord.entry.name}</span>
	  </div>

          <div class="column" style="gap: 8px">
	        <span><strong>${msg("Avatar")}</strong></span>
 	        <span style="white-space: pre-line"><show-image .imageHash=${entryRecord.entry.avatar} style="width: 300px; height: 200px"></show-image></span>
	  </div>

      </div>
    `;
  }

  renderHousehold() {
    return html`${subscribe(this.householdsStore.households.get(this.householdHash).latestVersion,
      renderAsyncStatus({
        complete: household => this.renderSummary(household),
        pending: () => html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`,
        error: e => html`<display-error
          .headline=${msg("Error fetching the household")}
          .error=${e}
        ></display-error>`
      })
    )}`;
  }

  render() {
    return html`<sl-card style="flex: 1; cursor: grab;" @click=${() => this.dispatchEvent(new CustomEvent('household-selected', {
      composed: true,
      bubbles: true,
      detail: {
        householdHash: this.householdHash
      }
    }))}>
        ${this.renderHousehold()}
    </sl-card>`;
  }

  static styles = [sharedStyles];
}
