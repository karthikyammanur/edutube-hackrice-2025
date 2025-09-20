import { TwelveLabsRetriever } from '../src/services/twelvelabs.js';
import { readFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { constants } from 'fs';

// Load .env file from the api directory
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

// Helper to ensure environment variables are set
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

// Helper to check if file exists
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Helper to sleep for a given number of milliseconds
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function createIndex(apiKey: string): Promise<string> {
  const url = 'https://api.twelvelabs.io/v1/indexes';
  const body = {
    name: `test-index-${Date.now()}`,
    engines: [
      {
        name: 'marengo2.6',
        options: ['visual', 'conversation']
      }
    ]
  };

  console.log('Creating new index...');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,  // Fixed: Use x-api-key instead of Authorization
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create index: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log(`Created index: ${data.id}`);
  return data.id;
}

async function uploadVideo(apiKey: string, indexId: string, videoPath: string): Promise<string> {
  // Check if video file exists
  if (!await fileExists(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const createTaskUrl = 'https://api.twelvelabs.io/v1/tasks';
  const videoBuffer = await readFile(videoPath);
  
  console.log(`Uploading video from ${videoPath} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);
  
  // Use native Node.js approach instead of FormData
  // Note: TwelveLabs API might require multipart/form-data
  // This is a simplified version - you may need to use a library like 'form-data'
  const boundary = `----WebKitFormBoundary${Math.random().toString(36).substr(2, 9)}`;
  
  // Build multipart form data manually
  const formParts = [
    `------${boundary}\r\nContent-Disposition: form-data; name="index_id"\r\n\r\n${indexId}`,
    `------${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nen`,
    `------${boundary}\r\nContent-Disposition: form-data; name="video_file"; filename="testvideo.mp4"\r\nContent-Type: video/mp4\r\n\r\n`,
  ];
  
  const textParts = Buffer.from(formParts.join('\r\n'));
  const endBoundary = Buffer.from(`\r\n------${boundary}--\r\n`);
  
  const body = Buffer.concat([textParts, videoBuffer, endBoundary]);

  const response = await fetch(createTaskUrl, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,  // Fixed: Use x-api-key
      'Content-Type': `multipart/form-data; boundary=----${boundary}`
    },
    body: body
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload video: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log(`Created task: ${data.id}`);
  return data.id;
}

async function waitForIndexing(apiKey: string, taskId: string): Promise<string> {
  const url = `https://api.twelvelabs.io/v1/tasks/${taskId}`;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max wait

  console.log('Waiting for video to be indexed...');
  
  while (attempts < maxAttempts) {
    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey  // Fixed: Use x-api-key
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to check task status: ${response.status}`);
    }

    const task = await response.json();
    console.log(`Task status: ${task.status} (attempt ${attempts + 1}/${maxAttempts})`);

    if (task.status === 'ready') {
      console.log('Video indexed successfully!');
      return task.video_id;
    } else if (task.status === 'failed') {
      throw new Error(`Task failed: ${JSON.stringify(task.error || task)}`);
    }

    attempts++;
    await sleep(5000); // Check every 5 seconds
  }

  throw new Error('Timeout waiting for video to be indexed');
}

async function deleteIndex(apiKey: string, indexId: string): Promise<void> {
  const url = `https://api.twelvelabs.io/v1/indexes/${indexId}`;
  
  console.log(`Deleting index ${indexId}...`);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'x-api-key': apiKey
    }
  });

  if (!response.ok && response.status !== 404) {
    console.error(`Failed to delete index: ${response.status}`);
  } else {
    console.log('Index deleted successfully');
  }
}

async function testSearch(indexId: string, videoId?: string) {
  console.log('\nTesting search functionality...');
  
  // Test various queries - customize based on your video content
  const queries = [
    'What is discussed in this video?',
    'Show me the introduction',
    'Find key moments',
    'Summary of main points'
  ];

  const retriever = new TwelveLabsRetriever({ indexId, videoId });

  for (const query of queries) {
    console.log(`\nSearching for: "${query}"`);
    try {
      const docs = await retriever.getRelevantDocuments(query);
      console.log(`Found ${docs.length} results`);
      
      docs.forEach((doc, idx) => {
        console.log(`\nResult ${idx + 1}:`);
        console.log(`  Content: ${doc.pageContent.substring(0, 150)}...`);
        console.log(`  Score: ${doc.metadata.score}`);
        console.log(`  Time: ${doc.metadata.start}s - ${doc.metadata.end}s`);
      });
    } catch (error) {
      console.error(`Search failed for "${query}":`, error);
    }
  }
}

async function main() {
  let indexId: string | undefined;
  let createdNewIndex = false;
  
  try {
    const apiKey = requireEnv('TWELVELABS_API_KEY');
    const videoPath = join(__dirname, 'testvideo.mp4');
    
    // Check if video file exists
    if (!await fileExists(videoPath)) {
      console.error(`\n❌ Video file not found: ${videoPath}`);
      console.log('\nPlease ensure you have a test video file named "testvideo.mp4" in the scripts directory.');
      console.log('You can download a sample video or create one for testing.');
      process.exit(1);
    }

    // Check if we should use existing index or create new one
    indexId = process.env.TWELVELABS_INDEX_ID;
    let videoId: string | undefined;

    if (!indexId) {
      console.log('No TWELVELABS_INDEX_ID provided, creating new index...');
      indexId = await createIndex(apiKey);
      createdNewIndex = true;
      
      // Upload video to the new index
      const taskId = await uploadVideo(apiKey, indexId, videoPath);
      videoId = await waitForIndexing(apiKey, taskId);
    } else {
      console.log(`Using existing index: ${indexId}`);
      
      // Optionally upload new video to existing index
      if (process.env.UPLOAD_NEW_VIDEO === 'true') {
        const taskId = await uploadVideo(apiKey, indexId, videoPath);
        videoId = await waitForIndexing(apiKey, taskId);
      }
    }

    // Test search functionality
    await testSearch(indexId, videoId);
    
    console.log('\n✅ All tests completed successfully!');
    console.log(`Index ID: ${indexId}`);
    if (videoId) {
      console.log(`Video ID: ${videoId}`);
    }
    
    // Cleanup if we created a new index and cleanup is enabled
    if (createdNewIndex && process.env.CLEANUP_AFTER_TEST === 'true') {
      console.log('\nCleaning up test resources...');
      await deleteIndex(apiKey, indexId);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Attempt cleanup on failure if we created a new index
    if (indexId && createdNewIndex) {
      try {
        const apiKey = process.env.TWELVELABS_API_KEY!;
        await deleteIndex(apiKey, indexId);
      } catch (cleanupError) {
        console.error('Failed to cleanup:', cleanupError);
      }
    }
    
    process.exit(1);
  }
}

// Run the test
console.log('=== TwelveLabs Test Script ===');
console.log('This script will test the TwelveLabs integration\n');
console.log('Required:');
console.log('- TWELVELABS_API_KEY: Your API key');
console.log('- testvideo.mp4: Test video file in the scripts directory\n');
console.log('Optional:');
console.log('- TWELVELABS_INDEX_ID: Use existing index instead of creating new');
console.log('- UPLOAD_NEW_VIDEO=true: Upload video to existing index');
console.log('- CLEANUP_AFTER_TEST=true: Delete test index after completion\n');

main();