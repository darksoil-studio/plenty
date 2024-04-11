#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use hdk::prelude::*;
use holochain::{conductor::config::ConductorConfig, sweettest::*};
use std::time::Duration;

use households::household_to_requestors::RemoveRequestorForHouseholdInput;

mod common;

use common::{create_household, sample_household_1};

#[tokio::test(flavor = "multi_thread")]
async fn link_a_household_to_a_requestor() {
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

    let base_record = create_household(
        &conductors[0],
        &alice_zome,
        sample_household_1(&conductors[0], &alice_zome).await,
    )
    .await;
    let base_address = base_record.signed_action.hashed.hash.clone();
    let target_address = alice.agent_pubkey();

    // Bob gets the links, should be empty
    let links_output: Vec<Link> = conductors[1]
        .call(
            &bob_zome,
            "get_requestors_for_household",
            base_address.clone(),
        )
        .await;
    assert_eq!(links_output.len(), 0);

    // Alice creates a link from Household to Requestor
    let _result: () = conductors[0]
        .call(
            &alice_zome,
            "request_to_join_household",
            base_address.clone(),
        )
        .await;

    await_consistency(Duration::from_secs(30), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");

    // Bob gets the links again
    let links_output: Vec<Link> = conductors[1]
        .call(
            &bob_zome,
            "get_requestors_for_household",
            base_address.clone(),
        )
        .await;
    assert_eq!(links_output.len(), 1);

    let _result: () = conductors[0]
        .call(
            &alice_zome,
            "remove_requestor_for_household",
            RemoveRequestorForHouseholdInput {
                household_hash: base_address.clone(),
                requestor: target_address.clone(),
            },
        )
        .await;

    await_consistency(Duration::from_secs(30), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");

    // Bob gets the links again
    let links_output: Vec<Link> = conductors[1]
        .call(
            &bob_zome,
            "get_requestors_for_household",
            base_address.clone(),
        )
        .await;
    assert_eq!(links_output.len(), 0);
    // Bob gets the deleted links
    let deleted_links_output: Vec<(SignedActionHashed, Vec<SignedActionHashed>)> = conductors[1]
        .call(
            &bob_zome,
            "get_deleted_requestors_for_household",
            base_address.clone(),
        )
        .await;
    assert_eq!(deleted_links_output.len(), 1);
}
