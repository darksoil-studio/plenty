use std::collections::BTreeMap;

use hdi::prelude::*;
use producers_types::*;

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
pub struct FixedProductDeliveryForHouseholds {
    pub amount: u32,
    pub households_hashes: Vec<ActionHash>, // Usually just one
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
pub struct EstimatedProductDeliveryForHouseholds {
    pub products: Vec<f32>,                 // Usually weight?
    pub households_hashes: Vec<ActionHash>, // Usually just one
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(tag = "type")]
pub enum DeliveredAmount {
    FixedAmountProduct {
        delivered_products: Vec<FixedProductDeliveryForHouseholds>,
        price_cents_per_unit_changed: Option<u32>,
    },
    EstimatedAmountProduct {
        delivered_products_by_household: Vec<EstimatedProductDeliveryForHouseholds>,
        price_cents_per_unit_changed: Option<u32>,
    },
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(tag = "type")]
pub enum ProductDelivery {
    Missing,
    Problem { problem: String },
    Delivered { delivered_amount: DeliveredAmount },
}

#[derive(Clone, PartialEq)]
#[hdk_entry_helper]
pub struct ProducerDelivery {
    pub order_hash: ActionHash,
    pub producer_hash: ActionHash,
    pub products: BTreeMap<ActionHash, ProductDelivery>,
}

pub fn validate_create_producer_delivery(
    _action: EntryCreationAction,
    producer_delivery: ProducerDelivery,
) -> ExternResult<ValidateCallbackResult> {
    let record = must_get_valid_record(producer_delivery.order_hash.clone())?;
    let _order: crate::Order = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Dependant action must be accompanied by an entry"
        ))))?;
    let record = must_get_valid_record(producer_delivery.producer_hash.clone())?;
    let _producer: Producer = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Dependant action must be accompanied by an entry"
        ))))?;
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_update_producer_delivery(
    _action: Update,
    producer_delivery: ProducerDelivery,
    _original_action: EntryCreationAction,
    original_producer_delivery: ProducerDelivery,
) -> ExternResult<ValidateCallbackResult> {
    if producer_delivery
        .order_hash
        .ne(&original_producer_delivery.order_hash)
    {
        return Ok(ValidateCallbackResult::Invalid(String::from(
            "Can't change the order_hash for a ProducerDelivery",
        )));
    }

    if producer_delivery
        .producer_hash
        .ne(&original_producer_delivery.producer_hash)
    {
        return Ok(ValidateCallbackResult::Invalid(String::from(
            "Can't change the producer_hash for a ProducerDelivery",
        )));
    }
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_producer_delivery(
    _action: Delete,
    _original_action: EntryCreationAction,
    _original_producer_delivery: ProducerDelivery,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_order_to_producer_deliveries(
    _action: CreateLink,
    base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // Check the entry type for the given action hash
    let action_hash = base_address
        .into_action_hash()
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "No action hash associated with link".to_string()
        )))?;
    let record = must_get_valid_record(action_hash)?;
    let _order: crate::Order = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    // Check the entry type for the given action hash
    let action_hash =
        target_address
            .into_action_hash()
            .ok_or(wasm_error!(WasmErrorInner::Guest(
                "No action hash associated with link".to_string()
            )))?;
    let record = must_get_valid_record(action_hash)?;
    let _producer_delivery: crate::ProducerDelivery = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    // TODO: add the appropriate validation rules
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_order_to_producer_deliveries(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // TODO: add the appropriate validation rules
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_producer_to_producer_deliveries(
    _action: CreateLink,
    base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // Check the entry type for the given action hash
    let action_hash = base_address
        .into_action_hash()
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "No action hash associated with link".to_string()
        )))?;
    let record = must_get_valid_record(action_hash)?;
    let _producer: Producer = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    // Check the entry type for the given action hash
    let action_hash =
        target_address
            .into_action_hash()
            .ok_or(wasm_error!(WasmErrorInner::Guest(
                "No action hash associated with link".to_string()
            )))?;
    let record = must_get_valid_record(action_hash)?;
    let _producer_delivery: crate::ProducerDelivery = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    // TODO: add the appropriate validation rules
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_producer_to_producer_deliveries(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // TODO: add the appropriate validation rules
    Ok(ValidateCallbackResult::Valid)
}
