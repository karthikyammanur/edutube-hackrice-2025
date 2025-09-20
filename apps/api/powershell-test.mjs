// Quick test specifically for the /generateNotes endpoint
console.log("🧪 Testing /generateNotes endpoint directly...");

// Test data
const sampleTranscript = `
Machine learning is a subset of artificial intelligence that focuses on developing algorithms that can learn and make decisions from data without being explicitly programmed for every task. 

There are three main types: supervised learning uses labeled datasets to train algorithms, unsupervised learning finds patterns in unlabeled data, and reinforcement learning uses rewards and penalties to optimize decision-making.

Key concepts include overfitting, cross-validation, and popular algorithms like linear regression, decision trees, and neural networks.
`;

// Using PowerShell instead of fetch for better Windows compatibility
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function testWithPowerShell() {
  const requestBody = JSON.stringify({ transcript: sampleTranscript });
  
  const psCommand = `
    $body = '${requestBody.replace(/'/g, "''")}'
    try {
      $response = Invoke-RestMethod -Uri "http://127.0.0.1:3000/generateNotes" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 60
      $response | ConvertTo-Json -Depth 10
    } catch {
      Write-Output "ERROR: $_"
    }
  `;
  
  try {
    console.log("📡 Sending request via PowerShell...");
    const { stdout, stderr } = await execAsync(`powershell -Command "${psCommand}"`);
    
    if (stderr) {
      console.log("❌ PowerShell stderr:", stderr);
    }
    
    if (stdout) {
      console.log("✅ Response received:");
      console.log(stdout);
    }
  } catch (error) {
    console.error("❌ PowerShell request failed:", error.message);
  }
}

async function testHealthEndpoint() {
  try {
    console.log("🏥 Testing health endpoint...");
    const { stdout } = await execAsync(`powershell -Command "Invoke-RestMethod -Uri 'http://127.0.0.1:3000/health' -TimeoutSec 5"`);
    console.log("✅ Health check:", stdout.trim());
  } catch (error) {
    console.log("❌ Health check failed:", error.message);
  }
}

async function testNotesHealth() {
  try {
    console.log("📝 Testing notes health endpoint...");
    const { stdout } = await execAsync(`powershell -Command "Invoke-RestMethod -Uri 'http://127.0.0.1:3000/notes/health' -TimeoutSec 5"`);
    console.log("✅ Notes health:", stdout.trim());
  } catch (error) {
    console.log("❌ Notes health failed:", error.message);
  }
}

async function runTests() {
  await testHealthEndpoint();
  await testNotesHealth();
  await testWithPowerShell();
}

runTests();