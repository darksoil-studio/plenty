use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Household {
    pub name: String,
    pub avatar: EntryHash,
}
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct HouseholdMembershipClaim {
    pub member_create_link_hash: ActionHash,
    pub household_hash: ActionHash,
}

pub const HOUSEHOLD_MEMBERSHIP_CLAIM_ENTRY_TYPE_INDEX: u8 = 1;
pub const HOUSEHOLDS_INTEGRITY_ZOME_NAME: &str = "households_integrity";

pub fn validate_agent_was_member_of_household_at_the_time(
    agent_pub_key: AgentPubKey,
    chain_top: ActionHash,
    household_hash: ActionHash,
) -> ExternResult<ValidateCallbackResult> {
    let dna_info = dna_info()?;

    let Some(households_zome_index) = dna_info.zome_names.into_iter().position(|z| {
        z.to_string()
            .eq(&String::from(HOUSEHOLDS_INTEGRITY_ZOME_NAME))
    }) else {
        return Ok(ValidateCallbackResult::Invalid(format!(
            "Unreachable: there is no '{HOUSEHOLDS_INTEGRITY_ZOME_NAME}' integrity zome in this DNA",
        )));
    };

    let agent_activity = must_get_agent_activity(
        agent_pub_key,
        ChainFilter {
            chain_top,
            filters: ChainFilters::ToGenesis,
            include_cached_entries: true,
        },
    )?;
    let mut deleted_actions: HashSet<ActionHash> = HashSet::new();
    for activity in agent_activity.iter() {
        if let Action::Delete(delete) = &activity.action.hashed.content {
            deleted_actions.insert(delete.deletes_address.clone());
        }
    }
    for activity in agent_activity {
        if activity.action.hashed.hash.eq(&household_hash) {
            return Ok(ValidateCallbackResult::Valid);
        }
        if let Some(EntryType::App(app)) = activity.action.hashed.content.entry_type() {
            if app.entry_index == HOUSEHOLD_MEMBERSHIP_CLAIM_ENTRY_TYPE_INDEX.into()
                && app.zome_index.0 as usize == households_zome_index
            {
                let claim_record = must_get_valid_record(activity.action.hashed.hash.clone())?;
                let claim = HouseholdMembershipClaim::try_from(claim_record)?;
                if claim.household_hash.eq(&household_hash) {
                    if !deleted_actions.contains(&activity.action.hashed.hash) {
                        return Ok(ValidateCallbackResult::Valid);
                    }
                }
            }
        }
    }
    Ok(ValidateCallbackResult::Invalid(
        "Agent was not a member of the household when they committed the given entry".into(),
    ))
}
