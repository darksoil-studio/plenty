#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use std::time::Duration;

use hdk::prelude::*;
use holochain::{conductor::config::ConductorConfig, sweettest::*};

use household_integrity::*;

use household::household::UpdateHouseholdInput;

mod common;
use common::{create_household, sample_household_1, sample_household_2};


#[tokio::test(flavor = "multi_thread")]
async fn create_household_test() {
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
    
    let alice_zome = alice.zome("household");
    
    let sample = sample_household_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a Household
    let record: Record = create_household(&conductors[0], &alice_zome, sample.clone()).await;
    let entry: Household = record.entry().to_app_option().unwrap().unwrap();
    assert!(entry.eq(&sample));
}


#[tokio::test(flavor = "multi_thread")]
async fn create_and_read_household() {
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
    
    let alice_zome = alice.zome("household");
    let bob_zome = bobbo.zome("household");
    
    let sample = sample_household_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a Household
    let record: Record = create_household(&conductors[0], &alice_zome, sample.clone()).await;
    
    await_consistency(Duration::from_secs(30), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");
    
    let get_record: Option<Record> = conductors[1]
        .call(&bob_zome, "get_original_household", record.signed_action.action_address().clone())
        .await;
        
    assert_eq!(record, get_record.unwrap());    
}

#[tokio::test(flavor = "multi_thread")]
async fn create_and_update_household() {
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
    
    let alice_zome = alice.zome("household");
    let bob_zome = bobbo.zome("household");
    
    let sample_1 = sample_household_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a Household
    let record: Record = create_household(&conductors[0], &alice_zome, sample_1.clone()).await;
    let original_action_hash = record.signed_action.hashed.hash.clone();
        
    await_consistency(Duration::from_secs(30), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");
    
    let sample_2 = sample_household_2(&conductors[0], &alice_zome).await;
    let input = UpdateHouseholdInput {
      original_household_hash: original_action_hash.clone(),
      previous_household_hash: original_action_hash.clone(),
      updated_household: sample_2.clone(),
    };
    
    // Alice updates the Household
    let update_record: Record = conductors[0]
        .call(&alice_zome, "update_household", input)
        .await;
        
    let entry: Household = update_record.entry().to_app_option().unwrap().unwrap();
    assert_eq!(sample_2, entry);
    
    await_consistency(Duration::from_secs(30), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");
    
    let get_record: Option<Record> = conductors[1]
        .call(&bob_zome, "get_latest_household", original_action_hash.clone())
        .await;
  
    assert_eq!(update_record, get_record.unwrap());
    
    let input = UpdateHouseholdInput {
      original_household_hash: original_action_hash.clone(),
      previous_household_hash: update_record.signed_action.hashed.hash.clone(),
      updated_household: sample_1.clone(),
    };
    
    // Alice updates the Household again
    let update_record: Record = conductors[0]
        .call(&alice_zome, "update_household", input)
        .await;
        
    let entry: Household = update_record.entry().to_app_option().unwrap().unwrap();
    assert_eq!(sample_1, entry);
    
    await_consistency(Duration::from_secs(30), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");
    
    let get_record: Option<Record> = conductors[1]
        .call(&bob_zome, "get_latest_household", original_action_hash.clone())
        .await;
  
    assert_eq!(update_record, get_record.unwrap());
}

#[tokio::test(flavor = "multi_thread")]
async fn create_and_delete_household() {
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
    
    let alice_zome = alice.zome("household");
    let bob_zome = bobbo.zome("household");
    
    let sample_1 = sample_household_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a Household
    let record: Record = create_household(&conductors[0], &alice_zome, sample_1.clone()).await;
    let original_action_hash = record.signed_action.hashed.hash;
    
    // Alice deletes the Household
    let delete_action_hash: ActionHash = conductors[0]
        .call(&alice_zome, "delete_household", original_action_hash.clone())
        .await;

    await_consistency(Duration::from_secs(30), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");

    let deletes: Vec<SignedActionHashed> = conductors[1]
        .call(&bob_zome, "get_all_deletes_for_household", original_action_hash.clone())
        .await;
        
    assert_eq!(deletes.len(), 1);
    assert_eq!(deletes[0].hashed.hash, delete_action_hash);
}
