import { assert, test } from "vitest";

import { runScenario, dhtSync } from '@holochain/tryorama';
import { ActionHash, SignedActionHashed, Delete, Record } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { EntryRecord } from '@holochain-open-dev/utils';
import { cleanNodeDecoding } from '@holochain-open-dev/utils/dist/clean-node-decoding.js';
import { toPromise } from '@holochain-open-dev/signals';

import { Producer } from '../../../../ui/src/plenty/producers/types.js';
import { sampleProducer } from '../../../../ui/src/plenty/producers/mocks.js';
import { setup } from './setup.js';

test('create Producer', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a Producer
    const producer: EntryRecord<Producer> = await alice.store.client.createProducer(await sampleProducer(alice.store.client));
    assert.ok(producer);
  });
});

test('create and read Producer', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    const sample = await sampleProducer(alice.store.client);

    // Alice creates a Producer
    const producer: EntryRecord<Producer> = await alice.store.client.createProducer(sample);
    assert.ok(producer);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );

    // Bob gets the created Producer
    const createReadOutput: EntryRecord<Producer> = await toPromise(bob.store.producers.get(producer.actionHash).original);
    assert.deepEqual(sample, cleanNodeDecoding(createReadOutput.entry));
  });
});

test('create and update Producer', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a Producer
    const producer: EntryRecord<Producer> = await alice.store.client.createProducer(await sampleProducer(alice.store.client));
    assert.ok(producer);
        
    const originalActionHash = producer.actionHash;
 
    // Alice updates the Producer
    let contentUpdate = await sampleProducer(alice.store.client);

    let updatedProducer: EntryRecord<Producer> = await alice.store.client.updateProducer(originalActionHash, originalActionHash, contentUpdate);
    assert.ok(updatedProducer);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
        
    // Bob gets the updated Producer
    const readUpdatedOutput0: EntryRecord<Producer> = await toPromise(bob.store.producers.get(producer.actionHash).latestVersion);
    assert.deepEqual(contentUpdate, cleanNodeDecoding(readUpdatedOutput0.entry));

    // Alice updates the Producer again
    contentUpdate = await sampleProducer(alice.store.client);

    updatedProducer = await alice.store.client.updateProducer(originalActionHash, updatedProducer.actionHash, contentUpdate);
    assert.ok(updatedProducer);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
        
    // Bob gets the updated Producer
    const readUpdatedOutput1: EntryRecord<Producer> = await toPromise(bob.store.producers.get(originalActionHash).latestVersion);
    assert.deepEqual(contentUpdate, cleanNodeDecoding(readUpdatedOutput1.entry));
  });
});

test('create and delete Producer', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a Producer
    const producer: EntryRecord<Producer> = await alice.store.client.createProducer(await sampleProducer(alice.store.client));
    assert.ok(producer);
        
    // Alice deletes the Producer
    const deleteActionHash = await alice.store.client.deleteProducer(producer.actionHash);
    assert.ok(deleteActionHash);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
        
    // Bob tries to get the deleted Producer
    const deletes: Array<SignedActionHashed<Delete>> = await toPromise(bob.store.producers.get(producer.actionHash).deletes);
    assert.equal(deletes.length, 1);
  });
});
