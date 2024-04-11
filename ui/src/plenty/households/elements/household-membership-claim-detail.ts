import {
  hashProperty,
  notifyError,
  renderAsyncStatus,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import { subscribe } from '@holochain-open-dev/stores';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash, EntryHash, Record } from '@holochain/client';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiDelete, mdiPencil } from '@mdi/js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { householdsStoreContext } from '../context.js';
import { HouseholdsStore } from '../households-store.js';
import { HouseholdMembershipClaim } from '../types.js';

/**
 * @element household-membership-claim-detail
 * @fires household-membership-claim-deleted: detail will contain { householdMembershipClaimHash }
 */
@localized()
@customElement('household-membership-claim-detail')
export class HouseholdMembershipClaimDetail extends LitElement {
  // REQUIRED. The hash of the HouseholdMembershipClaim to show
  @property(hashProperty('household-membership-claim-hash'))
  householdMembershipClaimHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  renderDetail(entryRecord: EntryRecord<HouseholdMembershipClaim>) {
    return html`
      <sl-card>
        <div slot="header" class="row" style="gap: 8px">
          <span style="font-size: 18px; flex: 1;"
            >${msg('Household Membership Claim')}</span
          >
        </div>

        <div class="column" style="gap: 16px;"></div>
      </sl-card>
    `;
  }

  render() {
    return html`${subscribe(
      this.householdsStore.householdMembershipClaims.get(
        this.householdMembershipClaimHash,
      ).entry,
      renderAsyncStatus({
        complete: householdMembershipClaim =>
          this.renderDetail(householdMembershipClaim),
        pending: () =>
          html`<div
            style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
          >
            <sl-spinner style="font-size: 2rem;"></sl-spinner>
          </div>`,
        error: e =>
          html`<display-error
            .headline=${msg('Error fetching the household membership claim')}
            .error=${e}
          ></display-error>`,
      }),
    )}`;
  }

  static styles = [sharedStyles];
}
