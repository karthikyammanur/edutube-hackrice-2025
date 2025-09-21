import 'dotenv/config';
import { TwelveLabs } from 'twelvelabs-js';

console.log('🔍 Testing TwelveLabs Integration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('  TWELVELABS_API_KEY:', process.env.TWELVELABS_API_KEY ? 'SET (length: ' + process.env.TWELVELABS_API_KEY.length + ')' : 'NOT SET');

if (!process.env.TWELVELABS_API_KEY) {
  console.log('❌ TWELVELABS_API_KEY not configured');
  process.exit(1);
}

try {
  console.log('\n🔧 Creating TwelveLabs client...');
  const client = new TwelveLabs({ apiKey: process.env.TWELVELABS_API_KEY });
  console.log('✅ TwelveLabs client created successfully');

  console.log('\n📋 Testing API connectivity...');
  const indexes = await client.indexes.list();
  console.log(`✅ Connected! Found ${indexes.data?.length || 0} indexes`);
  
  if (indexes.data && indexes.data.length > 0) {
    console.log('\nAvailable indexes:');
    indexes.data.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name} (ID: ${index.id})`);
      console.log(`     Engines: ${index.engines?.join(', ') || 'None'}`);
    });
  } else {
    console.log('\n⚠️  No indexes found. You may need to create an index first.');
    console.log('   Visit: https://docs.twelvelabs.io/docs/create-indexes');
  }

  console.log('\n📊 Testing task management...');
  const tasks = await client.tasks.list();
  console.log(`✅ Found ${tasks.data?.length || 0} tasks`);
  
  if (tasks.data && tasks.data.length > 0) {
    console.log('\nRecent tasks:');
    tasks.data.slice(0, 3).forEach((task, i) => {
      console.log(`  ${i + 1}. Task ${task.id} - Status: ${task.status}`);
    });
  }

  console.log('\n✅ TwelveLabs integration is working correctly!');
  
} catch (error) {
  console.error('\n❌ TwelveLabs test failed:', error.message);
  
  if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    console.log('\n💡 Authentication Issues:');
    console.log('   1. Verify TWELVELABS_API_KEY is correct');
    console.log('   2. Check if API key has proper permissions');
    console.log('   3. Visit TwelveLabs dashboard to regenerate key');
  }
  
  if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
    console.log('\n💡 Network Issues:');
    console.log('   1. Check internet connectivity');
    console.log('   2. Verify no firewall/proxy blocking requests');
  }
  
  process.exit(1);
}