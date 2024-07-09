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
  onSubmit,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { consume } from "@lit/context";
import { localized, msg } from "@lit/localize";
import { mdiAlertCircleOutline, mdiDelete } from "@mdi/js";

import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";

import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import { appStyles } from "../../../app-styles.js";
import { OrdersStore } from "../orders-store.js";
import { ordersStoreContext } from "../context.js";
import { HouseholdOrder } from "../types.js";

/**
 * @element create-household-order
 * @fires household-order-created: detail will contain { householdOrderHash }
 */
@localized()
@customElement("create-household-order")
export class CreateHouseholdOrder extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The order hash for this HouseholdOrder
   */
  @property(hashProperty("order-hash"))
  orderHash!: ActionHash;

  /**
   * REQUIRED. The order hash for this HouseholdOrder
   */
  @property(hashProperty("household-hash"))
  householdHash!: ActionHash;

  /**
   * REQUIRED. The products for this HouseholdOrder
   */
  @property()
  products!: Array<ActionHash>;

  /**
   * @internal
   */
  @consume({ context: ordersStoreContext, subscribe: true })
  ordersStore!: OrdersStore;

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

  async createHouseholdOrder(fields: Partial<HouseholdOrder>) {
    if (this.orderHash === undefined)
      throw new Error(
        "Cannot create a new Household Order without its order_hash field",
      );
    if (this.householdHash === undefined)
      throw new Error(
        "Cannot create a new Household Order without its household_hash field",
      );
    if (this.products === undefined)
      throw new Error(
        "Cannot create a new Household Order without its products field",
      );

    const householdOrder: HouseholdOrder = {
      order_hash: this.orderHash!,
      household_hash: this.householdHash!,
      products: [], // TODO
    };

    try {
      this.committing = true;
      const record: EntryRecord<HouseholdOrder> =
        await this.ordersStore.client.createHouseholdOrder(householdOrder);

      this.dispatchEvent(
        new CustomEvent("household-order-created", {
          composed: true,
          bubbles: true,
          detail: {
            householdOrderHash: record.actionHash,
          },
        }),
      );

      this.form.reset();
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error creating the household order"));
    }
    this.committing = false;
  }

  render() {
    return html` <sl-card style="flex: 1;">
      <span slot="header">${msg("Create Household Order")}</span>

      <form
        id="create-form"
        class="column"
        style="flex: 1; gap: 16px;"
        ${onSubmit((fields) => this.createHouseholdOrder(fields))}
      >
        <sl-button variant="primary" type="submit" .loading=${this.committing}
          >${msg("Create Household Order")}</sl-button
        >
      </form>
    </sl-card>`;
  }

  static styles = appStyles;
}
