#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use std::time::Duration;

use hdk::prelude::*;
use holochain::{conductor::config::ConductorConfig, sweettest::*};

mod common;
use common::{create_household, sample_household_1};

#[tokio::test(flavor = "multi_thread")]
async fn create_a_household_and_get_active_households() {
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

    let alice_zome = alice.zome("households");
    let bob_zome = bobbo.zome("households");

    let sample = sample_household_1(&conductors[0], &alice_zome).await;

    // Alice creates a Household
    let record: Record = create_household(&conductors[0], &alice_zome, sample.clone()).await;

    await_consistency(Duration::from_secs(30), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");

    let links: Vec<Link> = conductors[1]
        .call(&bob_zome, "get_active_households", ())
        .await;

    assert_eq!(links.len(), 1);
    assert_eq!(
        links[0].target.clone().into_action_hash().unwrap(),
        record.signed_action.hashed.hash
    );
}
