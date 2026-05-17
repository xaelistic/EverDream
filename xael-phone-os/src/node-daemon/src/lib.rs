//! XAEL Node Daemon - Core Library
//! 
//! Minimalist background service (<50MB RSS) that registers device capabilities,
//! executes AI inference tasks, and generates cryptographic proofs for the DYNA network.

pub mod communication;
pub mod execution;
pub mod crypto;
pub mod registry;

mod config;
mod error;
mod metrics;

pub use config::DaemonConfig;
pub use error::{DaemonError, Result};
pub use metrics::DaemonMetrics;

use tokio::sync::mpsc;
use tracing::{info, warn, error};

/// Node daemon state machine
#[derive(Debug, Clone, PartialEq)]
pub enum DaemonState {
    Initializing,
    Connected,
    Ready,
    Processing,
    Offline,
    Error(String),
}

/// Main daemon instance
pub struct NodeDaemon {
    config: DaemonConfig,
    state: DaemonState,
    node_id: String,
    command_tx: mpsc::Sender<DaemonCommand>,
    command_rx: mpsc::Receiver<DaemonCommand>,
}

/// Commands that can be sent to the daemon
#[derive(Debug)]
pub enum DaemonCommand {
    Start,
    Stop,
    Pause,
    Resume,
    UpdateConfig(DaemonConfig),
    ReportStatus,
}

impl NodeDaemon {
    /// Create a new node daemon instance
    pub fn new(config: DaemonConfig) -> Self {
        let (command_tx, command_rx) = mpsc::channel(32);
        let node_id = generate_node_id();
        
        info!("Initializing XAEL Node Daemon");
        info!("Node ID: {}", node_id);
        
        Self {
            config,
            state: DaemonState::Initializing,
            node_id,
            command_tx,
            command_rx,
        }
    }
    
    /// Get the unique node identifier
    pub fn node_id(&self) -> &str {
        &self.node_id
    }
    
    /// Get current daemon state
    pub fn state(&self) -> &DaemonState {
        &self.state
    }
    
    /// Get a clone of the command sender
    pub fn command_sender(&self) -> mpsc::Sender<DaemonCommand> {
        self.command_tx.clone()
    }
    
    /// Run the daemon main loop
    pub async fn run(&mut self) -> Result<()> {
        info!("Starting daemon main loop");
        self.state = DaemonState::Connected;
        
        // Initialize subsystems
        let mut registry = registry::CapabilityRegistry::new(&self.config)?;
        let mut executor = execution::TaskExecutor::new(&self.config).await?;
        let mut comm_layer = communication::CommunicationLayer::connect(&self.config).await?;
        
        // Register capabilities with DYNA scheduler
        let capabilities = registry.collect_capabilities();
        comm_layer.register_capabilities(&self.node_id, &capabilities).await?;
        
        self.state = DaemonState::Ready;
        info!("Daemon ready, waiting for tasks");
        
        // Main event loop
        loop {
            tokio::select! {
                Some(command) = self.command_rx.recv() => {
                    match command {
                        DaemonCommand::Stop => {
                            info!("Received stop command, shutting down");
                            break;
                        }
                        DaemonCommand::Pause => {
                            warn!("Daemon paused");
                            self.state = DaemonState::Offline;
                        }
                        DaemonCommand::Resume => {
                            info!("Daemon resumed");
                            self.state = DaemonState::Ready;
                        }
                        DaemonCommand::UpdateConfig(new_config) => {
                            self.config = new_config;
                            info!("Configuration updated");
                        }
                        DaemonCommand::ReportStatus => {
                            let status = self.get_status(&registry, &executor);
                            comm_layer.send_status_update(&status).await?;
                        }
                        _ => {}
                    }
                }
                
                task_result = executor.next_task() => {
                    match task_result {
                        Ok(Some(task)) => {
                            self.state = DaemonState::Processing;
                            
                            // Execute task
                            let result = executor.execute(task).await?;
                            
                            // Generate cryptographic proof
                            let proof = crypto::ProofGenerator::generate_proof(
                                &result,
                                &self.node_id,
                            )?;
                            
                            // Submit result with proof
                            comm_layer.submit_result(result, proof).await?;
                            
                            self.state = DaemonState::Ready;
                        }
                        Ok(None) => {
                            // No tasks available, continue waiting
                        }
                        Err(e) => {
                            error!("Task execution error: {}", e);
                            // Continue processing other tasks
                        }
                    }
                }
                
                message = comm_layer.receive_message() => {
                    match message {
                        Ok(Some(msg)) => {
                            // Handle incoming messages from scheduler
                            self.handle_scheduler_message(msg, &mut registry, &mut executor).await?;
                        }
                        Ok(None) => {
                            // Connection closed
                            warn!("Connection to scheduler closed");
                            self.state = DaemonState::Offline;
                        }
                        Err(e) => {
                            error!("Message receive error: {}", e);
                        }
                    }
                }
            }
        }
        
        // Cleanup
        comm_layer.disconnect().await?;
        executor.shutdown().await?;
        
        self.state = DaemonState::Offline;
        info!("Daemon shutdown complete");
        
        Ok(())
    }
    
    /// Get current daemon status
    fn get_status(
        &self,
        registry: &registry::CapabilityRegistry,
        executor: &execution::TaskExecutor,
    ) -> DaemonStatus {
        DaemonStatus {
            node_id: self.node_id.clone(),
            state: self.state.clone(),
            capabilities: registry.collect_capabilities(),
            active_tasks: executor.active_task_count(),
            completed_tasks: executor.completed_task_count(),
            uptime_seconds: 0, // TODO: track uptime
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }
    
    /// Handle messages from the DYNA scheduler
    async fn handle_scheduler_message(
        &self,
        message: communication::SchedulerMessage,
        registry: &mut registry::CapabilityRegistry,
        executor: &mut execution::TaskExecutor,
    ) -> Result<()> {
        match message {
            communication::SchedulerMessage::NewTask(task) => {
                info!("Received new task: {}", task.id);
                executor.queue_task(task).await?;
            }
            communication::SchedulerMessage::CancelTask(task_id) => {
                info!("Task cancelled: {}", task_id);
                executor.cancel_task(&task_id).await?;
            }
            communication::SchedulerMessage::ConfigUpdate(config) => {
                info!("Received configuration update");
                registry.update_from_config(&config);
            }
            communication::SchedulerMessage::Shutdown => {
                warn!("Scheduler requested shutdown");
                // Graceful shutdown handling
            }
        }
        
        Ok(())
    }
}

/// Daemon status report
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DaemonStatus {
    pub node_id: String,
    pub state: DaemonState,
    pub capabilities: registry::Capabilities,
    pub active_tasks: usize,
    pub completed_tasks: u64,
    pub uptime_seconds: u64,
    pub timestamp: i64,
}

/// Generate a unique node ID from hardware identifiers
fn generate_node_id() -> String {
    // In production, this would use Android's Android ID or hardware-backed identifier
    // For now, generate a random UUID-like string
    format!(
        "xaeld-{:08x}-{:04x}-{:04x}-{:04x}-{:012x}",
        rand::random::<u32>(),
        rand::random::<u16>(),
        rand::random::<u16>(),
        rand::random::<u16>(),
        rand::random::<u64>()
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_node_id_generation() {
        let id1 = generate_node_id();
        let id2 = generate_node_id();
        assert_ne!(id1, id2);
        assert!(id1.starts_with("xaeld-"));
    }
    
    #[tokio::test]
    async fn test_daemon_creation() {
        let config = DaemonConfig::default();
        let daemon = NodeDaemon::new(config);
        assert_eq!(daemon.state(), &DaemonState::Initializing);
    }
}
