import { sharedStyles } from "@holochain-open-dev/elements";
import { consume } from "@lit/context";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { householdsStoreContext } from "../context.js";
import { HouseholdsStore } from "../households-store.js";

@customElement('household-prompt')
export class HouseholdPrompt extends LitElement {
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  render() {
    return html``;
  }

  static styles = sharedStyles;
}
