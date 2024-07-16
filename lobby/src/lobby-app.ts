import { sharedStyles } from "@holochain-open-dev/elements";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import { localized, msg } from "@lit/localize";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/tab/tab.js";
import "@shoelace-style/shoelace/dist/themes/light.css";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { SignalWatcher } from "@holochain-open-dev/signals";
import "@darksoil-studio/notifications/dist/elements/my-notifications-icon-button.js";

@localized()
@customElement("lobby-app")
export class LobbyApp extends SignalWatcher(LitElement) {
  @state() _loading = true;

  @state() _error: any | undefined;

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
        <div
          style="flex: 1; height: 100%; align-items: center; justify-content: center;"
        >
          <display-error
            .error=${this._error}
            .headline=${msg("Error connecting to holochain.")}
          >
          </display-error>
        </div>
      `;

    return html``;
  }

  static styles = [sharedStyles];
}
