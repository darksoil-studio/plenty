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



pub async fn sample_producer_delivery_1(conductor: &SweetConductor, zome: &SweetZome) -> ProducerDelivery {
    ProducerDelivery {
          order_hash: create_order(conductor, zome, sample_order_1(conductor, zome).await).await.signed_action.hashed.hash,
	  products: vec![::fixt::fixt!(ActionHash)],
    }
}

pub async fn sample_producer_delivery_2(conductor: &SweetConductor, zome: &SweetZome) -> ProducerDelivery {
    ProducerDelivery {
          order_hash: create_order(conductor, zome, sample_order_2(conductor, zome).await).await.signed_action.hashed.hash,
	  products: vec![::fixt::fixt!(ActionHash)],
    }
}

pub async fn create_producer_delivery(conductor: &SweetConductor, zome: &SweetZome, producer_delivery: ProducerDelivery) -> Record {
    let record: Record = conductor
        .call(zome, "create_producer_delivery", producer_delivery)
        .await;
    record
}



pub async fn sample_producer_invoice_1(conductor: &SweetConductor, zome: &SweetZome) -> ProducerInvoice {
    ProducerInvoice {
          order_hash: create_order(conductor, zome, sample_order_1(conductor, zome).await).await.signed_action.hashed.hash,
	  invoice: ::fixt::fixt!(EntryHash),
    }
}

pub async fn sample_producer_invoice_2(conductor: &SweetConductor, zome: &SweetZome) -> ProducerInvoice {
    ProducerInvoice {
          order_hash: create_order(conductor, zome, sample_order_2(conductor, zome).await).await.signed_action.hashed.hash,
	  invoice: ::fixt::fixt!(EntryHash),
    }
}

pub async fn create_producer_invoice(conductor: &SweetConductor, zome: &SweetZome, producer_invoice: ProducerInvoice) -> Record {
    let record: Record = conductor
        .call(zome, "create_producer_invoice", producer_invoice)
        .await;
    record
}



pub async fn sample_available_products_1(conductor: &SweetConductor, zome: &SweetZome) -> AvailableProducts {
    AvailableProducts {
          order_hash: create_order(conductor, zome, sample_order_1(conductor, zome).await).await.signed_action.hashed.hash,
	  products: vec![::fixt::fixt!(ActionHash)],
    }
}

pub async fn sample_available_products_2(conductor: &SweetConductor, zome: &SweetZome) -> AvailableProducts {
    AvailableProducts {
          order_hash: create_order(conductor, zome, sample_order_2(conductor, zome).await).await.signed_action.hashed.hash,
	  products: vec![::fixt::fixt!(ActionHash)],
    }
}

pub async fn create_available_products(conductor: &SweetConductor, zome: &SweetZome, available_products: AvailableProducts) -> Record {
    let record: Record = conductor
        .call(zome, "create_available_products", available_products)
        .await;
    record
}

