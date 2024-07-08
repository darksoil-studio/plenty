import { SignalWatcher } from "@holochain-open-dev/signals";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

import { appStyles } from "./app-styles.js";

@customElement("orders-page")
export class OrdersPage extends SignalWatcher(LitElement) {
  render() {
    return html``;
  }

  static styles = appStyles;
}
