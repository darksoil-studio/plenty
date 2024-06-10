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
	  sorters: ProducerSorters::Liason,
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
	  editors: ProducerEditors::AllMembers
,
	  sorters: ProducerSorters::Members
,
    }
}

pub async fn create_producer(conductor: &SweetConductor, zome: &SweetZome, producer: Producer) -> Record {
    let record: Record = conductor
        .call(zome, "create_producer", producer)
        .await;
    record
}

