use std::collections::HashMap;

use anyhow::anyhow;
use holochain_client::AgentPubKey;
use holochain_types::{
    app::{AppBundle, AppManifest},
    dna::AgentPubKeyB64,
    prelude::YamlProperties,
    web_app::{WebAppBundle, WebAppManifest},
};
use mr_bundle::{Bundle, Manifest};
use tauri::{AppHandle, WebviewWindow};
use tauri_plugin_holochain::HolochainExt;
use tempdir::TempDir;

use crate::APP_ID;

pub fn plenty_happ_bundle() -> WebAppBundle {
    let bytes = include_bytes!("../../workdir/plenty.webhapp");
    WebAppBundle::decode(bytes).expect("Failed to decode plenty happ")
}

#[tauri::command]
pub async fn create_plenty_instance(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    internal_create_plenty_instance(app, window)
        .await
        .map_err(|err| format!("{:?}", err))
}

async fn internal_create_plenty_instance(
    app: AppHandle,
    window: WebviewWindow,
) -> anyhow::Result<()> {
    let admin_ws = app.holochain()?.admin_websocket().await?;

    let agent_key = admin_ws
        .generate_agent_pub_key()
        .await
        .map_err(|err| anyhow!("{:?}", err))?;

    let bundle = override_progenitor_in_web_happ(plenty_happ_bundle(), agent_key.clone()).await?;

    app.holochain()?
        .install_web_app(
            String::from(APP_ID),
            bundle,
            HashMap::new(),
            Some(agent_key),
            None,
        )
        .await
        .map(|_| ())?;

    app.holochain()?
        .web_happ_window_builder(String::from(APP_ID), None)
        .await?
        .enable_clipboard_access()
        .build()?;

    window.close()?;

    Ok(())
}

#[tauri::command]
pub async fn join_plenty_instance(
    app: AppHandle,
    window: WebviewWindow,
    progenitor: AgentPubKeyB64,
) -> Result<(), String> {
    internal_join_plenty_instance(app, window, progenitor.into())
        .await
        .map_err(|err| format!("{:?}", err))
}

async fn internal_join_plenty_instance(
    app: AppHandle,
    window: WebviewWindow,
    progenitor: AgentPubKey,
) -> anyhow::Result<()> {
    let bundle = override_progenitor_in_web_happ(plenty_happ_bundle(), progenitor.clone()).await?;

    app.holochain()?
        .install_web_app(String::from(APP_ID), bundle, HashMap::new(), None, None)
        .await
        .map(|_| ())?;

    app.holochain()?
        .web_happ_window_builder(String::from(APP_ID), None)
        .await?
        .build()?;

    window.close()?;

    Ok(())
}

async fn override_progenitor_in_web_happ(
    web_app_bundle: WebAppBundle,
    progenitor: AgentPubKey,
) -> anyhow::Result<WebAppBundle> {
    let happ_bundle =
        override_properties_in_happ(web_app_bundle.happ_bundle().await?, progenitor).await?;

    let tempdir = TempDir::new("plenty-webhapp")?;
    let ui_path = tempdir.path().join("ui.zip");
    std::fs::write(ui_path, web_app_bundle.web_ui_zip_bytes().await?.to_vec())?;
    let happ_path = tempdir.path().join("plenty.happ");
    std::fs::write(happ_path, happ_bundle.encode()?)?;

    let webhapp_yaml = r#"
---
manifest_version: "1"
name: plenty
ui:
  bundled: "./ui.zip"
happ_manifest:
  bundled: "./plenty.happ"
"#;
    let manifest_path = tempdir.path().join("web-happ.yaml");
    std::fs::write(manifest_path.clone(), webhapp_yaml.as_bytes())?;

    let web_app_bundle = Bundle::<WebAppManifest>::pack_yaml(&manifest_path).await?;

    let bundle = WebAppBundle::decode(&web_app_bundle.encode()?)?;

    Ok(bundle)
}

async fn override_properties_in_happ(
    app_bundle: AppBundle,
    progenitor: AgentPubKey,
) -> anyhow::Result<AppBundle> {
    let inner = app_bundle.into_inner();

    let mut manifest = inner.manifest().clone();

    match &mut manifest {
        AppManifest::V1(v1) => {
            for app_manifest_role in &mut v1.roles {
                if app_manifest_role.name.as_str().eq("plenty") {
                    let properties = roles_types::Properties {
                        progenitors: vec![progenitor.clone().into()],
                    };

                    let value = serde_yaml::to_value(properties)?;

                    let yaml_properties = YamlProperties::new(value);

                    app_manifest_role.dna.modifiers.properties = Some(yaml_properties);
                }
            }
        }
    }

    let inner = inner.update_manifest(manifest)?;

    let bundle = AppBundle::decode(&inner.encode()?)?;
    Ok(bundle)
}
