use hdi::prelude::*;
use households_types::*;

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
pub struct ProductOrder {
    pub original_product_hash: ActionHash,
    pub ordered_product_hash: ActionHash,
    pub amount: u32,
}

#[derive(Clone, PartialEq)]
#[hdk_entry_helper]
pub struct HouseholdOrder {
    pub order_hash: ActionHash,
    pub household_hash: ActionHash,
    pub products: Vec<ProductOrder>,
}

pub fn validate_create_household_order(
    action_hash: ActionHash,
    action: EntryCreationAction,
    household_order: HouseholdOrder,
) -> ExternResult<ValidateCallbackResult> {
    let record = must_get_valid_record(household_order.order_hash.clone())?;
    let _order: crate::Order = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Dependant action must be accompanied by an entry"
        ))))?;
    let record = must_get_valid_record(household_order.household_hash.clone())?;
    let _household: Household = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Dependant action must be accompanied by an entry"
        ))))?;

    let member_of_household = validate_agent_was_member_of_household_at_the_time(
        action.author().clone(),
        action_hash,
        household_order.household_hash,
    )?;

    let ValidateCallbackResult::Valid = member_of_household else {
        return Ok(member_of_household);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_update_household_order(
    action_hash: ActionHash,
    action: Update,
    household_order: HouseholdOrder,
    _original_action: EntryCreationAction,
    original_household_order: HouseholdOrder,
) -> ExternResult<ValidateCallbackResult> {
    if household_order
        .order_hash
        .ne(&original_household_order.order_hash)
    {
        return Ok(ValidateCallbackResult::Invalid(String::from(
            "Can't change the order_hash for a HouseholdOrder",
        )));
    }

    if household_order
        .household_hash
        .ne(&original_household_order.household_hash)
    {
        return Ok(ValidateCallbackResult::Invalid(String::from(
            "Can't change the household_hash for a HouseholdOrder",
        )));
    }

    let member_of_household = validate_agent_was_member_of_household_at_the_time(
        action.author,
        action_hash,
        household_order.household_hash,
    )?;

    let ValidateCallbackResult::Valid = member_of_household else {
        return Ok(member_of_household);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_household_order(
    action_hash: ActionHash,
    action: Delete,
    _original_action: EntryCreationAction,
    original_household_order: HouseholdOrder,
) -> ExternResult<ValidateCallbackResult> {
    let member_of_household = validate_agent_was_member_of_household_at_the_time(
        action.author,
        action_hash,
        original_household_order.household_hash,
    )?;

    let ValidateCallbackResult::Valid = member_of_household else {
        return Ok(member_of_household);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_order_to_household_orders(
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
    let household_order: crate::HouseholdOrder = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;

    let member_of_household = validate_agent_was_member_of_household_at_the_time(
        action.author,
        action_hash,
        household_order.household_hash,
    )?;

    let ValidateCallbackResult::Valid = member_of_household else {
        return Ok(member_of_household);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_order_to_household_orders(
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
    let household_order: crate::HouseholdOrder = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    let member_of_household = validate_agent_was_member_of_household_at_the_time(
        action.author,
        action_hash,
        household_order.household_hash,
    )?;

    let ValidateCallbackResult::Valid = member_of_household else {
        return Ok(member_of_household);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_household_to_household_orders(
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
    let record = must_get_valid_record(base_hash.clone())?;
    let _household: Household = record
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
    let household_order: crate::HouseholdOrder = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;

    if household_order.household_hash.ne(&base_hash) {
        return Ok(ValidateCallbackResult::Invalid(String::from("HouseholdToHouseholdOrders links can only have as the base the household hash specified in the HouseholdOrder entry")));
    }

    let member_of_household = validate_agent_was_member_of_household_at_the_time(
        action.author,
        action_hash,
        household_order.household_hash,
    )?;

    let ValidateCallbackResult::Valid = member_of_household else {
        return Ok(member_of_household);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_household_to_household_orders(
    action_hash: ActionHash,
    action: DeleteLink,
    _original_action: CreateLink,
    base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let household_hash = base
        .into_action_hash()
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "No action hash associated with link".to_string()
        )))?;
    let member_of_household = validate_agent_was_member_of_household_at_the_time(
        action.author,
        action_hash,
        household_hash,
    )?;

    let ValidateCallbackResult::Valid = member_of_household else {
        return Ok(member_of_household);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_household_order_updates(
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
    let _household_order: crate::HouseholdOrder = record
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
    let household_order: crate::HouseholdOrder = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    // TODO: add the appropriate validation rules

    let member_of_household = validate_agent_was_member_of_household_at_the_time(
        action.author,
        action_hash,
        household_order.household_hash,
    )?;

    let ValidateCallbackResult::Valid = member_of_household else {
        return Ok(member_of_household);
    };
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_household_order_updates(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "HouseholdOrderUpdates links cannot be deleted",
    )))
}
