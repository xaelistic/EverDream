//! Capability Registry - Hardware Detection and Reporting

use crate::{DaemonConfig, Result, DaemonError};
use serde::{Deserialize, Serialize};

/// Collection of node capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Capabilities {
    /// NPU model name
    pub npu_model: String,
    
    /// NPU performance in TOPS (Tera Operations Per Second)
    pub npu_tops: u32,
    
    /// GPU model name
    pub gpu_model: String,
    
    /// GPU memory in MB
    pub gpu_memory_mb: u32,
    
    /// Total system RAM in MB
    pub total_ram_mb: u32,
    
    /// Currently available RAM in MB
    pub available_ram_mb: u32,
    
    /// Supported model quantizations
    pub supported_quantizations: Vec<String>,
}

/// Registry for hardware capabilities
pub struct CapabilityRegistry {
    config: DaemonConfig,
    capabilities: Capabilities,
}

impl CapabilityRegistry {
    /// Create a new capability registry and detect hardware
    pub fn new(config: &DaemonConfig) -> Result<Self> {
        let capabilities = Self::detect_hardware()?;
        
        Ok(Self {
            config: config.clone(),
            capabilities,
        })
    }
    
    /// Detect hardware capabilities
    fn detect_hardware() -> Result<Capabilities> {
        // TODO: Implement actual hardware detection using sysinfo and Android APIs
        // For now, return placeholder values typical for Pixel 7
        
        let mut sys = sysinfo::System::new_all();
        sys.refresh_memory();
        
        let total_ram_mb = (sys.total_memory() / 1024) as u32;
        let available_ram_mb = (sys.available_memory() / 1024) as u32;
        
        Ok(Capabilities {
            npu_model: "Google Tensor G2 NPU".to_string(),
            npu_tops: 10,
            gpu_model: "Mali-G710 MP7".to_string(),
            gpu_memory_mb: (total_ram_mb as f32 * 0.5) as u32,
            total_ram_mb,
            available_ram_mb,
            supported_quantizations: vec![
                "Q4_K_M".to_string(),
                "Q5_K_M".to_string(),
                "Q6_K".to_string(),
                "Q8_0".to_string(),
            ],
        })
    }
    
    /// Collect current capabilities
    pub fn collect_capabilities(&self) -> Capabilities {
        self.capabilities.clone()
    }
    
    /// Update capabilities from scheduler config
    pub fn update_from_config(&mut self, config: &super::communication::SchedulerConfig) {
        // Handle configuration updates from scheduler
        if let Some(_models) = &config.preferred_models {
            // Could filter supported quantizations based on preferred models
        }
    }
    
    /// Check if device meets minimum requirements for a task
    pub fn can_handle_task(&self, required_ram_mb: u32, required_tops: u32) -> bool {
        self.capabilities.available_ram_mb >= required_ram_mb
            && self.capabilities.npu_tops >= required_tops
    }
    
    /// Get optimal quantization for given constraints
    pub fn select_quantization(&self, max_memory_mb: u32) -> Option<String> {
        // Simple heuristic: choose best quality that fits in memory
        // In production, this would be more sophisticated
        if max_memory_mb >= 4000 {
            Some("Q8_0".to_string())
        } else if max_memory_mb >= 3000 {
            Some("Q6_K".to_string())
        } else if max_memory_mb >= 2500 {
            Some("Q5_K_M".to_string())
        } else {
            Some("Q4_K_M".to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_capability_detection() {
        let config = DaemonConfig::default();
        let registry = CapabilityRegistry::new(&config).unwrap();
        let caps = registry.collect_capabilities();
        
        assert!(caps.total_ram_mb > 0);
        assert!(caps.npu_tops > 0);
        assert!(!caps.supported_quantizations.is_empty());
    }

    #[test]
    fn test_task_capability_check() {
        let config = DaemonConfig::default();
        let registry = CapabilityRegistry::new(&config).unwrap();
        
        // Should be able to handle small tasks
        assert!(registry.can_handle_task(1000, 1));
        
        // Might not handle very large tasks
        assert!(!registry.can_handle_task(100000, 1000));
    }
}
