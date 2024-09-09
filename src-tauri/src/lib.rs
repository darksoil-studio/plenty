use commands::plenty_happ_bundle;
use lair_keystore::dependencies::sodoken::{BufRead, BufWrite};
use std::path::PathBuf;
use tauri::Emitter;
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_holochain::{HolochainExt, HolochainPluginConfig, WANNetworkConfig};
use tauri_plugin_log::Target;

mod commands;

const APP_ID: &'static str = "plenty";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .target(Target::new(tauri_plugin_log::TargetKind::LogDir {
                    file_name: None,
                }))
                .level(log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("{}, {argv:?}, {cwd}", app.package_info().name);
            // TODO: join plenty instance
            // app.emit("single-instance", Payload { args: argv, cwd })
            //     .unwrap();
        }))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_holochain::init(
            vec_to_locked(vec![]).expect("Can't build passphrase"),
            HolochainPluginConfig::new(holochain_dir(), wan_network_config()),
        ))
        .invoke_handler(tauri::generate_handler![
            commands::create_plenty_instance,
            commands::join_plenty_instance,
            commands::leave_buyers_club
        ])
        .setup(|app| {
            if let Err(err) = app.deep_link().register("plenty") {
                log::error!("Error setting up the deep link handler: {err:?}");
            }

            let handle = app.handle().clone();
            let result: anyhow::Result<()> = tauri::async_runtime::block_on(async move {
                let admin_ws = handle.holochain()?.admin_websocket().await?;

                let installed_apps = admin_ws
                    .list_apps(None)
                    .await
                    .map_err(|err| tauri_plugin_holochain::Error::ConductorApiError(err))?;

                if installed_apps.len() == 0 {
                    app.holochain()?
                        .main_window_builder(String::from("lobby"), false, None, None)
                        .await?
                        .title(String::from("Plenty"))
                        .inner_size(1400.0, 1000.0)
                        .enable_clipboard_access()
                        .build()?;
                } else {
                    app.holochain()?
                        .update_web_app_if_necessary(String::from(APP_ID), plenty_happ_bundle())
                        .await?;

                    app.holochain()?
                        .web_happ_window_builder(String::from(APP_ID), None)
                        .await?
                        .title(String::from("Plenty"))
                        .inner_size(1400.0, 1000.0)
                        .enable_clipboard_access()
                        .build()?;
                }
                app.emit("setup-completed", ())?;

                Ok(())
            });
            result?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn wan_network_config() -> Option<WANNetworkConfig> {
    // Resolved at compile time to be able to point to local services
    if tauri::is_dev() {
        None
    } else {
        Some(WANNetworkConfig {
            signal_url: url2::url2!("wss://signal.holo.host"),
            bootstrap_url: url2::url2!("https://bootstrap.holo.host"),
        })
    }
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

fn holochain_dir() -> PathBuf {
    if tauri::is_dev() {
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
        .join(std::env!("CARGO_PKG_VERSION"))
    }
}
