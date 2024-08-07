use hdi::prelude::*;

pub mod producer_invoice;
pub mod roles;
pub use producer_invoice::*;
pub mod producer_delivery;
pub use producer_delivery::*;
pub mod household_order;
pub use household_order::*;
pub mod order;
pub use order::*;
pub mod available_products;
pub use available_products::*;

#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    Order(Order),
    HouseholdOrder(HouseholdOrder),
    ProducerDelivery(ProducerDelivery),
    ProducerInvoice(ProducerInvoice),
    AvailableProducts(AvailableProducts),
}

#[derive(Serialize, Deserialize)]
#[hdk_link_types]
pub enum LinkTypes {
    OrderUpdates,
    OrderToHouseholdOrders,
    HouseholdToHouseholdOrders,
    HouseholdOrderUpdates,
    OrderToProducerDeliveries,
    ProducerToProducerDeliveries,
    OrderToProducerInvoices,
    ProducerToProducerInvoices,
    AllOrders,
    OrderToAvailableProducts,
    AvailableProductsUpdates,
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

pub fn action_hash(op: &Op) -> &ActionHash {
    match op {
        Op::StoreRecord(StoreRecord { record }) => record.action_address(),
        Op::StoreEntry(StoreEntry { action, .. }) => &action.hashed.hash,
        Op::RegisterUpdate(RegisterUpdate { update, .. }) => &update.hashed.hash,
        Op::RegisterDelete(RegisterDelete { delete, .. }) => &delete.hashed.hash,
        Op::RegisterAgentActivity(RegisterAgentActivity { action, .. }) => &action.hashed.hash,
        Op::RegisterCreateLink(RegisterCreateLink { create_link }) => &create_link.hashed.hash,
        Op::RegisterDeleteLink(RegisterDeleteLink { delete_link, .. }) => &delete_link.hashed.hash,
    }
}

#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
    match op.flattened::<EntryTypes, LinkTypes>()? {
        FlatOp::StoreEntry(store_entry) => match store_entry {
            OpEntry::CreateEntry { app_entry, action } => match app_entry {
                EntryTypes::Order(order) => validate_create_order(
                    action_hash(&op),
                    EntryCreationAction::Create(action),
                    order,
                ),
                EntryTypes::HouseholdOrder(household_order) => validate_create_household_order(
                    action_hash(&op).clone(),
                    EntryCreationAction::Create(action),
                    household_order,
                ),
                EntryTypes::ProducerDelivery(producer_delivery) => {
                    validate_create_producer_delivery(
                        EntryCreationAction::Create(action),
                        producer_delivery,
                    )
                }
                EntryTypes::ProducerInvoice(producer_invoice) => validate_create_producer_invoice(
                    action_hash(&op).clone(),
                    EntryCreationAction::Create(action),
                    producer_invoice,
                ),
                EntryTypes::AvailableProducts(available_products) => {
                    validate_create_available_products(
                        action_hash(&op).clone(),
                        EntryCreationAction::Create(action),
                        available_products,
                    )
                }
            },
            OpEntry::UpdateEntry {
                app_entry, action, ..
            } => match app_entry {
                EntryTypes::Order(order) => validate_create_order(
                    action_hash(&op),
                    EntryCreationAction::Update(action),
                    order,
                ),
                EntryTypes::HouseholdOrder(household_order) => validate_create_household_order(
                    action_hash(&op).clone(),
                    EntryCreationAction::Update(action),
                    household_order,
                ),
                EntryTypes::ProducerDelivery(producer_delivery) => {
                    validate_create_producer_delivery(
                        EntryCreationAction::Update(action),
                        producer_delivery,
                    )
                }
                EntryTypes::ProducerInvoice(producer_invoice) => validate_create_producer_invoice(
                    action_hash(&op).clone(),
                    EntryCreationAction::Update(action),
                    producer_invoice,
                ),
                EntryTypes::AvailableProducts(available_products) => {
                    validate_create_available_products(
                        action_hash(&op).clone(),
                        EntryCreationAction::Update(action),
                        available_products,
                    )
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
                    EntryTypes::AvailableProducts(available_products) => {
                        let original_app_entry =
                            must_get_valid_record(action.clone().original_action_address)?;
                        let original_available_products =
                            match AvailableProducts::try_from(original_app_entry) {
                                Ok(entry) => entry,
                                Err(e) => {
                                    return Ok(ValidateCallbackResult::Invalid(format!(
                                        "Expected to get AvailableProducts from Record: {e:?}"
                                    )));
                                }
                            };
                        validate_update_available_products(
                            action_hash(&op).clone(),
                            action,
                            available_products,
                            original_create_action,
                            original_available_products,
                        )
                    }
                    EntryTypes::ProducerInvoice(producer_invoice) => {
                        let original_app_entry =
                            must_get_valid_record(action.clone().original_action_address)?;
                        let original_producer_invoice =
                            match ProducerInvoice::try_from(original_app_entry) {
                                Ok(entry) => entry,
                                Err(e) => {
                                    return Ok(ValidateCallbackResult::Invalid(format!(
                                        "Expected to get ProducerInvoice from Record: {e:?}"
                                    )));
                                }
                            };
                        validate_update_producer_invoice(
                            action_hash(&op).clone(),
                            action,
                            producer_invoice,
                            original_create_action,
                            original_producer_invoice,
                        )
                    }
                    EntryTypes::ProducerDelivery(producer_delivery) => {
                        let original_app_entry =
                            must_get_valid_record(action.clone().original_action_address)?;
                        let original_producer_delivery =
                            match ProducerDelivery::try_from(original_app_entry) {
                                Ok(entry) => entry,
                                Err(e) => {
                                    return Ok(ValidateCallbackResult::Invalid(format!(
                                        "Expected to get ProducerDelivery from Record: {e:?}"
                                    )));
                                }
                            };
                        validate_update_producer_delivery(
                            action,
                            producer_delivery,
                            original_create_action,
                            original_producer_delivery,
                        )
                    }
                    EntryTypes::HouseholdOrder(household_order) => {
                        let original_app_entry =
                            must_get_valid_record(action.clone().original_action_address)?;
                        let original_household_order =
                            match HouseholdOrder::try_from(original_app_entry) {
                                Ok(entry) => entry,
                                Err(e) => {
                                    return Ok(ValidateCallbackResult::Invalid(format!(
                                        "Expected to get HouseholdOrder from Record: {e:?}"
                                    )));
                                }
                            };
                        validate_update_household_order(
                            action_hash(&op).clone(),
                            action,
                            household_order,
                            original_create_action,
                            original_household_order,
                        )
                    }
                    EntryTypes::Order(order) => {
                        let original_app_entry =
                            must_get_valid_record(action.clone().original_action_address)?;
                        let original_order = match Order::try_from(original_app_entry) {
                            Ok(entry) => entry,
                            Err(e) => {
                                return Ok(ValidateCallbackResult::Invalid(format!(
                                    "Expected to get Order from Record: {e:?}"
                                )));
                            }
                        };
                        validate_update_order(action, order, original_create_action, original_order)
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
                EntryTypes::AvailableProducts(original_available_products) => {
                    validate_delete_available_products(
                        action_hash(&op).clone(),
                        delete_entry.clone().action,
                        original_action,
                        original_available_products,
                    )
                }
                EntryTypes::ProducerInvoice(original_producer_invoice) => {
                    validate_delete_producer_invoice(
                        action_hash(&op).clone(),
                        delete_entry.clone().action,
                        original_action,
                        original_producer_invoice,
                    )
                }
                EntryTypes::ProducerDelivery(original_producer_delivery) => {
                    validate_delete_producer_delivery(
                        delete_entry.clone().action,
                        original_action,
                        original_producer_delivery,
                    )
                }
                EntryTypes::HouseholdOrder(original_household_order) => {
                    validate_delete_household_order(
                        action_hash(&op).clone(),
                        delete_entry.clone().action,
                        original_action,
                        original_household_order,
                    )
                }
                EntryTypes::Order(original_order) => validate_delete_order(
                    action_hash(&op),
                    delete_entry.clone().action,
                    original_action,
                    original_order,
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
            LinkTypes::OrderUpdates => {
                validate_create_link_order_updates(action, base_address, target_address, tag)
            }
            LinkTypes::HouseholdToHouseholdOrders => {
                validate_create_link_household_to_household_orders(
                    action_hash(&op).clone(),
                    action,
                    base_address,
                    target_address,
                    tag,
                )
            }
            LinkTypes::OrderToHouseholdOrders => validate_create_link_order_to_household_orders(
                action_hash(&op).clone(),
                action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::HouseholdOrderUpdates => validate_create_link_household_order_updates(
                action_hash(&op).clone(),
                action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::OrderToProducerDeliveries => {
                validate_create_link_order_to_producer_deliveries(
                    action,
                    base_address,
                    target_address,
                    tag,
                )
            }
            LinkTypes::ProducerToProducerDeliveries => {
                validate_create_link_producer_to_producer_deliveries(
                    action,
                    base_address,
                    target_address,
                    tag,
                )
            }
            LinkTypes::OrderToProducerInvoices => validate_create_link_order_to_producer_invoices(
                action_hash(&op).clone(),
                action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::ProducerToProducerInvoices => {
                validate_create_link_producer_to_producer_invoices(
                    action_hash(&op).clone(),
                    action,
                    base_address,
                    target_address,
                    tag,
                )
            }
            LinkTypes::AllOrders => {
                validate_create_link_all_orders(action, base_address, target_address, tag)
            }
            LinkTypes::OrderToAvailableProducts => {
                validate_create_link_order_to_available_products(
                    action_hash(&op).clone(),
                    action,
                    base_address,
                    target_address,
                    tag,
                )
            }
            LinkTypes::AvailableProductsUpdates => validate_create_link_available_products_updates(
                action_hash(&op).clone(),
                action,
                base_address,
                target_address,
                tag,
            ),
        },
        FlatOp::RegisterDeleteLink {
            link_type,
            base_address,
            target_address,
            tag,
            original_action,
            action,
        } => match link_type {
            LinkTypes::OrderUpdates => validate_delete_link_order_updates(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::HouseholdToHouseholdOrders => {
                validate_delete_link_household_to_household_orders(
                    action_hash(&op).clone(),
                    action,
                    original_action,
                    base_address,
                    target_address,
                    tag,
                )
            }
            LinkTypes::OrderToHouseholdOrders => validate_delete_link_order_to_household_orders(
                action_hash(&op).clone(),
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::HouseholdOrderUpdates => validate_delete_link_household_order_updates(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::OrderToProducerDeliveries => {
                validate_delete_link_order_to_producer_deliveries(
                    action,
                    original_action,
                    base_address,
                    target_address,
                    tag,
                )
            }
            LinkTypes::OrderToProducerInvoices => validate_delete_link_order_to_producer_invoices(
                action_hash(&op).clone(),
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::ProducerToProducerDeliveries => {
                validate_delete_link_producer_to_producer_deliveries(
                    action,
                    original_action,
                    base_address,
                    target_address,
                    tag,
                )
            }
            LinkTypes::ProducerToProducerInvoices => {
                validate_delete_link_producer_to_producer_invoices(
                    action_hash(&op).clone(),
                    action,
                    original_action,
                    base_address,
                    target_address,
                    tag,
                )
            }
            LinkTypes::AllOrders => validate_delete_link_all_orders(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::OrderToAvailableProducts => {
                validate_delete_link_order_to_available_products(
                    action_hash(&op).clone(),
                    action,
                    original_action,
                    base_address,
                    target_address,
                    tag,
                )
            }
            LinkTypes::AvailableProductsUpdates => validate_delete_link_available_products_updates(
                action_hash(&op).clone(),
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
        },
        FlatOp::StoreRecord(store_record) => match store_record {
            OpRecord::CreateEntry { app_entry, action } => match app_entry {
                EntryTypes::Order(order) => validate_create_order(
                    action_hash(&op),
                    EntryCreationAction::Create(action),
                    order,
                ),
                EntryTypes::HouseholdOrder(household_order) => validate_create_household_order(
                    action_hash(&op).clone(),
                    EntryCreationAction::Create(action),
                    household_order,
                ),
                EntryTypes::ProducerDelivery(producer_delivery) => {
                    validate_create_producer_delivery(
                        EntryCreationAction::Create(action),
                        producer_delivery,
                    )
                }
                EntryTypes::ProducerInvoice(producer_invoice) => validate_create_producer_invoice(
                    action_hash(&op).clone(),
                    EntryCreationAction::Create(action),
                    producer_invoice,
                ),
                EntryTypes::AvailableProducts(available_products) => {
                    validate_create_available_products(
                        action_hash(&op).clone(),
                        EntryCreationAction::Create(action),
                        available_products,
                    )
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
                    EntryTypes::Order(order) => {
                        let result = validate_create_order(
                            action_hash(&op),
                            EntryCreationAction::Update(action.clone()),
                            order.clone(),
                        )?;
                        if let ValidateCallbackResult::Valid = result {
                            let original_order: Option<Order> = original_record
                                .entry()
                                .to_app_option()
                                .map_err(|e| wasm_error!(e))?;
                            let original_order = match original_order {
                                Some(order) => order,
                                None => {
                                    return Ok(
                                            ValidateCallbackResult::Invalid(
                                                "The updated entry type must be the same as the original entry type"
                                                    .to_string(),
                                            ),
                                        );
                                }
                            };
                            validate_update_order(action, order, original_action, original_order)
                        } else {
                            Ok(result)
                        }
                    }
                    EntryTypes::HouseholdOrder(household_order) => {
                        let result = validate_create_household_order(
                            action_hash(&op).clone(),
                            EntryCreationAction::Update(action.clone()),
                            household_order.clone(),
                        )?;
                        if let ValidateCallbackResult::Valid = result {
                            let original_household_order: Option<HouseholdOrder> = original_record
                                .entry()
                                .to_app_option()
                                .map_err(|e| wasm_error!(e))?;
                            let original_household_order = match original_household_order {
                                Some(household_order) => household_order,
                                None => {
                                    return Ok(
                                            ValidateCallbackResult::Invalid(
                                                "The updated entry type must be the same as the original entry type"
                                                    .to_string(),
                                            ),
                                        );
                                }
                            };
                            validate_update_household_order(
                                action_hash(&op).clone(),
                                action,
                                household_order,
                                original_action,
                                original_household_order,
                            )
                        } else {
                            Ok(result)
                        }
                    }
                    EntryTypes::ProducerDelivery(producer_delivery) => {
                        let result = validate_create_producer_delivery(
                            EntryCreationAction::Update(action.clone()),
                            producer_delivery.clone(),
                        )?;
                        if let ValidateCallbackResult::Valid = result {
                            let original_producer_delivery: Option<ProducerDelivery> =
                                original_record
                                    .entry()
                                    .to_app_option()
                                    .map_err(|e| wasm_error!(e))?;
                            let original_producer_delivery = match original_producer_delivery {
                                Some(producer_delivery) => producer_delivery,
                                None => {
                                    return Ok(
                                            ValidateCallbackResult::Invalid(
                                                "The updated entry type must be the same as the original entry type"
                                                    .to_string(),
                                            ),
                                        );
                                }
                            };
                            validate_update_producer_delivery(
                                action,
                                producer_delivery,
                                original_action,
                                original_producer_delivery,
                            )
                        } else {
                            Ok(result)
                        }
                    }
                    EntryTypes::ProducerInvoice(producer_invoice) => {
                        let result = validate_create_producer_invoice(
                            action_hash(&op).clone(),
                            EntryCreationAction::Update(action.clone()),
                            producer_invoice.clone(),
                        )?;
                        if let ValidateCallbackResult::Valid = result {
                            let original_producer_invoice: Option<ProducerInvoice> =
                                original_record
                                    .entry()
                                    .to_app_option()
                                    .map_err(|e| wasm_error!(e))?;
                            let original_producer_invoice = match original_producer_invoice {
                                Some(producer_invoice) => producer_invoice,
                                None => {
                                    return Ok(
                                            ValidateCallbackResult::Invalid(
                                                "The updated entry type must be the same as the original entry type"
                                                    .to_string(),
                                            ),
                                        );
                                }
                            };
                            validate_update_producer_invoice(
                                action_hash(&op).clone(),
                                action,
                                producer_invoice,
                                original_action,
                                original_producer_invoice,
                            )
                        } else {
                            Ok(result)
                        }
                    }
                    EntryTypes::AvailableProducts(available_products) => {
                        let result = validate_create_available_products(
                            action_hash(&op).clone(),
                            EntryCreationAction::Update(action.clone()),
                            available_products.clone(),
                        )?;
                        if let ValidateCallbackResult::Valid = result {
                            let original_available_products: Option<AvailableProducts> =
                                original_record
                                    .entry()
                                    .to_app_option()
                                    .map_err(|e| wasm_error!(e))?;
                            let original_available_products = match original_available_products {
                                Some(available_products) => available_products,
                                None => {
                                    return Ok(
                                            ValidateCallbackResult::Invalid(
                                                "The updated entry type must be the same as the original entry type"
                                                    .to_string(),
                                            ),
                                        );
                                }
                            };
                            validate_update_available_products(
                                action_hash(&op).clone(),
                                action,
                                available_products,
                                original_action,
                                original_available_products,
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
                    EntryTypes::Order(original_order) => validate_delete_order(
                        action_hash(&op),
                        action,
                        original_action,
                        original_order,
                    ),
                    EntryTypes::HouseholdOrder(original_household_order) => {
                        validate_delete_household_order(
                            action_hash(&op).clone(),
                            action,
                            original_action,
                            original_household_order,
                        )
                    }
                    EntryTypes::ProducerDelivery(original_producer_delivery) => {
                        validate_delete_producer_delivery(
                            action,
                            original_action,
                            original_producer_delivery,
                        )
                    }
                    EntryTypes::ProducerInvoice(original_producer_invoice) => {
                        validate_delete_producer_invoice(
                            action_hash(&op).clone(),
                            action,
                            original_action,
                            original_producer_invoice,
                        )
                    }
                    EntryTypes::AvailableProducts(original_available_products) => {
                        validate_delete_available_products(
                            action_hash(&op).clone(),
                            action,
                            original_action,
                            original_available_products,
                        )
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
                LinkTypes::OrderUpdates => {
                    validate_create_link_order_updates(action, base_address, target_address, tag)
                }
                LinkTypes::OrderToHouseholdOrders => {
                    validate_create_link_order_to_household_orders(
                        action_hash(&op).clone(),
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::HouseholdToHouseholdOrders => {
                    validate_create_link_household_to_household_orders(
                        action_hash(&op).clone(),
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::HouseholdOrderUpdates => validate_create_link_household_order_updates(
                    action_hash(&op).clone(),
                    action,
                    base_address,
                    target_address,
                    tag,
                ),
                LinkTypes::OrderToProducerDeliveries => {
                    validate_create_link_order_to_producer_deliveries(
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::OrderToProducerInvoices => {
                    validate_create_link_order_to_producer_invoices(
                        action_hash(&op).clone(),
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::ProducerToProducerDeliveries => {
                    validate_create_link_producer_to_producer_deliveries(
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::ProducerToProducerInvoices => {
                    validate_create_link_producer_to_producer_invoices(
                        action_hash(&op).clone(),
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::AllOrders => {
                    validate_create_link_all_orders(action, base_address, target_address, tag)
                }
                LinkTypes::OrderToAvailableProducts => {
                    validate_create_link_order_to_available_products(
                        action_hash(&op).clone(),
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::AvailableProductsUpdates => {
                    validate_create_link_available_products_updates(
                        action_hash(&op).clone(),
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
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
                    LinkTypes::OrderUpdates => validate_delete_link_order_updates(
                        action,
                        create_link.clone(),
                        base_address,
                        create_link.target_address,
                        create_link.tag,
                    ),
                    LinkTypes::OrderToHouseholdOrders => {
                        validate_delete_link_order_to_household_orders(
                            action_hash(&op).clone(),
                            action,
                            create_link.clone(),
                            base_address,
                            create_link.target_address,
                            create_link.tag,
                        )
                    }
                    LinkTypes::HouseholdToHouseholdOrders => {
                        validate_delete_link_household_to_household_orders(
                            action_hash(&op).clone(),
                            action,
                            create_link.clone(),
                            base_address,
                            create_link.target_address,
                            create_link.tag,
                        )
                    }
                    LinkTypes::HouseholdOrderUpdates => {
                        validate_delete_link_household_order_updates(
                            action,
                            create_link.clone(),
                            base_address,
                            create_link.target_address,
                            create_link.tag,
                        )
                    }
                    LinkTypes::OrderToProducerDeliveries => {
                        validate_delete_link_order_to_producer_deliveries(
                            action,
                            create_link.clone(),
                            base_address,
                            create_link.target_address,
                            create_link.tag,
                        )
                    }
                    LinkTypes::OrderToProducerInvoices => {
                        validate_delete_link_order_to_producer_invoices(
                            action_hash(&op).clone(),
                            action,
                            create_link.clone(),
                            base_address,
                            create_link.target_address,
                            create_link.tag,
                        )
                    }
                    LinkTypes::ProducerToProducerDeliveries => {
                        validate_delete_link_producer_to_producer_deliveries(
                            action,
                            create_link.clone(),
                            base_address,
                            create_link.target_address,
                            create_link.tag,
                        )
                    }
                    LinkTypes::ProducerToProducerInvoices => {
                        validate_delete_link_producer_to_producer_invoices(
                            action_hash(&op).clone(),
                            action,
                            create_link.clone(),
                            base_address,
                            create_link.target_address,
                            create_link.tag,
                        )
                    }
                    LinkTypes::AllOrders => validate_delete_link_all_orders(
                        action,
                        create_link.clone(),
                        base_address,
                        create_link.target_address,
                        create_link.tag,
                    ),
                    LinkTypes::OrderToAvailableProducts => {
                        validate_delete_link_order_to_available_products(
                            action_hash(&op).clone(),
                            action,
                            create_link.clone(),
                            base_address,
                            create_link.target_address,
                            create_link.tag,
                        )
                    }
                    LinkTypes::AvailableProductsUpdates => {
                        validate_delete_link_available_products_updates(
                            action_hash(&op).clone(),
                            action,
                            create_link.clone(),
                            base_address,
                            create_link.target_address,
                            create_link.tag,
                        )
                    }
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
