import { SignalWatcher } from "@holochain-open-dev/signals";
import { LitElement, html, css, TemplateResult, render } from "lit";
import { customElement, property } from "lit/decorators.js";
import { appStyles } from "./app-styles";
import { wrapPathInSvg } from "@holochain-open-dev/elements";
import { mdiClose } from "@mdi/js";

export function showOverlayPage(
  title: string,
  body: (closePage: () => void) => TemplateResult,
) {
  const div = document.createElement("div");
  const closePage = () => {
    document.body.removeChild(div);
  };
  render(
    html`
      <overlay-page .title=${title} @close-requested=${() => closePage()}>
        ${body(closePage)}
      </overlay-page>
    `,
    div,
  );
  document.body.appendChild(div);
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
        <div
          class="column"
          style="flex: 1; margin-top: 12px; align-items: center"
        >
          <slot></slot>
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
