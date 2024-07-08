use hdk::prelude::*;
use orders_integrity::*;

#[hdk_extern]
pub fn create_order(order: Order) -> ExternResult<Record> {
    let order_hash = create_entry(&EntryTypes::Order(order.clone()))?;
    let record = get(order_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest("Could not find the newly created Order"
                .to_string())
            ),
        )?;
    Ok(record)
}

#[hdk_extern]
pub fn get_latest_order(
    original_order_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let links = get_links(
        GetLinksInputBuilder::try_new(
                original_order_hash.clone(),
                LinkTypes::OrderUpdates,
            )?
            .build(),
    )?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_order_hash = match latest_link {
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
        None => original_order_hash.clone(),
    };
    get(latest_order_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_original_order(
    original_order_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let Some(details) = get_details(original_order_hash, GetOptions::default())? else {
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
pub fn get_all_revisions_for_order(
    original_order_hash: ActionHash,
) -> ExternResult<Vec<Record>> {
    let Some(original_record) = get_original_order(original_order_hash.clone())? else {
        return Ok(vec![]);
    };
    let links = get_links(
        GetLinksInputBuilder::try_new(
                original_order_hash.clone(),
                LinkTypes::OrderUpdates,
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
pub struct UpdateOrderInput {
    pub original_order_hash: ActionHash,
    pub previous_order_hash: ActionHash,
    pub updated_order: Order,
}

#[hdk_extern]
pub fn update_order(input: UpdateOrderInput) -> ExternResult<Record> {
    let updated_order_hash = update_entry(
        input.previous_order_hash.clone(),
        &input.updated_order,
    )?;
    create_link(
        input.original_order_hash.clone(),
        updated_order_hash.clone(),
        LinkTypes::OrderUpdates,
        (),
    )?;
    let record = get(updated_order_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest("Could not find the newly updated Order"
                .to_string())
            ),
        )?;
    Ok(record)
}

#[hdk_extern]
pub fn delete_order(original_order_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(original_order_hash)
}

#[hdk_extern]
pub fn get_all_deletes_for_order(
    original_order_hash: ActionHash,
) -> ExternResult<Option<Vec<SignedActionHashed>>> {
    let Some(details) = get_details(original_order_hash, GetOptions::default())? else {
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
pub fn get_oldest_delete_for_order(
    original_order_hash: ActionHash,
) -> ExternResult<Option<SignedActionHashed>> {
    let Some(mut deletes) = get_all_deletes_for_order(original_order_hash)? else {
        return Ok(None);
    };
    deletes
        .sort_by(|delete_a, delete_b| {
            delete_a.action().timestamp().cmp(&delete_b.action().timestamp())
        });
    Ok(deletes.first().cloned())
}
