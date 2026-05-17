//! Communication Layer - DYNA Scheduler Integration

use crate::{DaemonConfig, DaemonError, Result};
use serde::{Deserialize, Serialize};

mod websocket;
mod grpc_client;

pub use websocket::WebSocketClient;
pub use grpc_client::GrpcClient;

/// Messages received from the scheduler
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SchedulerMessage {
    #[serde(rename = "new_task")]
    NewTask(Task),
    
    #[serde(rename = "cancel_task")]
    CancelTask(String),
    
    #[serde(rename = "config_update")]
    ConfigUpdate(SchedulerConfig),
    
    #[serde(rename = "shutdown")]
    Shutdown,
}

/// Task definition from scheduler
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub model_uri: String,
    pub input: InferenceInput,
    pub timeout_seconds: u32,
    pub reward: RewardSpec,
}

/// Inference task input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceInput {
    pub prompt: String,
    pub max_tokens: u32,
    pub temperature: f32,
    pub top_p: f32,
}

/// Reward specification for a task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RewardSpec {
    pub base_amount: u64,
    pub token_symbol: String,
    pub bonus_multipliers: BonusMultipliers,
}

/// Bonus multipliers for ethical weighting
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BonusMultipliers {
    pub sustainability: f32,
    pub ppp_adjustment: f32,
    pub reputation_bonus: f32,
}

/// Configuration update from scheduler
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchedulerConfig {
    pub max_concurrent_tasks: Option<usize>,
    pub preferred_models: Option<Vec<String>>,
    pub region_priority: Option<String>,
}

/// Inference output result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceOutput {
    pub task_id: String,
    pub generated_text: String,
    pub tokens_generated: u32,
    pub inference_time_ms: u64,
    pub model_hash: String,
}

/// Cryptographic proof of execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CryptographicProof {
    pub signature: String,
    pub attestation: String,
    pub timestamp: i64,
    pub node_id: String,
}

/// Hardware capability report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityReport {
    pub node_id: String,
    pub hardware: HardwareSpecs,
    pub availability: ResourceAvailability,
    pub timestamp: i64,
}

/// Hardware specifications
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareSpecs {
    pub npu_model: String,
    pub npu_tops: u32,
    pub gpu_model: String,
    pub gpu_memory_mb: u32,
    pub total_ram_mb: u32,
    pub supported_quantizations: Vec<String>,
}

/// Resource availability status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceAvailability {
    pub available_ram_mb: u32,
    pub battery_percent: u8,
    pub is_charging: bool,
    pub network_type: NetworkType,
    pub thermal_state: ThermalState,
}

/// Network connection type
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum NetworkType {
    Wifi,
    Cellular4G,
    Cellular5G,
    Ethernet,
    Unknown,
}

/// Device thermal state
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum ThermalState {
    Nominal,
    Fair,
    Serious,
    Critical,
}

/// Communication layer manager
pub struct CommunicationLayer {
    websocket: WebSocketClient,
    grpc_client: GrpcClient,
    config: DaemonConfig,
}

impl CommunicationLayer {
    /// Connect to the DYNA scheduler
    pub async fn connect(config: &DaemonConfig) -> Result<Self> {
        let websocket = WebSocketClient::connect(&config.scheduler_url).await?;
        let grpc_client = GrpcClient::connect(&config.grpc_endpoint).await?;
        
        Ok(Self {
            websocket,
            grpc_client,
            config: config.clone(),
        })
    }
    
    /// Register node capabilities with scheduler
    pub async fn register_capabilities(
        &mut self,
        node_id: &str,
        capabilities: &crate::registry::Capabilities,
    ) -> Result<()> {
        let report = self.build_capability_report(node_id, capabilities);
        self.websocket.send_register(report).await
    }
    
    /// Send status update to scheduler
    pub async fn send_status_update(&mut self, status: &crate::DaemonStatus) -> Result<()> {
        self.websocket.send_status(status).await
    }
    
    /// Submit task result with cryptographic proof
    pub async fn submit_result(
        &mut self,
        output: InferenceOutput,
        proof: CryptographicProof,
    ) -> Result<()> {
        self.grpc_client.submit_proof(output, proof).await
    }
    
    /// Receive messages from scheduler
    pub async fn receive_message(&mut self) -> Result<Option<SchedulerMessage>> {
        self.websocket.receive().await
    }
    
    /// Disconnect from scheduler
    pub async fn disconnect(&mut self) -> Result<()> {
        self.websocket.close().await?;
        self.grpc_client.disconnect().await?;
        Ok(())
    }
    
    fn build_capability_report(
        &self,
        node_id: &str,
        capabilities: &crate::registry::Capabilities,
    ) -> CapabilityReport {
        CapabilityReport {
            node_id: node_id.to_string(),
            hardware: HardwareSpecs {
                npu_model: capabilities.npu_model.clone(),
                npu_tops: capabilities.npu_tops,
                gpu_model: capabilities.gpu_model.clone(),
                gpu_memory_mb: capabilities.gpu_memory_mb,
                total_ram_mb: capabilities.total_ram_mb,
                supported_quantizations: capabilities.supported_quantizations.clone(),
            },
            availability: ResourceAvailability {
                available_ram_mb: capabilities.available_ram_mb,
                battery_percent: 100, // TODO: get actual battery level
                is_charging: true,     // TODO: get actual charging state
                network_type: NetworkType::Wifi, // TODO: detect actual network
                thermal_state: ThermalState::Nominal, // TODO: get actual thermal state
            },
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_serialization() {
        let task = Task {
            id: "test-123".to_string(),
            model_uri: "llama-3-8b-q4".to_string(),
            input: InferenceInput {
                prompt: "Hello".to_string(),
                max_tokens: 100,
                temperature: 0.7,
                top_p: 0.9,
            },
            timeout_seconds: 30,
            reward: RewardSpec {
                base_amount: 1000,
                token_symbol: "XAEL".to_string(),
                bonus_multipliers: BonusMultipliers::default(),
            },
        };
        
        let json = serde_json::to_string(&task).unwrap();
        assert!(json.contains("test-123"));
    }
}
