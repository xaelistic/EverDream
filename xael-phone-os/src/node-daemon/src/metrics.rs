//! Daemon Metrics and Monitoring

use serde::{Deserialize, Serialize};

/// Metrics collected by the daemon
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaemonMetrics {
    /// Memory usage in MB
    pub memory_mb: u32,
    
    /// CPU usage percentage
    pub cpu_percent: f32,
    
    /// Number of tasks completed
    pub tasks_completed: u64,
    
    /// Number of tasks failed
    pub tasks_failed: u64,
    
    /// Average inference time in ms
    pub avg_inference_time_ms: f64,
    
    /// Total tokens generated
    pub total_tokens_generated: u64,
    
    /// Total earnings (in token base units)
    pub total_earnings: u64,
    
    /// Uptime in seconds
    pub uptime_seconds: u64,
    
    /// Network bytes sent
    pub network_bytes_sent: u64,
    
    /// Network bytes received
    pub network_bytes_received: u64,
}

impl Default for DaemonMetrics {
    fn default() -> Self {
        Self::new()
    }
}

impl DaemonMetrics {
    /// Create new metrics with zero values
    pub fn new() -> Self {
        Self {
            memory_mb: 0,
            cpu_percent: 0.0,
            tasks_completed: 0,
            tasks_failed: 0,
            avg_inference_time_ms: 0.0,
            total_tokens_generated: 0,
            total_earnings: 0,
            uptime_seconds: 0,
            network_bytes_sent: 0,
            network_bytes_received: 0,
        }
    }
    
    /// Record a completed task
    pub fn record_task_completion(&mut self, inference_time_ms: u64, tokens: u32) {
        self.tasks_completed += 1;
        self.total_tokens_generated += tokens as u64;
        
        // Update running average for inference time
        let n = self.tasks_completed as f64;
        self.avg_inference_time_ms = 
            (self.avg_inference_time_ms * (n - 1.0) + inference_time_ms as f64) / n;
    }
    
    /// Record a failed task
    pub fn record_task_failure(&mut self) {
        self.tasks_failed += 1;
    }
    
    /// Record earnings
    pub fn record_earnings(&mut self, amount: u64) {
        self.total_earnings += amount;
    }
    
    /// Get success rate as percentage
    pub fn success_rate(&self) -> f64 {
        let total = self.tasks_completed + self.tasks_failed;
        if total == 0 {
            return 100.0;
        }
        (self.tasks_completed as f64 / total as f64) * 100.0
    }
    
    /// Get tokens per second average
    pub fn tokens_per_second(&self) -> f64 {
        if self.avg_inference_time_ms == 0.0 {
            return 0.0;
        }
        (self.total_tokens_generated as f64 / self.tasks_completed as f64) 
            / (self.avg_inference_time_ms / 1000.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_recording() {
        let mut metrics = DaemonMetrics::new();
        
        assert_eq!(metrics.tasks_completed, 0);
        assert_eq!(metrics.success_rate(), 100.0);
        
        metrics.record_task_completion(100, 50);
        assert_eq!(metrics.tasks_completed, 1);
        assert_eq!(metrics.avg_inference_time_ms, 100.0);
        assert_eq!(metrics.total_tokens_generated, 50);
        
        metrics.record_task_completion(200, 30);
        assert_eq!(metrics.tasks_completed, 2);
        assert!((metrics.avg_inference_time_ms - 150.0).abs() < 0.01);
        
        metrics.record_task_failure();
        assert_eq!(metrics.tasks_failed, 1);
        assert!((metrics.success_rate() - 66.67).abs() < 0.1);
    }

    #[test]
    fn test_earnings_tracking() {
        let mut metrics = DaemonMetrics::new();
        
        metrics.record_earnings(1000);
        metrics.record_earnings(500);
        
        assert_eq!(metrics.total_earnings, 1500);
    }
}
