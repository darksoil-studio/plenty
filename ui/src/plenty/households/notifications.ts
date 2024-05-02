import {
  ActionHash,
  decodeHashFromBase64,
  encodeHashToBase64,
} from "@holochain/client";

export const NOTIFICATIONS_TYPES = {
  REQUEST_TO_JOIN_HOUSEHOLD: "households/request_to_join_household",
  REQUEST_ACCEPTED: "households/request_accepted",
  REQUEST_REJECTED: "households/request_rejected",
  REQUEST_CANCELLED: "households/request_cancelled",
};

export function encodeRequestNotificationGroup(
  householdHash: ActionHash,
  requestor: ActionHash,
) {
  return `${encodeHashToBase64(householdHash)}/${encodeHashToBase64(requestor)}`;
}
export function decodeRequestNotificationGroup(notificationGroup: string) {
  const split = notificationGroup.split("/");
  return {
    householdHash: decodeHashFromBase64(split[0]),
    requestor: decodeHashFromBase64(split[1]),
  };
}
