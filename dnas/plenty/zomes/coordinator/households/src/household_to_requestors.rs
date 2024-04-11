use hdk::prelude::*;
use households_integrity::*;

use crate::household_to_members::{add_member_for_household, AddMemberForHouseholdInput};

fn get_join_request_household_and_requestor(
    join_request_create_link_hash: ActionHash,
) -> ExternResult<(ActionHash, AgentPubKey)> {
    let Some(record) = get(join_request_create_link_hash, GetOptions::default())? else {
        return Err(wasm_error!(WasmErrorInner::Guest("NOT_FOUND".into())));
    };

    let Action::CreateLink(create_link) = record.action().clone() else {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "The given action hash does not correspond to a CreateLink action".into()
        )));
    };

    let household_hash = create_link
        .base_address
        .into_action_hash()
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "The join request does not have an ActionHash as its base address".into()
        )))?;

    let requestor = create_link
        .target_address
        .into_agent_pub_key()
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "The join request does not have an AgentPubKey as its target address".into()
        )))?;

    Ok((household_hash, requestor))
}

#[hdk_extern]
pub fn accept_join_request(join_request_create_link_hash: ActionHash) -> ExternResult<()> {
    let (household_hash, requestor) =
        get_join_request_household_and_requestor(join_request_create_link_hash)?;
    remove_requestor_for_household(RemoveRequestorForHouseholdInput {
        household_hash: household_hash.clone(),
        requestor: requestor.clone(),
    })?;

    add_member_for_household(AddMemberForHouseholdInput {
        household_hash,
        member: requestor,
    })?;

    Ok(())
}

#[hdk_extern]
pub fn request_to_join_household(household_hash: ActionHash) -> ExternResult<ActionHash> {
    let my_pub_key = agent_info()?.agent_latest_pubkey;

    create_link(
        household_hash,
        my_pub_key,
        LinkTypes::HouseholdToRequestors,
        (),
    )
}

#[hdk_extern]
pub fn get_requestors_for_household(household_hash: ActionHash) -> ExternResult<Vec<Link>> {
    get_links(
        GetLinksInputBuilder::try_new(household_hash, LinkTypes::HouseholdToRequestors)?.build(),
    )
}
#[hdk_extern]
pub fn get_deleted_requestors_for_household(
    household_hash: ActionHash,
) -> ExternResult<Vec<(SignedActionHashed, Vec<SignedActionHashed>)>> {
    let details = get_link_details(
        household_hash,
        LinkTypes::HouseholdToRequestors,
        None,
        GetOptions::default(),
    )?;
    Ok(details
        .into_inner()
        .into_iter()
        .filter(|(_link, deletes)| deletes.len() > 0)
        .collect())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RemoveRequestorForHouseholdInput {
    pub household_hash: ActionHash,
    pub requestor: AgentPubKey,
}
#[hdk_extern]
pub fn reject_join_request(join_request_create_link_hash: ActionHash) -> ExternResult<()> {
    let (household_hash, requestor) =
        get_join_request_household_and_requestor(join_request_create_link_hash)?;

    remove_requestor_for_household(RemoveRequestorForHouseholdInput {
        household_hash,
        requestor,
    })?;

    Ok(())
}

fn remove_requestor_for_household(input: RemoveRequestorForHouseholdInput) -> ExternResult<()> {
    let links = get_links(
        GetLinksInputBuilder::try_new(
            input.household_hash.clone(),
            LinkTypes::HouseholdToRequestors,
        )?
        .build(),
    )?;
    for link in links {
        if link
            .target
            .into_agent_pub_key()
            .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
                "No agent pub key associated with link"
            ))))?
            .eq(&input.requestor)
        {
            delete_link(link.create_link_hash)?;
        }
    }
    Ok(())
}
