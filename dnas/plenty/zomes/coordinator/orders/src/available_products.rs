use hdk::prelude::*;
use orders_integrity::*;

#[hdk_extern]
pub fn create_available_products(
    available_products: AvailableProducts,
) -> ExternResult<Record> {
    let available_products_hash = create_entry(
        &EntryTypes::AvailableProducts(available_products.clone()),
    )?;
    create_link(
        available_products.order_hash.clone(),
        available_products_hash.clone(),
        LinkTypes::OrderToAvailableProducts,
        (),
    )?;
    let record = get(available_products_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest("Could not find the newly created AvailableProducts"
                .to_string())
            ),
        )?;
    Ok(record)
}

#[hdk_extern]
pub fn get_latest_available_products(
    original_available_products_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let links = get_links(
        GetLinksInputBuilder::try_new(
                original_available_products_hash.clone(),
                LinkTypes::AvailableProductsUpdates,
            )?
            .build(),
    )?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_available_products_hash = match latest_link {
        Some(link) => {
            link.target
                .clone()
                .into_action_hash()
                .ok_or(
                    wasm_error!(
                        WasmErrorInner::Guest("No action hash associated with link"
                        .to_string())
                    ),
                )?
        }
        None => original_available_products_hash.clone(),
    };
    get(latest_available_products_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_original_available_products(
    original_available_products_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let Some(details) = get_details(
        original_available_products_hash,
        GetOptions::default(),
    )? else {
        return Ok(None);
    };
    match details {
        Details::Record(details) => Ok(Some(details.record)),
        _ => {
            Err(
                wasm_error!(
                    WasmErrorInner::Guest("Malformed get details response".to_string())
                ),
            )
        }
    }
}

#[hdk_extern]
pub fn get_all_revisions_for_available_products(
    original_available_products_hash: ActionHash,
) -> ExternResult<Vec<Record>> {
    let Some(original_record) = get_original_available_products(
        original_available_products_hash.clone(),
    )? else {
        return Ok(vec![]);
    };
    let links = get_links(
        GetLinksInputBuilder::try_new(
                original_available_products_hash.clone(),
                LinkTypes::AvailableProductsUpdates,
            )?
            .build(),
    )?;
    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| Ok(
            GetInput::new(
                link
                    .target
                    .into_action_hash()
                    .ok_or(
                        wasm_error!(
                            WasmErrorInner::Guest("No action hash associated with link"
                            .to_string())
                        ),
                    )?
                    .into(),
                GetOptions::default(),
            ),
        ))
        .collect::<ExternResult<Vec<GetInput>>>()?;
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let mut records: Vec<Record> = records.into_iter().flatten().collect();
    records.insert(0, original_record);
    Ok(records)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateAvailableProductsInput {
    pub original_available_products_hash: ActionHash,
    pub previous_available_products_hash: ActionHash,
    pub updated_available_products: AvailableProducts,
}

#[hdk_extern]
pub fn update_available_products(
    input: UpdateAvailableProductsInput,
) -> ExternResult<Record> {
    let updated_available_products_hash = update_entry(
        input.previous_available_products_hash.clone(),
        &input.updated_available_products,
    )?;
    create_link(
        input.original_available_products_hash.clone(),
        updated_available_products_hash.clone(),
        LinkTypes::AvailableProductsUpdates,
        (),
    )?;
    let record = get(updated_available_products_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest("Could not find the newly updated AvailableProducts"
                .to_string())
            ),
        )?;
    Ok(record)
}

#[hdk_extern]
pub fn delete_available_products(
    original_available_products_hash: ActionHash,
) -> ExternResult<ActionHash> {
    let details = get_details(
            original_available_products_hash.clone(),
            GetOptions::default(),
        )?
        .ok_or(
            wasm_error!(WasmErrorInner::Guest("AvailableProducts not found".to_string())),
        )?;
    let record = match details {
        Details::Record(details) => Ok(details.record),
        _ => {
            Err(
                wasm_error!(
                    WasmErrorInner::Guest("Malformed get details response".to_string())
                ),
            )
        }
    }?;
    let entry = record
        .entry()
        .as_option()
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest("AvailableProducts record has no entry"
                .to_string())
            ),
        )?;
    let available_products = <AvailableProducts>::try_from(entry)?;
    let links = get_links(
        GetLinksInputBuilder::try_new(
                available_products.order_hash.clone(),
                LinkTypes::OrderToAvailableProducts,
            )?
            .build(),
    )?;
    for link in links {
        if let Some(action_hash) = link.target.into_action_hash() {
            if action_hash == original_available_products_hash {
                delete_link(link.create_link_hash)?;
            }
        }
    }
    delete_entry(original_available_products_hash)
}

#[hdk_extern]
pub fn get_all_deletes_for_available_products(
    original_available_products_hash: ActionHash,
) -> ExternResult<Option<Vec<SignedActionHashed>>> {
    let Some(details) = get_details(
        original_available_products_hash,
        GetOptions::default(),
    )? else {
        return Ok(None);
    };
    match details {
        Details::Entry(_) => {
            Err(wasm_error!(WasmErrorInner::Guest("Malformed details".into())))
        }
        Details::Record(record_details) => Ok(Some(record_details.deletes)),
    }
}

#[hdk_extern]
pub fn get_oldest_delete_for_available_products(
    original_available_products_hash: ActionHash,
) -> ExternResult<Option<SignedActionHashed>> {
    let Some(mut deletes) = get_all_deletes_for_available_products(
        original_available_products_hash,
    )? else {
        return Ok(None);
    };
    deletes
        .sort_by(|delete_a, delete_b| {
            delete_a.action().timestamp().cmp(&delete_b.action().timestamp())
        });
    Ok(deletes.first().cloned())
}

#[hdk_extern]
pub fn get_available_products_for_order(
    order_hash: ActionHash,
) -> ExternResult<Vec<Link>> {
    get_links(
        GetLinksInputBuilder::try_new(order_hash, LinkTypes::OrderToAvailableProducts)?
            .build(),
    )
}

#[hdk_extern]
pub fn get_deleted_available_products_for_order(
    order_hash: ActionHash,
) -> ExternResult<Vec<(SignedActionHashed, Vec<SignedActionHashed>)>> {
    let details = get_link_details(
        order_hash,
        LinkTypes::OrderToAvailableProducts,
        None,
        GetOptions::default(),
    )?;
    Ok(
        details
            .into_inner()
            .into_iter()
            .filter(|(_link, deletes)| !deletes.is_empty())
            .collect(),
    )
}
