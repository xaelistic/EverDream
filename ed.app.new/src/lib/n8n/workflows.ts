/**
 * n8n Workflow Definitions for Overnight Batch Processing
 *
 * These define the n8n workflows that should be created for automated
 * dream asset generation. Each workflow is triggered by a webhook event
 * from the app and processes assets asynchronously.
 *
 * To set up:
 * 1. Create each workflow in n8n
 * 2. Add a "Webhook Trigger" node as the first node
 * 3. Copy the workflow JSON into n8n's import feature
 * 4. Configure API keys in n8n credentials
 * 5. Set the webhook URL in your .env as VITE_N8N_WEBHOOK_URL
 */

// ============================================================
// WORKFLOW 1: Dream Asset Generation (Overnight Batch)
// ============================================================

export const DREAM_ASSET_WORKFLOW = {
  name: "Dream Asset Generation (Overnight)",
  description: "Processes dream assets overnight. Triggered when a dream is saved. Generates depth maps, skyboxes, 3D meshes, and parallax videos.",
  trigger: "webhook",
  webhookPath: "dream-assets",
  nodes: [
    {
      name: "Webhook Trigger",
      type: "n8n-nodes-base.webhook",
      position: [250, 300],
      parameters: {
        httpMethod: "POST",
        path: "dream-assets",
        responseMode: "onReceived",
      },
    },
    {
      name: "Validate Input",
      type: "n8n-nodes-base.if",
      position: [450, 300],
      parameters: {
        conditions: {
          string: [
            { value1: "={{ $json.dreamId }}", operation: "isNotEmpty" },
            { value1: "={{ $json.content }}", operation: "isNotEmpty" },
          ],
        },
      },
    },
    {
      name: "Queue Asset Jobs",
      type: "n8n-nodes-base.splitInBatches",
      position: [650, 300],
      parameters: {
        batchSize: 1,
        options: {},
      },
    },
    {
      name: "Generate Depth Map",
      type: "n8n-nodes-base.httpRequest",
      position: [850, 200],
      parameters: {
        method: "POST",
        url: "https://api-inference.huggingface.co/models/depth-anything/Depth-Anything-V2-Large-hf",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendBody: true,
        bodyParameters: {
          binaryData: true,
        },
      },
    },
    {
      name: "Generate Skybox",
      type: "n8n-nodes-base.httpRequest",
      position: [850, 350],
      parameters: {
        method: "POST",
        url: "https://backend.blockadelabs.com/api/v1/skybox",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendBody: true,
        bodyParameters: {
          parameters: [
            { name: "prompt", value: "={{ $json.prompt }}" },
            { name: "negative_prompt", value: "blurry, low quality, distorted" },
            { name: "skybox_style_id", value: "10" },
          ],
        },
      },
    },
    {
      name: "Generate 3D Mesh",
      type: "n8n-nodes-base.httpRequest",
      position: [850, 500],
      parameters: {
        method: "POST",
        url: "https://api.meshy.ai/v2/text-to-3d",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendBody: true,
        bodyParameters: {
          parameters: [
            { name: "prompt", value: "={{ $json.prompt }}" },
            { name: "style", value: "={{$json.style || 'realistic'}}" },
            { name: "target_polycount", value: "50000" },
          ],
        },
      },
    },
    {
      name: "Wait for Processing",
      type: "n8n-nodes-base.wait",
      position: [1050, 350],
      parameters: {
        amount: 30,
        unit: "seconds",
      },
    },
    {
      name: "Poll Skybox Status",
      type: "n8n-nodes-base.httpRequest",
      position: [1250, 350],
      parameters: {
        method: "GET",
        url: "https://backend.blockadelabs.com/api/v1/skybox/{{ $json.skyboxId }}",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
      },
    },
    {
      name: "Save to Supabase",
      type: "n8n-nodes-base.supabase",
      position: [1450, 300],
      parameters: {
        operation: "insert",
        table: "dream_assets",
        fields: {
          dream_id: "={{ $('Webhook Trigger').item.json.dreamId }}",
          type: "={{ $json.type }}",
          status: "completed",
          url: "={{ $json.resultUrl }}",
          prompt: "={{ $json.prompt }}",
          metadata: "={{ $json.metadata }}",
        },
      },
    },
    {
      name: "Notify User",
      type: "n8n-nodes-base.httpRequest",
      position: [1650, 300],
      parameters: {
        method: "POST",
        url: "={{ $env.APP_URL }}/api/notifications",
        sendBody: true,
        bodyParameters: {
          parameters: [
            { name: "userId", value: "={{ $('Webhook Trigger').item.json.userId }}" },
            { name: "type", value: "assets_ready" },
            { name: "dreamId", value: "={{ $('Webhook Trigger').item.json.dreamId }}" },
            { name: "message", value: "Your dream assets are ready!" },
          ],
        },
      },
    },
  ],
};

// ============================================================
// WORKFLOW 2: Weekly Dream Insights
// ============================================================

export const WEEKLY_INSIGHTS_WORKFLOW = {
  name: "Weekly Dream Insights",
  description: "Analyzes a week's dreams for patterns, themes, and correlations. Runs every Sunday night.",
  trigger: "cron",
  cronExpression: "0 2 * * 0", // 2 AM every Sunday
  nodes: [
    {
      name: "Cron Trigger",
      type: "n8n-nodes-base.cron",
      position: [250, 300],
      parameters: {
        triggerTimes: { item: [{ mode: "everyWeek", hour: 2, minute: 0 }] },
      },
    },
    {
      name: "Fetch Week's Dreams",
      type: "n8n-nodes-base.supabase",
      position: [450, 300],
      parameters: {
        operation: "getAll",
        table: "dreams",
        filter: {
          created_at: "gte.{{ $now.minus({days: 7}).toISO() }}",
          is_deleted: "eq.false",
        },
      },
    },
    {
      name: "Analyze Patterns",
      type: "n8n-nodes-base.openAi",
      position: [650, 300],
      parameters: {
        model: "gpt-4o",
        prompt: `Analyze these dreams from the past week and provide insights:

{{ JSON.stringify($json.dreams) }}

Provide:
1. Recurring themes and symbols
2. Emotional patterns
3. Sleep quality correlations
4. Lucidity trends
5. Personalized recommendations
6. A "dream of the week" highlight

Format as JSON with keys: themes, emotions, sleepCorrelation, lucidityTrends, recommendations, highlight`,
      },
    },
    {
      name: "Save Insights",
      type: "n8n-nodes-base.supabase",
      position: [850, 300],
      parameters: {
        operation: "insert",
        table: "weekly_insights",
        fields: {
          user_id: "={{ $json.userId }}",
          week_starting: "={{ $now.minus({days: 7}).toFormat('yyyy-MM-dd') }}",
          insights: "={{ $json.analysis }}",
          dream_count: "={{ $json.dreams.length }}",
        },
      },
    },
    {
      name: "Send Notification",
      type: "n8n-nodes-base.httpRequest",
      position: [1050, 300],
      parameters: {
        method: "POST",
        url: "={{ $env.APP_URL }}/api/notifications",
        body: {
          type: "weekly_insights_ready",
          title: "Your Weekly Dream Insights Are Ready",
          message: "We found {{ $json.themes?.length || 0 }} recurring themes in your dreams this week.",
        },
      },
    },
  ],
};

// ============================================================
// WORKFLOW 3: Dream Object Interaction Analysis
// ============================================================

export const INTERACTION_ANALYSIS_WORKFLOW = {
  name: "Dream Interaction Analysis",
  description: "Analyzes how users interact with dream objects in VR to build a personal symbol dictionary over time.",
  trigger: "webhook",
  webhookPath: "interaction-analysis",
  nodes: [
    {
      name: "Webhook Trigger",
      type: "n8n-nodes-base.webhook",
      position: [250, 300],
      parameters: {
        httpMethod: "POST",
        path: "interaction-analysis",
      },
    },
    {
      name: "Fetch User History",
      type: "n8n-nodes-base.supabase",
      position: [450, 300],
      parameters: {
        operation: "getAll",
        table: "dream_elements",
        filter: {
          user_id: "={{ $json.userId }}",
        },
      },
    },
    {
      name: "Analyze Patterns",
      type: "n8n-nodes-base.openAi",
      position: [650, 300],
      parameters: {
        model: "gpt-4o",
        prompt: `Analyze this user's dream object interaction history:

{{ JSON.stringify($json.interactions) }}

Identify:
1. Which symbols does the user interact with most?
2. What interaction types are preferred (breaking, scaling, lighting)?
3. Are there patterns in how they manipulate specific symbols?
4. What might their interaction style reveal about their personality?
5. Suggest new interactions they haven't tried yet.

Format as JSON.`,
      },
    },
    {
      name: "Update Personal Dictionary",
      type: "n8n-nodes-base.supabase",
      position: [850, 300],
      parameters: {
        operation: "upsert",
        table: "user_symbol_dictionary",
        fields: {
          user_id: "={{ $('Webhook Trigger').item.json.userId }}",
          symbol: "={{ $json.symbol }}",
          interaction_pattern: "={{ $json.pattern }}",
          personal_meaning: "={{ $json.meaning }}",
          last_updated: "={{ $now.toISO() }}",
        },
      },
    },
  ],
};

// ============================================================
// WORKFLOW 4: Dream-to-VR Pipeline
// ============================================================

export const VR_PIPELINE_WORKFLOW = {
  name: "Dream-to-VR Pipeline",
  description: "Full pipeline: dream text -> multi-view images -> Gaussian splat -> VR scene. Runs overnight for premium users.",
  trigger: "webhook",
  webhookPath: "vr-pipeline",
  nodes: [
    {
      name: "Webhook Trigger",
      type: "n8n-nodes-base.webhook",
      position: [250, 300],
      parameters: {
        httpMethod: "POST",
        path: "vr-pipeline",
      },
    },
    {
      name: "Generate Multi-View Images",
      type: "n8n-nodes-base.splitInBatches",
      position: [450, 300],
      parameters: {
        batchSize: 1,
      },
    },
    {
      name: "Generate View Image",
      type: "n8n-nodes-base.httpRequest",
      position: [650, 300],
      parameters: {
        method: "POST",
        url: "https://api.meshy.ai/v2/text-to-image",
        body: {
          prompt: "={{ $json.prompt }}",
          negative_prompt: "blurry, low quality",
        },
      },
    },
    {
      name: "Wait Between Views",
      type: "n8n-nodes-base.wait",
      position: [850, 300],
      parameters: {
        amount: 10,
        unit: "seconds",
      },
    },
    {
      name: "Create Gaussian Splat",
      type: "n8n-nodes-base.httpRequest",
      position: [1050, 300],
      parameters: {
        method: "POST",
        url: "={{ $env.GAUSSIAN_SPLAT_API_URL }}/create",
        body: {
          images: "={{ $json.imageUrls }}",
          format: "splat",
        },
      },
    },
    {
      name: "Save VR Scene",
      type: "n8n-nodes-base.supabase",
      position: [1250, 300],
      parameters: {
        operation: "insert",
        table: "vr_scenes",
        fields: {
          dream_id: "={{ $('Webhook Trigger').item.json.dreamId }}",
          user_id: "={{ $('Webhook Trigger').item.json.userId }}",
          splat_url: "={{ $json.splatUrl }}",
          status: "ready",
        },
      },
    },
    {
      name: "Notify User",
      type: "n8n-nodes-base.httpRequest",
      position: [1450, 300],
      parameters: {
        method: "POST",
        url: "={{ $env.APP_URL }}/api/notifications",
        body: {
          type: "vr_scene_ready",
          title: "Your Dream VR Scene Is Ready",
          message: "Step inside your dream. Open the VR viewer to explore.",
        },
      },
    },
  ],
};

// ============================================================
// WORKFLOW SCHEDULE RECOMMENDATIONS
// ============================================================

export const RECOMMENDED_SCHEDULES = {
  // Overnight batch processing (when server load is low)
  assetGeneration: {
    cron: "0 1 * * *", // 1 AM daily
    description: "Process all pending dream assets from the day",
  },
  // Weekly analysis
  weeklyInsights: {
    cron: "0 2 * * 0", // 2 AM Sunday
    description: "Generate weekly dream pattern analysis",
  },
  // Monthly cleanup
  monthlyCleanup: {
    cron: "0 3 1 * *", // 3 AM first of month
    description: "Clean up expired assets, optimize storage",
  },
  // Interaction analysis (after VR sessions)
  interactionAnalysis: {
    cron: "0 4 * * *", // 4 AM daily
    description: "Analyze VR interaction patterns from previous day",
  },
};

// ============================================================
// WEBHOOK EVENT PAYLOAD SCHEMAS
// ============================================================

export const WEBHOOK_SCHEMAS = {
  "dream-assets": {
    description: "Triggered when a dream is saved and needs asset generation",
    payload: {
      dreamId: "string (UUID)",
      userId: "string (UUID)",
      content: "string (dream text)",
      nugget: "string (short summary)",
      themes: "string[]",
      emotion: "string",
      symbols: "string[]",
      category: "string",
      existingImageUrl: "string (URL, optional)",
      requestedTypes: "string[] (depth_map, skybox_360, mesh_3d, parallax_video, multi_view)",
      priority: "low | normal | high",
    },
  },
  "vr-pipeline": {
    description: "Triggered for premium users to generate full VR scenes",
    payload: {
      dreamId: "string (UUID)",
      userId: "string (UUID)",
      content: "string",
      nugget: "string",
      themes: "string[]",
      style: "realistic | dreamlike | surreal | artistic",
    },
  },
  "interaction-analysis": {
    description: "Triggered after VR interaction sessions",
    payload: {
      userId: "string (UUID)",
      sessionId: "string (UUID)",
      dreamId: "string (UUID)",
      interactions: "InteractionRecord[]",
      elements: "DreamElement[]",
    },
  },
};
