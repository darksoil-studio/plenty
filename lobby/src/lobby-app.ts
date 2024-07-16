import { notifyError, sharedStyles } from "@holochain-open-dev/elements";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import { localized, msg } from "@lit/localize";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/tab/tab.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/themes/light.css";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { SignalWatcher } from "@holochain-open-dev/signals";
import "@darksoil-studio/notifications/dist/elements/my-notifications-icon-button.js";
import { core } from "@tauri-apps/api";

@localized()
@customElement("lobby-app")
export class LobbyApp extends SignalWatcher(LitElement) {
  @state() _creating = false;

  @state() _error: any | undefined;

  async firstUpdated() {}

  render() {
    // if (this._loading)
    //   return html`<div
    //     class="row"
    //     style="flex: 1; height: 100%; align-items: center; justify-content: center;"
    //   >
    //     <sl-spinner style="font-size: 2rem"></sl-spinner>
    //   </div>`;

    // if (this._error)
    //   return html`
    //     <div
    //       style="flex: 1; height: 100%; align-items: center; justify-content: center;"
    //     >
    //       <display-error
    //         .error=${this._error}
    //         .headline=${msg("Error connecting to holochain.")}
    //       >
    //       </display-error>
    //     </div>
    //   `;

    return html`
      <div class="column center-content" style="flex: 1; gap: 16px">
        <img src="icon.png" style="height: 200px; width: 200px;" />
        <sl-card style="width: 700px">
          <div class="column" style="gap: 16px">
            <span class="title">${msg("Welcome to Plenty!")}</span>
            <span
              >${msg(
                "Plenty is a holochain app to support buyers clubs in ordering food together.",
              )}</span
            >
            <span
              >${msg(
                "If your buyers club has already been created by someone you know, ask them to send you an invite link for it, and click the link.",
              )}</span
            >
            <span
              >${msg(
                "Otherwise, create a new buyers club by clicking the button below.",
              )}</span
            >
            <sl-button
              variant="primary"
              .loading=${this._creating}
              @click=${async () => {
                if (this._creating) return;
                this._creating = true;
                try {
                  await core.invoke("create_plenty_instance");
                } catch (e) {
                  console.error(e);
                  notifyError(msg("Error creating the buyers club."));
                } finally {
                  this._creating = false;
                }
              }}
              >${msg("Create New Buyers Club")}</sl-button
            >
          </div>
        </sl-card>
      </div>
    `;
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
  ];
}
