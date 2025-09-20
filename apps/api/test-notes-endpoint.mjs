// Test the /generateNotes endpoint
import 'dotenv/config';

const BASE_URL = "http://127.0.0.1:3000";

const sampleTranscript = `
Welcome to today's lecture on Machine Learning Fundamentals. 

Machine learning is a subset of artificial intelligence that focuses on developing algorithms that can learn and make decisions from data without being explicitly programmed for every task. There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning.

Supervised learning involves training algorithms on labeled datasets. For example, if we want to classify emails as spam or not spam, we would provide the algorithm with many examples of emails that are already labeled as spam or not spam. The algorithm learns patterns from these examples and can then classify new, unseen emails.

Unsupervised learning works with unlabeled data. The algorithm tries to find hidden patterns or structures in the data without being told what to look for. Clustering is a common unsupervised learning technique where the algorithm groups similar data points together.

Reinforcement learning is inspired by behavioral psychology. Here, an agent learns to make decisions by performing actions in an environment and receiving rewards or penalties. The goal is to learn a policy that maximizes cumulative reward over time.

Some key concepts in machine learning include overfitting, which occurs when a model learns the training data too well and performs poorly on new data, and cross-validation, which is a technique used to assess how well a model will generalize to new data.

Popular algorithms include linear regression for predicting continuous values, decision trees for classification and regression, neural networks for complex pattern recognition, and support vector machines for classification tasks.

In today's world, machine learning is used everywhere from recommendation systems on streaming platforms to autonomous vehicles, medical diagnosis, and financial fraud detection.
`;

async function testGenerateNotes() {
  console.log("🧪 Testing /generateNotes endpoint...\n");
  
  try {
    console.log("📡 Sending POST request to /generateNotes...");
    
    const response = await fetch(`${BASE_URL}/generateNotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transcript: sampleTranscript
      })
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.log(`❌ Error Response: ${errorData}`);
      return;
    }

    const data = await response.json();
    
    console.log("\n✅ SUCCESS! Generated notes structure:");
    console.log("=" .repeat(60));
    
    console.log("\n📋 SUMMARY:");
    console.log(data.summary);
    
    console.log("\n🎯 FLASHCARDS:");
    data.flashcards.forEach((card, i) => {
      console.log(`${i + 1}. Q: ${card.question}`);
      console.log(`   A: ${card.answer}\n`);
    });
    
    console.log("📝 QUIZ QUESTIONS:");
    data.quiz.forEach((question, i) => {
      console.log(`${i + 1}. ${question.question}`);
      question.options.forEach((option, j) => {
        const letter = String.fromCharCode(65 + j); // A, B, C, D
        const marker = question.correct === letter ? "✅" : "  ";
        console.log(`   ${marker} ${letter}) ${option}`);
      });
      console.log(`   Correct: ${question.correct}\n`);
    });
    
    console.log("=" .repeat(60));
    console.log("📈 METADATA:");
    console.log(`- Transcript Length: ${data.transcript_length} characters`);
    console.log(`- Generated At: ${data.generated_at}`);
    console.log(`- Model: ${data.metadata.model}`);
    console.log(`- Temperature: ${data.metadata.temperature}`);
    console.log(`- Summary Length: ${data.summary.length} characters`);
    console.log(`- Flashcards: ${data.flashcards.length}`);
    console.log(`- Quiz Questions: ${data.quiz.length}`);

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

async function testHealthEndpoint() {
  console.log("🏥 Testing /notes/health endpoint...\n");
  
  try {
    const response = await fetch(`${BASE_URL}/notes/health`);
    const data = await response.json();
    
    console.log(`📊 Health Status: ${response.status}`);
    console.log(`✅ Service OK: ${data.ok}`);
    console.log(`🔑 Gemini Configured: ${data.gemini_configured}`);
    console.log(`📅 Timestamp: ${data.timestamp}\n`);
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
  }
}

async function testErrorHandling() {
  console.log("🛡️ Testing error handling...\n");
  
  // Test missing transcript
  try {
    console.log("Testing missing transcript...");
    const response = await fetch(`${BASE_URL}/generateNotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json();
    console.log(`✅ Missing transcript error: ${response.status} - ${data.error}\n`);
  } catch (error) {
    console.error("❌ Error test failed:", error.message);
  }
  
  // Test short transcript
  try {
    console.log("Testing short transcript...");
    const response = await fetch(`${BASE_URL}/generateNotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: "Too short" })
    });
    const data = await response.json();
    console.log(`✅ Short transcript error: ${response.status} - ${data.error}\n`);
  } catch (error) {
    console.error("❌ Short transcript test failed:", error.message);
  }
}

async function runFullTest() {
  console.log("🚀 Starting complete /generateNotes endpoint test...");
  console.log("=" .repeat(60));
  
  await testHealthEndpoint();
  await testErrorHandling();
  await testGenerateNotes();
  
  console.log("🎉 All tests completed!");
}

// Run the test
runFullTest().catch(console.error);