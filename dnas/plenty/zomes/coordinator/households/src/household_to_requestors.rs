use crate::household_to_members::{add_member_for_household, AddMemberForHouseholdInput};
use hdk::prelude::*;
use households_integrity::*;

#[derive(Serialize, Deserialize, Debug)]
pub struct AcceptJoinRequest {
    pub household_hash: ActionHash,
    pub requestor: AgentPubKey,
}
#[hdk_extern]
pub fn accept_join_request(input: AcceptJoinRequest) -> ExternResult<()> {
    remove_requestor_for_household(input.household_hash.clone(), input.requestor.clone())?;
    add_member_for_household(AddMemberForHouseholdInput {
        household_hash: input.household_hash,
        member: input.requestor,
    })?;
    Ok(())
}

#[hdk_extern]
pub fn cancel_join_request(household_hash: ActionHash) -> ExternResult<()> {
    remove_requestor_for_household(household_hash, agent_info()?.agent_latest_pubkey)?;
    Ok(())
}

#[hdk_extern]
pub fn request_to_join_household(household_hash: ActionHash) -> ExternResult<()> {
    let my_pub_key = agent_info()?.agent_latest_pubkey;
    create_link(
        my_pub_key.clone(),
        household_hash.clone(),
        LinkTypes::RequestorToHouseholds,
        (),
    )?;
    create_link(
        household_hash,
        my_pub_key,
        LinkTypes::HouseholdToRequestors,
        (),
    )?;

    Ok(())
}
#[hdk_extern]
pub fn get_requestors_for_household(household_hash: ActionHash) -> ExternResult<Vec<Link>> {
    get_links(
        GetLinksInputBuilder::try_new(household_hash, LinkTypes::HouseholdToRequestors)?.build(),
    )
}

#[hdk_extern]
pub fn get_join_household_requests_for_agent(agent: AgentPubKey) -> ExternResult<Vec<Link>> {
    get_links(GetLinksInputBuilder::try_new(agent, LinkTypes::RequestorToHouseholds)?.build())
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
pub struct RejectJoinRequest {
    pub household_hash: ActionHash,
    pub requestor: AgentPubKey,
}
#[hdk_extern]
pub fn reject_join_request(input: RejectJoinRequest) -> ExternResult<()> {
    remove_requestor_for_household(input.household_hash, input.requestor)?;
    Ok(())
}

fn remove_requestor_for_household(
    household_hash: ActionHash,
    requestor: AgentPubKey,
) -> ExternResult<()> {
    let links = get_links(
        GetLinksInputBuilder::try_new(household_hash.clone(), LinkTypes::HouseholdToRequestors)?
            .build(),
    )?;
    for link in links {
        if link
            .target
            .into_agent_pub_key()
            .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
                "No agent pub key associated with link"
            ))))?
            .eq(&requestor)
        {
            delete_link(link.create_link_hash)?;
        }
    }
    let links = get_links(
        GetLinksInputBuilder::try_new(requestor.clone(), LinkTypes::RequestorToHouseholds)?.build(),
    )?;
    for link in links {
        if link
            .target
            .into_action_hash()
            .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
                "No household associated RequestorToHouseholds link"
            ))))?
            .eq(&household_hash)
        {
            delete_link(link.create_link_hash)?;
        }
    }
    Ok(())
}
