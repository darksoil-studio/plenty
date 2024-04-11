use hdi::prelude::*;

use crate::was_member_of_household;

pub fn validate_create_link_member_to_households(
    action_hash: ActionHash,
    action: CreateLink,
    _base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // Check the entry type for the given action hash
    let household_hash =
        target_address
            .into_action_hash()
            .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
                "No action hash associated with link"
            ))))?;
    let record = must_get_valid_record(household_hash.clone())?;
    let _household: crate::Household = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Linked action must reference an entry"
        ))))?;

    if !was_member_of_household(action.author, action_hash, household_hash)? {
        return Ok(ValidateCallbackResult::Invalid(String::from("")));
    }

    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_member_to_households(
    action_hash: ActionHash,
    action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // Check the entry type for the given action hash
    let household_hash = target
        .into_action_hash()
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "No action hash associated with link"
        ))))?;
    if !was_member_of_household(action.author, action_hash, household_hash)? {
        return Ok(ValidateCallbackResult::Invalid(String::from("")));
    }

    Ok(ValidateCallbackResult::Valid)
}
