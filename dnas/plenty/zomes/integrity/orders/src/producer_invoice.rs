use hdi::prelude::*;
use producers_types::*;
use roles_types::*;

use crate::roles::{BOOKKEEPER_ROLE, ROLES_INTEGRITY_ZOME_NAME};

#[derive(Clone, PartialEq)]
#[hdk_entry_helper]
pub struct ProducerInvoice {
    pub order_hash: ActionHash,
    pub producer_hash: ActionHash,
    pub invoice: EntryHash,
}

pub fn validate_create_producer_invoice(
    action_hash: ActionHash,
    action: EntryCreationAction,
    producer_invoice: ProducerInvoice,
) -> ExternResult<ValidateCallbackResult> {
    let record = must_get_valid_record(producer_invoice.order_hash.clone())?;
    let _order: crate::Order = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Dependant action must be accompanied by an entry"
        ))))?;
    let record = must_get_valid_record(producer_invoice.producer_hash.clone())?;
    let _producer: Producer = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Dependant action must be accompanied by an entry"
        ))))?;

    let was_bookkeeper = validate_agent_had_undeleted_role_claim_at_the_time(
        action.author(),
        &action_hash,
        &String::from(BOOKKEEPER_ROLE),
        &ZomeName::from(ROLES_INTEGRITY_ZOME_NAME),
    )?;

    let ValidateCallbackResult::Valid = was_bookkeeper else {
        return Ok(was_bookkeeper);
    };

    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_update_producer_invoice(
    action_hash: ActionHash,
    action: Update,
    producer_invoice: ProducerInvoice,
    _original_action: EntryCreationAction,
    original_producer_invoice: ProducerInvoice,
) -> ExternResult<ValidateCallbackResult> {
    if producer_invoice
        .order_hash
        .ne(&original_producer_invoice.order_hash)
    {
        return Ok(ValidateCallbackResult::Invalid(String::from(
            "Can't change the order_hash for a ProducerInvoice",
        )));
    }

    if producer_invoice
        .producer_hash
        .ne(&original_producer_invoice.producer_hash)
    {
        return Ok(ValidateCallbackResult::Invalid(String::from(
            "Can't change the producer_hash for a ProducerInvoice",
        )));
    }
    let was_bookkeeper = validate_agent_had_undeleted_role_claim_at_the_time(
        &action.author,
        &action_hash,
        &String::from(BOOKKEEPER_ROLE),
        &ZomeName::from(ROLES_INTEGRITY_ZOME_NAME),
    )?;

    let ValidateCallbackResult::Valid = was_bookkeeper else {
        return Ok(was_bookkeeper);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_producer_invoice(
    action_hash: ActionHash,
    action: Delete,
    _original_action: EntryCreationAction,
    _original_producer_invoice: ProducerInvoice,
) -> ExternResult<ValidateCallbackResult> {
    let was_bookkeeper = validate_agent_had_undeleted_role_claim_at_the_time(
        &action.author,
        &action_hash,
        &String::from(BOOKKEEPER_ROLE),
        &ZomeName::from(ROLES_INTEGRITY_ZOME_NAME),
    )?;

    let ValidateCallbackResult::Valid = was_bookkeeper else {
        return Ok(was_bookkeeper);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_order_to_producer_invoices(
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
    let _order: crate::Order = record
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
    let record = must_get_valid_record(target_hash)?;
    let _producer_invoice: crate::ProducerInvoice = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    // TODO: add the appropriate validation rules
    let was_bookkeeper = validate_agent_had_undeleted_role_claim_at_the_time(
        &action.author,
        &action_hash,
        &String::from(BOOKKEEPER_ROLE),
        &ZomeName::from(ROLES_INTEGRITY_ZOME_NAME),
    )?;

    let ValidateCallbackResult::Valid = was_bookkeeper else {
        return Ok(was_bookkeeper);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_order_to_producer_invoices(
    action_hash: ActionHash,
    action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let was_bookkeeper = validate_agent_had_undeleted_role_claim_at_the_time(
        &action.author,
        &action_hash,
        &String::from(BOOKKEEPER_ROLE),
        &ZomeName::from(ROLES_INTEGRITY_ZOME_NAME),
    )?;

    let ValidateCallbackResult::Valid = was_bookkeeper else {
        return Ok(was_bookkeeper);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_producer_to_producer_invoices(
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
    let _producer: Producer = record
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
    let record = must_get_valid_record(target_hash)?;
    let _producer_invoice: crate::ProducerInvoice = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    // TODO: add the appropriate validation rules
    let was_bookkeeper = validate_agent_had_undeleted_role_claim_at_the_time(
        &action.author,
        &action_hash,
        &String::from(BOOKKEEPER_ROLE),
        &ZomeName::from(ROLES_INTEGRITY_ZOME_NAME),
    )?;

    let ValidateCallbackResult::Valid = was_bookkeeper else {
        return Ok(was_bookkeeper);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_producer_to_producer_invoices(
    action_hash: ActionHash,
    action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // TODO: add the appropriate validation rules
    let was_bookkeeper = validate_agent_had_undeleted_role_claim_at_the_time(
        &action.author,
        &action_hash,
        &String::from(BOOKKEEPER_ROLE),
        &ZomeName::from(ROLES_INTEGRITY_ZOME_NAME),
    )?;

    let ValidateCallbackResult::Valid = was_bookkeeper else {
        return Ok(was_bookkeeper);
    };
    Ok(ValidateCallbackResult::Valid)
}
