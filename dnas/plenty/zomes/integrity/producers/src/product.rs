use hdi::prelude::*;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum PackagingUnit {
    Piece,
    Kilograms,
    Grams,
    Liters,
    Pounds,
    Ounces,
}
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Packaging {
    pub unit: PackagingUnit,
    pub amount: u32,
    pub estimate: bool,
}
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Product {
    pub producer_hash: ActionHash,
    pub name: String,
    pub product_id: String,
    pub description: String,
    pub categories: Vec<String>,
    pub packaging: Packaging,
    pub maximum_available: Option<u32>,
    pub price: u32,
    pub vat_percentage: u32,
    pub margin_percentage: Option<u32>,
    pub origin: Option<String>,
    pub ingredients: Option<String>,
}
pub fn validate_create_product(
    _action: EntryCreationAction,
    product: Product,
) -> ExternResult<ValidateCallbackResult> {
    let record = must_get_valid_record(product.producer_hash.clone())?;
    let _producer: crate::Producer = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Dependant action must be accompanied by an entry"
        ))))?;
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_update_product(
    _action: Update,
    _product: Product,
    _original_action: EntryCreationAction,
    _original_product: Product,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_product(
    _action: Delete,
    _original_action: EntryCreationAction,
    _original_product: Product,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_create_link_producer_to_products(
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
    let _producer: crate::Producer = record
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
    let _product: crate::Product = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_link_producer_to_products(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_create_link_product_updates(
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
    let _product: crate::Product = record
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
    let _product: crate::Product = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    // TODO: add the appropriate validation rules
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_link_product_updates(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "ProductUpdates links cannot be deleted",
    )))
}
