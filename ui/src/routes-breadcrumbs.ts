import { SignalWatcher } from "@holochain-open-dev/signals";
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import "@shoelace-style/shoelace/dist/components/breadcrumb/breadcrumb.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb-item/breadcrumb-item.js";

import { appStyles } from "./app-styles.js";
import { Routes } from "./router.js";

@customElement("routes-breadcrumbs")
export class RoutesBreadcrumbs extends SignalWatcher(LitElement) {
  @property()
  routes!: Routes;

  render() {
    return html`<sl-breadcrumb
      ><sl-breadcrumb-item
        >${this.routes.currentRoute.get()?.name}</sl-breadcrumb-item
      ></sl-breadcrumb
    >`;
  }

  static styles = appStyles;
}
