use hdk::prelude::*;
use producers_integrity::*;

#[hdk_extern]
pub fn get_all_producers() -> ExternResult<Vec<Link>> {
    let path = Path::from("all_producers");
    get_links(GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::AllProducers)?.build())
}
