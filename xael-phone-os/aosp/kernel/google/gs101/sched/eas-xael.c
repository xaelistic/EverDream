/*
 * XAEL Phone OS - Energy-Aware Scheduler (EAS) Modifications
 * 
 * This file contains kernel-level modifications to prioritize AI inference tasks
 * and enable direct NPU access on Google Tensor GS101 (Pixel 6/7) chips.
 * 
 * Key features:
 * - PF_INFERENCE_TASK flag for real-time priority routing
 * - NPU-aware CPU cluster selection
 * - Memory locking support for model weights
 * - Reduced thermal throttling for sustained inference
 */

#include <linux/sched.h>
#include <linux/sched/task.h>
#include <linux/sched/prio.h>
#include <linux/cpumask.h>
#include <linux/topology.h>
#include <trace/events/sched.h>

/* XAEL-specific task flags */
#define PF_INFERENCE_TASK   0x00004000  /* Task is running AI inference */
#define PF_NPU_BOUND        0x00008000  /* Task bound to NPU accelerator */

/* XAEL scheduler configuration */
static struct xael_sched_config {
    int inference_boost_nice;       /* Nice value boost for inference tasks */
    int npu_cluster_base;           /* Base CPU ID for NPU-associated cluster */
    bool thermal_override_enabled;  /* Allow bypassing thermal limits for AI */
    unsigned long locked_mem_limit; /* Max memory that can be locked for models */
} xael_cfg __read_mostly;

/*
 * find_idlest_npu_cluster - Find the best CPU in the NPU-associated cluster
 * 
 * On Tensor GS101, the NPU shares power domains with the prime CPU cluster.
 * This function identifies idle CPUs in that cluster for optimal scheduling.
 */
static inline int find_idlest_npu_cluster(void)
{
    int cpu = smp_processor_id();
    struct cpumask *npu_cluster;
    
    /* Get the NPU-associated CPU cluster mask */
    npu_cluster = cpumask_of(cpu);
    
    /* Find the idlest CPU in the cluster */
    return cpumask_first_and(npu_cluster, cpu_online_mask);
}

/*
 * xael_select_task_rq - Custom task placement logic for XAEL Phone OS
 * 
 * This replaces the default EAS task selection when:
 * 1. Task is marked as inference work (PF_INFERENCE_TASK)
 * 2. System is in "XAEL Mining" mode
 * 3. NPU resources are available
 */
static inline int xael_select_task_rq(struct task_struct *p, int prev_cpu, int sd_flag, int wf)
{
    int target_cpu = prev_cpu;
    
    /* Check if this is an inference task */
    if (unlikely(p->flags & PF_INFERENCE_TASK)) {
        /* Route to NPU-associated CPU cluster for optimal performance */
        target_cpu = find_idlest_npu_cluster();
        
        /* Boost priority for inference tasks */
        if (p->static_prio > MAX_PRIO - 10) {
            set_user_nice(p, max_t(int, p->static_prio - 5, MIN_NICE));
        }
        
        trace_xael_inference_scheduled(p->pid, target_cpu);
        return target_cpu;
    }
    
    /* For non-inference tasks, use default EAS logic */
    return default_select_task_rq(p, prev_cpu, sd_flag, wf);
}

/*
 * xael_task_tick - Per-tick accounting for inference tasks
 * 
 * Tracks inference runtime and adjusts thermal limits dynamically.
 */
static void xael_task_tick(struct task_struct *p)
{
    static u64 inference_runtime_ns = 0;
    static u64 last_reset = 0;
    u64 now = ktime_get_ns();
    
    if (!(p->flags & PF_INFERENCE_TASK))
        return;
    
    /* Accumulate inference runtime */
    inference_runtime_ns += p->se.sum_exec_runtime;
    
    /* Reset counter every 10 seconds */
    if (now - last_reset > 10 * NSEC_PER_SEC) {
        inference_runtime_ns = 0;
        last_reset = now;
    }
    
    /* If inference has been running consistently, relax thermal limits */
    if (inference_runtime_ns > 8 * NSEC_PER_SEC && xael_cfg.thermal_override_enabled) {
        /* Signal thermal subsystem to allow higher temps for AI workload */
        xael_thermal_relax_limits();
    }
}

/*
 * xael_mlock_check - Validate memory lock requests for model weights
 * 
 * Allows inference tasks to lock large memory regions without hitting
 * standard RLIMIT_MEMLOCK limits.
 */
static int xael_mlock_check(struct task_struct *p, unsigned long len)
{
    if (!(p->flags & PF_INFERENCE_TASK))
        return -EPERM;
    
    /* Allow inference tasks to lock up to configured limit */
    if (len > xael_cfg.locked_mem_limit)
        return -ENOMEM;
    
    return 0;
}

/*
 * xael_set_inference_mode - Syscall helper to mark task as inference worker
 * 
 * Called from userspace when starting ML inference:
 *   syscall(__NR_xael_set_inference_mode, true);
 */
SYSCALL_DEFINE1(xael_set_inference_mode, bool, enable)
{
    struct task_struct *p = current;
    
    if (enable) {
        p->flags |= PF_INFERENCE_TASK;
        set_user_nice(p, -10);  /* High priority */
    } else {
        p->flags &= ~PF_INFERENCE_TASK;
        set_user_nice(p, 0);    /* Normal priority */
    }
    
    return 0;
}

/*
 * Initialize XAEL scheduler configuration
 * 
 * Called during kernel boot after EAS initialization.
 */
void __init xael_sched_init(void)
{
    /* Default configuration for Tensor GS101 */
    xael_cfg.inference_boost_nice = -10;
    xael_cfg.npu_cluster_base = 4;  /* Prime cluster starts at CPU 4 */
    xael_cfg.thermal_override_enabled = true;
    xael_cfg.locked_mem_limit = 2 * 1024 * 1024 * 1024;  /* 2GB for model weights */
    
    pr_info("XAEL Phone OS: Energy-Aware Scheduler initialized\n");
    pr_info("  - Inference tasks boosted to nice %d\n", xael_cfg.inference_boost_nice);
    pr_info("  - NPU cluster base CPU: %d\n", xael_cfg.npu_cluster_base);
    pr_info("  - Thermal override: %s\n", xael_cfg.thermal_override_enabled ? "enabled" : "disabled");
    pr_info("  - Locked memory limit: %lu MB\n", xael_cfg.locked_mem_limit / (1024 * 1024));
}

/* Export symbols for use by other kernel modules */
EXPORT_SYMBOL_GPL(xael_set_inference_mode);
EXPORT_SYMBOL_GPL(find_idlest_npu_cluster);

/* Trace events for debugging */
DEFINE_EVENT(xael, xael_inference_scheduled,
    TP_PROTO(pid_t pid, int cpu),
    TP_ARGS(pid, cpu),
    TP_STRUCT__entry(
        __field(pid_t, pid)
        __field(int, cpu)
    ),
    TP_fast_assign(
        __entry->pid = pid;
        __entry->cpu = cpu;
    ),
    TP_printk("pid=%d scheduled on cpu=%d", __entry->pid, __entry->cpu)
);

/* Module parameters for runtime tuning */
module_param_named(inference_boost, xael_cfg.inference_boost_nice, int, 0644);
module_param_named(thermal_override, xael_cfg.thermal_override_enabled, bool, 0644);
module_param_named(locked_mem_mb, xael_cfg.locked_mem_limit, ulong, 0644);

MODULE_DESCRIPTION("XAEL Phone OS Energy-Aware Scheduler Extensions");
MODULE_LICENSE("GPL v2");
MODULE_AUTHOR("XAEL Team <team@dyna-ai.org>");
