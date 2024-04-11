// Replace 'light.css' with 'dark.css' if you want the dark theme
import '@shoelace-style/shoelace/dist/themes/light.css';

import { LitElement, css, html } from 'lit';
import { property, state, customElement } from 'lit/decorators.js';
import { AppAgentWebsocket, AppAgentClient, ActionHash } from '@holochain/client';
import { subscribe } from '@holochain-open-dev/stores';
import { sharedStyles, renderAsyncStatus } from '@holochain-open-dev/elements';
import { provide } from '@lit/context';
import { localized, msg } from '@lit/localize';
import {
  Profile,
  ProfilesClient,
  ProfilesStore,
  profilesStoreContext
} from '@holochain-open-dev/profiles';
import { fileStorageClientContext, FileStorageClient } from '@holochain-open-dev/file-storage';
import { EntryRecord } from '@holochain-open-dev/utils';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
import '@holochain-open-dev/profiles/dist/elements/profile-prompt.js';
import '@holochain-open-dev/profiles/dist/elements/profile-list-item-skeleton.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';

import { householdsStoreContext } from './plenty/households/context.js';
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
    try {
      this._client = await AppAgentWebsocket.connect('plenty');
      await this.initStores(this._client);
    } catch (e: any) {
      this._error = e;
    } finally {
      this._loading = false;
    }
  }

  // Don't change this
  async initStores(appAgentClient: AppAgentClient) {
    this._profilesStore = new ProfilesStore(new ProfilesClient(appAgentClient, 'plenty'));
    this._householdStore = new HouseholdsStore(new HouseholdsClient(appAgentClient, 'plenty'));
    this._fileStorageClient = new FileStorageClient(appAgentClient, 'plenty');
  }

  renderMyProfile() {
    return html`${subscribe(this._profilesStore.myProfile, renderAsyncStatus({
      complete: profile => html`<div
            class="row"
            style="align-items: center;"
            slot="actionItems"
          >
            <agent-avatar .agentPubKey=${this._client.myPubKey}></agent-avatar>
            <span style="margin: 0 16px;">${profile?.entry.nickname}</span>
          </div>`,
      error: e => html`<display-error
            .headline=${msg('Error fetching the profile')}
            .error=${e}
            tooltip
          ></display-error>`,
      pending: () => html`<profile-list-item-skeleton></profile-list-item-skeleton>`
    }))}`
  }

  // TODO: add here the content of your application
  renderContent() {
    return html`<household-prompt>
      </household-prompt>`;
  }

  renderBackButton() {
    if (this._view.view === 'main') return html``;

    return html`
      <sl-icon-button
        name="arrow-left"
        @click=${() => { this._view = { view: 'main' } }}
      ></sl-icon-button>
    `;
  }

  render() {
    if (this._loading)
      return html`<div
        class="row"
        style="flex: 1; height: 100%; align-items: center; justify-content: center;"
      >
        <sl-spinner style="font-size: 2rem"></sl-spinner>
      </div>`;

    if (this._error)
      return html`
        <div style="flex: 1; height: 100%; align-items: center; justify-content: center;">
          <display-error .error=${this._error} .headline=${msg("Error connecting to holochain")}>
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
          <span class="title" style="flex: 1">${msg("Plenty")}</span>

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
