use hdi::prelude::*;

pub mod product;
pub use product::*;
pub mod producer;
pub use producer::*;
pub mod categories;
pub use categories::*;

#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    Producer(Producer),
    Product(Product),
}
#[derive(Serialize, Deserialize)]
#[hdk_link_types]
pub enum LinkTypes {
    LiasonToProducers,
    CategoriesPath,
    CategoryToProduct,
    ProducerUpdates,
    AllProducers,
    ProducerToProducts,
    ProductUpdates,
}
#[hdk_extern]
pub fn genesis_self_check(_data: GenesisSelfCheckData) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_agent_joining(
    _agent_pub_key: AgentPubKey,
    _membrane_proof: &Option<MembraneProof>,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
    match op.flattened::<EntryTypes, LinkTypes>()? {
        FlatOp::StoreEntry(store_entry) => match store_entry {
            OpEntry::CreateEntry { app_entry, action } => match app_entry {
                EntryTypes::Producer(producer) => {
                    validate_create_producer(EntryCreationAction::Create(action), producer)
                }
                EntryTypes::Product(product) => {
                    validate_create_product(EntryCreationAction::Create(action), product)
                }
            },
            OpEntry::UpdateEntry {
                app_entry, action, ..
            } => match app_entry {
                EntryTypes::Producer(producer) => {
                    validate_create_producer(EntryCreationAction::Update(action), producer)
                }
                EntryTypes::Product(product) => {
                    validate_create_product(EntryCreationAction::Update(action), product)
                }
            },
            _ => Ok(ValidateCallbackResult::Valid),
        },
        FlatOp::RegisterUpdate(update_entry) => match update_entry {
            OpUpdate::Entry { app_entry, action } => {
                let original_action = must_get_action(action.clone().original_action_address)?
                    .action()
                    .to_owned();
                let original_create_action = match EntryCreationAction::try_from(original_action) {
                    Ok(action) => action,
                    Err(e) => {
                        return Ok(ValidateCallbackResult::Invalid(format!(
                            "Expected to get EntryCreationAction from Action: {e:?}"
                        )));
                    }
                };
                match app_entry {
                    EntryTypes::Product(product) => {
                        let original_app_entry =
                            must_get_valid_record(action.clone().original_action_address)?;
                        let original_product = match Product::try_from(original_app_entry) {
                            Ok(entry) => entry,
                            Err(e) => {
                                return Ok(ValidateCallbackResult::Invalid(format!(
                                    "Expected to get Product from Record: {e:?}"
                                )));
                            }
                        };
                        validate_update_product(
                            action,
                            product,
                            original_create_action,
                            original_product,
                        )
                    }
                    EntryTypes::Producer(producer) => {
                        let original_app_entry =
                            must_get_valid_record(action.clone().original_action_address)?;
                        let original_producer = match Producer::try_from(original_app_entry) {
                            Ok(entry) => entry,
                            Err(e) => {
                                return Ok(ValidateCallbackResult::Invalid(format!(
                                    "Expected to get Producer from Record: {e:?}"
                                )));
                            }
                        };
                        validate_update_producer(
                            action,
                            producer,
                            original_create_action,
                            original_producer,
                        )
                    }
                }
            }
            _ => Ok(ValidateCallbackResult::Valid),
        },
        FlatOp::RegisterDelete(delete_entry) => {
            let original_action_hash = delete_entry.clone().action.deletes_address;
            let original_record = must_get_valid_record(original_action_hash)?;
            let original_record_action = original_record.action().clone();
            let original_action = match EntryCreationAction::try_from(original_record_action) {
                Ok(action) => action,
                Err(e) => {
                    return Ok(ValidateCallbackResult::Invalid(format!(
                        "Expected to get EntryCreationAction from Action: {e:?}"
                    )));
                }
            };
            let app_entry_type = match original_action.entry_type() {
                EntryType::App(app_entry_type) => app_entry_type,
                _ => {
                    return Ok(ValidateCallbackResult::Valid);
                }
            };
            let entry = match original_record.entry().as_option() {
                Some(entry) => entry,
                None => {
                    return Ok(ValidateCallbackResult::Invalid(
                        "Original record for a delete must contain an entry".to_string(),
                    ));
                }
            };
            let original_app_entry = match EntryTypes::deserialize_from_type(
                app_entry_type.zome_index,
                app_entry_type.entry_index,
                entry,
            )? {
                Some(app_entry) => app_entry,
                None => {
                    return Ok(ValidateCallbackResult::Invalid(
                        "Original app entry must be one of the defined entry types for this zome"
                            .to_string(),
                    ));
                }
            };
            match original_app_entry {
                EntryTypes::Product(original_product) => validate_delete_product(
                    delete_entry.clone().action,
                    original_action,
                    original_product,
                ),
                EntryTypes::Producer(original_producer) => validate_delete_producer(
                    delete_entry.clone().action,
                    original_action,
                    original_producer,
                ),
            }
        }
        FlatOp::RegisterCreateLink {
            link_type,
            base_address,
            target_address,
            tag,
            action,
        } => match link_type {
            LinkTypes::LiasonToProducers => {
                validate_create_link_liason_to_producers(action, base_address, target_address, tag)
            }
            LinkTypes::CategoriesPath => {
                validate_create_link_categories_path(action, base_address, target_address, tag)
            }
            LinkTypes::CategoryToProduct => {
                validate_create_link_category_to_product(action, base_address, target_address, tag)
            }
            LinkTypes::ProducerUpdates => {
                validate_create_link_producer_updates(action, base_address, target_address, tag)
            }
            LinkTypes::AllProducers => {
                validate_create_link_all_producers(action, base_address, target_address, tag)
            }
            LinkTypes::ProducerToProducts => {
                validate_create_link_producer_to_products(action, base_address, target_address, tag)
            }
            LinkTypes::ProductUpdates => {
                validate_create_link_product_updates(action, base_address, target_address, tag)
            }
        },
        FlatOp::RegisterDeleteLink {
            link_type,
            base_address,
            target_address,
            tag,
            original_action,
            action,
        } => match link_type {
            LinkTypes::LiasonToProducers => validate_delete_link_liason_to_producers(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::CategoriesPath => validate_delete_link_categories_path(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::CategoryToProduct => validate_delete_link_category_to_product(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::ProducerUpdates => validate_delete_link_producer_updates(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::AllProducers => validate_delete_link_all_producers(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::ProducerToProducts => validate_delete_link_producer_to_products(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::ProductUpdates => validate_delete_link_product_updates(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
        },
        FlatOp::StoreRecord(store_record) => match store_record {
            OpRecord::CreateEntry { app_entry, action } => match app_entry {
                EntryTypes::Producer(producer) => {
                    validate_create_producer(EntryCreationAction::Create(action), producer)
                }
                EntryTypes::Product(product) => {
                    validate_create_product(EntryCreationAction::Create(action), product)
                }
            },
            OpRecord::UpdateEntry {
                original_action_hash,
                app_entry,
                action,
                ..
            } => {
                let original_record = must_get_valid_record(original_action_hash)?;
                let original_action = original_record.action().clone();
                let original_action = match original_action {
                    Action::Create(create) => EntryCreationAction::Create(create),
                    Action::Update(update) => EntryCreationAction::Update(update),
                    _ => {
                        return Ok(ValidateCallbackResult::Invalid(
                            "Original action for an update must be a Create or Update action"
                                .to_string(),
                        ));
                    }
                };
                match app_entry {
                    EntryTypes::Producer(producer) => {
                        let result = validate_create_producer(
                            EntryCreationAction::Update(action.clone()),
                            producer.clone(),
                        )?;
                        if let ValidateCallbackResult::Valid = result {
                            let original_producer: Option<Producer> = original_record
                                .entry()
                                .to_app_option()
                                .map_err(|e| wasm_error!(e))?;
                            let original_producer = match original_producer {
                                Some(producer) => producer,
                                None => {
                                    return Ok(
                                            ValidateCallbackResult::Invalid(
                                                "The updated entry type must be the same as the original entry type"
                                                    .to_string(),
                                            ),
                                        );
                                }
                            };
                            validate_update_producer(
                                action,
                                producer,
                                original_action,
                                original_producer,
                            )
                        } else {
                            Ok(result)
                        }
                    }
                    EntryTypes::Product(product) => {
                        let result = validate_create_product(
                            EntryCreationAction::Update(action.clone()),
                            product.clone(),
                        )?;
                        if let ValidateCallbackResult::Valid = result {
                            let original_product: Option<Product> = original_record
                                .entry()
                                .to_app_option()
                                .map_err(|e| wasm_error!(e))?;
                            let original_product = match original_product {
                                Some(product) => product,
                                None => {
                                    return Ok(
                                            ValidateCallbackResult::Invalid(
                                                "The updated entry type must be the same as the original entry type"
                                                    .to_string(),
                                            ),
                                        );
                                }
                            };
                            validate_update_product(
                                action,
                                product,
                                original_action,
                                original_product,
                            )
                        } else {
                            Ok(result)
                        }
                    }
                }
            }
            OpRecord::DeleteEntry {
                original_action_hash,
                action,
                ..
            } => {
                let original_record = must_get_valid_record(original_action_hash)?;
                let original_action = original_record.action().clone();
                let original_action = match original_action {
                    Action::Create(create) => EntryCreationAction::Create(create),
                    Action::Update(update) => EntryCreationAction::Update(update),
                    _ => {
                        return Ok(ValidateCallbackResult::Invalid(
                            "Original action for a delete must be a Create or Update action"
                                .to_string(),
                        ));
                    }
                };
                let app_entry_type = match original_action.entry_type() {
                    EntryType::App(app_entry_type) => app_entry_type,
                    _ => {
                        return Ok(ValidateCallbackResult::Valid);
                    }
                };
                let entry = match original_record.entry().as_option() {
                    Some(entry) => entry,
                    None => {
                        return Ok(ValidateCallbackResult::Invalid(
                            "Original record for a delete must contain an entry".to_string(),
                        ));
                    }
                };
                let original_app_entry = match EntryTypes::deserialize_from_type(
                    app_entry_type.zome_index,
                    app_entry_type.entry_index,
                    entry,
                )? {
                    Some(app_entry) => app_entry,
                    None => {
                        return Ok(
                                ValidateCallbackResult::Invalid(
                                    "Original app entry must be one of the defined entry types for this zome"
                                        .to_string(),
                                ),
                            );
                    }
                };
                match original_app_entry {
                    EntryTypes::Producer(original_producer) => {
                        validate_delete_producer(action, original_action, original_producer)
                    }
                    EntryTypes::Product(original_product) => {
                        validate_delete_product(action, original_action, original_product)
                    }
                }
            }
            OpRecord::CreateLink {
                base_address,
                target_address,
                tag,
                link_type,
                action,
            } => match link_type {
                LinkTypes::LiasonToProducers => validate_create_link_liason_to_producers(
                    action,
                    base_address,
                    target_address,
                    tag,
                ),
                LinkTypes::CategoriesPath => {
                    validate_create_link_categories_path(action, base_address, target_address, tag)
                }
                LinkTypes::CategoryToProduct => validate_create_link_category_to_product(
                    action,
                    base_address,
                    target_address,
                    tag,
                ),
                LinkTypes::ProducerUpdates => {
                    validate_create_link_producer_updates(action, base_address, target_address, tag)
                }
                LinkTypes::AllProducers => {
                    validate_create_link_all_producers(action, base_address, target_address, tag)
                }
                LinkTypes::ProducerToProducts => validate_create_link_producer_to_products(
                    action,
                    base_address,
                    target_address,
                    tag,
                ),
                LinkTypes::ProductUpdates => {
                    validate_create_link_product_updates(action, base_address, target_address, tag)
                }
            },
            OpRecord::DeleteLink {
                original_action_hash,
                base_address,
                action,
            } => {
                let record = must_get_valid_record(original_action_hash)?;
                let create_link = match record.action() {
                    Action::CreateLink(create_link) => create_link.clone(),
                    _ => {
                        return Ok(ValidateCallbackResult::Invalid(
                            "The action that a DeleteLink deletes must be a CreateLink".to_string(),
                        ));
                    }
                };
                let link_type =
                    match LinkTypes::from_type(create_link.zome_index, create_link.link_type)? {
                        Some(lt) => lt,
                        None => {
                            return Ok(ValidateCallbackResult::Valid);
                        }
                    };
                match link_type {
                    LinkTypes::LiasonToProducers => validate_delete_link_liason_to_producers(
                        action,
                        create_link.clone(),
                        base_address,
                        create_link.target_address,
                        create_link.tag,
                    ),
                    LinkTypes::CategoriesPath => validate_delete_link_categories_path(
                        action,
                        create_link.clone(),
                        base_address,
                        create_link.target_address,
                        create_link.tag,
                    ),
                    LinkTypes::CategoryToProduct => validate_delete_link_category_to_product(
                        action,
                        create_link.clone(),
                        base_address,
                        create_link.target_address,
                        create_link.tag,
                    ),
                    LinkTypes::ProducerUpdates => validate_delete_link_producer_updates(
                        action,
                        create_link.clone(),
                        base_address,
                        create_link.target_address,
                        create_link.tag,
                    ),
                    LinkTypes::AllProducers => validate_delete_link_all_producers(
                        action,
                        create_link.clone(),
                        base_address,
                        create_link.target_address,
                        create_link.tag,
                    ),
                    LinkTypes::ProducerToProducts => validate_delete_link_producer_to_products(
                        action,
                        create_link.clone(),
                        base_address,
                        create_link.target_address,
                        create_link.tag,
                    ),
                    LinkTypes::ProductUpdates => validate_delete_link_product_updates(
                        action,
                        create_link.clone(),
                        base_address,
                        create_link.target_address,
                        create_link.tag,
                    ),
                }
            }
            OpRecord::CreatePrivateEntry { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::UpdatePrivateEntry { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::CreateCapClaim { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::CreateCapGrant { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::UpdateCapClaim { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::UpdateCapGrant { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::Dna { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::OpenChain { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::CloseChain { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::InitZomesComplete { .. } => Ok(ValidateCallbackResult::Valid),
            _ => Ok(ValidateCallbackResult::Valid),
        },
        FlatOp::RegisterAgentActivity(agent_activity) => match agent_activity {
            OpActivity::CreateAgent { agent, action } => {
                let previous_action = must_get_action(action.prev_action)?;
                match previous_action.action() {
                        Action::AgentValidationPkg(
                            AgentValidationPkg { membrane_proof, .. },
                        ) => validate_agent_joining(agent, membrane_proof),
                        _ => {
                            Ok(
                                ValidateCallbackResult::Invalid(
                                    "The previous action for a `CreateAgent` action must be an `AgentValidationPkg`"
                                        .to_string(),
                                ),
                            )
                        }
                    }
            }
            _ => Ok(ValidateCallbackResult::Valid),
        },
    }
}
