use hdk::prelude::*;
use households_integrity::*;

use crate::household::delete_household;

#[derive(Serialize, Deserialize, Debug)]
pub struct AddMemberForHouseholdInput {
    pub household_hash: ActionHash,
    pub member: AgentPubKey,
}
#[hdk_extern]
pub fn add_member_for_household(input: AddMemberForHouseholdInput) -> ExternResult<()> {
    create_link(
        input.household_hash.clone(),
        input.member.clone(),
        LinkTypes::HouseholdToMembers,
        (),
    )?;
    Ok(())
}
#[hdk_extern]
pub fn get_members_for_household(household_hash: ActionHash) -> ExternResult<Vec<Link>> {
    get_links(GetLinksInputBuilder::try_new(household_hash, LinkTypes::HouseholdToMembers)?.build())
}
#[hdk_extern]
pub fn get_deleted_members_for_household(
    household_hash: ActionHash,
) -> ExternResult<Vec<(SignedActionHashed, Vec<SignedActionHashed>)>> {
    let details = get_link_details(
        household_hash,
        LinkTypes::HouseholdToMembers,
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
pub struct RemoveMemberForHouseholdInput {
    pub household_hash: ActionHash,
    pub member: AgentPubKey,
}
#[hdk_extern]
pub fn remove_member_for_household(input: RemoveMemberForHouseholdInput) -> ExternResult<()> {
    let links = get_links(
        GetLinksInputBuilder::try_new(input.household_hash.clone(), LinkTypes::HouseholdToMembers)?
            .build(),
    )?;
    for link in links.iter() {
        if link
            .target
            .clone()
            .into_agent_pub_key()
            .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
                "No entry_hash associated with link"
            ))))?
            .eq(&input.member)
        {
            delete_link(link.create_link_hash.clone())?;
        }
    }
    if links.len() == 1 {
        // Last member left, archive household
        delete_household(input.household_hash)?;
    }
    Ok(())
}

#[hdk_extern]
pub fn leave_household(household_hash: ActionHash) -> ExternResult<()> {
    let my_pub_key = agent_info()?.agent_latest_pubkey;

    remove_member_for_household(RemoveMemberForHouseholdInput {
        household_hash: household_hash.clone(),
        member: my_pub_key.clone(),
    })?;

    // Delete membership claim

    let membership_claim_entry_type: EntryType =
        UnitEntryTypes::HouseholdMembershipClaim.try_into()?;
    let filter = ChainQueryFilter::new()
        .entry_type(membership_claim_entry_type)
        .include_entries(true);

    let records = query(filter)?;

    for record in records {
        let claim = HouseholdMembershipClaim::try_from(record.clone())?;

        if claim.household_hash.eq(&household_hash) {
            delete_entry(record.action_address().clone())?;
        }
    }

    Ok(())
}
