// Check TwelveLabs task processing status
import 'dotenv/config';
import { TwelveLabs } from 'twelvelabs-js';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

async function main() {
  try {
    const apiKey = requireEnv('TWELVELABS_API_KEY');
    const client = new TwelveLabs({ apiKey });

    console.log('📋 Checking all recent tasks...\n');
    
    const tasks = await client.tasks.list();
    
    if (!tasks.data || tasks.data.length === 0) {
      console.log('No tasks found');
      return;
    }

    tasks.data.forEach((task: any, i: number) => {
      console.log(`${i + 1}. Task ID: ${task._id || task.id}`);
      console.log(`   Status: ${task.status} ${getStatusEmoji(task.status)}`);
      console.log(`   Created: ${task.created_at}`);
      console.log(`   Updated: ${task.updated_at}`);
      
      if (task.status === 'processing') {
        console.log(`   ⏳ Processing time: ${getProcessingTime(task.created_at)}`);
      }
      
      if (task.video_id || task.videoId) {
        console.log(`   🎥 Video ID: ${task.video_id || task.videoId}`);
      }
      
      // Show all task properties
      console.log(`   📊 All fields:`, JSON.stringify(task, null, 4));
      console.log('');
    });

    console.log('📝 Processing time info:');
    console.log('• Short videos (< 5 min): 1-3 minutes');
    console.log('• Medium videos (5-30 min): 3-10 minutes');
    console.log('• Long videos (> 30 min): 10-30+ minutes');
    console.log('• High resolution/complex content takes longer');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'ready': return '✅';
    case 'processing': return '⏳';
    case 'pending': return '⏸️';
    case 'failed': return '❌';
    default: return '❓';
  }
}

function getProcessingTime(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.floor((diffMs % 60000) / 1000);
  
  if (diffMins > 0) {
    return `${diffMins}m ${diffSecs}s`;
  } else {
    return `${diffSecs}s`;
  }
}

main();
