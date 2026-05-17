//! Task Execution Engine

use crate::{DaemonConfig, Result, DaemonError};
use tokio::sync::mpsc;

mod task_queue;
mod resource_allocator;
mod inference_engine;

pub use task_queue::TaskQueue;
pub use resource_allocator::ResourceAllocator;
pub use inference_engine::InferenceEngine;

/// Task execution engine
pub struct TaskExecutor {
    config: DaemonConfig,
    queue: TaskQueue,
    allocator: ResourceAllocator,
    engine: InferenceEngine,
    completed_count: u64,
}

impl TaskExecutor {
    /// Create a new task executor
    pub async fn new(config: &DaemonConfig) -> Result<Self> {
        let queue = TaskQueue::new(config.node.max_concurrent_tasks);
        let allocator = ResourceAllocator::new(&config.resources)?;
        let engine = InferenceEngine::new(config).await?;
        
        Ok(Self {
            config: config.clone(),
            queue,
            allocator,
            engine,
            completed_count: 0,
        })
    }
    
    /// Queue a task for execution
    pub async fn queue_task(&mut self, task: super::communication::Task) -> Result<()> {
        self.queue.push(task).await
    }
    
    /// Cancel a queued task
    pub async fn cancel_task(&mut self, task_id: &str) -> Result<()> {
        self.queue.remove(task_id).await
    }
    
    /// Get the next task to execute
    pub async fn next_task(&mut self) -> Result<Option<super::communication::Task>> {
        self.queue.pop().await
    }
    
    /// Execute a task and return the result
    pub async fn execute(&mut self, task: super::communication::Task) -> Result<super::communication::InferenceOutput> {
        // Check resource availability
        if !self.allocator.can_allocate(&task) {
            return Err(DaemonError::TaskExecution(
                "Insufficient resources for task".to_string()
            ));
        }
        
        // Allocate resources
        let _allocation = self.allocator.allocate(&task)?;
        
        // Execute inference
        let output = self.engine.run_inference(&task).await?;
        
        self.completed_count += 1;
        
        Ok(output)
    }
    
    /// Get count of active tasks
    pub fn active_task_count(&self) -> usize {
        self.queue.len()
    }
    
    /// Get count of completed tasks
    pub fn completed_task_count(&self) -> u64 {
        self.completed_count
    }
    
    /// Shutdown the executor
    pub async fn shutdown(&mut self) -> Result<()> {
        self.engine.shutdown().await?;
        self.queue.clear().await;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::communication::{Task, InferenceInput, RewardSpec};

    #[tokio::test]
    async fn test_executor_creation() {
        let config = DaemonConfig::default();
        let executor = TaskExecutor::new(&config).await.unwrap();
        assert_eq!(executor.active_task_count(), 0);
        assert_eq!(executor.completed_task_count(), 0);
    }

    #[tokio::test]
    async fn test_task_queueing() {
        let config = DaemonConfig::default();
        let mut executor = TaskExecutor::new(&config).await.unwrap();
        
        let task = Task {
            id: "test-1".to_string(),
            model_uri: "llama-3-8b-q4".to_string(),
            input: InferenceInput {
                prompt: "Hello".to_string(),
                max_tokens: 10,
                temperature: 0.7,
                top_p: 0.9,
            },
            timeout_seconds: 30,
            reward: RewardSpec {
                base_amount: 100,
                token_symbol: "XAEL".to_string(),
                bonus_multipliers: Default::default(),
            },
        };
        
        executor.queue_task(task.clone()).await.unwrap();
        assert_eq!(executor.active_task_count(), 1);
        
        let popped = executor.next_task().await.unwrap();
        assert!(popped.is_some());
        assert_eq!(popped.unwrap().id, "test-1");
        assert_eq!(executor.active_task_count(), 0);
    }
}
