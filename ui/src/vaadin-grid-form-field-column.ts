import { SignalWatcher } from "@holochain-open-dev/signals";
import {
  GridColumn,
  GridColumnMixinClass,
} from "@vaadin/grid/vaadin-grid-column";
import {
  GridSortColumnMixin,
  GridSortColumnMixinClass,
} from "@vaadin/grid/vaadin-grid-sort-column";
import { LitElement, TemplateResult, html } from "lit";
import { customElement, property } from "lit/decorators.js";

export class VaadinGridFormFieldColumn extends GridColumnMixinClass<any, any> {
  @property()
  renderer!: (root: HTMLElement, model: any) => TemplateResult;

  connectedCallback() {
    // super.connectedCallback();
  }
}
