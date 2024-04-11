import { LitElement, html } from 'lit';
import { repeat } from "lit/directives/repeat.js";
import { state, property, query, customElement } from 'lit/decorators.js';
import { ActionHash, Record, DnaHash, AgentPubKey, EntryHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { hashProperty, notifyError, hashState, sharedStyles, onSubmit, wrapPathInSvg } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiDelete } from "@mdi/js";

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';

import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';
import { HouseholdsStore } from '../households-store.js';
import { householdsStoreContext } from '../context.js';
import { Household } from '../types.js';

/**
 * @element create-household
 * @fires household-created: detail will contain { householdHash }
 */
@localized()
@customElement('create-household')
export class CreateHousehold extends LitElement {

  /**
   * @internal
   */
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  /**
   * @internal
   */
  @state()
  committing = false;

  /**
   * @internal
   */
  @query('#create-form')
  form!: HTMLFormElement;


  async createHousehold(fields: any) {

    const household: Household = {
      name: fields.name,
      avatar: fields.avatar,
    };

    try {
      this.committing = true;
      const record: EntryRecord<Household> = await this.householdsStore.client.createHousehold(household);

      this.dispatchEvent(new CustomEvent('household-created', {
        composed: true,
        bubbles: true,
        detail: {
          householdHash: record.actionHash
        }
      }));

      this.form.reset();
    } catch (e: any) {
      console.error(e);
      notifyError(msg("Error creating the household"));
    }
    this.committing = false;
  }

  render() {
    return html`
      <sl-card style="flex: 1;">
        <span slot="header">${msg("Create Household")}</span>

        <form 
          id="create-form"
          class="column"
          style="flex: 1; gap: 16px;"
          ${onSubmit(fields => this.createHousehold(fields))}
        >  
          <div>
          <sl-input name="name" .label=${msg("Name")}  required></sl-input>          </div>

          <div>
          <upload-files name="avatar" one-file accepted-files="image/jpeg,image/png,image/gif" required></upload-files>          </div>


          <sl-button
            variant="primary"
            type="submit"
            .loading=${this.committing}
          >${msg("Create Household")}</sl-button>
        </form> 
      </sl-card>`;
  }

  static styles = [sharedStyles];
}
