//! XAEL Node Daemon - Error Types

use thiserror::Error;

/// Result type alias for daemon operations
pub type Result<T> = std::result::Result<T, DaemonError>;

/// All possible errors in the node daemon
#[derive(Error, Debug)]
pub enum DaemonError {
    #[error("Configuration error: {0}")]
    Configuration(String),

    #[error("Network error: {0}")]
    Network(String),

    #[error("Cryptographic error: {0}")]
    Cryptography(String),

    #[error("Task execution error: {0}")]
    TaskExecution(String),

    #[error("TEE/StrongBox error: {0}")]
    TeeError(String),

    #[error("Hardware detection error: {0}")]
    HardwareDetection(String),

    #[error("Model loading error: {0}")]
    ModelLoading(String),

    #[error("Inference error: {0}")]
    Inference(String),

    #[error("Settlement error: {0}")]
    Settlement(String),

    #[error("Protocol error: {0}")]
    Protocol(String),

    #[error("Timeout: {0}")]
    Timeout(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Channel send error: {0}")]
    ChannelSend(String),

    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl From<tokio::sync::mpsc::error::SendError<crate::DaemonCommand>> for DaemonError {
    fn from(err: tokio::sync::mpsc::error::SendError<crate::DaemonCommand>) -> Self {
        DaemonError::ChannelSend(err.to_string())
    }
}

// Helper macros for creating errors
#[macro_export]
macro_rules! config_err {
    ($($arg:tt)*) => {
        $crate::error::DaemonError::Configuration(format!($($arg)*))
    };
}

#[macro_export]
macro_rules! network_err {
    ($($arg:tt)*) => {
        $crate::error::DaemonError::Network(format!($($arg)*))
    };
}

#[macro_export]
macro_rules! crypto_err {
    ($($arg:tt)*) => {
        $crate::error::DaemonError::Cryptography(format!($($arg)*))
    };
}

#[macro_export]
macro_rules! task_err {
    ($($arg:tt)*) => {
        $crate::error::DaemonError::TaskExecution(format!($($arg)*))
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = DaemonError::Configuration("invalid value".to_string());
        assert_eq!(format!("{}", err), "Configuration error: invalid value");

        let err = DaemonError::Network("connection failed".to_string());
        assert_eq!(format!("{}", err), "Network error: connection failed");
    }

    #[test]
    fn test_error_from_io() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let daemon_err: DaemonError = io_err.into();
        
        match daemon_err {
            DaemonError::Io(e) => {
                assert_eq!(e.kind(), std::io::ErrorKind::NotFound);
            }
            _ => panic!("Expected Io error"),
        }
    }
}
