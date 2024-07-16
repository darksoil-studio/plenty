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
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { invoke } from "@tauri-apps/api";

@localized()
@customElement("lobby-app")
export class LobbyApp extends SignalWatcher(LitElement) {
  @state() _loading = true;

  @state() _error: any | undefined;

  async firstUpdated() {
    await onOpenUrl((urls) => {
      console.log("deep link:", urls);
    });
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

    return html`
      <div class="row center-content" style="flex: 1">
        <div class="row" style="gap: 16px">
          <img
            src="../../src-tauri/icons/icon.png"
            style="height: 400px; width: 400px"
          />
          <span class="title">${msg("Welcome to Plenty!")}</span>
          <span
            >${msg(
              "Plenty is a holochain app to support buyers clubs in ordering food together.",
            )}</span
          >
          <span
            >${msg(
              "If your buyers club was already created by someone you know, ask them to send you an invite link for it.",
            )}</span
          >
          <span
            >${msg(
              "Alternatively, create a new buyers club by clicking the button below.",
            )}</span
          >
          <sl-button @click=${() => invoke("create_plenty_instance")}
            >${msg("Create New Buyers Club")}</sl-button
          >
        </div>
      </div>
    `;
  }

  static styles = [sharedStyles];
}
