use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Household {
    pub name: String,
    pub avatar: EntryHash,
}
