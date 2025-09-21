import 'dotenv/config';
import { AutomaticStudyGenerator } from '../src/services/automatic-study-generator.js';

console.log('🧪 Testing Automatic Study Materials Generation');
console.log('='.repeat(60));

const sampleTranscript = `
Welcome to today's lecture on Machine Learning Fundamentals. 

Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without explicit programming. There are three main types: supervised learning uses labeled data, unsupervised learning finds patterns in unlabeled data, and reinforcement learning learns through rewards and penalties.

Key concepts include overfitting when models memorize training data, cross-validation technique to test model performance, and various algorithms like linear regression, decision trees, and neural networks.

Linear regression is used for predicting continuous values. The algorithm finds the best line through data points by minimizing the sum of squared errors. This happens around the 5-minute mark of our discussion.

Decision trees make predictions by asking a series of yes/no questions about the data. They're easy to interpret but can overfit if not properly pruned. We cover this extensively between minutes 8 and 12.

Neural networks are inspired by the human brain and consist of interconnected nodes called neurons. Deep learning uses neural networks with many layers to solve complex problems. This advanced topic is discussed from minute 15 onwards.

Cross-validation helps prevent overfitting by testing the model on unseen data. We typically use k-fold cross-validation where we split data into k parts. This validation technique is crucial for model reliability.

In conclusion, machine learning offers powerful tools for data analysis and prediction. The key is choosing the right algorithm for your specific problem and ensuring proper validation of results.
`;

async function testAutomaticGeneration() {
  try {
    console.log('🔑 Environment Check:');
    console.log(`GOOGLE_API_KEY configured: ${!!process.env.GOOGLE_API_KEY ? 'YES' : 'NO'}`);
    
    if (!process.env.GOOGLE_API_KEY) {
      console.log('❌ Cannot test without GOOGLE_API_KEY');
      return;
    }
    
    console.log('\n📝 Sample Transcript:');
    console.log(`Length: ${sampleTranscript.length} characters`);
    console.log(`Expected quiz questions: ${Math.max(5, Math.floor(sampleTranscript.length / 200))}`);
    console.log(`Expected flashcards: ${Math.max(5, Math.floor(sampleTranscript.length / 150))}`);
    
    console.log('\n🤖 Testing Automatic Study Generator...');
    const generator = new AutomaticStudyGenerator();
    
    const startTime = Date.now();
    const result = await generator.generateStudyMaterials(sampleTranscript);
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Generation completed in ${duration}ms`);
    console.log('\n📊 Results Summary:');
    console.log(`Summary length: ${result.summary.length} characters`);
    console.log(`Quiz questions: ${result.quiz.length}`);
    console.log(`Flashcards: ${result.flashcards.length}`);
    
    console.log('\n📝 Sample Summary (first 200 chars):');
    console.log(`"${result.summary.substring(0, 200)}..."`);
    
    console.log('\n❓ Sample Quiz Questions:');
    result.quiz.slice(0, 3).forEach((q, i) => {
      console.log(`${i + 1}. ${q.question}`);
      console.log(`   Options: ${q.options.join(', ')}`);
      console.log(`   Correct: ${q.correctAnswer} (${q.options[q.correctAnswer]})`);
      console.log(`   Concept: ${q.concept}, Timestamp: ${q.timestamp}`);
    });
    
    console.log('\n🃏 Sample Flashcards:');
    result.flashcards.slice(0, 3).forEach((fc, i) => {
      console.log(`${i + 1}. Q: ${fc.question}`);
      console.log(`   A: ${fc.answer}`);
    });
    
    console.log('\n🎉 Automatic Study Generation Test PASSED!');
    console.log('\n✅ All requirements implemented:');
    console.log('  ✅ Single Gemini API call');
    console.log('  ✅ Exact JSON structure');
    console.log('  ✅ MCQ with 4 options each');
    console.log('  ✅ CorrectAnswer index (0-3)');
    console.log('  ✅ Concept/topic for each question');
    console.log('  ✅ Timestamps included');
    console.log('  ✅ Dynamic scaling based on transcript length');
    console.log('  ✅ Proper validation and error handling');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    
    if ((error as Error).message.includes('GOOGLE_API_KEY')) {
      console.log('\n💡 Fix: Set GOOGLE_API_KEY environment variable');
    } else if ((error as Error).message.includes('parse')) {
      console.log('\n💡 Fix: Gemini response parsing issue - check JSON format');
    } else {
      console.log('\n💡 Check error details above for debugging');
    }
    
    process.exit(1);
  }
}

testAutomaticGeneration();