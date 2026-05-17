//! Resource Allocation Manager

use crate::{Result, DaemonError, ResourceConfig};
use crate::communication::Task;

/// Manages resource allocation for tasks
pub struct ResourceAllocator {
    config: ResourceConfig,
    allocated_memory_mb: usize,
    active_tasks: usize,
}

impl ResourceAllocator {
    /// Create a new resource allocator
    pub fn new(config: &ResourceConfig) -> Result<Self> {
        if config.max_memory_mb > 100 {
            return Err(DaemonError::Configuration(
                "max_memory_mb must be <= 100 for <50MB RSS target".to_string()
            ));
        }
        
        Ok(Self {
            config: config.clone(),
            allocated_memory_mb: 0,
            active_tasks: 0,
        })
    }
    
    /// Check if resources can be allocated for a task
    pub fn can_allocate(&self, task: &Task) -> bool {
        // Estimate memory needed based on task parameters
        let estimated_memory = self.estimate_memory_for_task(task);
        
        // Check memory constraints
        if self.allocated_memory_mb + estimated_memory > self.config.max_memory_mb {
            return false;
        }
        
        // Check concurrent task limits
        if self.active_tasks >= self.config.max_cpu_percent as usize / 10 {
            return false;
        }
        
        true
    }
    
    /// Allocate resources for a task
    pub fn allocate(&mut self, task: &Task) -> Result<ResourceAllocation> {
        if !self.can_allocate(task) {
            return Err(DaemonError::TaskExecution(
                "Insufficient resources".to_string()
            ));
        }
        
        let memory = self.estimate_memory_for_task(task);
        self.allocated_memory_mb += memory;
        self.active_tasks += 1;
        
        Ok(ResourceAllocation {
            memory_mb: memory,
            _task_id: task.id.clone(),
        })
    }
    
    /// Release resources when a task completes
    pub fn release(&mut self, allocation: ResourceAllocation) {
        self.allocated_memory_mb = self.allocated_memory_mb.saturating_sub(allocation.memory_mb);
        self.active_tasks = self.active_tasks.saturating_sub(1);
    }
    
    /// Estimate memory needed for a task (in MB)
    fn estimate_memory_for_task(&self, task: &Task) -> usize {
        // Rough estimation based on model quantization and context size
        // Q4 models need ~4-5GB for 7B model, but we're estimating daemon overhead
        // This is the additional memory the daemon needs, not total model memory
        
        let base_overhead = 10; // Base daemon overhead per task
        let context_memory = task.input.max_tokens as usize / 100; // ~10KB per 100 tokens
        
        base_overhead + context_memory
    }
    
    /// Get current resource utilization
    pub fn utilization(&self) -> ResourceUtilization {
        ResourceUtilization {
            memory_used_mb: self.allocated_memory_mb,
            memory_max_mb: self.config.max_memory_mb,
            active_tasks: self.active_tasks,
            memory_percent: (self.allocated_memory_mb as f32 / self.config.max_memory_mb as f32 * 100.0) as u8,
        }
    }
}

/// Represents an active resource allocation
pub struct ResourceAllocation {
    memory_mb: usize,
    _task_id: String,
}

/// Current resource utilization metrics
pub struct ResourceUtilization {
    pub memory_used_mb: usize,
    pub memory_max_mb: usize,
    pub active_tasks: usize,
    pub memory_percent: u8,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::communication::{InferenceInput, RewardSpec};

    fn create_test_task(max_tokens: u32) -> Task {
        Task {
            id: "test".to_string(),
            model_uri: "test-model".to_string(),
            input: InferenceInput {
                prompt: "test".to_string(),
                max_tokens,
                temperature: 0.7,
                top_p: 0.9,
            },
            timeout_seconds: 30,
            reward: RewardSpec {
                base_amount: 100,
                token_symbol: "XAEL".to_string(),
                bonus_multipliers: Default::default(),
            },
        }
    }

    #[test]
    fn test_allocator_creation() {
        let config = ResourceConfig::default();
        let allocator = ResourceAllocator::new(&config).unwrap();
        assert_eq!(allocator.allocated_memory_mb, 0);
    }

    #[test]
    fn test_resource_allocation() {
        let mut config = ResourceConfig::default();
        config.max_memory_mb = 50;
        
        let mut allocator = ResourceAllocator::new(&config).unwrap();
        let task = create_test_task(100);
        
        assert!(allocator.can_allocate(&task));
        
        let allocation = allocator.allocate(&task).unwrap();
        assert!(allocation.memory_mb > 0);
        
        let util = allocator.utilization();
        assert_eq!(util.active_tasks, 1);
        assert!(util.memory_percent > 0);
        
        allocator.release(allocation);
        assert_eq!(allocator.utilization().active_tasks, 0);
    }

    #[test]
    fn test_resource_exhaustion() {
        let mut config = ResourceConfig::default();
        config.max_memory_mb = 20;
        
        let mut allocator = ResourceAllocator::new(&config).unwrap();
        let task = create_test_task(1000); // Large context
        
        // First allocation should succeed
        assert!(allocator.can_allocate(&task));
        let _alloc = allocator.allocate(&task).unwrap();
        
        // Second should fail due to memory exhaustion
        assert!(!allocator.can_allocate(&task));
    }
}
