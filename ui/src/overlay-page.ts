import { SignalWatcher } from "@holochain-open-dev/signals";
import { LitElement, html, css, TemplateResult, render } from "lit";
import { customElement, property } from "lit/decorators.js";
import { wrapPathInSvg } from "@holochain-open-dev/elements";
import { mdiClose } from "@mdi/js";
import { HolochainApp } from "./holochain-app.js";
import { appStyles } from "./app-styles.js";

export function showOverlayPage(
  title: string,
  body: (closePage: () => void) => TemplateResult,
) {
  const holochainApp = document.querySelector("holochain-app") as HolochainApp;
  showOverlayPageWithinContainer(title, body, holochainApp.shadowRoot!);
}

export function showOverlayPageWithinContainer(
  title: string,
  body: (closePage: () => void) => TemplateResult,
  container: Node,
) {
  const div = document.createElement("div");
  const closePage = () => {
    container.removeChild(div);
  };
  render(
    html`
      <overlay-page .title=${title} @close-requested=${() => closePage()}>
        ${body(closePage)}
      </overlay-page>
    `,
    div,
  );
  container.appendChild(div);
}

@customElement("overlay-page")
export class OverlayPage extends SignalWatcher(LitElement) {
  @property()
  title: string = "";

  render() {
    return html`
      <div class="column fill">
        <div class="row top-bar">
          <sl-icon-button
            @click=${() =>
              this.dispatchEvent(new CustomEvent("close-requested"))}
            .src=${wrapPathInSvg(mdiClose)}
          ></sl-icon-button>
          <span>${this.title}</span>
        </div>
        <div class="flex-scrollable-parent" style="flex:1">
          <div class="flex-scrollable-container" style="flex:1">
            <div class="flex-scrollable-y" style="height: 100%;">
              <div
                class="column"
                style="min-height: calc(100% - 32px); margin: 16px; align-items: center"
              >
                <slot></slot>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static styles = [
    ...appStyles,
    css`
      :host {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 1001;
        background: var(--background-color);
      }
    `,
  ];
}
