use hdi::prelude::*;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(tag = "type")]
pub enum ProducerEditors {
    Liason,
    AllMembers,
    Members(Vec<AgentPubKey>),
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Producer {
    pub name: String,
    pub photo: EntryHash,
    pub contact_email: String,
    pub phone_number: String,
    pub location: String,
    pub producer_details: String,
    pub liason: AgentPubKey,
    pub editors: ProducerEditors,
}
