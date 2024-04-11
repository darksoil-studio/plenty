use holochain_types::prelude::*;
use lair_keystore::dependencies::sodoken::{BufRead, BufWrite};
use std::collections::HashMap;
use std::path::PathBuf;
use tauri_plugin_holochain::{HolochainExt, HolochainPluginConfig};
use url2::Url2;

pub fn happ_bundle() -> AppBundle {
    let bytes = include_bytes!("../../workdir/plenty-debug.happ");
    AppBundle::decode(bytes).expect("Failed to decode plenty happ")
}

pub fn vec_to_locked(mut pass_tmp: Vec<u8>) -> std::io::Result<BufRead> {
    match BufWrite::new_mem_locked(pass_tmp.len()) {
        Err(e) => {
            pass_tmp.fill(0);
            Err(e.into())
        }
        Ok(p) => {
            {
                let mut lock = p.write_lock();
                lock.copy_from_slice(&pass_tmp);
                pass_tmp.fill(0);
            }
            Ok(p.to_read())
        }
    }
}

fn bootstrap_url() -> Url2 {
    // Resolved at compile time to be able to point to local services
    match (
        std::option_env!("INTERNAL_IP"),
        std::option_env!("BOOTSTRAP_PORT"),
    ) {
        (Some(internal_ip), Some(port)) => url2::url2!("http://{internal_ip}:{port}"),
        _ => url2::url2!("https://bootstrap.holo.host"),
    }
}

fn signal_url() -> Url2 {
    // Resolved at compile time to be able to point to local services
    match (
        std::option_env!("INTERNAL_IP"),
        std::option_env!("SIGNAL_PORT"),
    ) {
        (Some(internal_ip), Some(port)) => url2::url2!("http://{internal_ip}:{port}"),
        _ => url2::url2!("wss://signal.holo.host"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_holochain::init(
            vec_to_locked(vec![]).expect("Can't build passphrase"),
            HolochainPluginConfig {
                signal_url: signal_url(),
                bootstrap_url: bootstrap_url(),
            },
        ))
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let mut admin_ws = handle.holochain()?.admin_websocket().await?;

                let installed_apps = admin_ws
                    .list_apps(None)
                    .await
                    .map_err(|err| tauri_plugin_holochain::Error::ConductorApiError(err))?;

                if installed_apps.len() == 0 {
                    handle
                        .holochain()?
                        .install_app(String::from("plenty"), happ_bundle(), HashMap::new(), None)
                        .await
                        .map(|_| ())
                } else {
                    Ok(())
                }
            })?;

            // app.holochain()?.web_happ_window_builder("plenty").build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Very simple setup:
// async fn setup(app: AppHandle) {}
