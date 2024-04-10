import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { AgentPubKey, EntryHash, ActionHash, Record } from '@holochain/client';
import { consume } from '@lit/context';
import { hashProperty, sharedStyles, wrapPathInSvg, renderAsyncStatus } from '@holochain-open-dev/elements';
import { subscribe } from '@holochain-open-dev/stores';
import { localized, msg } from '@lit/localize';
import { mdiInformationOutline } from '@mdi/js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';

import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';

import { HouseholdStore } from '../household-store.js';
import { householdStoreContext } from '../context.js';

/**
 * @element members-for-household
 */
@localized()
@customElement('members-for-household')
export class MembersForHousehold extends LitElement {

  // REQUIRED. The HouseholdHash for which the Members should be fetched
  @property(hashProperty('household-hash'))
  householdHash!: ActionHash; 

  /**
   * @internal
   */
  @consume({ context: householdStoreContext, subscribe: true })
  householdStore!: HouseholdStore;
  
  firstUpdated() {
    if (this.householdHash === undefined) {
      throw new Error(`The householdHash property is required for the members-for-household element`);
    }
  }

  renderList(hashes: Array<AgentPubKey>) {
    if (hashes.length === 0) 
      return html` <div class="column center-content" style="gap: 16px;">
        <sl-icon
          style="color: grey; height: 64px; width: 64px;"
          .src=${wrapPathInSvg(mdiInformationOutline)}
        ></sl-icon>
        <span class="placeholder">${msg("No members found for this household")}</span>
      </div>`;
    
    return html`
      <div class="column" style="gap: 16px;">
        ${hashes.map(hash => 
          html`<agent-avatar .agentPubKey=${hash}></agent-avatar>`
        )}
      </div>
    `;
  }

  render() {
    return html`${subscribe(this.householdStore.households.get(this.householdHash).members.live,
      renderAsyncStatus({
        complete: agents => this.renderList(agents),
        pending: () => html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`,
        error: e => html`<display-error
          .headline=${msg("Error fetching the households")}
          .error=${e}
        ></display-error>`
      })
    )}`;
  }
  
  static styles = [sharedStyles];
}
