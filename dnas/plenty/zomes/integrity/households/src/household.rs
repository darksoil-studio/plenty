use hdi::prelude::*;
pub use households_types::*;

use crate::{HouseholdMembershipClaim, UnitEntryTypes};

pub fn was_member_of_household(
    agent_pub_key: AgentPubKey,
    chain_top: ActionHash,
    household_hash: ActionHash,
) -> ExternResult<bool> {
    let agent_activity = must_get_agent_activity(
        agent_pub_key,
        ChainFilter {
            chain_top,
            filters: ChainFilters::ToGenesis,
            include_cached_entries: true,
        },
    )?;
    let mut deleted_actions: HashSet<ActionHash> = HashSet::new();
    for activity in agent_activity.iter() {
        if let Action::Delete(delete) = &activity.action.hashed.content {
            deleted_actions.insert(delete.deletes_address.clone());
        }
    }
    let household_membership_claim_entry_type: AppEntryDef =
        UnitEntryTypes::HouseholdMembershipClaim.try_into()?;
    for activity in agent_activity {
        if activity.action.hashed.hash.eq(&household_hash) {
            return Ok(true);
        }
        if let Some(EntryType::App(app)) = activity.action.hashed.content.entry_type() {
            if app.eq(&household_membership_claim_entry_type) {
                let claim_record = must_get_valid_record(activity.action.hashed.hash.clone())?;
                let claim = HouseholdMembershipClaim::try_from(claim_record)?;
                if claim.household_hash.eq(&household_hash) {
                    if !deleted_actions.contains(&activity.action.hashed.hash) {
                        return Ok(true);
                    }
                }
            }
        }
    }
    Ok(false)
}

pub fn validate_create_household(
    _action: EntryCreationAction,
    _household: Household,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_update_household(
    action: Update,
    household: Household,
) -> ExternResult<ValidateCallbackResult> {
    // TODO: Add adequate validation
    // was_member_of_household(action.author, action_hash, household_hash)

    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_household(
    _action: Delete,
    _original_action: EntryCreationAction,
    _original_household: Household,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_create_link_household_updates(
    _action: CreateLink,
    base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
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
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_link_household_updates(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "HouseholdUpdates links cannot be deleted",
    )))
}
pub fn validate_create_link_active_households(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
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
    // TODO: Add adequate validation
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_link_active_households(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // TODO: Add adequate validation
    Ok(ValidateCallbackResult::Valid)
}
