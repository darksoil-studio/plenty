import { sharedStyles } from "@holochain-open-dev/elements";
import { css } from "lit";

export const appStyles = [
  ...sharedStyles,
  css`
    show-image::part(image) {
      border-radius: 4px;
    }
    .top-bar {
      align-items: center;
      background-color: var(--sl-color-primary-600);
      color: white;
      padding: 16px;
      height: 32px;
    }
    .top-bar sl-icon-button {
      color: white;
    }
    .top-bar sl-icon-button::part(base):hover {
      color: rgb(220, 220, 220);
    }
    my-notifications-icon-button::part(icon-button) {
      color: white;
      --sl-color-primary-600: rgb(220, 220, 220);
      --sl-color-primary-700: rgb(180, 180, 180);
    }
    sl-tab-group {
      display: flex;
    }
    sl-tab-group::part(base) {
      display: flex;
      flex: 1;
    }
    sl-tab-group::part(body) {
      display: flex;
      flex: 1;
    }
    sl-tab-panel::part(base) {
      display: flex;
      flex: 1;
      width: 100%;
      height: 100%;
    }
    sl-tab-panel {
      width: 100%;
    }
  `,
];
