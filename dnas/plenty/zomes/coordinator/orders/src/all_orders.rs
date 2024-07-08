use hdk::prelude::*;
use orders_integrity::*;

#[hdk_extern]
pub fn get_all_orders() -> ExternResult<Vec<Link>> {
    let path = Path::from("all_orders");
    get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::AllOrders)?
            .build(),
    )
}
