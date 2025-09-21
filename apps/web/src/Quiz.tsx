import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from './lib';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface StudyMaterials {
  videoId: string;
  topics: string[];
  quizByTopic: Record<string, QuizQuestion[]>;
}

export default function Quiz(): JSX.Element {
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [videoId, setVideoId] = useState<string>('');

  useEffect(() => {
    console.log('🎯 [QUIZ-FRONTEND] Quiz component mounted');
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const vid = params.get('videoId');
    console.log('🎯 [QUIZ-FRONTEND] Video ID from URL:', vid);
    
    if (vid) {
      setVideoId(vid);
      fetchStudyMaterials(vid);
    } else {
      setError('No video ID provided');
      setLoading(false);
    }
  }, []);

  async function fetchStudyMaterials(videoId: string) {
    try {
      console.log('📡 [QUIZ-FRONTEND] Fetching study materials for video:', videoId);
      setLoading(true);
      const materials = await apiFetch(`/study/generate`, {
        method: 'POST',
        body: JSON.stringify({ 
          videoId,
          limits: { hits: 12, cards: 8, questions: 8 },
          length: 'medium' 
        })
      });
      console.log('✅ [QUIZ-FRONTEND] Study materials received:', materials);
      setStudyMaterials(materials);
      
      if (materials.topics && materials.topics.length > 0) {
        setSelectedTopic(materials.topics[0]);
        console.log('🏷️ [QUIZ-FRONTEND] Selected first topic:', materials.topics[0]);
      }
    } catch (err: any) {
      console.error('❌ [QUIZ-FRONTEND] Error fetching study materials:', err);
      setError(err?.message || 'Failed to fetch study materials');
    } finally {
      setLoading(false);
    }
  }

  function handleAnswerSelect(questionIndex: number, answerIndex: number) {
    console.log(`📝 [QUIZ-FRONTEND] Answer selected - Q${questionIndex + 1}: Option ${answerIndex + 1}`);
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  }

  function calculateScore() {
    if (!studyMaterials || !selectedTopic) return { correct: 0, total: 0 };
    
    const questions = studyMaterials.quizByTopic[selectedTopic] || [];
    let correct = 0;
    
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correct++;
      }
    });
    
    console.log(`🎯 [QUIZ-FRONTEND] Quiz score calculated: ${correct}/${questions.length}`);
    return { correct, total: questions.length };
  }

  function submitQuiz() {
    console.log('📊 [QUIZ-FRONTEND] Submitting quiz...');
    setShowResults(true);
    const score = calculateScore();
    console.log('✅ [QUIZ-FRONTEND] Quiz submitted with score:', score);
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-text mx-auto"></div>
          <p className="mt-2 text-subtext">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
          <button 
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-text text-background rounded-lg hover:bg-primaryHover"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!studyMaterials || !studyMaterials.topics.length) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-subtext">No quiz questions available</p>
          <button 
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-text text-background rounded-lg hover:bg-primaryHover"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentQuestions = studyMaterials.quizByTopic[selectedTopic] || [];
  const score = showResults ? calculateScore() : null;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <a href="#" className="text-lg font-semibold text-text">EduTube Notes - Quiz</a>
          <div className="flex items-center gap-4">
            <a href={`#upload?videoId=${videoId}`} className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline">Back to upload</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-4">Knowledge Quiz</h1>
          
          <div className="flex flex-wrap gap-2 mb-6">
            {studyMaterials.topics.map((topic) => (
              <button
                key={topic}
                onClick={() => {
                  console.log('🏷️ [QUIZ-FRONTEND] Topic changed to:', topic);
                  setSelectedTopic(topic);
                  setCurrentQuestionIndex(0);
                  setSelectedAnswers({});
                  setShowResults(false);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedTopic === topic
                    ? 'bg-text text-background'
                    : 'bg-surface text-text hover:bg-gray-100'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {currentQuestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-subtext text-lg">No quiz questions available for this topic</p>
          </div>
        ) : showResults ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-border p-8"
          >
            <h2 className="text-2xl font-bold text-text mb-6">Quiz Results - {selectedTopic}</h2>
            <div className="text-center mb-8">
              <div className="text-4xl font-bold text-text mb-2">
                {score?.correct}/{score?.total}
              </div>
              <p className="text-subtext">
                {score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}% Correct
              </p>
            </div>
            
            <div className="flex mt-8 justify-center gap-4">
              <button
                onClick={() => {
                  console.log('🔄 [QUIZ-FRONTEND] Retaking quiz for topic:', selectedTopic);
                  setSelectedAnswers({});
                  setShowResults(false);
                  setCurrentQuestionIndex(0);
                }}
                className="px-6 py-3 bg-surface text-text rounded-lg hover:bg-gray-100 font-medium"
              >
                Retake Quiz
              </button>
              <button
                onClick={() => window.location.hash = `#flashcards?videoId=${videoId}`}
                className="px-6 py-3 bg-text text-background rounded-lg hover:bg-primaryHover font-medium"
              >
                View Flashcards
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-border p-8"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-text">{selectedTopic}</h2>
              <span className="text-sm text-subtext">
                Question {currentQuestionIndex + 1} of {currentQuestions.length}
              </span>
            </div>
            
            <div className="mb-8">
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-text h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {currentQuestions[currentQuestionIndex] && (
              <div>
                <h3 className="text-lg font-medium text-text mb-6">
                  {currentQuestions[currentQuestionIndex].question}
                </h3>
                
                <div className="space-y-3 mb-8">
                  {currentQuestions[currentQuestionIndex].options.map((option, index) => (
                    <label
                      key={index}
                      className={`block p-4 rounded-lg border cursor-pointer transition ${
                        selectedAnswers[currentQuestionIndex] === index
                          ? 'border-text bg-blue-50'
                          : 'border-border hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestionIndex}`}
                        value={index}
                        checked={selectedAnswers[currentQuestionIndex] === index}
                        onChange={() => handleAnswerSelect(currentQuestionIndex, index)}
                        className="sr-only"
                      />
                      <span className="text-text">{option}</span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => {
                      if (currentQuestionIndex > 0) {
                        setCurrentQuestionIndex(currentQuestionIndex - 1);
                      }
                    }}
                    disabled={currentQuestionIndex === 0}
                    className="px-6 py-3 bg-surface text-text rounded-lg hover:bg-gray-100 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {currentQuestionIndex === currentQuestions.length - 1 ? (
                    <button
                      onClick={submitQuiz}
                      disabled={Object.keys(selectedAnswers).length !== currentQuestions.length}
                      className="px-6 py-3 bg-text text-background rounded-lg hover:bg-primaryHover font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit Quiz
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (currentQuestionIndex < currentQuestions.length - 1) {
                          setCurrentQuestionIndex(currentQuestionIndex + 1);
                        }
                      }}
                      className="px-6 py-3 bg-text text-background rounded-lg hover:bg-primaryHover font-medium"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}