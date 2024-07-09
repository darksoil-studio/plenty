use hdi::prelude::*;
use producers_types::Producer;
use roles_types::validate_agent_had_undeleted_role_claim_at_the_time;

use crate::roles::{ORDER_MANAGER, ROLES_INTEGRITY_ZOME_NAME};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(tag = "type")]
pub enum ProducerAvailability {
    Available { available_products: Vec<ActionHash> },
    Unavailable,
}

#[derive(Clone, PartialEq)]
#[hdk_entry_helper]
pub struct AvailableProducts {
    pub order_hash: ActionHash,
    pub original_producer_hash: ActionHash,
    pub latest_producer_hash: ActionHash,
    pub producer_availability: ProducerAvailability,
}

pub fn validate_can_change_available_products(
    agent: &AgentPubKey,
    chain_top: &ActionHash,
    available_products: AvailableProducts,
) -> ExternResult<ValidateCallbackResult> {
    let record = must_get_valid_record(available_products.latest_producer_hash.clone())?;
    let latest_producer: Producer = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Dependant action must be accompanied by an entry"
        ))))?;

    if latest_producer.liason.ne(agent) {
        let was_order_manager = validate_agent_had_undeleted_role_claim_at_the_time(
            agent,
            &chain_top,
            &String::from(ORDER_MANAGER),
            &ZomeName::from(ROLES_INTEGRITY_ZOME_NAME),
        )?;
        let ValidateCallbackResult::Valid = was_order_manager else {
            return Ok(ValidateCallbackResult::Invalid(String::from(
                "Only the liasons or the order managers can create AvailableProducts",
            )));
        };
    }

    return Ok(ValidateCallbackResult::Valid);
}

pub fn validate_create_available_products(
    action_hash: ActionHash,
    action: EntryCreationAction,
    available_products: AvailableProducts,
) -> ExternResult<ValidateCallbackResult> {
    let record = must_get_valid_record(available_products.order_hash.clone())?;
    let _order: crate::Order = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Dependant action must be accompanied by an entry"
        ))))?;
    let record = must_get_valid_record(available_products.original_producer_hash.clone())?;
    let _original_producer: Producer = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Dependant action must be accompanied by an entry"
        ))))?;

    let can_change =
        validate_can_change_available_products(action.author(), &action_hash, available_products)?;

    let ValidateCallbackResult::Valid = can_change else {
        return Ok(can_change);
    };

    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_update_available_products(
    action_hash: ActionHash,
    action: Update,
    available_products: AvailableProducts,
    _original_action: EntryCreationAction,
    original_available_products: AvailableProducts,
) -> ExternResult<ValidateCallbackResult> {
    if available_products
        .order_hash
        .ne(&original_available_products.order_hash)
    {
        return Ok(ValidateCallbackResult::Invalid(String::from(
            "Can't change the order hash for the AvailableProducts entry",
        )));
    }
    if available_products
        .original_producer_hash
        .ne(&original_available_products.original_producer_hash)
    {
        return Ok(ValidateCallbackResult::Invalid(String::from(
            "Can't change the original_producer_hash for the AvailableProducts entry",
        )));
    }

    let can_change =
        validate_can_change_available_products(&action.author, &action_hash, available_products)?;

    let ValidateCallbackResult::Valid = can_change else {
        return Ok(can_change);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_available_products(
    action_hash: ActionHash,
    action: Delete,
    _original_action: EntryCreationAction,
    original_available_products: AvailableProducts,
) -> ExternResult<ValidateCallbackResult> {
    let can_change = validate_can_change_available_products(
        &action.author,
        &action_hash,
        original_available_products,
    )?;

    let ValidateCallbackResult::Valid = can_change else {
        return Ok(can_change);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_order_to_available_products(
    action_hash: ActionHash,
    action: CreateLink,
    base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let base_hash = base_address
        .into_action_hash()
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "No action hash associated with link".to_string()
        )))?;
    let record = must_get_valid_record(base_hash)?;
    let _order: crate::Order = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    let target_hash =
        target_address
            .into_action_hash()
            .ok_or(wasm_error!(WasmErrorInner::Guest(
                "No action hash associated with link".to_string()
            )))?;
    let record = must_get_valid_record(target_hash)?;
    let available_products: crate::AvailableProducts = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    let can_change =
        validate_can_change_available_products(&action.author, &action_hash, available_products)?;

    let ValidateCallbackResult::Valid = can_change else {
        return Ok(can_change);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_order_to_available_products(
    action_hash: ActionHash,
    action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let target_hash = target
        .into_action_hash()
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "No action hash associated with link".to_string()
        )))?;
    let record = must_get_valid_record(target_hash)?;
    let available_products: crate::AvailableProducts = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;

    let can_change =
        validate_can_change_available_products(&action.author, &action_hash, available_products)?;

    let ValidateCallbackResult::Valid = can_change else {
        return Ok(can_change);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_available_products_updates(
    action_hash: ActionHash,
    action: CreateLink,
    base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // Check the entry type for the given action hash
    let base_hash = base_address
        .into_action_hash()
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "No action hash associated with link".to_string()
        )))?;
    let record = must_get_valid_record(base_hash)?;
    let _available_products: crate::AvailableProducts = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    // Check the entry type for the given action hash
    let target_hash =
        target_address
            .into_action_hash()
            .ok_or(wasm_error!(WasmErrorInner::Guest(
                "No action hash associated with link".to_string()
            )))?;
    let record = must_get_valid_record(target_hash.clone())?;
    let available_products: crate::AvailableProducts = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;

    let can_change =
        validate_can_change_available_products(&action.author, &action_hash, available_products)?;

    let ValidateCallbackResult::Valid = can_change else {
        return Ok(can_change);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_available_products_updates(
    action_hash: ActionHash,
    action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // Check the entry type for the given action hash
    let target_hash = target
        .into_action_hash()
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "No action hash associated with link".to_string()
        )))?;
    let record = must_get_valid_record(target_hash.clone())?;
    let available_products: crate::AvailableProducts = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    let can_change =
        validate_can_change_available_products(&action.author, &action_hash, available_products)?;

    let ValidateCallbackResult::Valid = can_change else {
        return Ok(can_change);
    };
    Ok(ValidateCallbackResult::Invalid(String::from(
        "AvailableProductsUpdates links cannot be deleted",
    )))
}
