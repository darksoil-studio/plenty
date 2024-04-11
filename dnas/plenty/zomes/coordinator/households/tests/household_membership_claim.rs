#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use std::time::Duration;

use hdk::prelude::*;
use holochain::{conductor::config::ConductorConfig, sweettest::*};

use households_integrity::*;


mod common;
use common::{create_household_membership_claim, sample_household_membership_claim_1, sample_household_membership_claim_2};


#[tokio::test(flavor = "multi_thread")]
async fn create_household_membership_claim_test() {
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
    
    let alice_zome = alice.zome("households");
    
    let sample = sample_household_membership_claim_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a HouseholdMembershipClaim
    let record: Record = create_household_membership_claim(&conductors[0], &alice_zome, sample.clone()).await;
    let entry: HouseholdMembershipClaim = record.entry().to_app_option().unwrap().unwrap();
    assert!(entry.eq(&sample));
}


#[tokio::test(flavor = "multi_thread")]
async fn create_and_read_household_membership_claim() {
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
    
    let alice_zome = alice.zome("households");
    let bob_zome = bobbo.zome("households");
    
    let sample = sample_household_membership_claim_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a HouseholdMembershipClaim
    let record: Record = create_household_membership_claim(&conductors[0], &alice_zome, sample.clone()).await;
    
    await_consistency(Duration::from_secs(30), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");
    
    let get_record: Option<Record> = conductors[1]
        .call(&bob_zome, "get_household_membership_claim", record.signed_action.action_address().clone())
        .await;
        
    assert_eq!(record, get_record.unwrap());    
}


