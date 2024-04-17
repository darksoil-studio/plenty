use hdk::prelude::*;
use holochain::{conductor::api::error::ConductorApiResult, sweettest::*};

use households_integrity::*;

pub async fn sample_household_1(conductor: &SweetConductor, zome: &SweetZome) -> Household {
    Household {
        name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
        avatar: ::fixt::fixt!(EntryHash),
    }
}

pub async fn sample_household_2(conductor: &SweetConductor, zome: &SweetZome) -> Household {
    Household {
        name: "Lorem ipsum 2".to_string(),
        avatar: ::fixt::fixt!(EntryHash),
    }
}

pub async fn create_household(
    conductor: &SweetConductor,
    zome: &SweetZome,
    household: Household,
) -> Record {
    let record: Record = conductor.call(zome, "create_household", household).await;
    record
}

pub async fn sample_household_membership_claim_1(
    conductor: &SweetConductor,
    zome: &SweetZome,
) -> HouseholdMembershipClaim {
    HouseholdMembershipClaim {
        member_create_link_hash: ::fixt::fixt!(ActionHash),
        household_hash: ::fixt::fixt!(ActionHash),
    }
}

pub async fn sample_household_membership_claim_2(
    conductor: &SweetConductor,
    zome: &SweetZome,
) -> HouseholdMembershipClaim {
    HouseholdMembershipClaim {
        member_create_link_hash: ::fixt::fixt!(ActionHash),
        household_hash: ::fixt::fixt!(ActionHash),
    }
}

pub async fn create_household_membership_claim(
    conductor: &SweetConductor,
    zome: &SweetZome,
    household_membership_claim: HouseholdMembershipClaim,
) -> ConductorApiResult<Record> {
    conductor
        .call_fallible(
            zome,
            "create_household_membership_claim",
            household_membership_claim,
        )
        .await
}
