
        use hdk::prelude::*;
        use producers_integrity::*;

        
        #[hdk_extern]
        pub fn create_producer(producer: Producer) -> ExternResult<Record> {
            let producer_hash = create_entry(&EntryTypes::Producer(producer.clone()))?;
            
            create_link(producer.liason.clone(), producer_hash.clone(), LinkTypes::LiasonToProducers, ())?;
            
        
            let record = get(producer_hash.clone(), GetOptions::default())?
                .ok_or(wasm_error!(WasmErrorInner::Guest("Could not find the newly created Producer".to_string())))?;
            Ok(record)
        }
        
        
        #[hdk_extern]
        pub fn get_latest_producer(original_producer_hash: ActionHash) -> ExternResult<Option<Record>> {
            let links = get_links(
                GetLinksInputBuilder::try_new(original_producer_hash.clone(), LinkTypes::ProducerUpdates)?.build(),
            )?;

            let latest_link = links.into_iter().max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));

            let latest_producer_hash = match latest_link {
                Some(link) => link.target.clone().into_action_hash().ok_or(wasm_error!(
                    WasmErrorInner::Guest("No action hash associated with link".to_string())
                ))?,
                None => original_producer_hash.clone()   
            };

            get(latest_producer_hash, GetOptions::default())
        }

        #[hdk_extern]
        pub fn get_original_producer(original_producer_hash: ActionHash) -> ExternResult<Option<Record>> {
            let Some(details) = get_details(original_producer_hash, GetOptions::default())? else {
                return Ok(None);
            };
            match details {
                Details::Record(details) => Ok(Some(details.record)),
                _ => Err(wasm_error!(WasmErrorInner::Guest("Malformed get details response".to_string()))),
            }
        }

        #[hdk_extern]
        pub fn get_all_revisions_for_producer(original_producer_hash: ActionHash) -> ExternResult<Vec<Record>> {
            let Some(original_record) = get_original_producer(original_producer_hash.clone())? else {
                return Ok(vec![]);
            };

            let links = get_links(
                GetLinksInputBuilder::try_new(original_producer_hash.clone(), LinkTypes::ProducerUpdates)?.build(),
            )?;

            let get_input: Vec<GetInput> = links
                .into_iter()
                .map(|link| Ok(GetInput::new(
                    link.target.into_action_hash().ok_or(wasm_error!(WasmErrorInner::Guest("No action hash associated with link".to_string())))?.into(),
                    GetOptions::default(),
                )))
                .collect::<ExternResult<Vec<GetInput>>>()?;

            // load the records for all the links
            let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
            let mut records: Vec<Record> = records.into_iter().flatten().collect();
            records.insert(0, original_record);

            Ok(records)
        }
        
    #[derive(Serialize, Deserialize, Debug)]
    pub struct UpdateProducerInput {
        pub original_producer_hash: ActionHash,
        pub previous_producer_hash: ActionHash,
        pub updated_producer: Producer
    }

    #[hdk_extern]
    pub fn update_producer(input: UpdateProducerInput) -> ExternResult<Record> {
        let updated_producer_hash = update_entry(input.previous_producer_hash.clone(), &input.updated_producer)?;
                
        create_link(input.original_producer_hash.clone(), updated_producer_hash.clone(), LinkTypes::ProducerUpdates, ())?;

        let record = get(updated_producer_hash.clone(), GetOptions::default())?
                .ok_or(wasm_error!(WasmErrorInner::Guest("Could not find the newly updated Producer".to_string())))?;
            
        Ok(record)
    }
    
        #[hdk_extern]
        pub fn delete_producer(original_producer_hash: ActionHash) -> ExternResult<ActionHash> {
            
                let details = get_details(original_producer_hash.clone(), GetOptions::default())?
                    .ok_or(wasm_error!(WasmErrorInner::Guest(String::from("{pascal_entry_def_name} not found"))))?;
                let record = match details {
                    Details::Record(details) => Ok(details.record),
                    _ => Err(wasm_error!(WasmErrorInner::Guest(String::from(
                        "Malformed get details response"
                    )))),
                }?;
                let entry = record.entry().as_option().ok_or(wasm_error!(WasmErrorInner::Guest("Producer record has no entry".to_string())))?;
                let producer = Producer::try_from(entry)?;
                
                        let links = get_links(
                            GetLinksInputBuilder::try_new(producer.liason.clone(), LinkTypes::LiasonToProducers)?.build(),
                        )?;
                        for link in links {
                            if let Some(action_hash) = link.target.into_action_hash() {
                                if action_hash.eq(&original_producer_hash) {
                                    delete_link(link.create_link_hash)?;
                                }
                            }
                        }
                        
            delete_entry(original_producer_hash)
        }

        #[hdk_extern]
        pub fn get_all_deletes_for_producer(
            original_producer_hash: ActionHash,
        ) -> ExternResult<Option<Vec<SignedActionHashed>>> {
            let Some(details) = get_details(original_producer_hash, GetOptions::default())? else {
                return Ok(None);
            };

            match details {
                Details::Entry(_) => Err(wasm_error!(WasmErrorInner::Guest(
                    "Malformed details".into()
                ))),
                Details::Record(record_details) => Ok(Some(record_details.deletes)),
            }
        }

        #[hdk_extern]
        pub fn get_oldest_delete_for_producer(
            original_producer_hash: ActionHash,
        ) -> ExternResult<Option<SignedActionHashed>> {
            let Some(mut deletes) = get_all_deletes_for_producer(original_producer_hash)? else {
                return Ok(None);
            };

            deletes.sort_by(|delete_a, delete_b| delete_a.action().timestamp().cmp(&delete_b.action().timestamp()));

            Ok(deletes.first().cloned())
        }
        
        #[hdk_extern]
        pub fn get_producers_for_liason(liason: AgentPubKey) -> ExternResult<Vec<Link>> {
            get_links(
                GetLinksInputBuilder::try_new(liason, LinkTypes::LiasonToProducers)?.build(),
            )
        }
        
            #[hdk_extern]
            pub fn get_deleted_producers_for_liason(
                liason: AgentPubKey,
            ) -> ExternResult<Vec<(SignedActionHashed, Vec<SignedActionHashed>)>> {
                let details = get_link_details(
                    liason,
                    LinkTypes::LiasonToProducers,
                    None,
                    GetOptions::default(),
                )?;
                Ok(details
                    .into_inner()
                    .into_iter()
                    .filter(|(_link, deletes)| !deletes.is_empty())
                    .collect())
            }
            
        