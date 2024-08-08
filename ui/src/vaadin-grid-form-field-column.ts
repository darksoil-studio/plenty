import { SignalWatcher } from "@holochain-open-dev/signals";
import { GridColumnMixin } from "@vaadin/grid/src/vaadin-grid-column-mixin.js";
import { LitElement, TemplateResult, html, render } from "lit";
import { customElement, property } from "lit/decorators.js";
import { PolylitMixin } from "@vaadin/component-base/src/polylit-mixin.js";

// @ts-ignore
@customElement("vaadin-grid-form-field-column")
// @ts-ignore
export class VaadinGridFormFieldColumn extends GridColumnMixin(
  // @ts-ignore
  PolylitMixin(LitElement),
) {
  @property({})
  getId!: (model: any) => string;

  @property({})
  templateRenderer!: (
    id: string,
    value: any,
    setValue: (value: any) => void,
  ) => TemplateResult;

  @property({})
  lastUpdated: number | undefined;

  // @property({})
  _values: { [key: string]: { value: any; timestamp: number } } = {};
  set values(values: { [key: string]: any }) {
    setTimeout(() => {
      for (const [key, value] of Object.entries(values)) {
        if (this._values[key] && this._values[key].value === value) continue;
        if (
          this._values[key] &&
          this.lastUpdated !== undefined &&
          this._values[key].timestamp > this.lastUpdated
        )
          continue;
        this.setValue(key, value, this.lastUpdated || Date.now());
      }
    });
  }
  get values(): { [key: string]: any } {
    return Object.fromEntries(
      Object.entries(this._values).map(([key, value]) => [key, value.value]),
    );
  }

  setValue(id: string, value: any, timestamp: number) {
    this._values[id] = {
      value,
      timestamp,
    };

    if (this.instances[id])
      setTimeout(() => {
        render(
          this.templateRenderer(id, this.values[id], (value) =>
            this.setValue(id, value, Date.now()),
          ),
          this.instances[id],
        );
      });
  }

  get renderer() {
    return (root: HTMLElement, _: any, model: any) => {
      const id = this.getId(model);

      if (!this.instances[id]) {
        const div = document.createElement("div");
        render(
          this.templateRenderer(id, this.values[id], (value) =>
            this.setValue(id, value, Date.now()),
          ),
          div,
        );
        this.instances[id] = div;
      }
      root.innerHTML = "";
      root.appendChild(this.instances[id]);
    };
  }

  instances: { [key: string]: HTMLElement } = {};

  // values: { [key: number]: any } = {};
}
