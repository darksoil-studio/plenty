use hdk::prelude::*;
use holochain::sweettest::*;

use household_integrity::*;



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

pub async fn create_household(conductor: &SweetConductor, zome: &SweetZome, household: Household) -> Record {
    let record: Record = conductor
        .call(zome, "create_household", household)
        .await;
    record
}

