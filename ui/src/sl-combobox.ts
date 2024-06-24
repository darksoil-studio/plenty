import { SignalWatcher } from "@holochain-open-dev/signals";
import { LitElement, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/tag/tag.js";
import "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";
import "@shoelace-style/shoelace/dist/components/menu/menu.js";
import SlInput from "@shoelace-style/shoelace/dist/components/input/input.js";
import { FormField, FormFieldController } from "@holochain-open-dev/elements";

@customElement("sl-combobox")
export class SlCombobox extends LitElement implements FormField {
  @property()
  options: Array<String> = [];

  @property()
  name: string = "";

  @property()
  label: string = "";

  @property()
  required: boolean = false;

  @property()
  disabled: boolean = false;

  @property()
  multiple: boolean = false;

  @property()
  defaultValue: Array<String> = [];

  @state()
  value: Array<String> = [];

  @state()
  filter = "";

  @query("sl-input")
  input!: SlInput;

  /**
   * @internal
   */
  _controller = new FormFieldController(this);

  reportValidity() {
    const invalid = this.required !== false && this.value === undefined;

    if (invalid) {
      this.input.setCustomValidity(`This field is required`);
      this.input.reportValidity();
    }

    return !invalid;
  }

  async reset() {
    this.value = this.defaultValue;
    this.input.value = "";
  }

  render() {
    return html` <sl-dropdown
      .open=${this.filter.length > 0}
      hoist
      style="flex: 1"
    >
      ${this.options.length > 0
        ? html`
            <sl-menu
              @sl-select=${(e: CustomEvent) =>
                (this.value = [...this.value, e.detail.item.value])}
            >
              ${this.options
                .filter((option) => option.startsWith(this.input.value))
                .map(
                  (option) =>
                    html`<sl-menu-item .value=${option}
                      >${option}</sl-menu-item
                    >`,
                )}
            </sl-menu>
          `
        : html``}
      <sl-input
        slot="trigger"
        .label=${this.label}
        .required=${this.required}
        .disabled=${this.disabled}
        @input=${(e: CustomEvent) => {
          this.filter = this.input.value;
          this.requestUpdate();
        }}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === "Enter") {
            e.stopPropagation();
            this.value = [...this.value, this.input.value];
            this.input.value = "";
          }
        }}
      >
        <div class="row" style="flex-wrap: wrap; gap: 8px" slot="prefix">
          ${this.value.map(
            (v, i) =>
              html`<sl-tag
                removable
                @sl-remove=${() =>
                  (this.value = this.value.filter((_, j) => i !== j))}
                >${v}</sl-tag
              >`,
          )}
        </div>
      </sl-input></sl-dropdown
    >`;
  }

  static styles = css`
    :host {
      display: flex;
    }

    .row {
      display: flex;
      flex-direction: row;
    }

    sl-input::part(base) {
      flex-wrap: wrap;
      height: unset !important;
    }

    sl-input::part(prefix) {
      width: 100%;
    }
  `;
}
