import { sharedStyles } from "@holochain-open-dev/elements";
import { css } from "lit";

export const appStyles = [
  ...sharedStyles,
  css`
    .top-bar {
      align-items: center;
      color: white;
      background-color: var(--sl-color-primary-900);
      padding: 16px;
    }
  `,
];
