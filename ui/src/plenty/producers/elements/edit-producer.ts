import { LitElement, html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { state, customElement, property } from "lit/decorators.js";
import { ActionHash, Record, EntryHash, AgentPubKey } from "@holochain/client";
import { EntryRecord } from "@holochain-open-dev/utils";
import {
  hashState,
  notifyError,
  sharedStyles,
  hashProperty,
  wrapPathInSvg,
  onSubmit,
} from "@holochain-open-dev/elements";
import { SignalWatcher, toPromise } from "@holochain-open-dev/signals";
import { consume } from "@lit/context";
import { localized, msg } from "@lit/localize";
import { mdiAlertCircleOutline, mdiDelete } from "@mdi/js";

import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/option/option.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@holochain-open-dev/file-storage/dist/elements/upload-files.js";
import "@shoelace-style/shoelace/dist/components/textarea/textarea.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/select/select.js";

import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import { ProducersStore } from "../producers-store.js";
import { producersStoreContext } from "../context.js";
import { Producer, ProducerEditors } from "../types.js";

/**
 * @element edit-producer
 * @fires producer-updated: detail will contain { originalProducerHash, previousProducerHash, updatedProducerHash }
 */
@localized()
@customElement("edit-producer")
export class EditProducer extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The hash of the original `Create` action for this Producer
   */
  @property(hashProperty("producer-hash"))
  producerHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: producersStoreContext })
  producersStore!: ProducersStore;

  /**
   * @internal
   */
  @state()
  committing = false;

  async firstUpdated() {
    const currentRecord = await toPromise(
      this.producersStore.producers.get(this.producerHash).latestVersion,
    );
    setTimeout(() => {
      (this.shadowRoot?.getElementById("form") as HTMLFormElement).reset();
    });
  }

  async updateProducer(
    currentRecord: EntryRecord<Producer>,
    fields: Partial<Producer>,
  ) {
    const producer: Producer = {
      name: fields.name!,
      photo: fields.photo!,
      contact_email: fields.contact_email!,
      phone_number: fields.phone_number!,
      location: fields.location!,
      producer_details: fields.producer_details!,
      liason: currentRecord.entry.liason!,
      editors: { type: fields.editors as any },
    };

    try {
      this.committing = true;
      const updateRecord = await this.producersStore.client.updateProducer(
        this.producerHash,
        currentRecord.actionHash,
        producer,
      );

      this.dispatchEvent(
        new CustomEvent("producer-updated", {
          composed: true,
          bubbles: true,
          detail: {
            originalProducerHash: this.producerHash,
            previousProducerHash: currentRecord.actionHash,
            updatedProducerHash: updateRecord.actionHash,
          },
        }),
      );
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error updating the producer"));
    }

    this.committing = false;
  }

  renderEditForm(currentRecord: EntryRecord<Producer>) {
    return html` <sl-card>
      <form
        id="form"
        class="column"
        style="flex: 1; gap: 16px;"
        ${onSubmit((fields) => this.updateProducer(currentRecord, fields))}
      >
        <div class="row" style="gap: 20px; flex: 1">
          <div class="column" style="gap: 12px; flex: 1">
            <span class="title" style="margin-bottom: 12px"
              >${msg("Producer Details")}</span
            >
            <div class="column" style="gap: 8px">
              <span>${msg("Photo")}*</span>

              <upload-files
                name="photo"
                one-file
                accepted-files="image/jpeg,image/png,image/gif"
                required
                .defaultValue=${currentRecord.entry.photo}
              ></upload-files>
            </div>
            <sl-input
              name="name"
              .label=${msg("Name")}
              required
              .defaultValue=${currentRecord.entry.name}
            ></sl-input>

            <sl-input
              name="contact_email"
              .label=${msg("Contact Email")}
              required
              .defaultValue=${currentRecord.entry.contact_email}
            ></sl-input>

            <sl-input
              name="phone_number"
              .label=${msg("Phone Number")}
              required
              .defaultValue=${currentRecord.entry.phone_number}
            ></sl-input>

            <sl-input
              name="location"
              .label=${msg("Location")}
              required
              .defaultValue=${currentRecord.entry.location}
            ></sl-input>

            <sl-textarea
              name="producer_details"
              .label=${msg("Producer Details")}
              required
              .defaultValue=${currentRecord.entry.producer_details}
            ></sl-textarea>
          </div>
          <div class="column" style="flex: 1; gap: 12px">
            <span class="title" style="margin-bottom: 12px"
              >${msg("Roles")}</span
            >
            <sl-select
              name="editors"
              .label=${msg("Product Editors")}
              required
              .defaultValue=${currentRecord.entry.editors.type}
            >
              <sl-option value="Liason">${msg("Liason")}</sl-option>
              <sl-option value="AllMembers">${msg("All Members")}</sl-option>
              <sl-option value="Members">${msg("Members")}</sl-option>
            </sl-select>
          </div>
        </div>
        <div class="row" style="gap: 8px;">
          <sl-button
            @click=${() =>
              this.dispatchEvent(
                new CustomEvent("edit-canceled", {
                  bubbles: true,
                  composed: true,
                }),
              )}
            style="flex: 1;"
            >${msg("Cancel")}</sl-button
          >
          <sl-button
            type="submit"
            variant="primary"
            style="flex: 1;"
            .loading=${this.committing}
            >${msg("Save")}</sl-button
          >
        </div>
      </form>
    </sl-card>`;
  }

  render() {
    const producer = this.producersStore.producers
      .get(this.producerHash)
      .latestVersion.get();

    switch (producer.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the producer")}
          .error=${producer.error}
        ></display-error>`;
      case "completed":
        return this.renderEditForm(producer.value);
    }
  }

  static styles = [sharedStyles];
}
