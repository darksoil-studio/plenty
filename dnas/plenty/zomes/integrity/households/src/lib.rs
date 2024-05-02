use hdi::prelude::*;

pub mod member_to_households;
pub use member_to_households::*;
pub mod household_membership_claim;
pub use household_membership_claim::*;
pub mod household_to_members;
pub use household_to_members::*;
pub mod household_to_requestors;
pub use household_to_requestors::*;
pub mod household;
pub use household::*;

#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    Household(Household),
    HouseholdMembershipClaim(HouseholdMembershipClaim),
}
#[derive(Serialize, Deserialize)]
#[hdk_link_types]
pub enum LinkTypes {
    HouseholdUpdates,
    HouseholdToRequestors,
    RequestorToHouseholds,
    HouseholdToMembers,
    MemberToHouseholds,
    ActiveHouseholds,
}
#[hdk_extern]
pub fn genesis_self_check(_data: GenesisSelfCheckData) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_agent_joining(
    _agent_pub_key: AgentPubKey,
    _membrane_proof: &Option<MembraneProof>,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn action_hash(op: &Op) -> &ActionHash {
    match op {
        Op::StoreRecord(StoreRecord { record }) => record.action_address(),
        Op::StoreEntry(StoreEntry { action, .. }) => &action.hashed.hash,
        Op::RegisterUpdate(RegisterUpdate { update, .. }) => &update.hashed.hash,
        Op::RegisterDelete(RegisterDelete { delete, .. }) => &delete.hashed.hash,
        Op::RegisterAgentActivity(RegisterAgentActivity { action, .. }) => &action.hashed.hash,
        Op::RegisterCreateLink(RegisterCreateLink { create_link }) => &create_link.hashed.hash,
        Op::RegisterDeleteLink(RegisterDeleteLink { delete_link, .. }) => &delete_link.hashed.hash,
    }
}
#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
    match op.flattened::<EntryTypes, LinkTypes>()? {
        FlatOp::StoreEntry(store_entry) => match store_entry {
            OpEntry::CreateEntry { app_entry, action } => match app_entry {
                EntryTypes::Household(household) => {
                    validate_create_household(EntryCreationAction::Create(action), household)
                }
                EntryTypes::HouseholdMembershipClaim(household_membership_claim) => {
                    validate_create_household_membership_claim(
                        EntryCreationAction::Create(action),
                        household_membership_claim,
                    )
                }
            },
            OpEntry::UpdateEntry {
                app_entry, action, ..
            } => match app_entry {
                EntryTypes::Household(household) => {
                    validate_create_household(EntryCreationAction::Update(action), household)
                }
                EntryTypes::HouseholdMembershipClaim(household_membership_claim) => {
                    validate_create_household_membership_claim(
                        EntryCreationAction::Update(action),
                        household_membership_claim,
                    )
                }
            },
            _ => Ok(ValidateCallbackResult::Valid),
        },
        FlatOp::RegisterUpdate(update_entry) => match update_entry {
            OpUpdate::Entry { app_entry, action } => match app_entry {
                EntryTypes::HouseholdMembershipClaim(household_membership_claim) => {
                    validate_update_household_membership_claim(action, household_membership_claim)
                }
                EntryTypes::Household(household) => validate_update_household(action, household),
            },
            _ => Ok(ValidateCallbackResult::Valid),
        },
        FlatOp::RegisterDelete(delete_entry) => {
            let original_action_hash = delete_entry.clone().action.deletes_address;
            let original_record = must_get_valid_record(original_action_hash)?;
            let original_record_action = original_record.action().clone();
            let original_action = match EntryCreationAction::try_from(original_record_action) {
                Ok(action) => action,
                Err(e) => {
                    return Ok(ValidateCallbackResult::Invalid(format!(
                        "Expected to get EntryCreationAction from Action: {e:?}"
                    )))
                }
            };
            let app_entry_type = match original_action.entry_type() {
                EntryType::App(app_entry_type) => app_entry_type,
                _ => {
                    return Ok(ValidateCallbackResult::Valid);
                }
            };
            let entry = match original_record.entry().as_option() {
                Some(entry) => entry,
                None => {
                    return Ok(ValidateCallbackResult::Invalid(
                        "Original record for a delete must contain an entry".to_string(),
                    ));
                }
            };
            let original_app_entry = match EntryTypes::deserialize_from_type(
                app_entry_type.zome_index,
                app_entry_type.entry_index,
                entry,
            )? {
                Some(app_entry) => app_entry,
                None => {
                    return Ok(ValidateCallbackResult::Invalid(
                        "Original app entry must be one of the defined entry types for this zome"
                            .to_string(),
                    ));
                }
            };
            match original_app_entry {
                EntryTypes::Household(household) => {
                    validate_delete_household(delete_entry.action, original_action, household)
                }
                EntryTypes::HouseholdMembershipClaim(household_membership_claim) => {
                    validate_delete_household_membership_claim(
                        delete_entry.action,
                        original_action,
                        household_membership_claim,
                    )
                }
            }
        }
        FlatOp::RegisterCreateLink {
            link_type,
            base_address,
            target_address,
            tag,
            action,
        } => match link_type {
            LinkTypes::HouseholdUpdates => {
                validate_create_link_household_updates(action, base_address, target_address, tag)
            }
            LinkTypes::HouseholdToRequestors => validate_create_link_household_to_requestors(
                action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::RequestorToHouseholds => validate_create_link_requestor_to_households(
                action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::HouseholdToMembers => validate_create_link_household_to_members(
                action_hash(&op).clone(),
                action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::ActiveHouseholds => {
                validate_create_link_active_households(action, base_address, target_address, tag)
            }
            LinkTypes::MemberToHouseholds => validate_create_link_member_to_households(
                action_hash(&op).clone(),
                action,
                base_address,
                target_address,
                tag,
            ),
        },
        FlatOp::RegisterDeleteLink {
            link_type,
            base_address,
            target_address,
            tag,
            original_action,
            action,
        } => match link_type {
            LinkTypes::HouseholdUpdates => validate_delete_link_household_updates(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::HouseholdToRequestors => validate_delete_link_household_to_requestors(
                action_hash(&op).clone(),
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::RequestorToHouseholds => validate_delete_link_requestor_to_households(
                action_hash(&op).clone(),
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::HouseholdToMembers => validate_delete_link_household_to_members(
                action_hash(&op).clone(),
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::ActiveHouseholds => validate_delete_link_active_households(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::MemberToHouseholds => validate_delete_link_member_to_households(
                action_hash(&op).clone(),
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
        },
        FlatOp::StoreRecord(store_record) => match store_record {
            OpRecord::CreateEntry { app_entry, action } => match app_entry {
                EntryTypes::Household(household) => {
                    validate_create_household(EntryCreationAction::Create(action), household)
                }
                EntryTypes::HouseholdMembershipClaim(household_membership_claim) => {
                    validate_create_household_membership_claim(
                        EntryCreationAction::Create(action),
                        household_membership_claim,
                    )
                }
            },
            OpRecord::UpdateEntry {
                app_entry, action, ..
            } => match app_entry {
                EntryTypes::Household(household) => {
                    let result = validate_create_household(
                        EntryCreationAction::Update(action.clone()),
                        household.clone(),
                    )?;
                    if let ValidateCallbackResult::Valid = result {
                        validate_update_household(action, household)
                    } else {
                        Ok(result)
                    }
                }
                EntryTypes::HouseholdMembershipClaim(household_membership_claim) => {
                    let result = validate_create_household_membership_claim(
                        EntryCreationAction::Update(action.clone()),
                        household_membership_claim.clone(),
                    )?;
                    if let ValidateCallbackResult::Valid = result {
                        validate_update_household_membership_claim(
                            action,
                            household_membership_claim,
                        )
                    } else {
                        Ok(result)
                    }
                }
            },
            OpRecord::DeleteEntry {
                original_action_hash,
                action,
                ..
            } => {
                let original_record = must_get_valid_record(original_action_hash)?;
                let original_action = original_record.action().clone();
                let original_action = match original_action {
                    Action::Create(create) => EntryCreationAction::Create(create),
                    Action::Update(update) => EntryCreationAction::Update(update),
                    _ => {
                        return Ok(ValidateCallbackResult::Invalid(
                            "Original action for a delete must be a Create or Update action"
                                .to_string(),
                        ));
                    }
                };
                let app_entry_type = match original_action.entry_type() {
                    EntryType::App(app_entry_type) => app_entry_type,
                    _ => {
                        return Ok(ValidateCallbackResult::Valid);
                    }
                };
                let entry = match original_record.entry().as_option() {
                    Some(entry) => entry,
                    None => {
                        if original_action.entry_type().visibility().is_public() {
                            return Ok(
                                    ValidateCallbackResult::Invalid(
                                        "Original record for a delete of a public entry must contain an entry"
                                            .to_string(),
                                    ),
                                );
                        } else {
                            return Ok(ValidateCallbackResult::Valid);
                        }
                    }
                };
                let original_app_entry = match EntryTypes::deserialize_from_type(
                    app_entry_type.zome_index.clone(),
                    app_entry_type.entry_index.clone(),
                    &entry,
                )? {
                    Some(app_entry) => app_entry,
                    None => {
                        return Ok(
                                ValidateCallbackResult::Invalid(
                                    "Original app entry must be one of the defined entry types for this zome"
                                        .to_string(),
                                ),
                            );
                    }
                };
                match original_app_entry {
                    EntryTypes::Household(original_household) => {
                        validate_delete_household(action, original_action, original_household)
                    }
                    EntryTypes::HouseholdMembershipClaim(original_household_membership_claim) => {
                        validate_delete_household_membership_claim(
                            action,
                            original_action,
                            original_household_membership_claim,
                        )
                    }
                }
            }
            OpRecord::CreateLink {
                base_address,
                target_address,
                tag,
                link_type,
                action,
            } => match link_type {
                LinkTypes::HouseholdUpdates => validate_create_link_household_updates(
                    action,
                    base_address,
                    target_address,
                    tag,
                ),
                LinkTypes::HouseholdToRequestors => validate_create_link_household_to_requestors(
                    action,
                    base_address,
                    target_address,
                    tag,
                ),
                LinkTypes::RequestorToHouseholds => validate_create_link_requestor_to_households(
                    action,
                    base_address,
                    target_address,
                    tag,
                ),
                LinkTypes::HouseholdToMembers => validate_create_link_household_to_members(
                    action_hash(&op).clone(),
                    action,
                    base_address,
                    target_address,
                    tag,
                ),
                LinkTypes::ActiveHouseholds => validate_create_link_active_households(
                    action,
                    base_address,
                    target_address,
                    tag,
                ),
                LinkTypes::MemberToHouseholds => validate_create_link_member_to_households(
                    action_hash(&op).clone(),
                    action,
                    base_address,
                    target_address,
                    tag,
                ),
            },
            OpRecord::DeleteLink {
                original_action_hash,
                base_address,
                action,
            } => {
                let record = must_get_valid_record(original_action_hash)?;
                let create_link = match record.action() {
                    Action::CreateLink(create_link) => create_link.clone(),
                    _ => {
                        return Ok(ValidateCallbackResult::Invalid(
                            "The action that a DeleteLink deletes must be a CreateLink".to_string(),
                        ));
                    }
                };
                let link_type = match LinkTypes::from_type(
                    create_link.zome_index.clone(),
                    create_link.link_type.clone(),
                )? {
                    Some(lt) => lt,
                    None => {
                        return Ok(ValidateCallbackResult::Valid);
                    }
                };
                match link_type {
                    LinkTypes::HouseholdUpdates => validate_delete_link_household_updates(
                        action,
                        create_link.clone(),
                        base_address,
                        create_link.target_address,
                        create_link.tag,
                    ),
                    LinkTypes::HouseholdToRequestors => {
                        validate_delete_link_household_to_requestors(
                            action_hash(&op).clone(),
                            action,
                            create_link.clone(),
                            base_address,
                            create_link.target_address,
                            create_link.tag,
                        )
                    }
                    LinkTypes::RequestorToHouseholds => {
                        validate_delete_link_requestor_to_households(
                            action_hash(&op).clone(),
                            action,
                            create_link.clone(),
                            base_address,
                            create_link.target_address,
                            create_link.tag,
                        )
                    }
                    LinkTypes::HouseholdToMembers => validate_delete_link_household_to_members(
                        action_hash(&op).clone(),
                        action,
                        create_link.clone(),
                        base_address,
                        create_link.target_address,
                        create_link.tag,
                    ),
                    LinkTypes::ActiveHouseholds => validate_delete_link_active_households(
                        action,
                        create_link.clone(),
                        base_address,
                        create_link.target_address,
                        create_link.tag,
                    ),
                    LinkTypes::MemberToHouseholds => validate_delete_link_member_to_households(
                        action_hash(&op).clone(),
                        action,
                        create_link.clone(),
                        base_address,
                        create_link.target_address,
                        create_link.tag,
                    ),
                }
            }
            OpRecord::CreatePrivateEntry { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::UpdatePrivateEntry { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::CreateCapClaim { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::CreateCapGrant { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::UpdateCapClaim { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::UpdateCapGrant { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::Dna { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::OpenChain { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::CloseChain { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::InitZomesComplete { .. } => Ok(ValidateCallbackResult::Valid),
            _ => Ok(ValidateCallbackResult::Valid),
        },
        FlatOp::RegisterAgentActivity(agent_activity) => match agent_activity {
            OpActivity::CreateAgent { agent, action } => {
                let previous_action = must_get_action(action.prev_action)?;
                match previous_action.action() {
                        Action::AgentValidationPkg(
                            AgentValidationPkg { membrane_proof, .. },
                        ) => validate_agent_joining(agent, membrane_proof),
                        _ => {
                            Ok(
                                ValidateCallbackResult::Invalid(
                                    "The previous action for a `CreateAgent` action must be an `AgentValidationPkg`"
                                        .to_string(),
                                ),
                            )
                        }
                    }
            }
            _ => Ok(ValidateCallbackResult::Valid),
        },
    }
}
