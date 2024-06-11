import { LitElement, html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { state, property, query, customElement } from "lit/decorators.js";
import {
  ActionHash,
  Record,
  DnaHash,
  AgentPubKey,
  EntryHash,
} from "@holochain/client";
import { EntryRecord } from "@holochain-open-dev/utils";
import { SignalWatcher } from "@holochain-open-dev/signals";
import {
  hashProperty,
  notifyError,
  hashState,
  sharedStyles,
  onSubmit,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { consume } from "@lit/context";
import { localized, msg } from "@lit/localize";
import { mdiAlertCircleOutline, mdiDelete } from "@mdi/js";

import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@holochain-open-dev/file-storage/dist/elements/upload-files.js";
import "@shoelace-style/shoelace/dist/components/select/select.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/option/option.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/textarea/textarea.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";

import { ProducersStore } from "../producers-store.js";
import { producersStoreContext } from "../context.js";
import { Producer, ProducerEditors, ProducerSorters } from "../types.js";

/**
 * @element create-producer
 * @fires producer-created: detail will contain { producerHash }
 */
@localized()
@customElement("create-producer")
export class CreateProducer extends SignalWatcher(LitElement) {
  /**
   * @internal
   */
  @consume({ context: producersStoreContext, subscribe: true })
  producersStore!: ProducersStore;

  /**
   * @internal
   */
  @state()
  committing = false;

  /**
   * @internal
   */
  @query("#create-form")
  form!: HTMLFormElement;

  async createProducer(fields: Partial<Producer>) {
    const producer: Producer = {
      name: fields.name!,
      photo: fields.photo!,
      contact_email: fields.contact_email!,
      phone_number: fields.phone_number!,
      location: fields.location!,
      producer_details: fields.producer_details!,
      liason: this.producersStore.client.client.myPubKey!,
      editors: { type: fields.editors as any },
      sorters: { type: fields.sorters as any },
    };

    try {
      this.committing = true;
      const record: EntryRecord<Producer> =
        await this.producersStore.client.createProducer(producer);

      this.dispatchEvent(
        new CustomEvent("producer-created", {
          composed: true,
          bubbles: true,
          detail: {
            producerHash: record.actionHash,
          },
        }),
      );

      this.form.reset();
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error creating the producer"));
    }
    this.committing = false;
  }

  render() {
    return html` <sl-card style="flex: 1;">
      <span slot="header">${msg("Create Producer")}</span>

      <form
        id="create-form"
        class="column"
        style="flex: 1; gap: 16px;"
        ${onSubmit((fields) => this.createProducer(fields))}
      >
        <div>
          <sl-input name="name" .label=${msg("Name")} required></sl-input>
        </div>

        <div>
          <upload-files
            name="photo"
            one-file
            accepted-files="image/jpeg,image/png,image/gif"
            required
          ></upload-files>
        </div>

        <div>
          <sl-input
            name="contact_email"
            .label=${msg("Contact Email")}
            required
          ></sl-input>
        </div>

        <div>
          <sl-input
            name="phone_number"
            .label=${msg("Phone Number")}
            required
          ></sl-input>
        </div>

        <div>
          <sl-input
            name="location"
            .label=${msg("Location")}
            required
          ></sl-input>
        </div>

        <div>
          <sl-textarea
            name="producer_details"
            .label=${msg("Producer Details")}
            required
          ></sl-textarea>
        </div>

        <div>
          <sl-select name="editors" .helpText=${msg("Editors")} required>
            <sl-option value="Liason">Liason</sl-option>
            <sl-option value="AllMembers">All Members</sl-option>
            <sl-option value="Members">Members</sl-option>
          </sl-select>
        </div>

        <div>
          <sl-select name="sorters" .helpText=${msg("Sorters")} required>
            <sl-option value="Liason">Liason</sl-option>
            <sl-option value="Members">Members</sl-option>
          </sl-select>
        </div>

        <sl-button variant="primary" type="submit" .loading=${this.committing}
          >${msg("Create Producer")}</sl-button
        >
      </form>
    </sl-card>`;
  }

  static styles = [sharedStyles];
}