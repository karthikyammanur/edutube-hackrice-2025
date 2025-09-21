// Debug script to inspect all data returned by TwelveLabs API
//
// Usage:
//   npm run debug:twelvelabs -- --query "your question" [--video-id VIDEO_ID] [--raw]
//
// This script shows:
// 1. Raw API responses from TwelveLabs
// 2. All available metadata and fields
// 3. Complete search results with all properties

import 'dotenv/config';
import { TwelveLabs } from 'twelvelabs-js';

interface Args {
  query?: string;
  videoId?: string;
  raw?: boolean;
  help?: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const take = () => argv[++i];
    switch (true) {
      case a === '--query' || a === '-q':
        args.query = take();
        break;
      case a.startsWith('--query='):
        args.query = a.split('=')[1];
        break;
      case a === '--video-id' || a === '-v':
        args.videoId = take();
        break;
      case a.startsWith('--video-id='):
        args.videoId = a.split('=')[1];
        break;
      case a === '--raw':
        args.raw = true;
        break;
      case a === '--help' || a === '-h':
        args.help = true;
        break;
    }
  }
  return args;
}

function printUsage() {
  console.log(`
TwelveLabs API Debug Script

Usage:
  npm run debug:twelvelabs -- --query "Your question here" [options]

Options:
  --query, -q       Question/search query (required)
  --video-id, -v    Specific video ID to search in (optional)
  --raw             Show raw JSON responses
  --help, -h        Show this help message

Examples:
  # Debug search with all data
  npm run debug:twelvelabs -- --query "machine learning"
  
  # Show raw JSON responses
  npm run debug:twelvelabs -- --query "concepts" --raw
  
  # Search specific video
  npm run debug:twelvelabs -- --query "topics" --video-id "68ceea3bc81f4a8a93036b98"
`);
}

async function loadCachedVideoId(): Promise<string | null> {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const cacheFile = path.resolve(__dirname, '.testvideo-cache.json');
    
    const data = await fs.readFile(cacheFile, 'utf8');
    const cache = JSON.parse(data);
    return cache.videoId || null;
  } catch (error) {
    return null;
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

function printSection(title: string, emoji: string = '📋') {
  console.log(`\n${emoji} ${title}`);
  console.log('='.repeat(60));
}

function printObject(obj: any, indent: number = 0): void {
  const spaces = '  '.repeat(indent);
  
  if (obj === null || obj === undefined) {
    console.log(`${spaces}${obj}`);
    return;
  }
  
  if (typeof obj !== 'object') {
    console.log(`${spaces}${obj}`);
    return;
  }
  
  if (Array.isArray(obj)) {
    console.log(`${spaces}[`);
    obj.forEach((item, index) => {
      console.log(`${spaces}  [${index}]:`);
      printObject(item, indent + 2);
    });
    console.log(`${spaces}]`);
    return;
  }
  
  // Regular object
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      console.log(`${spaces}${key}:`);
      printObject(value, indent + 1);
    } else {
      console.log(`${spaces}${key}: ${value}`);
    }
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  if (!args.query) {
    console.error('❌ Query is required. Use --query "Your question here"');
    console.log('\nUse --help for usage information.');
    process.exit(1);
  }

  try {
    const apiKey = requireEnv('TWELVELABS_API_KEY');
    const client = new TwelveLabs({ apiKey });

    console.log('🔍 TwelveLabs API Debug Analysis');
    console.log(`📝 Query: "${args.query}"`);
    console.log(`🎬 Video ID filter: ${args.videoId || 'None (search all)'}`);
    console.log(`🔬 Raw mode: ${args.raw ? 'Enabled' : 'Disabled'}`);

    // 1. List all indexes
    printSection('Available Indexes', '📚');
    const indexes = await client.indexes.list();
    
    if (args.raw) {
      console.log('Raw indexes response:');
      console.log(JSON.stringify(indexes, null, 2));
    } else {
      console.log(`Found ${indexes.data?.length || 0} indexes:`);
      indexes.data?.forEach((index: any, i: number) => {
        console.log(`${i + 1}. ID: ${index.id}`);
        console.log(`   Name: ${index.index_name || 'Unnamed'}`);
        console.log(`   Created: ${index.created_at}`);
        console.log(`   Engine: ${JSON.stringify(index.index_options)}`);
        console.log('');
      });
    }

    if (!indexes.data || indexes.data.length === 0) {
      console.error('❌ No indexes found');
      return;
    }

    const indexId = indexes.data[0].id;
    console.log(`Using index: ${indexId}`);

    // 2. Skip video listing for now (API method issues)
    printSection('Videos in Index', '🎥');
    console.log('Video listing temporarily disabled due to API method compatibility');

    // 3. Perform search
    printSection('Search Results', '🔎');
    
    const searchOptions = ['visual']; // Only visual works reliably
    const searchParams = {
      indexId,
      queryText: args.query,
      searchOptions,
      pageLimit: 10
    };

    if (args.videoId) {
      // Add video filter if specified
      (searchParams as any).filter = { videoId: args.videoId };
    }

    console.log('Search parameters:');
    printObject(searchParams, 1);
    console.log('');

    const searchResult = await client.search.query(searchParams);
    
    if (args.raw) {
      console.log('Raw search response:');
      console.log(JSON.stringify(searchResult, null, 2));
    } else {
      console.log(`Found ${searchResult.data?.length || 0} results:`);
      
      if (searchResult.data && searchResult.data.length > 0) {
        searchResult.data.forEach((result: any, i: number) => {
          console.log(`\n${i + 1}. Result:`);
          console.log('   ===========================');
          
          // Basic fields
          console.log(`   Video ID: ${result.videoId || result.video_id || 'N/A'}`);
          console.log(`   Start: ${result.start || result.startSec || result.start_offset_sec || 'N/A'}s`);
          console.log(`   End: ${result.end || result.endSec || result.end_offset_sec || 'N/A'}s`);
          console.log(`   Duration: ${(result.end || result.endSec || 0) - (result.start || result.startSec || 0)}s`);
          console.log(`   Confidence: ${result.confidence || result.score || 'N/A'}`);
          console.log(`   Text: ${result.text || result.metadata?.text || 'N/A'}`);
          
          // All available fields
          console.log(`   All fields:`);
          printObject(result, 2);
        });
        
        // Summary statistics
        printSection('Search Statistics', '📊');
        const confidences = searchResult.data
          .map((r: any) => r.confidence || r.score || 0)
          .filter((c: number) => c > 0);
          
        if (confidences.length > 0) {
          const avgConfidence = confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length;
          const maxConfidence = Math.max(...confidences);
          const minConfidence = Math.min(...confidences);
          
          console.log(`   Average confidence: ${(avgConfidence * 100).toFixed(2)}%`);
          console.log(`   Max confidence: ${(maxConfidence * 100).toFixed(2)}%`);
          console.log(`   Min confidence: ${(minConfidence * 100).toFixed(2)}%`);
        }
        
        const totalDuration = searchResult.data.reduce((sum: number, r: any) => {
          const start = r.start || r.startSec || 0;
          const end = r.end || r.endSec || 0;
          return sum + (end - start);
        }, 0);
        
        console.log(`   Total matched duration: ${totalDuration.toFixed(1)}s`);
      } else {
        console.log('   No results found for this query');
      }
    }

    // 4. Get task details if we have a cached video
    const cachedVideoId = await loadCachedVideoId();
    if (cachedVideoId) {
      printSection('Cached Video Task Details', '⚙️');
      
      try {
        // List recent tasks
        const tasks = await client.tasks.list();
        
        if (args.raw) {
          console.log('Raw tasks response:');
          console.log(JSON.stringify(tasks, null, 2));
        } else {
          console.log(`Found ${tasks.data?.length || 0} recent tasks:`);
          
          tasks.data?.forEach((task: any, i: number) => {
            console.log(`${i + 1}. Task ID: ${task._id || task.id}`);
            console.log(`   Status: ${task.status}`);
            console.log(`   Type: ${task.type || 'index'}`);
            console.log(`   Created: ${task.created_at}`);
            console.log(`   Updated: ${task.updated_at}`);
            
            if (task.video_id || task.videoId) {
              console.log(`   Video ID: ${task.video_id || task.videoId}`);
            }
            
            console.log(`   All task fields:`);
            printObject(task, 2);
            console.log('');
          });
        }
      } catch (error) {
        console.warn('Could not fetch task details:', error);
      }
    }
    
    console.log('\n✅ Debug analysis complete!');

  } catch (error: any) {
    console.error(`\n❌ Error: ${error?.message || error}`);
    
    if (error?.response) {
      console.error('\n📋 API Response Details:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
    
    process.exit(1);
  }
}

main();