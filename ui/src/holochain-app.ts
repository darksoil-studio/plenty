import { renderAsyncStatus, sharedStyles } from '@holochain-open-dev/elements';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import {
  FileStorageClient,
  fileStorageClientContext,
} from '@holochain-open-dev/file-storage';
import {
  ProfilesClient,
  ProfilesStore,
  profilesStoreContext,
} from '@holochain-open-dev/profiles';
import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
import '@holochain-open-dev/profiles/dist/elements/profile-list-item-skeleton.js';
import '@holochain-open-dev/profiles/dist/elements/profile-prompt.js';
import { pipe, subscribe } from '@holochain-open-dev/stores';
import { AppAgentClient, AppAgentWebsocket } from '@holochain/client';
import { provide } from '@lit/context';
import { localized, msg } from '@lit/localize';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { householdsStoreContext } from './plenty/households/context.js';
import './plenty/households/elements/household-prompt.js';
import { HouseholdsClient } from './plenty/households/households-client.js';
import { HouseholdsStore } from './plenty/households/households-store.js';

type View = { view: 'main' };

@localized()
@customElement('holochain-app')
export class HolochainApp extends LitElement {
  @provide({ context: householdsStoreContext })
  @property()
  _householdStore!: HouseholdsStore;

  @state() _loading = true;

  @state() _view = { view: 'main' };

  @state() _error: any | undefined;

  @provide({ context: profilesStoreContext })
  @property()
  _profilesStore!: ProfilesStore;

  @provide({ context: fileStorageClientContext })
  @property()
  _fileStorageClient!: FileStorageClient;

  _client!: AppAgentClient;

  async firstUpdated() {
    //   await event.once('setup-completed', () => this.connect());
    // }

    // async connect() {
    try {
      this._client = await AppAgentWebsocket.connect('plenty', {
        url: new URL(
          `ws://localhost:${(window as any).__HC_LAUNCHER_ENV__.__PORT__}`,
        ),
      });
      await this.initStores(this._client);
    } catch (e: any) {
      this._error = e;
    } finally {
      this._loading = false;
    }
  }

  // Don't change this
  async initStores(appAgentClient: AppAgentClient) {
    this._profilesStore = new ProfilesStore(
      new ProfilesClient(appAgentClient, 'plenty'),
    );
    this._householdStore = new HouseholdsStore(
      new HouseholdsClient(appAgentClient, 'plenty'),
    );
    this._fileStorageClient = new FileStorageClient(appAgentClient, 'plenty');
  }

  renderMyProfile() {
    return html`<div class="row" style="gap: 16px" slot="actionItems">
      ${subscribe(
        pipe(this._householdStore.myHousehold, h => h?.latestVersion),
        renderAsyncStatus({
          complete: household =>
            household
              ? html`<div class="row" style="align-items: center;">
                  <show-image
                    style="width: 32px; height: 32px;"
                    .imageHash=${household?.entry.avatar}
                  ></show-image>
                  <span style="margin: 0 16px;">${household?.entry.name}</span>
                </div>`
              : html``,
          error: e =>
            html`<display-error
              .headline=${msg('Error fetching your household')}
              .error=${e}
              tooltip
            ></display-error>`,
          pending: () =>
            html`<profile-list-item-skeleton></profile-list-item-skeleton>`,
        }),
      )}
    </div>`;
  }

  renderContent() {
    return html`<household-prompt>
      <sl-tab-group placement="start">
        <sl-tab slot="nav" panel="orders">${msg('Orders')}</sl-tab>
        <sl-tab slot="nav" panel="producers">${msg('Producers')}</sl-tab>
        <sl-tab slot="nav" panel="members">${msg('Members')}</sl-tab>

        <sl-tab-panel name="orders"
          >This is the general tab panel.</sl-tab-panel
        >
        <sl-tab-panel name="producers"
          >This is the general tab panel.</sl-tab-panel
        >
        <sl-tab-panel name="members"
          >This is the general tab panel.</sl-tab-panel
        >
      </sl-tab-group>
    </household-prompt>`;
  }

  renderBackButton() {
    if (this._view.view === 'main') return html``;

    return html`
      <sl-icon-button
        name="arrow-left"
        @click=${() => {
          this._view = { view: 'main' };
        }}
      ></sl-icon-button>
    `;
  }

  render() {
    if (this._loading)
      return html`<div
        class="row"
        style="flex: 1; height: 100%; align-content: center; justify-content: center;"
      >
        <sl-spinner style="font-size: 2rem"></sl-spinner>
      </div>`;

    if (this._error)
      return html`
        <div
          style="flex: 1; height: 100%; align-content: center; justify-content: center;"
        >
          <display-error
            .error=${this._error}
            .headline=${msg('Error connecting to holochain.')}
          >
          </display-error>
        </div>
      `;

    return html`
      <div class="column fill">
        <div
          class="row"
          style="align-items: center; color:white; background-color: var(--sl-color-primary-900); padding: 16px"
        >
          ${this.renderBackButton()}
          <span class="title" style="flex: 1">${msg('Plenty')}</span>

          ${this.renderMyProfile()}
        </div>

        <profile-prompt style="flex: 1;">
          ${this.renderContent()}
        </profile-prompt>
      </div>
    `;
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
    sharedStyles,
  ];
}
