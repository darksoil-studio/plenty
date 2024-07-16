import { notifyError, sharedStyles } from "@holochain-open-dev/elements";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import { localized, msg } from "@lit/localize";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/tab/tab.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/themes/light.css";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { SignalWatcher } from "@holochain-open-dev/signals";
import "@darksoil-studio/notifications/dist/elements/my-notifications-icon-button.js";
import { core } from "@tauri-apps/api";
import { SlInput } from "@shoelace-style/shoelace";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";

@localized()
@customElement("lobby-app")
export class LobbyApp extends SignalWatcher(LitElement) {
  @state() _creating = false;
  @state() _joining = false;

  @state() _inviteLink: string | undefined;

  async firstUpdated() {
    await onOpenUrl((urls) => {
      if (urls[0].startsWith("plenty://")) {
        this.joinPlentyInstance(urls[0]);
      }
      console.log("deep link:", urls);
    });
  }

  async joinPlentyInstance(url: string) {
    const progenitor = url.split("plenty://")[1]!;
    try {
      await core.invoke("join_plenty_instance", {
        progenitor,
      });
    } catch (e) {
      console.error(e);
      notifyError(msg("Error joining the buyers club."));
    }
  }

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
        <img src="icon.png" style="height: 288px; width: 288px;" />
        <sl-card style="width: 900px">
          <div class="column" style="gap: 32px">
            <span class="title">${msg("Welcome to Plenty!")}</span>
            <span
              >${msg(
                "Plenty is a holochain app to support buyers clubs in ordering food together.",
              )}</span
            >
            <div class="row" style="gap: 8px">
              <div class="column" style="gap: 24px; flex: 1">
                <span class="title">${msg("Join a Buyers Club")}</span>
                <span
                  >${msg(
                    "If your buyers club has already been created by someone you know, ask them to send you an invite link for it, and click the link or paste it below.",
                  )}</span
                >
                <div
                  class="row"
                  style="justify-content: center; align-items: center; gap: 12px; flex: 1"
                >
                  <sl-input
                    style="flex: 1"
                    @input=${(e: InputEvent) => {
                      this._inviteLink = (e.target as SlInput).value;
                    }}
                  ></sl-input>
                  <sl-button
                    .loading=${this._joining}
                    .disabled=${!this._inviteLink}
                    @click=${async () => {
                      if (this._joining || !this._inviteLink) return;
                      if (!this._inviteLink.startsWith("plenty://")) {
                        notifyError(
                          msg(
                            "Invalid plenty invite link: it must start with plenty://",
                          ),
                        );
                        return;
                      }
                      this._joining = true;
                      await this.joinPlentyInstance(this._inviteLink);
                      this._joining = false;
                    }}
                    >${msg("Join Buyers Club")}</sl-button
                  >
                </div>
              </div>
              <sl-divider vertical></sl-divider>
              <div class="column" style="gap: 16px; flex: 1">
                <span class="title">${msg("Create a Buyers Club")}</span>
                <span style="flex: 1"
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
            </div>
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
