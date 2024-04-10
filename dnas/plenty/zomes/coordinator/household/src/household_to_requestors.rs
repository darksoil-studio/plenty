use hdk::prelude::*;
use household_integrity::*;
#[derive(Serialize, Deserialize, Debug)]
pub struct AddRequestorForHouseholdInput {
    pub base_household_hash: ActionHash,
    pub target_requestor: AgentPubKey,
}
#[hdk_extern]
pub fn add_requestor_for_household(
    input: AddRequestorForHouseholdInput,
) -> ExternResult<()> {
    create_link(
        input.base_household_hash.clone(),
        input.target_requestor.clone(),
        LinkTypes::HouseholdToRequestors,
        (),
    )?;
    Ok(())
}
#[hdk_extern]
pub fn get_requestors_for_household(
    household_hash: ActionHash,
) -> ExternResult<Vec<Link>> {
    get_links(
        GetLinksInputBuilder::try_new(household_hash, LinkTypes::HouseholdToRequestors)?
            .build(),
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
    Ok(
        details
            .into_inner()
            .into_iter()
            .filter(|(_link, deletes)| deletes.len() > 0)
            .collect(),
    )
}
#[derive(Serialize, Deserialize, Debug)]
pub struct RemoveRequestorForHouseholdInput {
    pub base_household_hash: ActionHash,
    pub target_requestor: AgentPubKey,
}
#[hdk_extern]
pub fn remove_requestor_for_household(
    input: RemoveRequestorForHouseholdInput,
) -> ExternResult<()> {
    let links = get_links(
        GetLinksInputBuilder::try_new(
                input.base_household_hash.clone(),
                LinkTypes::HouseholdToRequestors,
            )?
            .build(),
    )?;
    for link in links {
        if AgentPubKey::from(
                link
                    .target
                    .clone()
                    .into_entry_hash()
                    .ok_or(
                        wasm_error!(
                            WasmErrorInner::Guest(String::from("No entry_hash associated with link"))
                        ),
                    )?,
            )
            .eq(&input.target_requestor)
        {
            delete_link(link.create_link_hash)?;
        }
    }
    Ok(())
}
