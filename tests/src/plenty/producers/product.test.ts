import { assert, test } from "vitest";

import { runScenario, dhtSync } from '@holochain/tryorama';
import { ActionHash, SignedActionHashed, Delete, Record } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { EntryRecord } from '@holochain-open-dev/utils';
import { cleanNodeDecoding } from '@holochain-open-dev/utils/dist/clean-node-decoding.js';
import { toPromise } from '@holochain-open-dev/signals';

import { Product } from '../../../../ui/src/plenty/producers/types.js';
import { sampleProduct } from '../../../../ui/src/plenty/producers/mocks.js';
import { setup } from './setup.js';

test('create Product', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a Product
    const product: EntryRecord<Product> = await alice.store.client.createProduct(await sampleProduct(alice.store.client));
    assert.ok(product);
  });
});

test('create and read Product', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    const sample = await sampleProduct(alice.store.client);

    // Alice creates a Product
    const product: EntryRecord<Product> = await alice.store.client.createProduct(sample);
    assert.ok(product);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );

    // Bob gets the created Product
    const createReadOutput: EntryRecord<Product> = await toPromise(bob.store.products.get(product.actionHash).original);
    assert.deepEqual(sample, cleanNodeDecoding(createReadOutput.entry));
  });
});

test('create and update Product', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a Product
    const product: EntryRecord<Product> = await alice.store.client.createProduct(await sampleProduct(alice.store.client));
    assert.ok(product);
        
    const originalActionHash = product.actionHash;
 
    // Alice updates the Product
    let contentUpdate = await sampleProduct(alice.store.client);

    let updatedProduct: EntryRecord<Product> = await alice.store.client.updateProduct(originalActionHash, originalActionHash, contentUpdate);
    assert.ok(updatedProduct);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
        
    // Bob gets the updated Product
    const readUpdatedOutput0: EntryRecord<Product> = await toPromise(bob.store.products.get(product.actionHash).latestVersion);
    assert.deepEqual(contentUpdate, cleanNodeDecoding(readUpdatedOutput0.entry));

    // Alice updates the Product again
    contentUpdate = await sampleProduct(alice.store.client);

    updatedProduct = await alice.store.client.updateProduct(originalActionHash, updatedProduct.actionHash, contentUpdate);
    assert.ok(updatedProduct);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
        
    // Bob gets the updated Product
    const readUpdatedOutput1: EntryRecord<Product> = await toPromise(bob.store.products.get(originalActionHash).latestVersion);
    assert.deepEqual(contentUpdate, cleanNodeDecoding(readUpdatedOutput1.entry));
  });
});

test('create and delete Product', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a Product
    const product: EntryRecord<Product> = await alice.store.client.createProduct(await sampleProduct(alice.store.client));
    assert.ok(product);
        
    // Alice deletes the Product
    const deleteActionHash = await alice.store.client.deleteProduct(product.actionHash);
    assert.ok(deleteActionHash);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
        
    // Bob tries to get the deleted Product
    const deletes: Array<SignedActionHashed<Delete>> = await toPromise(bob.store.products.get(product.actionHash).deletes);
    assert.equal(deletes.length, 1);
  });
});
