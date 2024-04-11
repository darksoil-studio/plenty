use hdi::prelude::*;
use crate::{was_member_of_household, LinkTypes};
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct HouseholdMembershipClaim {
    pub member_create_link_hash: ActionHash,
    pub household_hash: ActionHash,
}
pub fn validate_create_household_membership_claim(
    action: EntryCreationAction,
    household_membership_claim: HouseholdMembershipClaim,
) -> ExternResult<ValidateCallbackResult> {
    let member_create_link_action = must_get_valid_record(
            household_membership_claim.member_create_link_hash,
        )?
        .signed_action
        .hashed;
    let Action::CreateLink(create_link) = member_create_link_action.content else {
        return Ok(
            ValidateCallbackResult::Invalid(
                String::from("member_create_link_hash must point to a CreateLink action"),
            ),
        );
    };
    let scoped_link_type = ScopedLinkType {
        zome_index: zome_info()?.id,
        zome_type: create_link.link_type,
    };
    let link_type = LinkTypes::try_from(scoped_link_type)?;
    let LinkTypes::HouseholdToMembers = link_type else {
        return Ok(
            ValidateCallbackResult::Invalid(
                String::from(
                    "membership claim must point to a HouseholdToMember CreateLink",
                ),
            ),
        );
    };
    let Some(household_hash) = create_link.base_address.into_action_hash() else {
        return Ok(
            ValidateCallbackResult::Invalid(
                String::from(
                    "member CreateLink action must have an ActionHash as its base",
                ),
            ),
        );
    };
    if !household_hash.eq(&household_membership_claim.household_hash) {
        return Ok(
            ValidateCallbackResult::Invalid(
                String::from(
                    "The member link has a different household hash than that from the household membership claim",
                ),
            ),
        );
    }
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_update_household_membership_claim(
    _action: Update,
    _household_membership_claim: HouseholdMembershipClaim,
    _original_action: EntryCreationAction,
    _original_household_membership_claim: HouseholdMembershipClaim,
) -> ExternResult<ValidateCallbackResult> {
    Ok(
        ValidateCallbackResult::Invalid(
            String::from("Household Membership Claims cannot be updated"),
        ),
    )
}
pub fn validate_delete_household_membership_claim(
    action: Delete,
    original_action: EntryCreationAction,
    _original_household_membership_claim: HouseholdMembershipClaim,
) -> ExternResult<ValidateCallbackResult> {
    match action.author.eq(original_action.author()) {
        true => Ok(ValidateCallbackResult::Valid),
        false => {
            Ok(
                ValidateCallbackResult::Invalid(
                    String::from(
                        "Only the authors of household membership claims can delete them",
                    ),
                ),
            )
        }
    }
}
