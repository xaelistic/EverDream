//! XAEL Node Daemon - Main Entry Point
//!
//! Minimalist background service for DYNA compute network participation.
//! Target: <50MB RSS, optimized for mobile devices.

use xael_daemon::{DaemonConfig, NodeDaemon, Result};
use tracing::{info, error};
use tracing_subscriber::{fmt, EnvFilter};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    init_logging();
    
    info!("🚀 XAEL Node Daemon v{}", env!("CARGO_PKG_VERSION"));
    info!("Starting up...");
    
    // Load configuration
    let config = load_config()?;
    
    // Validate configuration
    config.validate()?;
    
    // Create and run daemon
    let mut daemon = NodeDaemon::new(config);
    
    info!("Node ID: {}", daemon.node_id());
    
    match daemon.run().await {
        Ok(_) => {
            info!("Daemon shut down gracefully");
            Ok(())
        }
        Err(e) => {
            error!("Daemon error: {}", e);
            Err(e)
        }
    }
}

/// Initialize logging subsystem
fn init_logging() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,xael_daemon=debug"));
    
    fmt()
        .with_target(true)
        .with_thread_ids(false)
        .with_file(false)
        .with_line_number(false)
        .with_env_filter(filter)
        .init();
}

/// Load configuration from file or use defaults
fn load_config() -> Result<DaemonConfig> {
    let config_path = std::env::var("XAEL_CONFIG")
        .unwrap_or_else(|_| "/data/local/tmp/xael-daemon/config.json".to_string());
    
    if std::path::Path::new(&config_path).exists() {
        info!("Loading configuration from: {}", config_path);
        DaemonConfig::from_file(&config_path)
    } else {
        info!("Using default configuration");
        Ok(DaemonConfig::default())
    }
}
