#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use std::{sync::Arc, time::Duration};

use hdk::prelude::*;
use holochain::{
    conductor::config::ConductorConfig,
    prelude::{
        dependencies::kitsune_p2p_types::config::{
            tuning_params_struct::KitsuneP2pTuningParams, KitsuneP2pConfig,
        },
        RenderedOps,
    },
    sweettest::*,
};
use holochain_cascade::error::CascadeResult;

use holochain_sqlite::rusqlite::Transaction;
use holochain_state::{
    mutations::{
        insert_action, insert_entry, insert_op_lite, set_validation_status, set_when_integrated,
    },
    prelude::{produce_ops_from_record, DhtOpError, OpOrder, RenderedOp},
};
use producers_integrity::*;

use producers::producer::UpdateProducerInput;

mod common;
use common::{create_producer, sample_producer_1, sample_producer_2};

#[tokio::test(flavor = "multi_thread")]
async fn create_producer_test() {
    // Use prebuilt dna file
    let dna_path = std::env::current_dir().unwrap().join(
        std::env::var("DNA_PATH").expect("DNA_PATH not set, must be run using nix flake check"),
    );
    let dna = SweetDnaFile::from_bundle(&dna_path).await.unwrap();

    // Set up conductors
    let mut conductors = SweetConductorBatch::from_config(2, ConductorConfig::default()).await;
    let apps = conductors.setup_app("plenty", &[dna]).await.unwrap();
    conductors.exchange_peer_info().await;

    let ((alice,), (_bobbo,)) = apps.into_tuples();

    let alice_zome = alice.zome("producers");

    let sample = sample_producer_1(&conductors[0], &alice_zome).await;

    // Alice creates a Producer
    // let record: Record = create_producer(&conductors[0], &alice_zome, sample.clone()).await;
    // let entry: Producer = record.entry().to_app_option().unwrap().unwrap();
    // assert!(entry.eq(&sample));
}

#[tokio::test(flavor = "multi_thread")]
async fn create_and_read_producer() {
    // Use prebuilt dna file
    let dna_path = std::env::current_dir().unwrap().join(
        std::env::var("DNA_PATH").expect("DNA_PATH not set, must be run using nix flake check"),
    );
    let dna = SweetDnaFile::from_bundle(&dna_path).await.unwrap();

    // Set up conductors
    let mut conductors = SweetConductorBatch::from_config(2, ConductorConfig::default()).await;
    let apps = conductors.setup_app("plenty", &[dna]).await.unwrap();
    conductors.exchange_peer_info().await;

    let ((alice,), (bobbo,)) = apps.into_tuples();

    let alice_zome = alice.zome("producers");
    let bob_zome = bobbo.zome("producers");

    let sample = sample_producer_1(&conductors[0], &alice_zome).await;

    // Alice creates a Producer
    // let record: Record = create_producer(&conductors[0], &alice_zome, sample.clone()).await;

    // await_consistency(Duration::from_secs(60), [&alice, &bobbo])
    //     .await
    //     .expect("Timed out waiting for consistency");

    // let get_record: Option<Record> = conductors[1]
    //     .call(
    //         &bob_zome,
    //         "get_original_producer",
    //         record.signed_action.action_address().clone(),
    //     )
    //     .await;

    // assert_eq!(record, get_record.unwrap());
}

#[tokio::test(flavor = "multi_thread")]
async fn create_and_read_producer_without_the_thing() {
    // Use prebuilt dna file
    let dna_path = std::env::current_dir().unwrap().join(
        std::env::var("DNA_PATH").expect("DNA_PATH not set, must be run using nix flake check"),
    );
    let dna = SweetDnaFile::from_bundle(&dna_path).await.unwrap();
    let mut config = ConductorConfig::default();

    let mut network_config = KitsuneP2pConfig::default();

    let mut tuning_params = KitsuneP2pTuningParams::default();

    tuning_params.gossip_arc_clamping = String::from("empty");

    network_config.tuning_params = Arc::new(tuning_params);

    config.network = network_config;

    // Set up conductors
    let mut conductors = SweetConductorBatch::from_config(2, config).await;
    let apps = conductors.setup_app("plenty", &[dna]).await.unwrap();
    // conductors.exchange_peer_info().await;

    let ((alice,), (bobbo,)) = apps.into_tuples();

    let alice_zome = alice.zome("producers");
    let bob_zome = bobbo.zome("producers");

    let sample = sample_producer_1(&conductors[0], &alice_zome).await;

    // Alice creates a Producer
    // let record: Record = create_producer(&conductors[0], &alice_zome, sample.clone()).await;

    // await_consistency(Duration::from_secs(60), [&alice, &bobbo])
    //     .await
    //     .expect("Timed out waiting for consistency");

    // let space = conductors[1]
    //     .raw_handle()
    //     .get_spaces()
    //     .get_or_create_space(alice.dna_hash())
    //     .unwrap();

    // let ops = produce_rendered_ops(&record).unwrap();

    // space
    //     .cache_db
    //     .write_async(move |txn| {
    //         insert_rendered_ops(txn, &ops)?;
    //         CascadeResult::Ok(())
    //     })
    //     .await
    //     .unwrap();

    // let get_record: Option<Record> = conductors[1]
    //     .call(
    //         &bob_zome,
    //         "get_original_producer",
    //         record.signed_action.action_address().clone(),
    //     )
    //     .await;

    // assert_eq!(record, get_record.unwrap());
}

fn produce_rendered_ops(record: &Record) -> CascadeResult<RenderedOps> {
    let ops = produce_ops_from_record(&record).unwrap();

    let ops: Vec<RenderedOp> = ops
        .into_iter()
        .map(|op| {
            RenderedOp::new(
                op.action(),
                op.signature().clone(),
                Some(ValidationStatus::Valid),
                op.get_type(),
            )
        })
        .collect::<Result<Vec<RenderedOp>, DhtOpError>>()?;

    let op = RenderedOps {
        entry: record
            .entry()
            .as_option()
            .map(|e| EntryHashed::from_content_sync(e.clone())),
        ops,
    };

    Ok(op)
}

fn insert_rendered_ops(txn: &mut Transaction, ops: &RenderedOps) -> CascadeResult<()> {
    let RenderedOps { ops, entry } = ops;
    if let Some(entry) = entry {
        insert_entry(txn, entry.as_hash(), entry.as_content())?;
    }
    for op in ops {
        insert_rendered_op(txn, op)?;
    }
    Ok(())
}
fn insert_rendered_op(txn: &mut Transaction, op: &RenderedOp) -> CascadeResult<()> {
    let RenderedOp {
        op_light,
        op_hash,
        action,
        validation_status,
    } = op;
    let op_order = OpOrder::new(op_light.get_type(), action.action().timestamp());
    let timestamp = action.action().timestamp();
    insert_action(txn, action)?;
    insert_op_lite(txn, op_light, op_hash, &op_order, &timestamp)?;
    if let Some(status) = validation_status {
        set_validation_status(txn, op_hash, *status)?;
    }
    // We set the integrated to for the cache so it can match the
    // same query as the vault. This can also be used for garbage collection.
    set_when_integrated(txn, op_hash, Timestamp::now())?;
    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
async fn create_and_update_producer() {
    // Use prebuilt dna file
    let dna_path = std::env::current_dir().unwrap().join(
        std::env::var("DNA_PATH").expect("DNA_PATH not set, must be run using nix flake check"),
    );
    let dna = SweetDnaFile::from_bundle(&dna_path).await.unwrap();

    // Set up conductors
    let mut conductors = SweetConductorBatch::from_config(2, ConductorConfig::default()).await;
    let apps = conductors.setup_app("plenty", &[dna]).await.unwrap();
    conductors.exchange_peer_info().await;

    let ((alice,), (bobbo,)) = apps.into_tuples();

    let alice_zome = alice.zome("producers");
    let bob_zome = bobbo.zome("producers");

    let sample_1 = sample_producer_1(&conductors[0], &alice_zome).await;

    // Alice creates a Producer
    // let record: Record = create_producer(&conductors[0], &alice_zome, sample_1.clone()).await;
    // let original_action_hash = record.signed_action.hashed.hash.clone();

    // await_consistency(Duration::from_secs(60), [&alice, &bobbo])
    //     .await
    //     .expect("Timed out waiting for consistency");

    // let sample_2 = sample_producer_2(&conductors[0], &alice_zome).await;
    // let input = UpdateProducerInput {
    //     original_producer_hash: original_action_hash.clone(),
    //     previous_producer_hash: original_action_hash.clone(),
    //     updated_producer: sample_2.clone(),
    // };

    // // Alice updates the Producer
    // let update_record: Record = conductors[0]
    //     .call(&alice_zome, "update_producer", input)
    //     .await;

    // let entry: Producer = update_record.entry().to_app_option().unwrap().unwrap();
    // assert_eq!(sample_2, entry);

    // await_consistency(Duration::from_secs(60), [&alice, &bobbo])
    //     .await
    //     .expect("Timed out waiting for consistency");

    // let get_record: Option<Record> = conductors[1]
    //     .call(
    //         &bob_zome,
    //         "get_latest_producer",
    //         original_action_hash.clone(),
    //     )
    //     .await;

    // assert_eq!(update_record, get_record.unwrap());

    // let input = UpdateProducerInput {
    //     original_producer_hash: original_action_hash.clone(),
    //     previous_producer_hash: update_record.signed_action.hashed.hash.clone(),
    //     updated_producer: sample_1.clone(),
    // };

    // // Alice updates the Producer again
    // let update_record: Record = conductors[0]
    //     .call(&alice_zome, "update_producer", input)
    //     .await;

    // let entry: Producer = update_record.entry().to_app_option().unwrap().unwrap();
    // assert_eq!(sample_1, entry);

    // await_consistency(Duration::from_secs(60), [&alice, &bobbo])
    //     .await
    //     .expect("Timed out waiting for consistency");

    // let get_record: Option<Record> = conductors[1]
    //     .call(
    //         &bob_zome,
    //         "get_latest_producer",
    //         original_action_hash.clone(),
    //     )
    //     .await;

    // assert_eq!(update_record, get_record.unwrap());
}

#[tokio::test(flavor = "multi_thread")]
async fn create_and_delete_producer() {
    // Use prebuilt dna file
    let dna_path = std::env::current_dir().unwrap().join(
        std::env::var("DNA_PATH").expect("DNA_PATH not set, must be run using nix flake check"),
    );
    let dna = SweetDnaFile::from_bundle(&dna_path).await.unwrap();

    // Set up conductors
    let mut conductors = SweetConductorBatch::from_config(2, ConductorConfig::default()).await;
    let apps = conductors.setup_app("plenty", &[dna]).await.unwrap();
    conductors.exchange_peer_info().await;

    let ((alice,), (bobbo,)) = apps.into_tuples();

    let alice_zome = alice.zome("producers");
    let bob_zome = bobbo.zome("producers");

    let sample_1 = sample_producer_1(&conductors[0], &alice_zome).await;

    // Alice creates a Producer
    // let record: Record = create_producer(&conductors[0], &alice_zome, sample_1.clone()).await;
    // let original_action_hash = record.signed_action.hashed.hash;

    // // Alice deletes the Producer
    // let delete_action_hash: ActionHash = conductors[0]
    //     .call(&alice_zome, "delete_producer", original_action_hash.clone())
    //     .await;

    // await_consistency(Duration::from_secs(60), [&alice, &bobbo])
    //     .await
    //     .expect("Timed out waiting for consistency");

    // let deletes: Vec<SignedActionHashed> = conductors[1]
    //     .call(
    //         &bob_zome,
    //         "get_all_deletes_for_producer",
    //         original_action_hash.clone(),
    //     )
    //     .await;

    // assert_eq!(deletes.len(), 1);
    // assert_eq!(deletes[0].hashed.hash, delete_action_hash);
}
