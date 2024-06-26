
import { LitElement, html } from 'lit';
import { state, customElement, property } from 'lit/decorators.js';
import { Record, EntryHash, ActionHash, AgentPubKey } from '@holochain/client';
import { AsyncComputed, SignalWatcher } from '@holochain-open-dev/signals';
import { EntryRecord, slice} from '@holochain-open-dev/utils';
import { hashProperty, sharedStyles, wrapPathInSvg } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiInformationOutline } from '@mdi/js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';

import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';

import { ProducersStore } from '../producers-store.js';
import { producersStoreContext } from '../context.js';
import { Producer } from '../types.js';


/**
 * @element producers-for-liason
 */
@localized()
@customElement('producers-for-liason')
export class ProducersForLiason extends SignalWatcher(LitElement) {

  /**
   * REQUIRED. The Liason for which the Producers should be fetched
   */
  @property(hashProperty('liason'))
  liason!: AgentPubKey;

  /**
   * @internal
   */
  @consume({ context: producersStoreContext, subscribe: true })
  producersStore!: ProducersStore;
 

  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0) 
      return html` <div class="column center-content" style="gap: 16px;">
        <sl-icon
          style="color: grey; height: 64px; width: 64px;"
          .src=${wrapPathInSvg(mdiInformationOutline)}
        ></sl-icon>
        <span class="placeholder">${msg("No producers found for this liason")}</span>
      </div>`;

    return html`
      <div style="display: flex; flex-direction: column">
        ${hashes.map(hash =>
          html`<producer-summary .producerHash=${hash}></producer-summary>`
        )}
      </div>
    `;
  }

  render() {
    const map = this.producersStore.producersForLiason.get(this.liason).live.get();

    switch (map.status) {
      case 'pending': 
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error': 
        return html`<display-error
          .headline=${msg("Error fetching the producers")}
          .error=${map.error}
        ></display-error>`;
      case 'completed':
        return this.renderList(Array.from(map.value.keys()));
    }
  }
  
  static styles = [sharedStyles];
}
