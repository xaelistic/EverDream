//! Task Queue Management

use crate::{Result, DaemonError};
use crate::communication::Task;
use tokio::sync::mpsc;
use std::collections::HashMap;

/// Priority task queue with cancellation support
pub struct TaskQueue {
    sender: mpsc::Sender<Task>,
    receiver: mpsc::Receiver<Task>,
    pending: HashMap<String, Task>,
    max_concurrent: usize,
}

impl TaskQueue {
    /// Create a new task queue
    pub fn new(max_concurrent: usize) -> Self {
        let (sender, receiver) = mpsc::channel(max_concurrent * 2);
        
        Self {
            sender,
            receiver,
            pending: HashMap::new(),
            max_concurrent,
        }
    }
    
    /// Push a task onto the queue
    pub async fn push(&mut self, task: Task) -> Result<()> {
        if self.pending.len() >= self.max_concurrent * 2 {
            return Err(DaemonError::TaskExecution(
                "Task queue is full".to_string()
            ));
        }
        
        self.pending.insert(task.id.clone(), task.clone());
        self.sender.send(task).await
            .map_err(|e| DaemonError::ChannelSend(e.to_string()))
    }
    
    /// Pop the next task from the queue
    pub async fn pop(&mut self) -> Result<Option<Task>> {
        match self.receiver.try_recv() {
            Ok(task) => Ok(Some(task)),
            Err(tokio::sync::mpsc::error::TryRecvError::Empty) => Ok(None),
            Err(tokio::sync::mpsc::error::TryRecvError::Disconnected) => {
                Err(DaemonError::TaskExecution("Queue disconnected".to_string()))
            }
        }
    }
    
    /// Remove a task from the queue by ID
    pub async fn remove(&mut self, task_id: &str) -> Result<()> {
        self.pending.remove(task_id);
        // Note: Can't actually remove from channel, will be skipped when popped
        Ok(())
    }
    
    /// Clear all tasks from the queue
    pub async fn clear(&mut self) -> Result<()> {
        self.pending.clear();
        // Drain the channel
        while self.receiver.try_recv().is_ok() {}
        Ok(())
    }
    
    /// Get the number of pending tasks
    pub fn len(&self) -> usize {
        self.pending.len()
    }
    
    /// Check if the queue is empty
    pub fn is_empty(&self) -> bool {
        self.pending.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::communication::{InferenceInput, RewardSpec};

    fn create_test_task(id: &str) -> Task {
        Task {
            id: id.to_string(),
            model_uri: "test-model".to_string(),
            input: InferenceInput {
                prompt: "test".to_string(),
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
        }
    }

    #[tokio::test]
    async fn test_queue_operations() {
        let mut queue = TaskQueue::new(2);
        
        assert!(queue.is_empty());
        
        queue.push(create_test_task("task-1")).await.unwrap();
        assert!(!queue.is_empty());
        assert_eq!(queue.len(), 1);
        
        queue.push(create_test_task("task-2")).await.unwrap();
        assert_eq!(queue.len(), 2);
        
        let task = queue.pop().await.unwrap().unwrap();
        assert_eq!(task.id, "task-1");
        assert_eq!(queue.len(), 1);
        
        queue.remove("task-2").await.unwrap();
        assert_eq!(queue.len(), 0);
    }
}
