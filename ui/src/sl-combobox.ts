import { SignalWatcher } from "@holochain-open-dev/signals";
import { LitElement, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/tag/tag.js";
import "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";
import "@shoelace-style/shoelace/dist/components/menu/menu.js";
import "@shoelace-style/shoelace/dist/components/menu-item/menu-item.js";
import SlInput from "@shoelace-style/shoelace/dist/components/input/input.js";
import { FormField, FormFieldController } from "@holochain-open-dev/elements";
import SlDropdown from "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";

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

  @property({ attribute: "no-repeated-values", type: Boolean })
  noRepeatedValues: boolean = false;

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

  renderMenu() {
    if (this.options.length === 0 || !this.input || this.input.value === "")
      return html``;
    let matchingOptions = this.options.filter((option) =>
      option.startsWith(this.input.value),
    );
    if (this.noRepeatedValues) {
      matchingOptions = matchingOptions.filter(
        (option) => !this.value.includes(option),
      );
    }
    if (matchingOptions.length === 0) return html``;
    return html`
      <sl-menu
        @sl-select=${(e: CustomEvent) => {
          this.value = [...this.value, e.detail.item.value];
          this.input.value = "";
        }}
      >
        ${matchingOptions.map(
          (option) =>
            html`<sl-menu-item .value=${option}>${option}</sl-menu-item>`,
        )}
      </sl-menu>
    `;
  }

  firstUpdated() {
    this.addEventListener("blur", () => {
      if (this.input?.value !== "") {
        this.addValue();
      }
    });
  }

  addValue() {
    if (!(this.noRepeatedValues && this.value.includes(this.input.value))) {
      this.value = [...this.value, this.input.value];
    }
    this.input.value = "";
  }

  render() {
    return html`
      <sl-dropdown
        id="dropdown"
        .open=${this.filter.length > 0}
        hoist
        style="flex: 1"
      >
        ${this.renderMenu()}
        <sl-input
          slot="trigger"
          .label=${this.label}
          .required=${this.required}
          .disabled=${this.disabled}
          @input=${(e: CustomEvent) => {
            this.filter = this.input.value;
            this.requestUpdate();
          }}
          @click=${(e: Event) => {
            if (
              (this.shadowRoot?.getElementById("dropdown") as SlDropdown).open
            ) {
              e.stopPropagation();
            }
          }}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === "Enter" && this.input.value.length > 0) {
              e.stopPropagation();
              this.addValue();
            } else if (e.key === "Backspace" && this.input.value.length === 0) {
              this.value = this.value.slice(0, this.value.length - 1);
            }
          }}
        >
          <div
            class="row"
            style="flex-wrap: wrap; gap: 8px; margin: 2px"
            slot="prefix"
          >
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
      >
    `;
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
      max-width: 100%;
    }
  `;
}
