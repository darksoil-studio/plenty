import { AsyncResult, AsyncSignal, Signal } from "@holochain-open-dev/signals";
import {
  ActionCommittedSignal,
  EntryRecord,
  ZomeClient,
} from "@holochain-open-dev/utils";
import { HoloHash } from "@holochain/client";
import { encode } from "@msgpack/msgpack";

export function completed<T>(value: T): AsyncResult<T> {
  return {
    status: "completed",
    value,
  };
}

function areArrayHashesEqual(
  array1: Array<HoloHash>,
  array2: Array<HoloHash>,
): boolean {
  if (array1.length !== array2.length) return false;

  for (let i = 0; i < array1.length; i += 1) {
    if (array1[i].toString() !== array2[i].toString()) {
      return false;
    }
  }

  return true;
}
export function queryEntriesSignal<
  T,
  S extends ActionCommittedSignal<any, any> & any,
>(
  client: ZomeClient<S>,
  queryEntries: () => Promise<Array<EntryRecord<T>>>,
  entry_type: String,
  pollIntervalMs: number = 20_000,
): AsyncSignal<Array<EntryRecord<T>>> {
  let active = false;
  let unsubs: () => void | undefined;
  let queriedEntries: Array<EntryRecord<T>> | undefined;
  const signal = new Signal.State<AsyncResult<Array<EntryRecord<T>>>>(
    { status: "pending" },
    {
      [Signal.subtle.watched]: () => {
        active = true;
        const fetch = async () => {
          if (!active) return;

          const nQueriedEntries = await queryEntries().finally(() => {
            if (active) {
              setTimeout(() => fetch(), pollIntervalMs);
            }
          });
          if (
            queriedEntries === undefined ||
            !areArrayHashesEqual(
              queriedEntries.map((r) => r.actionHash),
              nQueriedEntries.map((r) => r.actionHash),
            )
          ) {
            queriedEntries = nQueriedEntries;
            signal.set({
              status: "completed",
              value: queriedEntries,
            });
          }
        };
        fetch().catch((error) => {
          signal.set({
            status: "error",
            error,
          });
        });
        unsubs = client.onSignal(async (originalSignal) => {
          if (!active) return;
          if (!(originalSignal as ActionCommittedSignal<any, any>).type) return;
          const hcSignal = originalSignal as ActionCommittedSignal<any, any>;

          if (
            hcSignal.type === "EntryCreated" &&
            hcSignal.app_entry.type === entry_type
          ) {
            const newEntry = new EntryRecord<T>({
              entry: {
                Present: {
                  entry_type: "App",
                  entry: encode(hcSignal.app_entry),
                },
              },
              signed_action: hcSignal.action,
            });
            if (!queriedEntries) queriedEntries = [];
            queriedEntries.push(newEntry);
            signal.set({
              status: "completed",
              value: queriedEntries,
            });
          }
        });
      },
      [Signal.subtle.unwatched]: () => {
        signal.set({
          status: "pending",
        });
        active = false;
        queriedEntries = undefined;
        unsubs();
      },
    },
  );

  return signal;
}
