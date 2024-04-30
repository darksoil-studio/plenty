import {
  hashProperty,
  hashState,
  notifyError,
  onSubmit,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import { EntryRecord } from "@holochain-open-dev/utils";
import {
  ActionHash,
  AgentPubKey,
  DnaHash,
  EntryHash,
  Record,
} from "@holochain/client";
import { consume } from "@lit/context";
import { localized, msg } from "@lit/localize";
import { mdiAlertCircleOutline, mdiDelete } from "@mdi/js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import { LitElement, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { SignalWatcher } from "@holochain-open-dev/signals";

import { householdsStoreContext } from "../context.js";
import { HouseholdsStore } from "../households-store.js";
import { HouseholdMembershipClaim } from "../types.js";

/**
 * @element create-household-membership-claim
 * @fires household-membership-claim-created: detail will contain { householdMembershipClaimHash }
 */
@localized()
@customElement("create-household-membership-claim")
export class CreateHouseholdMembershipClaim extends SignalWatcher(LitElement) {
  // REQUIRED. The member create link hash for this HouseholdMembershipClaim
  @property(hashProperty("member-create-link-hash"))
  memberCreateLinkHash!: ActionHash;

  // REQUIRED. The household hash for this HouseholdMembershipClaim
  @property(hashProperty("household-hash"))
  householdHash!: ActionHash;

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
  @query("#create-form")
  form!: HTMLFormElement;

  async createHouseholdMembershipClaim(fields: any) {
    if (this.memberCreateLinkHash === undefined)
      throw new Error(
        "Cannot create a new Household Membership Claim without its member_create_link_hash field",
      );
    if (this.householdHash === undefined)
      throw new Error(
        "Cannot create a new Household Membership Claim without its household_hash field",
      );

    const householdMembershipClaim: HouseholdMembershipClaim = {
      member_create_link_hash: this.memberCreateLinkHash,
      household_hash: this.householdHash,
    };

    try {
      this.committing = true;
      const record: EntryRecord<HouseholdMembershipClaim> =
        await this.householdsStore.client.createHouseholdMembershipClaim(
          householdMembershipClaim,
        );

      this.dispatchEvent(
        new CustomEvent("household-membership-claim-created", {
          composed: true,
          bubbles: true,
          detail: {
            householdMembershipClaimHash: record.actionHash,
          },
        }),
      );

      this.form.reset();
    } catch (e: any) {
      console.error(e);
      notifyError(msg("Error creating the household membership claim"));
    }
    this.committing = false;
  }

  render() {
    return html` <sl-card style="flex: 1;">
      <span slot="header">${msg("Create Household Membership Claim")}</span>

      <form
        id="create-form"
        class="column"
        style="flex: 1; gap: 16px;"
        ${onSubmit((fields) => this.createHouseholdMembershipClaim(fields))}
      >
        <sl-button variant="primary" type="submit" .loading=${this.committing}
          >${msg("Create Household Membership Claim")}</sl-button
        >
      </form>
    </sl-card>`;
  }

  static styles = [sharedStyles];
}
