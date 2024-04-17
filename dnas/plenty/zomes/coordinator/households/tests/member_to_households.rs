#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use hdk::prelude::*;
use holochain::{conductor::config::ConductorConfig, sweettest::*};
use std::time::Duration;

use households::household_to_members::AddMemberForHouseholdInput;

mod common;

use common::{create_household, sample_household_1};

#[tokio::test(flavor = "multi_thread")]
async fn link_a_member_to_a_household() {
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

    let base_address = bobbo.agent_pubkey().clone();
    let target_record = create_household(
        &conductors[0],
        &alice_zome,
        sample_household_1(&conductors[0], &alice_zome).await,
    )
    .await;
    let target_address = target_record.signed_action.hashed.hash.clone();

    // Bob gets the links, should be empty
    let links_output: Vec<Link> = conductors[1]
        .call(&bob_zome, "get_households_for_member", base_address.clone())
        .await;
    assert_eq!(links_output.len(), 0);

    // Alice creates a link from Member to Household
    let _result: () = conductors[0]
        .call(
            &alice_zome,
            "add_member_for_household",
            AddMemberForHouseholdInput {
                member: base_address.clone(),
                household_hash: target_address.clone(),
            },
        )
        .await;

    await_consistency(Duration::from_secs(30), [&alice, &bobbo])
        .await
        .expect("Timed out waiting for consistency");

    // Bob gets the links again
    let links_output: Vec<Link> = conductors[1]
        .call(&bob_zome, "get_households_for_member", base_address.clone())
        .await;
    assert_eq!(links_output.len(), 1);
    assert_eq!(
        AnyLinkableHash::from(target_address.clone()),
        links_output[0].target
    );
}
