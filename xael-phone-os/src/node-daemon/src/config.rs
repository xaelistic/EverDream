//! XAEL Node Daemon - Configuration

use serde::{Deserialize, Serialize};

/// Daemon configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaemonConfig {
    /// DYNA scheduler WebSocket URL
    pub scheduler_url: String,
    
    /// gRPC endpoint for proof submission
    pub grpc_endpoint: String,
    
    /// Node-specific settings
    pub node: NodeConfig,
    
    /// Resource constraints
    pub resources: ResourceConfig,
    
    /// Privacy and consent settings
    pub privacy: PrivacyConfig,
    
    /// Logging configuration
    pub logging: LoggingConfig,
}

impl Default for DaemonConfig {
    fn default() -> Self {
        Self {
            scheduler_url: "wss://scheduler.dyna.network/v1".to_string(),
            grpc_endpoint: "https://grpc.dyna.network:443".to_string(),
            node: NodeConfig::default(),
            resources: ResourceConfig::default(),
            privacy: PrivacyConfig::default(),
            logging: LoggingConfig::default(),
        }
    }
}

/// Node-specific configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeConfig {
    /// Custom node name (optional)
    pub name: Option<String>,
    
    /// Region code for PPP adjustments
    pub region_code: String,
    
    /// Whether to allow mobile data usage
    pub allow_mobile_data: bool,
    
    /// Whether to run only while charging
    pub charging_only: bool,
    
    /// Maximum battery level to operate at (percentage)
    pub max_battery_usage: u8,
    
    /// Maximum concurrent tasks
    pub max_concurrent_tasks: usize,
}

impl Default for NodeConfig {
    fn default() -> Self {
        Self {
            name: None,
            region_code: "US".to_string(),
            allow_mobile_data: false,
            charging_only: true,
            max_battery_usage: 80,
            max_concurrent_tasks: 2,
        }
    }
}

/// Resource constraints configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceConfig {
    /// Maximum memory usage for daemon (MB)
    pub max_memory_mb: usize,
    
    /// Maximum CPU usage percentage
    pub max_cpu_percent: u8,
    
    /// NPU power budget (mW)
    pub npu_power_budget_mw: u32,
    
    /// GPU memory fraction (0.0-1.0)
    pub gpu_memory_fraction: f32,
    
    /// Model cache size (MB)
    pub model_cache_size_mb: usize,
}

impl Default for ResourceConfig {
    fn default() -> Self {
        Self {
            max_memory_mb: 50,
            max_cpu_percent: 30,
            npu_power_budget_mw: 1000,
            gpu_memory_fraction: 0.7,
            model_cache_size_mb: 512,
        }
    }
}

/// Privacy and consent configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivacyConfig {
    /// Allow inference tasks
    pub allow_inference_tasks: bool,
    
    /// Allow data processing tasks
    pub allow_data_processing: bool,
    
    /// Require explicit consent per task type
    pub require_per_task_consent: bool,
    
    /// Enable audit logging
    pub enable_audit_log: bool,
    
    /// Regional compliance preset (EU, US, APAC)
    pub compliance_preset: CompliancePreset,
}

impl Default for PrivacyConfig {
    fn default() -> Self {
        Self {
            allow_inference_tasks: true,
            allow_data_processing: false,
            require_per_task_consent: true,
            enable_audit_log: true,
            compliance_preset: CompliancePreset::default(),
        }
    }
}

/// Regional compliance presets
#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default)]
pub enum CompliancePreset {
    #[default]
    EU,      // GDPR-compliant
    US,      // Standard US privacy
    APAC,    // Asia-Pacific regional
    Custom,  // User-defined
}

/// Logging configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    /// Log level (trace, debug, info, warn, error)
    pub level: String,
    
    /// Enable JSON formatting
    pub json_format: bool,
    
    /// Log file path (optional)
    pub file_path: Option<String>,
    
    /// Maximum log file size (MB)
    pub max_file_size_mb: usize,
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            level: "info".to_string(),
            json_format: false,
            file_path: None,
            max_file_size_mb: 10,
        }
    }
}

impl DaemonConfig {
    /// Load configuration from file
    pub fn from_file(path: &str) -> Result<Self, crate::DaemonError> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| crate::DaemonError::Io(e))?;
        
        let config: DaemonConfig = serde_json::from_str(&content)
            .map_err(|e| crate::DaemonError::Json(e))?;
        
        Ok(config)
    }
    
    /// Save configuration to file
    pub fn to_file(&self, path: &str) -> Result<(), crate::DaemonError> {
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| crate::DaemonError::Json(e))?;
        
        std::fs::write(path, content)
            .map_err(|e| crate::DaemonError::Io(e))?;
        
        Ok(())
    }
    
    /// Validate configuration
    pub fn validate(&self) -> Result<(), crate::DaemonError> {
        if self.resources.max_memory_mb > 100 {
            return Err(crate::config_err!(
                "max_memory_mb must be <= 100 (target is <50MB RSS)"
            ));
        }
        
        if self.resources.gpu_memory_fraction < 0.0 || self.resources.gpu_memory_fraction > 1.0 {
            return Err(crate::config_err!(
                "gpu_memory_fraction must be between 0.0 and 1.0"
            ));
        }
        
        if self.node.max_battery_usage > 100 {
            return Err(crate::config_err!(
                "max_battery_usage must be <= 100"
            ));
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = DaemonConfig::default();
        assert_eq!(config.resources.max_memory_mb, 50);
        assert!(config.privacy.allow_inference_tasks);
        assert!(!config.privacy.allow_data_processing);
    }

    #[test]
    fn test_config_validation() {
        let mut config = DaemonConfig::default();
        config.resources.max_memory_mb = 150;
        assert!(config.validate().is_err());
        
        config.resources.max_memory_mb = 50;
        assert!(config.validate().is_ok());
    }
}
