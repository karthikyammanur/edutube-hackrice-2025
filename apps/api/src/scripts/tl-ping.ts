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

    console.log('Pinging TwelveLabs: listing indexes...');
    const indexes = await client.indexes.list();
    const count = indexes.data?.length || 0;
    console.log(`OK: Found ${count} index(es).`);
    if (count > 0) {
      const first = indexes.data![0];
      console.log(`First index ID: ${first.id}`);
    }

    console.log('Listing recent tasks...');
    const tasks = await client.tasks.list();
    console.log(`OK: Found ${tasks.data?.length || 0} task(s).`);

    console.log('✅ TwelveLabs API connectivity looks good.');
  } catch (err: any) {
    console.error('❌ TwelveLabs ping failed:', err?.message || err);
    if (err?.response?.data) {
      console.error('Response data:', JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();


