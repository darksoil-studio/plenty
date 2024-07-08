use hdk::prelude::*;
use orders_integrity::*;

#[hdk_extern]
pub fn create_producer_invoice(
    producer_invoice: ProducerInvoice,
) -> ExternResult<Record> {
    let producer_invoice_hash = create_entry(
        &EntryTypes::ProducerInvoice(producer_invoice.clone()),
    )?;
    create_link(
        producer_invoice.order_hash.clone(),
        producer_invoice_hash.clone(),
        LinkTypes::OrderToProducerInvoices,
        (),
    )?;
    let record = get(producer_invoice_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest("Could not find the newly created ProducerInvoice"
                .to_string())
            ),
        )?;
    Ok(record)
}

#[hdk_extern]
pub fn get_original_producer_invoice(
    original_producer_invoice_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let Some(details) = get_details(
        original_producer_invoice_hash,
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
pub fn get_latest_producer_invoice(
    original_producer_invoice_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let Some(details) = get_details(
        original_producer_invoice_hash,
        GetOptions::default(),
    )? else {
        return Ok(None);
    };
    let record_details = match details {
        Details::Entry(_) => {
            Err(wasm_error!(WasmErrorInner::Guest("Malformed details".into())))
        }
        Details::Record(record_details) => Ok(record_details),
    }?;
    match record_details.updates.last() {
        Some(update) => get_latest_producer_invoice(update.action_address().clone()),
        None => Ok(Some(record_details.record)),
    }
}

#[hdk_extern]
pub fn get_all_revisions_for_producer_invoice(
    original_producer_invoice_hash: ActionHash,
) -> ExternResult<Vec<Record>> {
    let Some(Details::Record(details)) = get_details(
        original_producer_invoice_hash,
        GetOptions::default(),
    )? else {
        return Ok(vec![]);
    };
    let mut records = vec![details.record];
    for update in details.updates {
        let mut update_records = get_all_revisions_for_producer_invoice(
            update.action_address().clone(),
        )?;
        records.append(&mut update_records);
    }
    Ok(records)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateProducerInvoiceInput {
    pub previous_producer_invoice_hash: ActionHash,
    pub updated_producer_invoice: ProducerInvoice,
}

#[hdk_extern]
pub fn update_producer_invoice(
    input: UpdateProducerInvoiceInput,
) -> ExternResult<Record> {
    let updated_producer_invoice_hash = update_entry(
        input.previous_producer_invoice_hash,
        &input.updated_producer_invoice,
    )?;
    let record = get(updated_producer_invoice_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest("Could not find the newly updated ProducerInvoice"
                .to_string())
            ),
        )?;
    Ok(record)
}

#[hdk_extern]
pub fn delete_producer_invoice(
    original_producer_invoice_hash: ActionHash,
) -> ExternResult<ActionHash> {
    let details = get_details(
            original_producer_invoice_hash.clone(),
            GetOptions::default(),
        )?
        .ok_or(
            wasm_error!(WasmErrorInner::Guest("ProducerInvoice not found".to_string())),
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
                WasmErrorInner::Guest("ProducerInvoice record has no entry".to_string())
            ),
        )?;
    let producer_invoice = <ProducerInvoice>::try_from(entry)?;
    let links = get_links(
        GetLinksInputBuilder::try_new(
                producer_invoice.order_hash.clone(),
                LinkTypes::OrderToProducerInvoices,
            )?
            .build(),
    )?;
    for link in links {
        if let Some(action_hash) = link.target.into_action_hash() {
            if action_hash == original_producer_invoice_hash {
                delete_link(link.create_link_hash)?;
            }
        }
    }
    delete_entry(original_producer_invoice_hash)
}

#[hdk_extern]
pub fn get_all_deletes_for_producer_invoice(
    original_producer_invoice_hash: ActionHash,
) -> ExternResult<Option<Vec<SignedActionHashed>>> {
    let Some(details) = get_details(
        original_producer_invoice_hash,
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
pub fn get_oldest_delete_for_producer_invoice(
    original_producer_invoice_hash: ActionHash,
) -> ExternResult<Option<SignedActionHashed>> {
    let Some(mut deletes) = get_all_deletes_for_producer_invoice(
        original_producer_invoice_hash,
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
pub fn get_producer_invoices_for_order(
    order_hash: ActionHash,
) -> ExternResult<Vec<Link>> {
    get_links(
        GetLinksInputBuilder::try_new(order_hash, LinkTypes::OrderToProducerInvoices)?
            .build(),
    )
}

#[hdk_extern]
pub fn get_deleted_producer_invoices_for_order(
    order_hash: ActionHash,
) -> ExternResult<Vec<(SignedActionHashed, Vec<SignedActionHashed>)>> {
    let details = get_link_details(
        order_hash,
        LinkTypes::OrderToProducerInvoices,
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
