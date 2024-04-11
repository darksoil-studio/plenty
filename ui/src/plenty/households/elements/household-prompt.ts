import {
  renderAsyncStatus,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@holochain-open-dev/file-storage/dist/elements/show-image.js';
import { mapAndJoin, pipe, subscribe } from '@holochain-open-dev/stores';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit/context';
import { msg } from '@lit/localize';
import { mdiInformationOutline, mdiPlus } from '@mdi/js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { householdsStoreContext } from '../context.js';
import { HouseholdsStore } from '../households-store.js';
import { Household } from '../types.js';

@customElement('household-prompt')
export class HouseholdPrompt extends LitElement {
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  @state()
  creatingHousehold = false;

  renderActiveHouseholds(
    households: ReadonlyMap<ActionHash, EntryRecord<Household>>,
  ) {
    if (households.size === 0)
      return html` <div class="column center-content" style="gap: 16px;">
        <sl-icon
          .src=${wrapPathInSvg(mdiInformationOutline)}
          style="color: grey; height: 64px; width: 64px;"
        ></sl-icon>
        <span class="placeholder"
          >${msg('No active households were found')}</span
        >
      </div>`;

    return html`<div class="column" style="gap: 16px">
      ${Array.from(households.values()).map(
        h => html`
          <sl-button variant="default" size="small">
            <show-image slot="prefix" .imageHash=${h.entry.avatar}></show-image>
            ${h.entry.name}
          </sl-button>
        `,
      )}
    </div>`;
  }

  renderPrompt() {
    const activeHouseholds = pipe(
      this.householdsStore.activeHouseholds,
      householdMap => mapAndJoin(householdMap, h => h.latestVersion),
    );

    return html`${subscribe(
      activeHouseholds,
      renderAsyncStatus({
        complete: map =>
          html`<div class="column" style="gap: 16px">
            <div class="row">
              <span>${msg('Households')}</span>

              <sl-button
                @click=${() => {
                  this.creatingHousehold = true;
                }}
              >
                <sl-icon slot="prefix" .src=${wrapPathInSvg(mdiPlus)}></sl-icon>
                ${msg('Create Household')}
              </sl-button>
            </div>

            ${this.renderActiveHouseholds(map)}

            <span>${msg('Select your household and wait to be invited.')}</span>
            <span
              >${msg(
                'If your household does not appear in the list, create it.',
              )}</span
            >
          </div>`,
        pending: () =>
          html`<div
            style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
          >
            <sl-spinner style="font-size: 2rem;"></sl-spinner>
          </div>`,
        error: e =>
          html`<display-error
            .headline=${msg('Error fetching the households')}
            .error=${e}
          ></display-error>`,
      }),
    )}`;
  }

  render() {
    if (this.creatingHousehold)
      return html`<create-household
        @household-created=${() => {
          this.creatingHousehold = false;
        }}
      ></create-household>`;

    return html`${subscribe(
      this.householdsStore.myHousehold,
      renderAsyncStatus({
        pending: () =>
          html`<div
            class="row"
            style="flex: 1; height: 100%; align-items: center; justify-content: center;"
          >
            <sl-spinner style="font-size: 2rem"></sl-spinner>
          </div>`,
        complete: value => (value ? html`<slot></slot>` : this.renderPrompt()),
        error: e => html`
          <div
            style="flex: 1; height: 100%; align-items: center; justify-content: center;"
          >
            <display-error
              .error=${e}
              .headline=${msg('Error getting your household.')}
            >
            </display-error>
          </div>
        `,
      }),
    )}`;
  }

  static styles = sharedStyles;
}
