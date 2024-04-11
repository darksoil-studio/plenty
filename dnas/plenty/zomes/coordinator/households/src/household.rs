use hdk::prelude::*;
use households_integrity::*;

use crate::household_to_members::{add_member_for_household, AddMemberForHouseholdInput};

#[hdk_extern]
pub fn create_household(household: Household) -> ExternResult<Record> {
    let household_hash = create_entry(&EntryTypes::Household(household.clone()))?;
    let record = get(household_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly created Household"))
    ))?;
    let path = Path::from("active_households");
    create_link(
        path.path_entry_hash()?,
        household_hash.clone(),
        LinkTypes::ActiveHouseholds,
        (),
    )?;

    add_member_for_household(AddMemberForHouseholdInput {
        household_hash,
        member: agent_info()?.agent_latest_pubkey,
    })?;

    Ok(record)
}
#[hdk_extern]
pub fn get_latest_household(original_household_hash: ActionHash) -> ExternResult<Option<Record>> {
    let links = get_links(
        GetLinksInputBuilder::try_new(
            original_household_hash.clone(),
            LinkTypes::HouseholdUpdates,
        )?
        .build(),
    )?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_household_hash = match latest_link {
        Some(link) => {
            link.target
                .clone()
                .into_action_hash()
                .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
                    "No action hash associated with link"
                ))))?
        }
        None => original_household_hash.clone(),
    };
    get(latest_household_hash, GetOptions::default())
}
#[hdk_extern]
pub fn get_original_household(original_household_hash: ActionHash) -> ExternResult<Option<Record>> {
    let Some(details) = get_details(original_household_hash, GetOptions::default())? else {
        return Ok(None);
    };
    match details {
        Details::Record(details) => Ok(Some(details.record)),
        _ => Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "Malformed get details response"
        )))),
    }
}
#[hdk_extern]
pub fn get_all_revisions_for_household(
    original_household_hash: ActionHash,
) -> ExternResult<Vec<Record>> {
    let Some(original_record) = get_original_household(original_household_hash.clone())? else {
        return Ok(vec![]);
    };
    let links = get_links(
        GetLinksInputBuilder::try_new(
            original_household_hash.clone(),
            LinkTypes::HouseholdUpdates,
        )?
        .build(),
    )?;
    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| {
            Ok(GetInput::new(
                link.target
                    .into_action_hash()
                    .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
                        "No action hash associated with link"
                    ))))?
                    .into(),
                GetOptions::default(),
            ))
        })
        .collect::<ExternResult<Vec<GetInput>>>()?;
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let mut records: Vec<Record> = records.into_iter().filter_map(|r| r).collect();
    records.insert(0, original_record);
    Ok(records)
}
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateHouseholdInput {
    pub original_household_hash: ActionHash,
    pub previous_household_hash: ActionHash,
    pub updated_household: Household,
}
#[hdk_extern]
pub fn update_household(input: UpdateHouseholdInput) -> ExternResult<Record> {
    let updated_household_hash = update_entry(
        input.previous_household_hash.clone(),
        &input.updated_household,
    )?;
    create_link(
        input.original_household_hash.clone(),
        updated_household_hash.clone(),
        LinkTypes::HouseholdUpdates,
        (),
    )?;
    let record = get(updated_household_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly updated Household"))
    ))?;
    Ok(record)
}
#[hdk_extern]
pub fn delete_household(original_household_hash: ActionHash) -> ExternResult<ActionHash> {
    let details =
        get_details(original_household_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
            WasmErrorInner::Guest(String::from("{pascal_entry_def_name} not found"))
        ))?;
    let record = match details {
        Details::Record(details) => Ok(details.record),
        _ => Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "Malformed get details response"
        )))),
    }?;
    let path = Path::from("active_households");
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::ActiveHouseholds)?
            .build(),
    )?;
    for link in links {
        if let Some(hash) = link.target.into_action_hash() {
            if hash.eq(&original_household_hash) {
                delete_link(link.create_link_hash)?;
            }
        }
    }
    delete_entry(original_household_hash)
}
#[hdk_extern]
pub fn get_all_deletes_for_household(
    original_household_hash: ActionHash,
) -> ExternResult<Option<Vec<SignedActionHashed>>> {
    let Some(details) = get_details(original_household_hash, GetOptions::default())? else {
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
pub fn get_oldest_delete_for_household(
    original_household_hash: ActionHash,
) -> ExternResult<Option<SignedActionHashed>> {
    let Some(mut deletes) = get_all_deletes_for_household(original_household_hash)? else {
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
