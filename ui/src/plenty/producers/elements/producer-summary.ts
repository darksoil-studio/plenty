import { LitElement, html } from "lit";
import { state, property, customElement } from "lit/decorators.js";
import { EntryHash, Record, ActionHash } from "@holochain/client";
import { EntryRecord } from "@holochain-open-dev/utils";
import { SignalWatcher } from "@holochain-open-dev/signals";
import { hashProperty, sharedStyles } from "@holochain-open-dev/elements";
import { consume } from "@lit/context";

import { localized, msg } from "@lit/localize";

import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import { ProducersStore } from "../producers-store.js";
import { producersStoreContext } from "../context.js";
import { Producer, ProducerEditors } from "../types.js";

/**
 * @element producer-summary
 * @fires producer-selected: detail will contain { producerHash }
 */
@localized()
@customElement("producer-summary")
export class ProducerSummary extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The hash of the Producer to show
   */
  @property(hashProperty("producer-hash"))
  producerHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: producersStoreContext, subscribe: true })
  producersStore!: ProducersStore;

  renderSummary(entryRecord: EntryRecord<Producer>) {
    return html`
      <show-image
        slot="image"
        .imageHash=${entryRecord.entry.photo}
        style="width: 300px; height: 200px"
      ></show-image>
      <span style="white-space: pre-line">${entryRecord.entry.name}</span>
    `;
  }

  renderProducer() {
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
        return this.renderSummary(producer.value);
    }
  }

  render() {
    return html`<sl-card
      style="flex: 1; cursor: grab;"
      @click=${() =>
        this.dispatchEvent(
          new CustomEvent("producer-selected", {
            composed: true,
            bubbles: true,
            detail: {
              producerHash: this.producerHash,
            },
          }),
        )}
    >
      ${this.renderProducer()}
    </sl-card>`;
  }

  static styles = [sharedStyles];
}
