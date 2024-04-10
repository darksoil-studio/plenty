import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { EntryHash, Record, ActionHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { subscribe } from '@holochain-open-dev/stores';
import { renderAsyncStatus, sharedStyles, hashProperty, wrapPathInSvg, notifyError } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiPencil, mdiDelete } from '@mdi/js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@holochain-open-dev/file-storage/dist/elements/show-image.js';
import './edit-household.js';

import { HouseholdStore } from '../household-store.js';
import { householdStoreContext } from '../context.js';
import { Household } from '../types.js';

/**
 * @element household-detail
 * @fires household-deleted: detail will contain { householdHash }
 */
@localized()
@customElement('household-detail')
export class HouseholdDetail extends LitElement {

  // REQUIRED. The hash of the Household to show
  @property(hashProperty('household-hash'))
  householdHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: householdStoreContext, subscribe: true })
  householdStore!: HouseholdStore;

  /**
   * @internal
   */
  @state()
  _editing = false;

  async deleteHousehold() {
    try {
      await this.householdStore.client.deleteHousehold(this.householdHash);
 
      this.dispatchEvent(new CustomEvent('household-deleted', {
        bubbles: true,
        composed: true,
        detail: {
          householdHash: this.householdHash
        }
      }));
    } catch (e: any) {
      console.error(e);
      notifyError(msg("Error deleting the household"));
    }
  }

  renderDetail(entryRecord: EntryRecord<Household>) {
    return html`
      <sl-card>
      	<div slot="header" class="row" style="gap: 8px">
          <span style="font-size: 18px; flex: 1;">${msg("Household")}</span>

          <sl-icon-button .src=${wrapPathInSvg(mdiPencil)} @click=${() => { this._editing = true; } }></sl-icon-button>
          <sl-icon-button .src=${wrapPathInSvg(mdiDelete)} @click=${() => this.deleteHousehold()}></sl-icon-button>
        </div>

        <div class="column" style="gap: 16px;">
  
          <div class="column" style="gap: 8px;">
	        <span><strong>${msg("Name")}</strong></span>
 	        <span style="white-space: pre-line">${ entryRecord.entry.name }</span>
	  </div>

          <div class="column" style="gap: 8px;">
	        <span><strong>${msg("Avatar")}</strong></span>
 	        <span style="white-space: pre-line"><show-image .imageHash=${ entryRecord.entry.avatar } style="width: 300px; height: 200px"></show-image></span>
	  </div>

      </div>
      </sl-card>
    `;
  }
  
  render() {
    return html`${subscribe(this.householdStore.households.get(this.householdHash).latestVersion,
      renderAsyncStatus({
        complete: household => {
          if (this._editing) {
      	  return html`<edit-household
      	    .originalHouseholdHash=${this.householdHash}
      	    .currentRecord=${ household }
              @household-updated=${async () => { this._editing = false; } }
        	    @edit-canceled=${() => { this._editing = false; } }
      	    style="display: flex; flex: 1;"
      	  ></edit-household>`;
        }

          return this.renderDetail(household);
        },
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
  
  static styles = [sharedStyles];
}
