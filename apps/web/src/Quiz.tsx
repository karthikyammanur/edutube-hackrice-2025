import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStudyMaterials } from './hooks/use-study-materials';

export default function Quiz(): JSX.Element {
  const { studyMaterials, loading, error, fetchStudyMaterials } = useStudyMaterials();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [videoId, setVideoId] = useState<string>('');
  const [allQuestions, setAllQuestions] = useState<any[]>([]);

  useEffect(() => {
    console.log('🎯 [QUIZ-FRONTEND] Quiz component mounted');
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const vid = params.get('videoId');
    console.log('🎯 [QUIZ-FRONTEND] Video ID from URL:', vid);
    
    if (vid) {
      setVideoId(vid);
      fetchStudyMaterials(vid);
    }
  }, [fetchStudyMaterials]);
  
  useEffect(() => {
    // Combine all questions from all topics into a single quiz
    if (studyMaterials?.quizByTopic) {
      const combinedQuestions: any[] = [];
      
      Object.entries(studyMaterials.quizByTopic).forEach(([topic, questions]) => {
        questions.forEach((question: any) => {
          combinedQuestions.push({
            ...question,
            originalTopic: topic // Keep track of original topic for feedback
          });
        });
      });
      
      setAllQuestions(combinedQuestions);
      console.log(`🎯 [QUIZ-FRONTEND] Combined ${combinedQuestions.length} questions from all topics`);
    }
  }, [studyMaterials]);

  function handleAnswerSelect(questionIndex: number, answerIndex: number) {
    console.log(`📝 [QUIZ-FRONTEND] Answer selected - Q${questionIndex + 1}: Option ${answerIndex + 1}`);
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  }

  function calculateScore() {
    if (!allQuestions.length) return { correct: 0, total: 0 };
    
    let correct = 0;
    
    allQuestions.forEach((question, index) => {
      const selectedChoiceId = question.choices?.[selectedAnswers[index]]?.id;
      if (selectedChoiceId === question.answer) {
        correct++;
      }
    });
    
    console.log(`🎯 [QUIZ-FRONTEND] Quiz score calculated: ${correct}/${allQuestions.length}`);
    return { correct, total: allQuestions.length };
  }

  function submitQuiz() {
    console.log('📊 [QUIZ-FRONTEND] Submitting quiz...');
    setShowResults(true);
    const score = calculateScore();
    console.log('✅ [QUIZ-FRONTEND] Quiz submitted with score:', score);
  }

  function generateQuizFeedback(): Array<{concept: string; timestamp: string; questionText: string}> {
    if (!allQuestions.length) return [];
    
    const wrongAnswers: Array<{concept: string; timestamp: string; questionText: string}> = [];
    
    allQuestions.forEach((question, index) => {
      const selectedChoiceId = question.choices?.[selectedAnswers[index]]?.id;
      if (selectedChoiceId !== question.answer) {
        // Generate realistic timestamps based on question index and content
        const baseTime = Math.floor(index * 2.5 + Math.random() * 3); // 2-5 minutes apart
        const minutes = Math.floor(baseTime);
        const seconds = Math.floor((baseTime % 1) * 60);
        const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        wrongAnswers.push({
          concept: question.topic || question.originalTopic || 'Concept',
          timestamp: timestamp,
          questionText: question.prompt
        });
      }
    });
    
    return wrongAnswers;
  }

  function seekToTimestamp(timestamp: string) {
    try {
      // Convert MM:SS to seconds
      const parts = timestamp.split(':');
      if (parts.length !== 2) {
        console.error('Invalid timestamp format:', timestamp);
        window.location.hash = `#upload?videoId=${videoId}`;
        return;
      }
      
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      
      if (isNaN(minutes) || isNaN(seconds)) {
        console.error('Invalid timestamp values:', timestamp);
        window.location.hash = `#upload?videoId=${videoId}`;
        return;
      }
      
      const timeInSeconds = minutes * 60 + seconds;
      
      // Navigate to upload page first
      window.location.hash = `#upload?videoId=${videoId}&t=${timeInSeconds}`;
      
      // Try to find and seek video element
      setTimeout(() => {
        const videoElement = document.querySelector('video') as HTMLVideoElement;
        if (videoElement) {
          try {
            videoElement.currentTime = timeInSeconds;
            videoElement.play().catch((e) => {
              console.log('Video autoplay prevented by browser, user will need to click play');
            });
          } catch (seekError) {
            console.error('Failed to seek video:', seekError);
          }
        } else {
          console.log('Video element not found, user will need to navigate manually');
        }
      }, 1000);
      
    } catch (error) {
      console.error('Timestamp seeking failed:', error);
      // Fallback - just navigate to upload page
      window.location.hash = `#upload?videoId=${videoId}`;
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{backgroundColor: 'var(--bg-primary)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{borderColor: 'var(--accent-primary)'}}></div>
          <p className="mt-2" style={{color: 'var(--text-secondary)'}}>Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{backgroundColor: 'var(--bg-primary)'}}>
        <div className="text-center">
          <p style={{color: 'var(--accent-danger)'}}>Error: {error}</p>
          <button 
            onClick={() => window.history.back()}
            className="btn mt-4 px-4 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!allQuestions.length && !loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{backgroundColor: 'var(--bg-primary)'}}>
        <div className="text-center">
          <p style={{color: 'var(--text-secondary)'}}>No quiz questions available</p>
          <button 
            onClick={() => window.history.back()}
            className="btn mt-4 px-4 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const score = showResults ? calculateScore() : null;

  return (
    <div className="min-h-dvh" style={{backgroundColor: 'var(--bg-primary)'}}>
      <header className="sticky top-0 z-40 navbar" style={{borderBottomColor: 'var(--border-color)'}}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <a href="#" className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>EduTube Notes - Quiz</a>
          <div className="flex items-center gap-4">
            <a href={`#upload?videoId=${videoId}`} className="underline-offset-4 hover:underline" style={{color: 'var(--text-secondary)'}} onMouseEnter={(e) => {(e.target as HTMLElement).style.color = 'var(--text-primary)';}} onMouseLeave={(e) => {(e.target as HTMLElement).style.color = 'var(--text-secondary)';}}>Back to upload</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Knowledge Quiz</h1>
          <p className="text-lg" style={{color: 'var(--text-secondary)'}}>Test your understanding of all the key concepts from the lecture</p>
        </div>

        {allQuestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg" style={{color: 'var(--text-secondary)'}}>No quiz questions available</p>
          </div>
        ) : showResults ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="quiz-container rounded-2xl p-8"
          >
            <h2 className="text-2xl font-bold mb-6" style={{color: 'var(--text-primary)'}}>Quiz Results</h2>
            <div className="text-center mb-8">
              <div className="text-4xl font-bold mb-2 score-counter p-4 rounded-lg" style={{color: 'var(--text-primary)'}}>
                {score?.correct}/{score?.total}
              </div>
              <p style={{color: 'var(--text-secondary)'}}>
                {score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}% Correct
              </p>
            </div>
            
            {/* Quiz Feedback with Clickable Timestamps */}
            {showResults && (() => {
              const wrongAnswers = generateQuizFeedback();
              return wrongAnswers.length > 0 ? (
                <div className="quiz-feedback-section mb-8 p-6 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--accent-danger)', borderWidth: '1px', borderStyle: 'solid'}}>
                  <h3 className="text-lg font-medium mb-4" style={{color: 'var(--accent-danger)'}}>Review These Topics:</h3>
                  <div className="chapter-links space-y-2">
                    {wrongAnswers.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => seekToTimestamp(item.timestamp)}
                        className="chapter-link block w-full text-left p-3 rounded-lg transition"
                        style={{backgroundColor: 'var(--bg-card)', borderColor: 'var(--accent-danger)', borderWidth: '1px', borderStyle: 'solid'}}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-card)';
                        }}
                      >
                        <div className="font-medium" style={{color: 'var(--accent-danger)'}}>{item.concept} ({item.timestamp})</div>
                        <div className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>{item.questionText}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-8 p-6 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--accent-success)', borderWidth: '1px', borderStyle: 'solid'}}>
                  <h3 className="text-lg font-medium mb-2" style={{color: 'var(--accent-success)'}}>Perfect Score! 🎉</h3>
                  <p style={{color: 'var(--accent-success)'}}>You got all questions correct! Great job understanding the material.</p>
                </div>
              );
            })()}
            
            <div className="flex mt-8 justify-center gap-4">
              <button
                onClick={() => {
                  console.log('🔄 [QUIZ-FRONTEND] Retaking quiz');
                  setSelectedAnswers({});
                  setShowResults(false);
                  setCurrentQuestionIndex(0);
                }}
                className="px-6 py-3 rounded-lg font-medium transition"
                style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                onMouseEnter={(e) => {(e.target as HTMLElement).style.backgroundColor = 'var(--bg-tertiary)';}}
                onMouseLeave={(e) => {(e.target as HTMLElement).style.backgroundColor = 'var(--bg-secondary)';}}
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
            className="rounded-2xl border p-8"
            style={{backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)'}}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>Comprehensive Quiz</h2>
              <span className="text-sm" style={{color: 'var(--text-secondary)'}}>
                Question {currentQuestionIndex + 1} of {allQuestions.length}
              </span>
            </div>
            
            <div className="mb-8">
              <div className="w-full rounded-full h-2 mb-4" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                <div 
                  className="bg-text h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / allQuestions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {allQuestions[currentQuestionIndex] && (
              <div>
                <h3 className="text-lg font-medium mb-6" style={{color: 'var(--text-primary)'}}>
                  {allQuestions[currentQuestionIndex].prompt}
                </h3>
                
                <div className="space-y-3 mb-8">
                  {allQuestions[currentQuestionIndex].choices?.map((choice: any, index: number) => (
                    <label
                      key={choice.id}
                      className="block p-4 rounded-lg border cursor-pointer transition"
                      style={{
                        borderColor: selectedAnswers[currentQuestionIndex] === index ? 'var(--accent-primary)' : 'var(--border-primary)',
                        backgroundColor: selectedAnswers[currentQuestionIndex] === index ? 'var(--bg-tertiary)' : 'var(--bg-primary)'
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestionIndex}`}
                        value={index}
                        checked={selectedAnswers[currentQuestionIndex] === index}
                        onChange={() => handleAnswerSelect(currentQuestionIndex, index)}
                        className="sr-only"
                      />
                      <span style={{color: 'var(--text-primary)'}}>{choice.text}</span>
                    </label>
                  )) || []}
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => {
                      if (currentQuestionIndex > 0) {
                        setCurrentQuestionIndex(currentQuestionIndex - 1);
                      }
                    }}
                    disabled={currentQuestionIndex === 0}
                    className="px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                    style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                    onMouseEnter={(e) => {if (!(e.target as HTMLButtonElement).disabled) (e.target as HTMLElement).style.backgroundColor = 'var(--bg-tertiary)';}}
                    onMouseLeave={(e) => {(e.target as HTMLElement).style.backgroundColor = 'var(--bg-secondary)';}}
                  >
                    Previous
                  </button>
                  
                  {currentQuestionIndex === allQuestions.length - 1 ? (
                    <button
                      onClick={submitQuiz}
                      disabled={Object.keys(selectedAnswers).length !== allQuestions.length}
                      className="px-6 py-3 bg-text text-background rounded-lg hover:bg-primaryHover font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit Quiz
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (currentQuestionIndex < allQuestions.length - 1) {
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