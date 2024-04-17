#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use std::time::Duration;

use hdk::prelude::*;
use holochain::{conductor::config::ConductorConfig, sweettest::*};

use households_integrity::*;

mod common;
use common::{
    create_household_membership_claim, sample_household_membership_claim_1,
    sample_household_membership_claim_2,
};

#[tokio::test(flavor = "multi_thread")]
async fn create_household_membership_claim_test() {
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

    let alice_zome = alice.zome("households");

    let sample = sample_household_membership_claim_1(&conductors[0], &alice_zome).await;

    // Alice can't create a membership claim without creating first the household and the invite link
    assert!(
        create_household_membership_claim(&conductors[0], &alice_zome, sample.clone())
            .await
            .is_err()
    );
}
