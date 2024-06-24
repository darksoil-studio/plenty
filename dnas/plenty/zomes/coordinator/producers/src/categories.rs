use hdk::prelude::*;
use producers_integrity::LinkTypes;

pub fn category_path(category: String) -> ExternResult<TypedPath> {
    let mut path = all_categories_path()?;
    path.path.append_component(Component::from(category));
    Ok(path)
}

pub fn all_categories_path() -> ExternResult<TypedPath> {
    Path::from("all_categories").typed(LinkTypes::CategoriesPath)
}

#[hdk_extern]
pub fn get_all_categories() -> ExternResult<Vec<String>> {
    let path = all_categories_path()?;

    let children = path.children_paths()?;

    let categories: Vec<String> = children
        .into_iter()
        .filter_map(|child| child.path.leaf().cloned())
        .filter_map(|leaf| String::try_from(&leaf).ok())
        .collect();
    Ok(categories)
}

#[hdk_extern]
pub fn get_products_for_category(category: String) -> ExternResult<Vec<Link>> {
    let path = category_path(category)?;

    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::CategoryToProduct)?
            .build(),
    )?;
    Ok(links)
}
