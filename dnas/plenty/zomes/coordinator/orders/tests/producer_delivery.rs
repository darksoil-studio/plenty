#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use std::time::Duration;

use hdk::prelude::*;
use holochain::{conductor::config::ConductorConfig, sweettest::*};

use orders_integrity::*;

use orders::producer_delivery::UpdateProducerDeliveryInput;

mod common;
use common::{create_producer_delivery, sample_producer_delivery_1, sample_producer_delivery_2};

use common::{create_order, sample_order_1, sample_order_2};

#[tokio::test(flavor = "multi_thread")]
async fn create_producer_delivery_test() {
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
    
    let alice_zome = alice.zome("orders");
    
    let sample = sample_producer_delivery_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a ProducerDelivery
    let record: Record = create_producer_delivery(&conductors[0], &alice_zome, sample.clone()).await;
    let entry: ProducerDelivery = record.entry().to_app_option().unwrap().unwrap();
    assert!(entry.eq(&sample));
}


#[tokio::test(flavor = "multi_thread")]
async fn create_and_read_producer_delivery() {
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
    
    let alice_zome = alice.zome("orders");
    let bob_zome = bobbo.zome("orders");
    
    let sample = sample_producer_delivery_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a ProducerDelivery
    let record: Record = create_producer_delivery(&conductors[0], &alice_zome, sample.clone()).await;
    
    await_consistency(Duration::from_secs(60), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");
    
    let get_record: Option<Record> = conductors[1]
        .call(&bob_zome, "get_original_producer_delivery", record.signed_action.action_address().clone())
        .await;
        
    assert_eq!(record, get_record.unwrap());    
}

#[tokio::test(flavor = "multi_thread")]
async fn create_and_update_producer_delivery() {
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
    
    let alice_zome = alice.zome("orders");
    let bob_zome = bobbo.zome("orders");
    
    let sample_1 = sample_producer_delivery_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a ProducerDelivery
    let record: Record = create_producer_delivery(&conductors[0], &alice_zome, sample_1.clone()).await;
    let original_action_hash = record.signed_action.hashed.hash.clone();
        
    await_consistency(Duration::from_secs(60), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");
    
    let sample_2 = sample_producer_delivery_2(&conductors[0], &alice_zome).await;
    let input = UpdateProducerDeliveryInput {
      previous_producer_delivery_hash: original_action_hash.clone(),
      updated_producer_delivery: sample_2.clone(),
    };
    
    // Alice updates the ProducerDelivery
    let update_record: Record = conductors[0]
        .call(&alice_zome, "update_producer_delivery", input)
        .await;
        
    let entry: ProducerDelivery = update_record.entry().to_app_option().unwrap().unwrap();
    assert_eq!(sample_2, entry);
    
    await_consistency(Duration::from_secs(60), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");
    
    let get_record: Option<Record> = conductors[1]
        .call(&bob_zome, "get_latest_producer_delivery", original_action_hash.clone())
        .await;
  
    assert_eq!(update_record, get_record.unwrap());
    
    let input = UpdateProducerDeliveryInput {
      previous_producer_delivery_hash: update_record.signed_action.hashed.hash.clone(),
      updated_producer_delivery: sample_1.clone(),
    };
    
    // Alice updates the ProducerDelivery again
    let update_record: Record = conductors[0]
        .call(&alice_zome, "update_producer_delivery", input)
        .await;
        
    let entry: ProducerDelivery = update_record.entry().to_app_option().unwrap().unwrap();
    assert_eq!(sample_1, entry);
    
    await_consistency(Duration::from_secs(60), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");
    
    let get_record: Option<Record> = conductors[1]
        .call(&bob_zome, "get_latest_producer_delivery", original_action_hash.clone())
        .await;
  
    assert_eq!(update_record, get_record.unwrap());
}

#[tokio::test(flavor = "multi_thread")]
async fn create_and_delete_producer_delivery() {
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
    
    let alice_zome = alice.zome("orders");
    let bob_zome = bobbo.zome("orders");
    
    let sample_1 = sample_producer_delivery_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a ProducerDelivery
    let record: Record = create_producer_delivery(&conductors[0], &alice_zome, sample_1.clone()).await;
    let original_action_hash = record.signed_action.hashed.hash;
    
    // Alice deletes the ProducerDelivery
    let delete_action_hash: ActionHash = conductors[0]
        .call(&alice_zome, "delete_producer_delivery", original_action_hash.clone())
        .await;

    await_consistency(Duration::from_secs(60), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");

    let deletes: Vec<SignedActionHashed> = conductors[1]
        .call(&bob_zome, "get_all_deletes_for_producer_delivery", original_action_hash.clone())
        .await;
        
    assert_eq!(deletes.len(), 1);
    assert_eq!(deletes[0].hashed.hash, delete_action_hash);
}
