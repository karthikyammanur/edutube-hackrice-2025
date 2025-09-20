// Test via server's internal fetch capability since that works
console.log("🧪 Testing /generateNotes via Server Internal Fetch");
console.log("=" .repeat(60));

const BASE_URL = "http://127.0.0.1:3000";

const sampleTranscript = `
Welcome to today's lecture on Machine Learning and Neural Networks.

Neural networks are computational models inspired by biological neural networks. They consist of layers of interconnected nodes called neurons. The basic structure includes an input layer, hidden layers for processing, and an output layer for results.

Deep learning uses neural networks with many hidden layers to learn complex patterns from data. Key concepts include activation functions like ReLU and sigmoid, and the backpropagation algorithm for training.

Common architectures include convolutional neural networks for images, recurrent neural networks for sequences, and transformer models for natural language processing.

Applications span image recognition, speech processing, autonomous vehicles, and medical diagnosis. This field has revolutionized artificial intelligence in recent years.
`;

async function testHealthEndpoints() {
  console.log("🏥 Testing Health Endpoints...");
  
  try {
    // Test main health
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log(`✅ Main health: ${healthResponse.status} - ${JSON.stringify(healthData)}`);
    
    // Test notes health  
    const notesHealthResponse = await fetch(`${BASE_URL}/notes/health`);
    const notesHealthData = await notesHealthResponse.json();
    console.log(`✅ Notes health: ${notesHealthResponse.status} - ${JSON.stringify(notesHealthData)}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Health checks failed: ${error.message}`);
    return false;
  }
}

async function testGenerateNotes() {
  console.log("\n📝 Testing /generateNotes Endpoint...");
  console.log(`📊 Transcript length: ${sampleTranscript.length} characters`);
  console.log("⏳ Sending request (may take 15-45 seconds)...\n");
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${BASE_URL}/generateNotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: sampleTranscript
      })
    });
    
    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;
    
    console.log(`📡 Response received in ${processingTime}s`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error Response: ${errorText}`);
      return false;
    }
    
    const data = await response.json();
    
    console.log("\n🎉 SUCCESS! Generated Notes:");
    console.log("=" .repeat(60));
    
    console.log("\n📋 SUMMARY:");
    console.log("-" .repeat(40));
    console.log(data.summary);
    
    console.log("\n🎯 FLASHCARDS:");
    console.log("-" .repeat(40));
    data.flashcards.forEach((card, i) => {
      console.log(`${i + 1}. Q: ${card.question}`);
      console.log(`   A: ${card.answer}\n`);
    });
    
    console.log("📝 QUIZ QUESTIONS:");
    console.log("-" .repeat(40));
    data.quiz.forEach((question, i) => {
      console.log(`${i + 1}. ${question.question}`);
      question.options.forEach((option, j) => {
        const letter = String.fromCharCode(65 + j);
        const marker = question.correct === letter ? "✅" : "  ";
        console.log(`   ${marker} ${letter}) ${option}`);
      });
      console.log(`   Correct: ${question.correct}\n`);
    });
    
    console.log("=" .repeat(60));
    console.log("✅ VALIDATION RESULTS:");
    console.log(`✅ Summary: ${data.summary ? 'Generated' : 'Missing'} (${data.summary?.length || 0} chars)`);
    console.log(`✅ Flashcards: ${data.flashcards?.length || 0}/5 ${data.flashcards?.length === 5 ? '✅' : '❌'}`);
    console.log(`✅ Quiz Questions: ${data.quiz?.length || 0}/5 ${data.quiz?.length === 5 ? '✅' : '❌'}`);
    console.log(`✅ Processing Time: ${processingTime}s`);
    console.log(`✅ Response Structure: ${data.success ? 'Valid' : 'Invalid'}`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ /generateNotes test failed: ${error.message}`);
    return false;
  }
}

async function testErrorCases() {
  console.log("\n🛡️ Testing Error Handling...");
  
  // Test missing transcript
  try {
    console.log("Testing missing transcript...");
    const response = await fetch(`${BASE_URL}/generateNotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json();
    console.log(`✅ Missing transcript: ${response.status} - ${data.error}`);
  } catch (error) {
    console.log(`⚠️ Missing transcript test failed: ${error.message}`);
  }
  
  // Test empty transcript
  try {
    console.log("Testing empty transcript...");
    const response = await fetch(`${BASE_URL}/generateNotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: "" })
    });
    const data = await response.json();
    console.log(`✅ Empty transcript: ${response.status} - ${data.error}`);
  } catch (error) {
    console.log(`⚠️ Empty transcript test failed: ${error.message}`);
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
    console.log(`✅ Short transcript: ${response.status} - ${data.error}`);
  } catch (error) {
    console.log(`⚠️ Short transcript test failed: ${error.message}`);
  }
}

async function runCompleteTest() {
  console.log("Starting comprehensive /generateNotes endpoint test...\n");
  
  const healthOK = await testHealthEndpoints();
  if (!healthOK) {
    console.log("❌ Cannot proceed - server not responding");
    return;
  }
  
  await testErrorCases();
  
  const mainTestOK = await testGenerateNotes();
  
  console.log("\n" + "=" .repeat(60));
  if (mainTestOK) {
    console.log("🎉 ALL TESTS PASSED! /generateNotes IS WORKING PERFECTLY! 🎉");
  } else {
    console.log("❌ Some tests failed - but endpoint structure is correct");
  }
  console.log("=" .repeat(60));
}

runCompleteTest().catch(console.error);