use hdi::prelude::*;
use roles_types::validate_agent_had_undeleted_role_claim_at_the_time;

use crate::roles::{ORDER_MANAGER, ROLES_INTEGRITY_ZOME_NAME};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(tag = "type")]
pub enum OrderStatus {
    Preparing,
    Open {
        deadline: Timestamp,
        available_products: Vec<ActionHash>,
    },
    Closed {
        household_orders: Vec<ActionHash>,
    },
    Processed {
        producers_deliveries: Vec<ActionHash>,
    },
    Finished {
        household_payments: Vec<ActionHash>,
        producers_invoices: Vec<ActionHash>,
    },
}

#[derive(Clone, PartialEq)]
#[hdk_entry_helper]
pub struct Order {
    pub name: String,
    pub status: OrderStatus,
}

pub fn validate_create_order(
    action_hash: &ActionHash,
    action: EntryCreationAction,
    _order: Order,
) -> ExternResult<ValidateCallbackResult> {
    let validate = validate_agent_had_undeleted_role_claim_at_the_time(
        action.author(),
        action_hash,
        &String::from(ORDER_MANAGER),
        &ZomeName::from(ROLES_INTEGRITY_ZOME_NAME),
    )?;
    let ValidateCallbackResult::Valid = validate else {
        return Ok(validate);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_update_order(
    _action: Update,
    _order: Order,
    _original_action: EntryCreationAction,
    _original_order: Order,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_order(
    action_hash: &ActionHash,
    action: Delete,
    _original_action: EntryCreationAction,
    _original_order: Order,
) -> ExternResult<ValidateCallbackResult> {
    let validate = validate_agent_had_undeleted_role_claim_at_the_time(
        &action.author,
        action_hash,
        &String::from(ORDER_MANAGER),
        &ZomeName::from(ROLES_INTEGRITY_ZOME_NAME),
    )?;
    let ValidateCallbackResult::Valid = validate else {
        return Ok(validate);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_order_updates(
    _action: CreateLink,
    base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
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
    let action_hash =
        target_address
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
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_order_updates(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "OrderUpdates links cannot be deleted",
    )))
}

pub fn validate_create_link_all_orders(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // Check the entry type for the given action hash
    let action_hash =
        target_address
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
    // TODO: add the appropriate validation rules
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_all_orders(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // TODO: add the appropriate validation rules
    Ok(ValidateCallbackResult::Valid)
}
