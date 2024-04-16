use hdi::prelude::*;

use crate::was_member_of_household;

pub fn validate_create_link_household_to_requestors(
    _action: CreateLink,
    base_address: AnyLinkableHash,
    _target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let action_hash = base_address
        .into_action_hash()
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "No action hash associated with link"
        ))))?;
    let record = must_get_valid_record(action_hash)?;
    let _household: crate::Household = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Linked action must reference an entry"
        ))))?;
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_household_to_requestors(
    action_hash: ActionHash,
    action: DeleteLink,
    _original_action: CreateLink,
    base: AnyLinkableHash,
    target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let household_hash = base
        .into_action_hash()
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "No action hash associated with link"
        ))))?;

    let requestor = target
        .into_agent_pub_key()
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "HouseholdToRequestors link does not have an AgentPubKey as its target"
        ))))?;

    if action.author.eq(&requestor) {
        return Ok(ValidateCallbackResult::Valid);
    }

    if !was_member_of_household(action.author, action_hash, household_hash)? {
        return Ok(ValidateCallbackResult::Invalid(String::from(
            "Only members of households can remove join household requests",
        )));
    }
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_requestor_to_households(
    action: CreateLink,
    base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let action_hash =
        target_address
            .into_action_hash()
            .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
                "No action hash associated with link"
            ))))?;
    let record = must_get_valid_record(action_hash)?;
    let _household: crate::Household = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Linked action must reference an entry"
        ))))?;

    let requestor = base_address
        .into_agent_pub_key()
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "The base of a RequestorToHouseholds link must be an agent"
        ))))?;

    if !requestor.eq(&action.author) {
        return Ok(ValidateCallbackResult::Invalid(String::from(
            "The author of a RequestorToHouseholds link must be the base address for that link",
        )));
    }

    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_requestor_to_households(
    action_hash: ActionHash,
    action: DeleteLink,
    _original_action: CreateLink,
    base: AnyLinkableHash,
    target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let household_hash = target
        .into_action_hash()
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "No action hash associated with link"
        ))))?;

    let requestor = base
        .into_agent_pub_key()
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "RequestorToHouseholds link does not have an AgentPubKey as its target"
        ))))?;

    if action.author.eq(&requestor) {
        return Ok(ValidateCallbackResult::Valid);
    }

    if !was_member_of_household(action.author, action_hash, household_hash)? {
        return Ok(ValidateCallbackResult::Invalid(String::from(
            "Only members of households can remove join household requests",
        )));
    }
    Ok(ValidateCallbackResult::Valid)
}
