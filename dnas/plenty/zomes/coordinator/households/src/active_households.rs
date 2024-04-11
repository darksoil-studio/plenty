use hdk::prelude::*;
use households_integrity::*;
#[hdk_extern]
pub fn get_active_households(_: ()) -> ExternResult<Vec<Link>> {
    let path = Path::from("active_households");
    get_links(
        GetLinksInputBuilder::try_new(
                path.path_entry_hash()?,
                LinkTypes::ActiveHouseholds,
            )?
            .build(),
    )
}
