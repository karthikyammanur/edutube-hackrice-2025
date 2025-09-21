// Minimal TwelveLabs search test - bare bones functionality
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

    console.log('1. Getting first index...');
    const indexes = await client.indexes.list();
    if (!indexes.data || indexes.data.length === 0) {
      throw new Error('No indexes found');
    }
    const indexId = indexes.data[0].id!;
    console.log(`   Using index: ${indexId}`);

    console.log('2. Performing basic search...');
    const searchResult = await client.search.query({
      indexId,
      queryText: 'content',
      searchOptions: ['visual'],
      pageLimit: 3
    });

    console.log('3. Raw search result:');
    console.log(JSON.stringify(searchResult, null, 2));

    console.log('\n4. Parsed results:');
    if (searchResult.data && searchResult.data.length > 0) {
      searchResult.data.forEach((result: any, i: number) => {
        console.log(`   ${i + 1}. Video: ${result.videoId || 'unknown'}`);
        console.log(`      Time: ${result.start || 0}s - ${result.end || 0}s`);
        console.log(`      Text: ${result.text || 'No text'}`);
        console.log(`      Confidence: ${result.confidence || 'N/A'}`);
      });
    } else {
      console.log('   No results found');
    }

    console.log('\n✅ Minimal test completed successfully');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
