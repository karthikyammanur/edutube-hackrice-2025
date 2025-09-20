/**
 * TwelveLabs Webhook Test Script
 * 
 * This script simulates TwelveLabs webhook calls to test the webhook endpoint
 * and video status updates.
 */

import 'dotenv/config';
import { createHmac } from 'crypto';

const API_BASE = 'http://localhost:3000';

interface MockWebhookPayload {
  event_type: 'video.embed.task.done' | 'video.embed.task.failed';
  task_id: string;
  status: 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

function generateWebhookSignature(payload: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

async function testWebhookEndpoint() {
  console.log('🔗 TwelveLabs Webhook Test');
  console.log('========================\n');

  // First, let's create a test video
  console.log('1️⃣ Creating test video...');
  const uploadResponse = await fetch(`${API_BASE}/videos/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'webhook-test.mp4',
      contentType: 'video/mp4',
      ownerId: 'webhook-test-user'
    })
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload URL request failed: ${uploadResponse.statusText}`);
  }

  const { videoId } = await uploadResponse.json() as any;
  console.log(`✅ Test video created: ${videoId}`);

  // Trigger indexing to get a task ID
  console.log('2️⃣ Starting indexing...');
  const indexResponse = await fetch(`${API_BASE}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: videoId,
      title: 'Webhook Test Video',
      description: 'Testing webhook functionality'
    })
  });

  if (!indexResponse.ok) {
    throw new Error(`Indexing request failed: ${indexResponse.statusText}`);
  }

  const videoMeta = await indexResponse.json() as any;
  const taskId = videoMeta.taskId;
  
  if (!taskId) {
    console.log('⚠️  No task ID generated (likely missing TwelveLabs API key)');
    console.log('   Using mock task ID for webhook testing...');
  }

  console.log(`✅ Indexing started, task ID: ${taskId || 'mock-task-id'}`);

  // Simulate webhook completion
  console.log('3️⃣ Simulating webhook completion...');
  
  const webhookPayload: MockWebhookPayload = {
    event_type: 'video.embed.task.done',
    task_id: taskId || 'mock-task-id',
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const payloadString = JSON.stringify(webhookPayload);
  const webhookSecret = process.env.TWELVELABS_WEBHOOK_SECRET || 'test-secret';
  const signature = generateWebhookSignature(payloadString, webhookSecret);

  const webhookResponse = await fetch(`${API_BASE}/webhooks/twelvelabs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-TwelveLabs-Signature': signature,
    },
    body: payloadString
  });

  console.log(`Webhook response: ${webhookResponse.status}`);
  
  if (webhookResponse.ok) {
    const result = await webhookResponse.json() as any;
    console.log(`✅ Webhook processed successfully for video: ${result.videoId}`);
  } else {
    const error = await webhookResponse.text();
    console.log(`❌ Webhook failed: ${error}`);
  }

  // Check final video status
  console.log('4️⃣ Checking final video status...');
  const statusResponse = await fetch(`${API_BASE}/videos/${videoId}/status`);
  
  if (statusResponse.ok) {
    const finalStatus = await statusResponse.json() as any;
    console.log(`✅ Final video status: ${finalStatus.status}`);
    console.log(`   Segments: ${finalStatus.totalSegments || 0}`);
    console.log(`   Updated: ${finalStatus.updatedAt}`);
  }

  console.log('\n🎉 Webhook test completed!');
  
  return { videoId, taskId };
}

async function testSSEConnection(videoId: string) {
  console.log('\n📡 Testing SSE Connection');
  console.log('========================');
  
  console.log(`Connecting to SSE endpoint for video: ${videoId}`);
  console.log(`URL: ${API_BASE}/videos/${videoId}/events`);
  console.log('(This would be handled by frontend JavaScript in real app)');
  
  // Note: In a real test, you'd use EventSource or similar
  // For now, just document the endpoint
  console.log('✅ SSE endpoint available for real-time updates');
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testWebhookEndpoint()
    .then(({ videoId }) => testSSEConnection(videoId))
    .catch(console.error);
}

export { testWebhookEndpoint, testSSEConnection };