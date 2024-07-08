use hdk::prelude::*;
use holochain::sweettest::*;

use orders_integrity::*;



pub async fn sample_order_1(conductor: &SweetConductor, zome: &SweetZome) -> Order {
    Order {
	  name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
	  status: OrderStatus::Preparing,
    }
}

pub async fn sample_order_2(conductor: &SweetConductor, zome: &SweetZome) -> Order {
    Order {
	  name: "Lorem ipsum 2".to_string(),
	  status: OrderStatus::Open
,
    }
}

pub async fn create_order(conductor: &SweetConductor, zome: &SweetZome, order: Order) -> Record {
    let record: Record = conductor
        .call(zome, "create_order", order)
        .await;
    record
}



pub async fn sample_household_order_1(conductor: &SweetConductor, zome: &SweetZome) -> HouseholdOrder {
    HouseholdOrder {
          order_hash: create_order(conductor, zome, sample_order_1(conductor, zome).await).await.signed_action.hashed.hash,
	  products: vec![::fixt::fixt!(ActionHash)],
    }
}

pub async fn sample_household_order_2(conductor: &SweetConductor, zome: &SweetZome) -> HouseholdOrder {
    HouseholdOrder {
          order_hash: create_order(conductor, zome, sample_order_2(conductor, zome).await).await.signed_action.hashed.hash,
	  products: vec![::fixt::fixt!(ActionHash)],
    }
}

pub async fn create_household_order(conductor: &SweetConductor, zome: &SweetZome, household_order: HouseholdOrder) -> Record {
    let record: Record = conductor
        .call(zome, "create_household_order", household_order)
        .await;
    record
}

