use hdk::prelude::*;
use holochain::sweettest::*;

use producers_integrity::*;

pub async fn sample_producer_1(conductor: &SweetConductor, zome: &SweetZome) -> Producer {
    Producer {
        name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
        photo: ::fixt::fixt!(EntryHash),
        contact_email: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
        phone_number: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
        location: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
        producer_details: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
        liason: zome.cell_id().agent_pubkey().clone(),
        editors: ProducerEditors::Liason,
    }
}

pub async fn sample_producer_2(conductor: &SweetConductor, zome: &SweetZome) -> Producer {
    Producer {
        name: "Lorem ipsum 2".to_string(),
        photo: ::fixt::fixt!(EntryHash),
        contact_email: "Lorem ipsum 2".to_string(),
        phone_number: "Lorem ipsum 2".to_string(),
        location: "Lorem ipsum 2".to_string(),
        producer_details: "Lorem ipsum 2".to_string(),
        liason: zome.cell_id().agent_pubkey().clone(),
        editors: ProducerEditors::AllMembers,
    }
}

pub async fn create_producer(
    conductor: &SweetConductor,
    zome: &SweetZome,
    producer: Producer,
) -> Record {
    let record: Record = conductor.call(zome, "create_producer", producer).await;
    record
}

pub async fn sample_product_1(conductor: &SweetConductor, zome: &SweetZome) -> Product {
    Product {
        producer_hash: create_producer(conductor, zome, sample_producer_1(conductor, zome).await)
            .await
            .signed_action
            .hashed
            .hash,
        name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
        product_id: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
        categories: vec!["Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string()],
        packaging: Packaging {
            unit: PackagingUnit::Piece,
            number_of_packages: 1,
            amount_per_package: 1.0,
            estimate: false,
        },
        maximum_available: Some(10),
        price_cents: 10,
        vat_percentage: 10.0,
        margin_percentage: Some(10.0),
        origin: Some("Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string()),
        ingredients: Some("Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string()),
    }
}

pub async fn sample_product_2(conductor: &SweetConductor, zome: &SweetZome) -> Product {
    Product {
        producer_hash: create_producer(conductor, zome, sample_producer_2(conductor, zome).await)
            .await
            .signed_action
            .hashed
            .hash,
        name: "Lorem ipsum 2".to_string(),
        product_id: "Lorem ipsum 2".to_string(),
        description: "Lorem ipsum 2".to_string(),
        categories: vec!["Lorem ipsum 2".to_string()],
        packaging: Packaging {
            unit: PackagingUnit::Kilograms,
            number_of_packages: 1,
            amount_per_package: 1.0,
            estimate: false,
        },
        maximum_available: Some(3),
        price_cents: 3,
        vat_percentage: 3.0,
        margin_percentage: Some(3.0),
        origin: Some("Lorem ipsum 2".to_string()),
        ingredients: Some("Lorem ipsum 2".to_string()),
    }
}

pub async fn create_product(
    conductor: &SweetConductor,
    zome: &SweetZome,
    product: Product,
) -> Record {
    let record: Record = conductor.call(zome, "create_product", product).await;
    record
}
