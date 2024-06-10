import { assert, test } from "vitest";

import { runScenario, dhtSync } from '@holochain/tryorama';
import { ActionHash, Record, EntryHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { EntryRecord } from '@holochain-open-dev/utils';
import { toPromise } from '@holochain-open-dev/signals';

import { Producer } from '../../../../ui/src/plenty/producers/types.js';
import { sampleProducer } from '../../../../ui/src/plenty/producers/mocks.js';
import { setup } from './setup.js';

test('create a Producer and get all producers', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Bob gets all producers
    let collectionOutput = await toPromise(bob.store.allProducers);
    assert.equal(collectionOutput.size, 0);

    // Alice creates a Producer
    const producer: EntryRecord<Producer> = await alice.store.client.createProducer(await sampleProducer(alice.store.client));
    assert.ok(producer);
    
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
    
    // Bob gets all producers again
    collectionOutput = await toPromise(bob.store.allProducers);
    assert.equal(collectionOutput.size, 1);
    assert.deepEqual(producer.actionHash, Array.from(collectionOutput.keys())[0]);    
  });
});

