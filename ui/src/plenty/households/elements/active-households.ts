import { LitElement, html } from 'lit';
import { state, customElement, property } from 'lit/decorators.js';
import { AgentPubKey, EntryHash, ActionHash, Record } from '@holochain/client';
import { subscribe } from '@holochain-open-dev/stores';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { hashProperty, sharedStyles, wrapPathInSvg, renderAsyncStatus } from '@holochain-open-dev/elements';
import { mdiInformationOutline } from '@mdi/js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';

import './household-summary.js';
import { HouseholdsStore } from '../households-store.js';
import { householdsStoreContext } from '../context.js';

/**
 * @element active-households
 */
@localized()
@customElement('active-households')
export class ActiveHouseholds extends LitElement {

  /**
   * @internal
   */
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;


  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0)
      return html` <div class="column center-content" style="gap: 16px;">
        <sl-icon
          .src=${wrapPathInSvg(mdiInformationOutline)}
          style="color: grey; height: 64px; width: 64px;"
          ></sl-icon
        >
        <span class="placeholder">${msg("No households found")}</span>
      </div>`;

    return html`
      <div class="column" style="gap: 16px; flex: 1">
        ${hashes.map(hash =>
      html`<household-summary .householdHash=${hash}></household-summary>`
    )}
      </div>
    `;
  }

  render() {
    return html`${subscribe(this.householdsStore.activeHouseholds,
      renderAsyncStatus({
        complete: map => this.renderList(Array.from(map.keys())),
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
