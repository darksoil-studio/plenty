import { sharedStyles } from "@holochain-open-dev/elements";
import { css } from "lit";

export const appStyles = [
  ...sharedStyles,
  css`
    .top-bar {
      align-items: center;
      background-color: var(--sl-color-primary-500);
      padding: 16px;
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
