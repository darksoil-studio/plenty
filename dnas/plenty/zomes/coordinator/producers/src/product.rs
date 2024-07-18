use hdk::prelude::*;
use producers_integrity::*;

use crate::categories::category_path;

#[hdk_extern]
pub fn create_products(products: Vec<Product>) -> ExternResult<()> {
    for product in products {
        create_product(product)?;
    }

    Ok(())
}

#[hdk_extern]
pub fn create_product(product: Product) -> ExternResult<Record> {
    let product_hash = create_entry(&EntryTypes::Product(product.clone()))?;

    create_link(
        product.producer_hash.clone(),
        product_hash.clone(),
        LinkTypes::ProducerToProducts,
        (),
    )?;

    let record = get(product_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest("Could not find the newly created Product".to_string())
    ))?;

    for category in product.categories {
        let path = category_path(category)?;
        path.ensure()?;
        create_link(
            path.path_entry_hash()?,
            product_hash.clone(),
            LinkTypes::CategoryToProduct,
            (),
        )?;
    }
    Ok(record)
}

#[hdk_extern]
pub fn get_latest_product(original_product_hash: ActionHash) -> ExternResult<Option<Record>> {
    let links = get_links(
        GetLinksInputBuilder::try_new(original_product_hash.clone(), LinkTypes::ProductUpdates)?
            .build(),
    )?;

    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));

    let latest_product_hash = match latest_link {
        Some(link) => {
            link.target
                .clone()
                .into_action_hash()
                .ok_or(wasm_error!(WasmErrorInner::Guest(
                    "No action hash associated with link".to_string()
                )))?
        }
        None => original_product_hash.clone(),
    };

    get(latest_product_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_original_product(original_product_hash: ActionHash) -> ExternResult<Option<Record>> {
    let Some(details) = get_details(original_product_hash, GetOptions::default())? else {
        return Ok(None);
    };
    match details {
        Details::Record(details) => Ok(Some(details.record)),
        _ => Err(wasm_error!(WasmErrorInner::Guest(
            "Malformed get details response".to_string()
        ))),
    }
}

#[hdk_extern]
pub fn get_all_revisions_for_product(
    original_product_hash: ActionHash,
) -> ExternResult<Vec<Record>> {
    let Some(original_record) = get_original_product(original_product_hash.clone())? else {
        return Ok(vec![]);
    };

    let links = get_links(
        GetLinksInputBuilder::try_new(original_product_hash.clone(), LinkTypes::ProductUpdates)?
            .build(),
    )?;

    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| {
            Ok(GetInput::new(
                link.target
                    .into_action_hash()
                    .ok_or(wasm_error!(WasmErrorInner::Guest(
                        "No action hash associated with link".to_string()
                    )))?
                    .into(),
                GetOptions::default(),
            ))
        })
        .collect::<ExternResult<Vec<GetInput>>>()?;

    // load the records for all the links
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let mut records: Vec<Record> = records.into_iter().flatten().collect();
    records.insert(0, original_record);

    Ok(records)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateProductInput {
    pub original_product_hash: ActionHash,
    pub previous_product_hash: ActionHash,
    pub updated_product: Product,
}

#[hdk_extern]
pub fn update_product(input: UpdateProductInput) -> ExternResult<Record> {
    let updated_product_hash =
        update_entry(input.previous_product_hash.clone(), &input.updated_product)?;

    create_link(
        input.original_product_hash.clone(),
        updated_product_hash.clone(),
        LinkTypes::ProductUpdates,
        (),
    )?;

    let record = get(updated_product_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest("Could not find the newly updated Product".to_string())
    ))?;

    Ok(record)
}

#[hdk_extern]
pub fn delete_product(original_product_hash: ActionHash) -> ExternResult<ActionHash> {
    let details =
        get_details(original_product_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
            WasmErrorInner::Guest(String::from("{pascal_entry_def_name} not found"))
        ))?;
    let record = match details {
        Details::Record(details) => Ok(details.record),
        _ => Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "Malformed get details response"
        )))),
    }?;
    let entry = record
        .entry()
        .as_option()
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Product record has no entry".to_string()
        )))?;
    let product = Product::try_from(entry)?;

    let links = get_links(
        GetLinksInputBuilder::try_new(
            product.producer_hash.clone(),
            LinkTypes::ProducerToProducts,
        )?
        .build(),
    )?;
    for link in links {
        if let Some(action_hash) = link.target.into_action_hash() {
            if action_hash.eq(&original_product_hash) {
                delete_link(link.create_link_hash)?;
            }
        }
    }

    delete_entry(original_product_hash)
}

#[hdk_extern]
pub fn get_all_deletes_for_product(
    original_product_hash: ActionHash,
) -> ExternResult<Option<Vec<SignedActionHashed>>> {
    let Some(details) = get_details(original_product_hash, GetOptions::default())? else {
        return Ok(None);
    };

    match details {
        Details::Entry(_) => Err(wasm_error!(WasmErrorInner::Guest(
            "Malformed details".into()
        ))),
        Details::Record(record_details) => Ok(Some(record_details.deletes)),
    }
}

#[hdk_extern]
pub fn get_oldest_delete_for_product(
    original_product_hash: ActionHash,
) -> ExternResult<Option<SignedActionHashed>> {
    let Some(mut deletes) = get_all_deletes_for_product(original_product_hash)? else {
        return Ok(None);
    };

    deletes.sort_by(|delete_a, delete_b| {
        delete_a
            .action()
            .timestamp()
            .cmp(&delete_b.action().timestamp())
    });

    Ok(deletes.first().cloned())
}

#[hdk_extern]
pub fn get_products_for_producer(producer_hash: ActionHash) -> ExternResult<Vec<Link>> {
    get_links(GetLinksInputBuilder::try_new(producer_hash, LinkTypes::ProducerToProducts)?.build())
}

#[hdk_extern]
pub fn get_deleted_products_for_producer(
    producer_hash: ActionHash,
) -> ExternResult<Vec<(SignedActionHashed, Vec<SignedActionHashed>)>> {
    let details = get_link_details(
        producer_hash,
        LinkTypes::ProducerToProducts,
        None,
        GetOptions::default(),
    )?;
    Ok(details
        .into_inner()
        .into_iter()
        .filter(|(_link, deletes)| !deletes.is_empty())
        .collect())
}
