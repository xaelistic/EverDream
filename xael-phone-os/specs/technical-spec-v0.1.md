# XAEL Phone OS - Technical Specification

## Version: 0.1.0-alpha
## Date: 2026-05-17
## Status: Draft

---

## 1. Executive Summary

XAEL Phone OS is a minimal Android fork designed to transform mobile devices into DYNA compute nodes. The system prioritizes AI inference workloads during device idle states while maintaining user privacy and providing transparent economic rewards.

### Key Metrics
- **Node Daemon Size**: <50MB memory footprint
- **Model Support**: GGUF quantized models (3-4bit)
- **Target Devices**: Pixel 6/7/8, Samsung A-series, Fairphone 4/5
- **Security**: TEE-backed proofs via Android StrongBox

---

## 2. System Architecture

### 2.1 Layer Overview

```
┌─────────────────────────────────────────────────────────┐
│                    UI/UX Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   Status    │  │  Earnings   │  │    Consent      │ │
│  │ Indicator   │  │  Dashboard  │  │    Controls     │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────┤
│              Settlement Module                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   DYNA      │  │   XAEL.*    │  │    Ethical      │ │
│  │   Escrow    │  │   Minting   │  │   Weighting     │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────┤
│               Node Daemon (<50MB)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Capability  │  │    Task     │  │   Cryptographic │ │
│  │  Registry   │  │  Executor   │  │     Proofs      │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                  Runtime Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   MLC-LLM   │  │    GGUF     │  │    Dynamic      │ │
│  │   Engine    │  │   Loader    │  │ Model Swapping  │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                  Kernel Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Energy-Aware│  │   NNAPI++   │  │   NPU Control   │ │
│  │ Scheduler   │  │ Extensions  │  │    Interface    │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Kernel Layer Specifications

### 3.1 Energy-Aware Scheduler (EAS) Modifications

**Objective**: Prioritize inference tasks during idle states without impacting user experience.

#### Implementation Details

```c
// Pseudo-code for EAS modification
struct xael_eas_params {
    u64 inference_boost_threshold;    // CPU load threshold for boost
    u64 idle_detection_window_ms;     // Time window to detect idle
    u64 npu_priority_boost;           // NPU priority multiplier
    bool user_task_preemption;        // Always preempt for user tasks
};

int xael_eas_select_task(struct rq *rq)
{
    if (is_user_interactive()) {
        return select_user_task();
    }
    
    if (is_device_idle() && has_inference_tasks()) {
        return select_inference_task_with_npu_boost();
    }
    
    return default_eas_select(rq);
}
```

#### Key Parameters
| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| `inference_boost_threshold` | 30% | CPU load below which inference is boosted |
| `idle_detection_window_ms` | 500ms | Time window for idle detection |
| `npu_priority_boost` | 2x | Priority multiplier for NPU tasks |
| `user_task_preemption` | true | Always preempt for user interaction |

### 3.2 NNAPI++ Extensions

**Objective**: Fine-grained NPU control for efficient inference scheduling.

#### New APIs

```cpp
// Extended NNAPI interface
class NNAPIPlusPlus {
public:
    // Set NPU power budget (mW)
    ANeuralNetworks_setNPUPowerBudget(ANeuralNetworks* nn, int32_t budget_mw);
    
    // Schedule inference at specific time window
    ANeuralNetworks_scheduleInferenceWindow(ANeuralNetworks* nn, 
                                            uint64_t start_ms, 
                                            uint64_t duration_ms);
    
    // Query NPU thermal state
    ANeuralNetworks_getNPUThermalState(ANeuralNetworks* nn, 
                                       ThermalState* out_state);
    
    // Dynamic model loading with priority
    ANeuralNetworks_loadModelWithPriority(ANeuralNetworks* nn,
                                          const Model* model,
                                          PriorityLevel priority);
};

enum class PriorityLevel {
    LOW = 0,      // Background tasks
    NORMAL = 1,   // Standard inference
    HIGH = 2,     // Time-sensitive tasks
    CRITICAL = 3  // User-facing inference
};
```

---

## 4. Runtime Layer Specifications

### 4.1 MLC-LLM Integration

**Objective**: Bundle MLC-LLM runtime with hardware-aware kernel selection.

#### Supported Models
- Llama 3 (8B, 70B quantized)
- Phi-3 Mini/Medium
- Gemma 2B/7B
- Mistral 7B
- Custom fine-tunes (GGUF format)

#### Configuration
```json
{
  "runtime": {
    "mlc_llm": {
      "version": "0.2.0",
      "backend": "vulkan",
      "quantization": "q4f16_ft",
      "max_context_length": 4096,
      "gpu_memory_fraction": 0.7
    },
    "gguf": {
      "supported_versions": ["v3"],
      "preferred_quantizations": ["Q4_K_M", "Q5_K_M", "Q6_K"],
      "memory_mapping": true
    },
    "model_swapping": {
      "cache_size_mb": 512,
      "preload_models": 1,
      "lazy_loading": true
    }
  }
}
```

### 4.2 Dynamic Model Swapping Engine

**Objective**: Efficiently swap models based on task requirements without blocking inference.

```rust
// Pseudo-Rust for model manager
pub struct ModelManager {
    cache: LRUCache<String, LoadedModel>,
    active_model: Option<LoadedModel>,
    pending_requests: VecDeque<ModelRequest>,
}

impl ModelManager {
    pub async fn load_model(&mut self, model_id: &str, priority: Priority) -> Result<()> {
        if self.cache.contains(model_id) {
            self.promote_to_active(model_id).await?;
            return Ok(());
        }
        
        if self.cache.is_full() {
            self.evict_lowest_priority().await?;
        }
        
        let model = self.download_and_load(model_id).await?;
        self.cache.insert(model_id.to_string(), model);
        Ok(())
    }
    
    pub async fn execute_inference(&mut self, request: InferenceRequest) -> Result<Output> {
        self.ensure_model_loaded(&request.model_id, request.priority).await?;
        let model = self.get_active_model(&request.model_id)?;
        model.generate(request.prompt, request.max_tokens).await
    }
}
```

---

## 5. Node Daemon Specifications

### 5.1 Architecture

**Size Constraint**: <50MB resident memory

```
┌──────────────────────────────────────────┐
│           Node Daemon                    │
│  ┌────────────────────────────────────┐  │
│  │       Communication Layer          │  │
│  │  - DYNA Scheduler WebSocket        │  │
│  │  - gRPC for proofs                 │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │        Task Execution Engine       │  │
│  │  - Task queue management           │  │
│  │  - Resource allocation             │  │
│  │  - Timeout handling                │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │      Cryptographic Proof Module    │  │
│  │  - TEE integration (StrongBox)     │  │
│  │  - Signature generation            │  │
│  │  - Proof verification              │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │       Capability Registry          │  │
│  │  - NPU availability                │  │
│  │  - GPU specs                       │  │
│  │  - Memory constraints              │  │
│  │  - Network status                  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### 5.2 Communication Protocol

```protobuf
// node_daemon.proto
syntax = "proto3";

package xael.node;

message CapabilityReport {
    string node_id = 1;
    HardwareSpecs hardware = 2;
    ResourceAvailability availability = 3;
    int64 timestamp = 4;
}

message HardwareSpecs {
    string npu_model = 1;
    int32 npu_tops = 2;
    string gpu_model = 3;
    int32 gpu_memory_mb = 4;
    int32 total_ram_mb = 5;
    repeated string supported_quantizations = 6;
}

message TaskRequest {
    string task_id = 1;
    string model_uri = 2;
    InferenceInput input = 3;
    int32 timeout_seconds = 4;
    RewardSpec reward = 5;
}

message TaskResult {
    string task_id = 1;
    oneof result {
        InferenceOutput output = 2;
        ErrorInfo error = 3;
    }
    CryptographicProof proof = 4;
}

message CryptographicProof {
    bytes signature = 1;
    bytes attestation = 2;
    int64 timestamp = 3;
    string node_id = 4;
}
```

### 5.3 TEE Integration (Android StrongBox)

```kotlin
// Kotlin for StrongBox integration
class TeeProofGenerator(private val strongBox: StrongBoxKeyManager) {
    
    data class ProofInput(
        val taskId: String,
        val inputHash: ByteArray,
        val outputHash: ByteArray,
        val executionTimeMs: Long,
        val nodeId: String
    )
    
    suspend fun generateProof(input: ProofInput): CryptographicProof {
        val payload = buildProofPayload(input)
        val signature = strongBox.sign(payload)
        val attestation = strongBox.attest(signature)
        
        return CryptographicProof(
            signature = signature,
            attestation = attestation,
            timestamp = System.currentTimeMillis(),
            nodeId = input.nodeId
        )
    }
    
    private fun buildProofPayload(input: ProofInput): ByteArray {
        return ByteArrayOutputStream().apply {
            write(input.taskId.encodeToByteArray())
            write(input.inputHash)
            write(input.outputHash)
            writeLong(input.executionTimeMs)
            write(input.nodeId.encodeToByteArray())
        }.toByteArray()
    }
}
```

---

## 6. Settlement Module Specifications

### 6.1 DYNA Escrow Integration

**Smart Contract Interface**:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDYNAEscrow {
    struct TaskEscrow {
        address client;
        uint256 stakeAmount;
        bytes32 taskHash;
        uint256 deadline;
        bool completed;
    }
    
    function createEscrow(
        bytes32 taskHash,
        uint256 stakeAmount,
        uint256 deadline
    ) external returns (uint256 escrowId);
    
    function submitProof(
        uint256 escrowId,
        bytes calldata proof,
        bytes calldata output
    ) external;
    
    function claimReward(uint256 escrowId) external;
    
    function dispute(uint256 escrowId, bytes calldata evidence) external;
}
```

### 6.2 XAEL.* Minting Logic

**Ethical Weighting Formula**:

```
Final Reward = Base Reward × Sustainability Factor × PPP Factor × Individual Bonus

Where:
- Sustainability Factor = f(device_repairability, energy_source, device_age)
- PPP Factor = cost_of_local_basket / cost_of_reference_basket
- Individual Bonus = reputation_score × consistency_multiplier
```

#### Implementation

```rust
pub struct EthicalWeightCalculator {
    sustainability_weights: SustainabilityWeights,
    ppp_data: HashMap<String, Decimal>,
    reputation_service: ReputationService,
}

pub struct SustainabilityWeights {
    repairability_score: Decimal,    // 0.0 - 1.0 (Fairphone = 1.0)
    renewable_energy_ratio: Decimal, // 0.0 - 1.0
    device_longevity_bonus: Decimal, // Years beyond expected life
}

impl EthicalWeightCalculator {
    pub fn calculate_final_reward(
        &self,
        base_reward: Decimal,
        sustainability: SustainabilityWeights,
        region_code: &str,
        node_id: &str,
    ) -> Decimal {
        let sustainability_factor = self.calc_sustainability_factor(sustainability);
        let ppp_factor = self.get_ppp_factor(region_code);
        let individual_bonus = self.get_individual_bonus(node_id);
        
        base_reward * sustainability_factor * ppp_factor * individual_bonus
    }
    
    fn calc_sustainability_factor(&self, weights: SustainabilityWeights) -> Decimal {
        // Fairphone or highly repairable devices get up to 1.5x
        let repairability_multiplier = dec!(1.0) + (weights.repairability_score * dec!(0.5));
        
        // Renewable energy gets up to 1.3x
        let energy_multiplier = dec!(1.0) + (weights.renewable_energy_ratio * dec!(0.3));
        
        // Device longevity gets up to 1.2x
        let longevity_multiplier = dec!(1.0) + (weights.device_longevity_bonus.min(dec!(2.0)) * dec!(0.1));
        
        repairability_multiplier * energy_multiplier * longevity_multiplier
    }
}
```

### 6.3 Reputation System

```rust
pub struct ReputationSystem {
    min_trust_score: u32,      // Below this = slashing risk
    max_trust_score: u32,      // Caps at 1000
    decay_rate: Decimal,       // Monthly decay if inactive
}

impl ReputationSystem {
    pub fn update_score(&mut self, node_id: &str, outcome: TaskOutcome) {
        let current_score = self.get_score(node_id);
        
        let new_score = match outcome {
            TaskOutcome::ValidProof => {
                current_score + self.calculate_positive_delta(current_score)
            },
            TaskOutcome::InvalidProof => {
                // Slashing: significant penalty
                current_score.saturating_sub(200)
            },
            TaskOutcome::Timeout => {
                current_score.saturating_sub(50)
            },
            TaskOutcome::Disputed => {
                // Pending resolution, no change
                current_score
            }
        };
        
        self.set_score(node_id, new_score.clamp(0, self.max_trust_score));
    }
    
    pub fn check_slashing_condition(&self, node_id: &str) -> bool {
        self.get_score(node_id) < self.min_trust_score
    }
}
```

---

## 7. UI/UX Specifications

### 7.1 Minimal Status Indicator

**Design Principles**:
- Non-intrusive
- At-a-glance comprehension
- Battery-conscious

```xml
<!-- Android status bar indicator -->
<ImageView
    android:id="@+id/xael_status_indicator"
    android:layout_width="16dp"
    android:layout_height="16dp"
    android:src="@drawable/ic_xael_idle"
    android:contentDescription="XAEL Node Status" />

<!-- Status States -->
<!-- Idle (gray): Node ready, no active tasks -->
<!-- Active (green): Processing inference tasks -->
<!-- Earning (gold): Rewards being accumulated -->
<!-- Offline (red): Node disconnected -->
<!-- Consent Required (amber): User action needed -->
```

### 7.2 Earnings Dashboard

**Key Metrics**:
- Total XAEL earned (lifetime)
- Current epoch earnings
- Active tasks count
- Trust score
- Sustainability bonus multiplier

```kotlin
data class EarningsDashboard(
    val lifetimeEarnings: BigDecimal,
    val currentEpochEarnings: BigDecimal,
    val activeTasksCount: Int,
    val trustScore: Int,
    val sustainabilityMultiplier: BigDecimal,
    val pppMultiplier: BigDecimal,
    val nextPayoutEstimate: BigDecimal,
    val nextPayoutTimestamp: Long
)
```

### 7.3 Consent Controls

**Granular Permissions**:
- Per-task type consent
- Per-data-type permissions
- Time-based restrictions
- Network type restrictions (WiFi only, etc.)

```kotlin
sealed class ConsentSetting {
    object AllowInferenceTasks : ConsentSetting()
    object AllowDataProcessing : ConsentSetting()
    object AllowWhileCharging : ConsentSetting()
    object AllowOnMobileData : ConsentSetting()
    class MaxDailyTasks(val count: Int) : ConsentSetting()
    class MaxBatteryUsage(val percentage: Int) : ConsentSetting()
}

class ConsentManager {
    private val settings = MutableMap<ConsentSetting, Boolean>()
    
    fun checkPermission(task: Task): Boolean {
        return when (task.type) {
            TaskType.Inference -> settings[ConsentSetting.AllowInferenceTasks] ?: false
            TaskType.DataProcessing -> settings[ConsentSetting.AllowDataProcessing] ?: false
        } && checkBatteryConstraints(task) && checkNetworkConstraints(task)
    }
}
```

---

## 8. Security Specifications

### 8.1 Threat Model

**Assets to Protect**:
1. Cryptographic keys (StrongBox)
2. User data (never leaves device without consent)
3. Task integrity (proofs must be verifiable)
4. Economic rewards (escrow security)

**Threat Actors**:
- Malicious task submitters (fake tasks, low rewards)
- Compromised nodes (fake proofs)
- Network attackers (MITM on task distribution)
- Physical device access (extracted keys)

### 8.2 Mitigations

| Threat | Mitigation |
|--------|------------|
| Fake proofs | TEE-backed attestation required |
| Key extraction | StrongBox hardware isolation |
| MITM attacks | Mutual TLS + message signing |
| Reward theft | Multi-sig escrow + timelocks |
| Privacy violations | Granular consent + local processing |

---

## 9. Device Support Matrix

### Phase 1 Target Devices

| Device | SoC | NPU | RAM | Storage | Status |
|--------|-----|-----|-----|---------|--------|
| Pixel 6 | Tensor G1 | 8 TOPS | 8GB | 128GB+ | 🎯 Primary |
| Pixel 7 | Tensor G2 | 10 TOPS | 8GB | 128GB+ | 🎯 Primary |
| Pixel 8 | Tensor G3 | 12 TOPS | 8GB | 128GB+ | 🎯 Primary |
| Galaxy A54 | Exynos 1380 | ~5 TOPS | 6-8GB | 128GB+ | 🎯 Secondary |
| Galaxy A34 | Dimensity 1080 | ~4 TOPS | 6-8GB | 128GB+ | 🎯 Secondary |
| Fairphone 4 | SM7325 | ~6 TOPS | 6-8GB | 128GB+ | 🎯 Ethical |
| Fairphone 5 | QCM6490 | ~8 TOPS | 8GB | 256GB+ | 🎯 Ethical |

---

## 10. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Node daemon memory | <50MB | RSS under load |
| Cold start inference | <500ms | Model load + first token |
| Token generation speed | >20 tok/s | Llama-3-8B-Q4 |
| Power consumption (idle) | <100mW | During background inference |
| Proof generation latency | <100ms | TEE signature + attestation |
| Task completion rate | >99% | Within deadline |

---

## Appendix A: Glossary

- **DYNA**: Decentralized yield network architecture
- **TEE**: Trusted Execution Environment
- **StrongBox**: Android hardware-backed keystore
- **GGUF**: GPT-Generated Unified Format (model serialization)
- **NPU**: Neural Processing Unit
- **PPP**: Purchasing Power Parity
- **EAS**: Energy-Aware Scheduler

---

## Appendix B: References

1. [Android EAS Documentation](https://source.android.com/docs/core/power/eas)
2. [NNAPI Reference](https://developer.android.com/ndk/guides/neuralnetworks)
3. [MLC-LLM Project](https://mlc.ai/mlc-llm/)
4. [GGUF Format Spec](https://github.com/ggerganov/ggml/blob/master/docs/gguf.md)
5. [Android StrongBox](https://developer.android.com/security/strongbox)

---

*Document Version: 0.1.0-alpha*
*Last Updated: 2026-05-17*
*Status: Draft - For Community Review*
