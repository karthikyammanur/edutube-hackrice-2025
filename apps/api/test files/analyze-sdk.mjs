// Check the current SDK structure to understand available methods
import 'dotenv/config';

try {
  const { TwelveLabs } = await import('twelvelabs-js');
  const client = new TwelveLabs({ apiKey: process.env.TWELVELABS_API_KEY });
  
  console.log('🔍 Full TwelveLabs SDK Structure Analysis\n');
  
  console.log('1. Top-level client methods:');
  Object.keys(client).forEach(key => {
    console.log(`   - ${key}: ${typeof client[key]}`);
    if (typeof client[key] === 'object' && client[key] !== null) {
      const methods = Object.keys(client[key]).filter(k => typeof client[key][k] === 'function');
      if (methods.length > 0) {
        console.log(`     Methods: ${methods.join(', ')}`);
      }
    }
  });
  
  console.log('\n2. Testing indexes methods:');
  if (client.indexes && typeof client.indexes.list === 'function') {
    const indexes = await client.indexes.list();
    console.log('   ✅ indexes.list() works!');
    console.log('   📊 Found indexes:', indexes.data?.length || 0);
    if (indexes.data?.[0]) {
      console.log('   📋 First index:', indexes.data[0]);
    }
  }
  
  console.log('\n3. Testing tasks structure:');
  if (client.tasks) {
    console.log('   📋 Tasks methods:', Object.keys(client.tasks));
    if (typeof client.tasks.list === 'function') {
      try {
        const tasks = await client.tasks.list();
        console.log('   ✅ tasks.list() works!');
        console.log('   📊 Found tasks:', tasks.data?.length || 0);
      } catch (error) {
        console.log('   ⚠️ tasks.list() failed:', error.message);
      }
    }
  }
  
  console.log('\n4. Testing search structure:');
  if (client.search) {
    console.log('   📋 Search methods:', Object.keys(client.search));
  }
  
  console.log('\n5. Testing embed structure:');
  if (client.embed) {
    console.log('   📋 Embed methods:', Object.keys(client.embed));
    if (client.embed.tasks) {
      console.log('   📋 Embed.tasks methods:', Object.keys(client.embed.tasks));
    }
  }
  
} catch (error) {
  console.log('❌ Analysis failed:', error.message);
}