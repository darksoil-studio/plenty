use hdk::prelude::*;
use households_integrity::*;
#[hdk_extern]
pub fn create_household_membership_claim(
    household_membership_claim: HouseholdMembershipClaim,
) -> ExternResult<Record> {
    let household_membership_claim_hash = create_entry(
        &EntryTypes::HouseholdMembershipClaim(household_membership_claim.clone()),
    )?;
    let record = get(household_membership_claim_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the newly created HouseholdMembershipClaim"))
            ),
        )?;
    Ok(record)
}
#[hdk_extern]
pub fn get_household_membership_claim(
    household_membership_claim_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let Some(details) = get_details(
        household_membership_claim_hash,
        GetOptions::default(),
    )? else {
        return Ok(None);
    };
    match details {
        Details::Record(details) => Ok(Some(details.record)),
        _ => {
            Err(
                wasm_error!(
                    WasmErrorInner::Guest(String::from("Malformed get details response"))
                ),
            )
        }
    }
}
