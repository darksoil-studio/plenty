import { assert, test } from "vitest";

import { runScenario, dhtSync } from '@holochain/tryorama';
import { ActionHash, SignedActionHashed, Delete, Record } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { EntryRecord } from '@holochain-open-dev/utils';
import { cleanNodeDecoding } from '@holochain-open-dev/utils/dist/clean-node-decoding.js';
import { toPromise } from '@holochain-open-dev/signals';

import { ProducerInvoice } from '../../../../ui/src/plenty/orders/types.js';
import { sampleProducerInvoice } from '../../../../ui/src/plenty/orders/mocks.js';
import { setup } from './setup.js';

test('create ProducerInvoice', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a ProducerInvoice
    const producerInvoice: EntryRecord<ProducerInvoice> = await alice.store.client.createProducerInvoice(await sampleProducerInvoice(alice.store.client));
    assert.ok(producerInvoice);
  });
});

test('create and read ProducerInvoice', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    const sample = await sampleProducerInvoice(alice.store.client);

    // Alice creates a ProducerInvoice
    const producerInvoice: EntryRecord<ProducerInvoice> = await alice.store.client.createProducerInvoice(sample);
    assert.ok(producerInvoice);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );

    // Bob gets the created ProducerInvoice
    const createReadOutput: EntryRecord<ProducerInvoice> = await toPromise(bob.store.producerInvoices.get(producerInvoice.actionHash).original);
    assert.deepEqual(sample, cleanNodeDecoding(createReadOutput.entry));
  });
});

test('create and update ProducerInvoice', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a ProducerInvoice
    const producerInvoice: EntryRecord<ProducerInvoice> = await alice.store.client.createProducerInvoice(await sampleProducerInvoice(alice.store.client));
    assert.ok(producerInvoice);
        
    const originalActionHash = producerInvoice.actionHash;
 
    // Alice updates the ProducerInvoice
    let contentUpdate = await sampleProducerInvoice(alice.store.client);

    let updatedProducerInvoice: EntryRecord<ProducerInvoice> = await alice.store.client.updateProducerInvoice(originalActionHash, contentUpdate);
    assert.ok(updatedProducerInvoice);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
        
    // Bob gets the updated ProducerInvoice
    const readUpdatedOutput0: EntryRecord<ProducerInvoice> = await toPromise(bob.store.producerInvoices.get(producerInvoice.actionHash).latestVersion);
    assert.deepEqual(contentUpdate, cleanNodeDecoding(readUpdatedOutput0.entry));

    // Alice updates the ProducerInvoice again
    contentUpdate = await sampleProducerInvoice(alice.store.client);

    updatedProducerInvoice = await alice.store.client.updateProducerInvoice(updatedProducerInvoice.actionHash, contentUpdate);
    assert.ok(updatedProducerInvoice);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
        
    // Bob gets the updated ProducerInvoice
    const readUpdatedOutput1: EntryRecord<ProducerInvoice> = await toPromise(bob.store.producerInvoices.get(originalActionHash).latestVersion);
    assert.deepEqual(contentUpdate, cleanNodeDecoding(readUpdatedOutput1.entry));
  });
});

test('create and delete ProducerInvoice', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a ProducerInvoice
    const producerInvoice: EntryRecord<ProducerInvoice> = await alice.store.client.createProducerInvoice(await sampleProducerInvoice(alice.store.client));
    assert.ok(producerInvoice);
        
    // Alice deletes the ProducerInvoice
    const deleteActionHash = await alice.store.client.deleteProducerInvoice(producerInvoice.actionHash);
    assert.ok(deleteActionHash);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
        
    // Bob tries to get the deleted ProducerInvoice
    const deletes: Array<SignedActionHashed<Delete>> = await toPromise(bob.store.producerInvoices.get(producerInvoice.actionHash).deletes);
    assert.equal(deletes.length, 1);
  });
});
