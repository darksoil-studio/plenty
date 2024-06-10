#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use std::time::Duration;

use hdk::prelude::*;
use holochain::{conductor::config::ConductorConfig, sweettest::*};

use producers_integrity::*;

use producers::producer::UpdateProducerInput;

mod common;
use common::{create_producer, sample_producer_1, sample_producer_2};


#[tokio::test(flavor = "multi_thread")]
async fn create_producer_test() {
    // Use prebuilt dna file
    let dna_path = std::env::current_dir()
        .unwrap()
        .join(std::env::var("DNA_PATH").expect("DNA_PATH not set, must be run using nix flake check"));
    let dna = SweetDnaFile::from_bundle(&dna_path).await.unwrap();

    // Set up conductors
    let mut conductors = SweetConductorBatch::from_config(2, ConductorConfig::default()).await;
    let apps = conductors.setup_app("plenty", &[dna]).await.unwrap();
    conductors.exchange_peer_info().await;

    let ((alice,), (_bobbo,)) = apps.into_tuples();
    
    let alice_zome = alice.zome("producers");
    
    let sample = sample_producer_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a Producer
    let record: Record = create_producer(&conductors[0], &alice_zome, sample.clone()).await;
    let entry: Producer = record.entry().to_app_option().unwrap().unwrap();
    assert!(entry.eq(&sample));
}


#[tokio::test(flavor = "multi_thread")]
async fn create_and_read_producer() {
    // Use prebuilt dna file
    let dna_path = std::env::current_dir()
        .unwrap()
        .join(std::env::var("DNA_PATH").expect("DNA_PATH not set, must be run using nix flake check"));
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
    let record: Record = create_producer(&conductors[0], &alice_zome, sample.clone()).await;
    
    await_consistency(Duration::from_secs(60), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");
    
    let get_record: Option<Record> = conductors[1]
        .call(&bob_zome, "get_original_producer", record.signed_action.action_address().clone())
        .await;
        
    assert_eq!(record, get_record.unwrap());    
}

#[tokio::test(flavor = "multi_thread")]
async fn create_and_update_producer() {
    // Use prebuilt dna file
    let dna_path = std::env::current_dir()
        .unwrap()
        .join(std::env::var("DNA_PATH").expect("DNA_PATH not set, must be run using nix flake check"));
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
    let record: Record = create_producer(&conductors[0], &alice_zome, sample_1.clone()).await;
    let original_action_hash = record.signed_action.hashed.hash.clone();
        
    await_consistency(Duration::from_secs(60), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");
    
    let sample_2 = sample_producer_2(&conductors[0], &alice_zome).await;
    let input = UpdateProducerInput {
      original_producer_hash: original_action_hash.clone(),
      previous_producer_hash: original_action_hash.clone(),
      updated_producer: sample_2.clone(),
    };
    
    // Alice updates the Producer
    let update_record: Record = conductors[0]
        .call(&alice_zome, "update_producer", input)
        .await;
        
    let entry: Producer = update_record.entry().to_app_option().unwrap().unwrap();
    assert_eq!(sample_2, entry);
    
    await_consistency(Duration::from_secs(60), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");
    
    let get_record: Option<Record> = conductors[1]
        .call(&bob_zome, "get_latest_producer", original_action_hash.clone())
        .await;
  
    assert_eq!(update_record, get_record.unwrap());
    
    let input = UpdateProducerInput {
      original_producer_hash: original_action_hash.clone(),
      previous_producer_hash: update_record.signed_action.hashed.hash.clone(),
      updated_producer: sample_1.clone(),
    };
    
    // Alice updates the Producer again
    let update_record: Record = conductors[0]
        .call(&alice_zome, "update_producer", input)
        .await;
        
    let entry: Producer = update_record.entry().to_app_option().unwrap().unwrap();
    assert_eq!(sample_1, entry);
    
    await_consistency(Duration::from_secs(60), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");
    
    let get_record: Option<Record> = conductors[1]
        .call(&bob_zome, "get_latest_producer", original_action_hash.clone())
        .await;
  
    assert_eq!(update_record, get_record.unwrap());
}

#[tokio::test(flavor = "multi_thread")]
async fn create_and_delete_producer() {
    // Use prebuilt dna file
    let dna_path = std::env::current_dir()
        .unwrap()
        .join(std::env::var("DNA_PATH").expect("DNA_PATH not set, must be run using nix flake check"));
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
    let record: Record = create_producer(&conductors[0], &alice_zome, sample_1.clone()).await;
    let original_action_hash = record.signed_action.hashed.hash;
    
    // Alice deletes the Producer
    let delete_action_hash: ActionHash = conductors[0]
        .call(&alice_zome, "delete_producer", original_action_hash.clone())
        .await;

    await_consistency(Duration::from_secs(60), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");

    let deletes: Vec<SignedActionHashed> = conductors[1]
        .call(&bob_zome, "get_all_deletes_for_producer", original_action_hash.clone())
        .await;
        
    assert_eq!(deletes.len(), 1);
    assert_eq!(deletes[0].hashed.hash, delete_action_hash);
}
