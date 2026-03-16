use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::Manager;

pub struct AppState {
    pub next_process: Mutex<Option<Child>>,
    pub wv2_raw: Arc<Mutex<Option<isize>>>,
    pub tauri_wv_hwnd: Arc<Mutex<Option<isize>>>, // HWND del WebView de wry para restaurar
}

const PORT: u16 = 3000;
const SIDEBAR_W: i32 = 224;

fn wait_for_server(retries: u32) -> bool {
    for _ in 0..retries {
        if TcpStream::connect(("127.0.0.1", PORT)).is_ok() {
            return true;
        }
        thread::sleep(Duration::from_millis(500));
    }
    false
}

#[cfg(target_os = "windows")]
fn create_wv2(
    parent_hwnd: isize,
    x: i32,
    y: i32,
    w: i32,
    h: i32,
    url: String,
    wv2_arc: Arc<Mutex<Option<isize>>>,
    tauri_wv_arc: Arc<Mutex<Option<isize>>>,
) {
    use webview2_com::{
        CreateCoreWebView2ControllerCompletedHandler,
        CreateCoreWebView2EnvironmentCompletedHandler,
        Microsoft::Web::WebView2::Win32::CreateCoreWebView2Environment,
    };
    use windows::Win32::Foundation::{HWND, RECT};
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindow, SetWindowPos, GW_CHILD, SWP_NOACTIVATE, SWP_NOZORDER,
    };

    let parent = HWND(parent_hwnd as *mut _);

    unsafe {
        // PASO 1: Encontrar el WebView de Tauri/wry (hijo actual antes de crear el nuestro)
        // y achicarlo al ancho del sidebar — el área de contenido queda libre
        if let Ok(tauri_wv) = GetWindow(parent, GW_CHILD) {
            *tauri_wv_arc.lock().unwrap() = Some(tauri_wv.0 as isize);
            let _ = SetWindowPos(
                tauri_wv,
                None,
                0,
                0,
                x,  // x = sidebar_w en pixels físicos
                h,
                SWP_NOZORDER | SWP_NOACTIVATE,
            );
        }
    }

    // PASO 2: Crear nuestro streaming WebView2 en el área de contenido (non-blocking)
    let env_handler = CreateCoreWebView2EnvironmentCompletedHandler::create(Box::new(
        move |result, env| {
            result?;
            let environment = match env {
                Some(e) => e,
                None => return Ok(()),
            };

            let url2 = url.clone();
            let wv2_arc2 = wv2_arc.clone();

            let ctrl_handler = CreateCoreWebView2ControllerCompletedHandler::create(Box::new(
                move |result2, ctrl| {
                    result2?;
                    let controller = match ctrl {
                        Some(c) => c,
                        None => return Ok(()),
                    };

                    unsafe {
                        let bounds = RECT {
                            left: x,
                            top: y,
                            right: x + w - 8,  // dejar 8px en borde derecho para resize
                            bottom: y + h - 8, // dejar 8px en borde inferior para resize
                        };
                        let _ = controller.SetBounds(bounds);
                        let _ = controller.SetIsVisible(true);

                        if let Ok(wv) = controller.CoreWebView2() {
                            // Spoofear UA para que YouTube/Netflix no bloqueen WebView2
                            if let Ok(settings) = wv.Settings() {
                                use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings2;
                                use windows::core::Interface;
                                if let Ok(s2) = settings.cast::<ICoreWebView2Settings2>() {
                                    let ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0";
                                    let ua_wide: Vec<u16> =
                                        ua.encode_utf16().chain(std::iter::once(0)).collect();
                                    let _ = s2.SetUserAgent(windows::core::PCWSTR(ua_wide.as_ptr()));
                                }
                            }
                            let url_wide: Vec<u16> =
                                url2.encode_utf16().chain(std::iter::once(0)).collect();
                            let _ = wv.Navigate(windows::core::PCWSTR(url_wide.as_ptr()));
                        }

                        let raw: isize = std::mem::transmute_copy(&controller);
                        std::mem::forget(controller);
                        *wv2_arc2.lock().unwrap() = Some(raw);
                    }
                    Ok(())
                },
            ));

            unsafe {
                let _ = environment.CreateCoreWebView2Controller(parent, &ctrl_handler);
            }
            Ok(())
        },
    ));

    unsafe {
        let _ = CreateCoreWebView2Environment(&env_handler);
    }
}

#[cfg(target_os = "windows")]
fn exec_mute(raw: isize, muted: bool) {
    use webview2_com::ExecuteScriptCompletedHandler;
    use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Controller;

    let script = if muted {
        "document.querySelectorAll('video,audio').forEach(function(e){e.muted=true;})"
    } else {
        "document.querySelectorAll('video,audio').forEach(function(e){e.muted=false;})"
    };

    unsafe {
        let controller: ICoreWebView2Controller = std::mem::transmute_copy(&raw);
        if let Ok(wv) = controller.CoreWebView2() {
            let script_wide: Vec<u16> =
                script.encode_utf16().chain(std::iter::once(0)).collect();
            let handler = ExecuteScriptCompletedHandler::create(Box::new(|_, _| Ok(())));
            let _ = wv.ExecuteScript(
                windows::core::PCWSTR(script_wide.as_ptr()),
                &handler,
            );
        }
        std::mem::forget(controller);
    }
}

#[tauri::command]
fn set_streaming_muted(muted: bool, app: tauri::AppHandle) {
    let raw = *app.state::<AppState>().wv2_raw.lock().unwrap();
    if let Some(raw) = raw {
        let _ = app.run_on_main_thread(move || {
            #[cfg(target_os = "windows")]
            exec_mute(raw, muted);
        });
    }
}

#[cfg(target_os = "windows")]
fn close_wv2_on_main(raw: isize) {
    use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Controller;
    unsafe {
        let controller: ICoreWebView2Controller = std::mem::transmute_copy(&raw);
        let _ = controller.Close();
    }
}

#[cfg(target_os = "windows")]
fn restore_tauri_wv(tauri_wv_raw: isize, full_w: i32, full_h: i32) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{SetWindowPos, SWP_NOACTIVATE, SWP_NOZORDER};
    unsafe {
        let tauri_wv = HWND(tauri_wv_raw as *mut _);
        let _ = SetWindowPos(tauri_wv, None, 0, 0, full_w, full_h, SWP_NOZORDER | SWP_NOACTIVATE);
    }
}

#[tauri::command]
fn open_streaming(url: String, app: tauri::AppHandle) {
    // Cerrar WebView2 anterior si existe
    let prev_raw = app.state::<AppState>().wv2_raw.clone();
    let prev_raw = prev_raw.lock().unwrap().take();
    if let Some(raw) = prev_raw {
        let _ = app.run_on_main_thread(move || {
            #[cfg(target_os = "windows")]
            close_wv2_on_main(raw);
        });
    }

    let main_win = match app.get_webview_window("main") {
        Some(w) => w,
        None => return,
    };

    #[cfg(target_os = "windows")]
    let tauri_hwnd = match main_win.hwnd() {
        Ok(h) => h.0 as isize,
        Err(_) => return,
    };

    let scale = main_win.scale_factor().unwrap_or(1.0);
    let inner = main_win.inner_size().unwrap_or_default();
    let sidebar_w_phys = (SIDEBAR_W as f64 * scale).round() as i32;
    let content_w_phys = inner.width as i32 - sidebar_w_phys;
    let content_h_phys = inner.height as i32;

    let wv2_arc = app.state::<AppState>().wv2_raw.clone();
    let tauri_wv_arc = app.state::<AppState>().tauri_wv_hwnd.clone();

    let _ = app.run_on_main_thread(move || {
        #[cfg(target_os = "windows")]
        create_wv2(
            tauri_hwnd,
            sidebar_w_phys,
            0,
            content_w_phys,
            content_h_phys,
            url,
            wv2_arc,
            tauri_wv_arc,
        );
    });
}

#[tauri::command]
fn check_streaming(app: tauri::AppHandle) -> bool {
    let state = app.state::<AppState>();
    let guard = state.wv2_raw.lock().unwrap();
    guard.is_some()
}

#[tauri::command]
fn close_streaming(app: tauri::AppHandle) {
    // Cerrar nuestro streaming WebView2
    let raw = app.state::<AppState>().wv2_raw.clone().lock().unwrap().take();
    if let Some(raw) = raw {
        let _ = app.run_on_main_thread(move || {
            #[cfg(target_os = "windows")]
            close_wv2_on_main(raw);
        });
    }

    // Restaurar el WebView de Tauri a tamaño completo
    let tauri_wv_raw = app.state::<AppState>().tauri_wv_hwnd.clone().lock().unwrap().take();
    if let Some(raw) = tauri_wv_raw {
        let main_win = match app.get_webview_window("main") {
            Some(w) => w,
            None => return,
        };
        let scale = main_win.scale_factor().unwrap_or(1.0);
        let inner = main_win.inner_size().unwrap_or_default();
        let full_w = inner.width as i32;
        let full_h = inner.height as i32;
        let _ = app.run_on_main_thread(move || {
            #[cfg(target_os = "windows")]
            restore_tauri_wv(raw, full_w, full_h);
        });
    }
}

pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            next_process: Mutex::new(None),
            wv2_raw: Arc::new(Mutex::new(None)),
            tauri_wv_hwnd: Arc::new(Mutex::new(None)),
        })
        .setup(|app| {
            let app_handle = app.handle().clone();
            let is_dev = cfg!(debug_assertions);
            let resources = if !is_dev {
                Some(app.path().resource_dir().ok())
            } else {
                None
            };

            thread::spawn(move || {
                let mut child: Option<Child> = None;

                if !is_dev {
                    if let Some(Some(res_dir)) = resources {
                        let standalone = res_dir.join(".next").join("standalone");
                        let server_js = standalone.join("server.js");
                        let user_data = app_handle
                            .path()
                            .app_data_dir()
                            .unwrap_or_else(|_| standalone.clone());

                        let proc = Command::new("node")
                            .arg(&server_js)
                            .current_dir(&standalone)
                            .env("PORT", PORT.to_string())
                            .env("HOSTNAME", "127.0.0.1")
                            .env("NODE_ENV", "production")
                            .env("DATA_DIR", user_data.to_str().unwrap_or(""))
                            .env("NEXT_TELEMETRY_DISABLED", "1")
                            .spawn();

                        child = proc.ok();
                    }
                }

                if wait_for_server(120) {
                    if let Some(main) = app_handle.get_webview_window("main") {
                        let _ = main.show();
                        let _ = main.set_focus();
                    }
                }

                if let Some(mut c) = child {
                    let _ = c.wait();
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_streaming,
            close_streaming,
            check_streaming,
            set_streaming_muted
        ])
        .run(tauri::generate_context!())
        .expect("error al iniciar la aplicación");
}
