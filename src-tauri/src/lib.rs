use holochain_types::prelude::*;
use lair_keystore::dependencies::sodoken::{BufRead, BufWrite};
use std::{collections::HashMap, path::PathBuf};
use tauri::Manager;
use tauri_plugin_holochain::{HolochainExt, HolochainPluginConfig};
use url2::Url2;

const APP_ID: &'static str = "plenty";

pub fn happ_bundle() -> AppBundle {
    let bytes = include_bytes!("../../workdir/plenty.happ");
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

fn internal_ip() -> String {
    if cfg!(mobile) {
        std::option_env!("INTERNAL_IP")
            .expect("Environment variable INTERNAL_IP was not set")
            .to_string()
    } else {
        String::from("localhost")
    }
}

fn bootstrap_url() -> Url2 {
    // Resolved at compile time to be able to point to local services
    if cfg!(debug_assertions) {
        let internal_ip = internal_ip();
        let port = std::option_env!("BOOTSTRAP_PORT")
            .expect("Environment variable BOOTSTRAP_PORT was not set");
        url2::url2!("http://{internal_ip}:{port}")
    } else {
        url2::url2!("https://bootstrap.holo.host")
    }
}

fn signal_url() -> Url2 {
    // Resolved at compile time to be able to point to local services
    if cfg!(debug_assertions) {
        let internal_ip = internal_ip();
        let signal_port =
            std::option_env!("SIGNAL_PORT").expect("Environment variable INTERNAL_IP was not set");
        url2::url2!("ws://{internal_ip}:{signal_port}")
    } else {
        url2::url2!("wss://signal.holo.host")
    }
}

fn holochain_dir() -> PathBuf {
    if cfg!(debug_assertions) {
        let tmp_dir =
            tempdir::TempDir::new("plenty").expect("Could not create temporary directory");

        // Convert `tmp_dir` into a `Path`, destroying the `TempDir`
        // without deleting the directory.
        let tmp_path = tmp_dir.into_path();
        tmp_path
    } else {
        app_dirs2::app_root(
            app_dirs2::AppDataType::UserData,
            &app_dirs2::AppInfo {
                name: "studio.darksoil.plenty",
                author: std::env!("CARGO_PKG_AUTHORS"),
            },
        )
        .expect("Could not get app root")
        .join("holochain")
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_holochain::init(
            vec_to_locked(vec![]).expect("Can't build passphrase"),
            HolochainPluginConfig {
                signal_url: signal_url(),
                bootstrap_url: bootstrap_url(),
                holochain_dir: holochain_dir(),
            },
        ))
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let admin_ws = handle.holochain()?.admin_websocket().await?;

                let installed_apps = admin_ws
                    .list_apps(None)
                    .await
                    .map_err(|err| tauri_plugin_holochain::Error::ConductorApiError(err))?;

                if installed_apps.len() == 0 {
                    handle
                        .holochain()?
                        .install_app(String::from(APP_ID), happ_bundle(), HashMap::new(), None)
                        .await
                        .map(|_| ())
                } else {
                    Ok(())
                }
            })?;

            app.emit("setup-completed", ())?;

            app.holochain()?
                .main_window_builder(
                    String::from("plenty"),
                    false,
                    Some(String::from(APP_ID)),
                    None,
                )?
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
