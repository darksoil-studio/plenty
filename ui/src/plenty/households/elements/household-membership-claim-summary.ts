import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { EntryHash, Record, ActionHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { subscribe } from '@holochain-open-dev/stores';
import { renderAsyncStatus, hashProperty, sharedStyles } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';

import { localized, msg } from '@lit/localize';

import '@holochain-open-dev/elements/dist/elements/display-error.js';

import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { HouseholdsStore } from '../households-store.js';
import { householdsStoreContext } from '../context.js';
import { HouseholdMembershipClaim } from '../types.js';

/**
 * @element household-membership-claim-summary
 * @fires household-membership-claim-selected: detail will contain { householdMembershipClaimHash }
 */
@localized()
@customElement('household-membership-claim-summary')
export class HouseholdMembershipClaimSummary extends LitElement {

  // REQUIRED. The hash of the HouseholdMembershipClaim to show
  @property(hashProperty('household-membership-claim-hash'))
  householdMembershipClaimHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  renderSummary(entryRecord: EntryRecord<HouseholdMembershipClaim>) {
    return html`
      <div class="column" style="gap: 16px;">

      </div>
    `;
  }

  renderHouseholdMembershipClaim() {
    return html`${subscribe(this.householdsStore.householdMembershipClaims.get(this.householdMembershipClaimHash).entry,
      renderAsyncStatus({
        complete: householdMembershipClaim => this.renderSummary(householdMembershipClaim),
        pending: () => html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`,
        error: e => html`<display-error
          .headline=${msg("Error fetching the household membership claim")}
          .error=${e}
        ></display-error>`
      })
    )}`;
  }

  render() {
    return html`<sl-card style="flex: 1; cursor: grab;" @click=${() => this.dispatchEvent(new CustomEvent('household-membership-claim-selected', {
      composed: true,
      bubbles: true,
      detail: {
        householdMembershipClaimHash: this.householdMembershipClaimHash
      }
    }))}>
        ${this.renderHouseholdMembershipClaim()}
    </sl-card>`;
  }


  static styles = [sharedStyles];
}
