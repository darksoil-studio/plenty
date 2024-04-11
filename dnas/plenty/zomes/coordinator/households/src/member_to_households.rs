use hdk::prelude::*;
use households_integrity::*;

#[hdk_extern]
pub fn get_households_for_member(member: AgentPubKey) -> ExternResult<Vec<Link>> {
    get_links(GetLinksInputBuilder::try_new(member, LinkTypes::MemberToHouseholds)?.build())
}
