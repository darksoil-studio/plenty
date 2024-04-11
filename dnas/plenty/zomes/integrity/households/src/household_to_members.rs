use hdi::prelude::*;

use crate::was_member_of_household;

pub fn validate_create_link_household_to_members(
    action_hash: ActionHash,
    action: CreateLink,
    base_address: AnyLinkableHash,
    _target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let household_hash =
        base_address
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
        return Ok(ValidateCallbackResult::Invalid(String::from(
            "Only members of households can add households members",
        )));
    }

    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_household_to_members(
    action_hash: ActionHash,
    action: DeleteLink,
    _original_action: CreateLink,
    base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let household_hash = base
        .into_action_hash()
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "No action hash associated with link"
        ))))?;

    if !was_member_of_household(action.author, action_hash, household_hash)? {
        return Ok(ValidateCallbackResult::Invalid(String::from(
            "Only members of households can remove household members",
        )));
    }

    Ok(ValidateCallbackResult::Valid)
}
