// Test script to validate ContentValidator is working correctly

// Inline ContentValidator class for testing
class ContentValidator {
    constructor() {
        this.placeholderPatterns = [
            // Specific bracket patterns (not all brackets)
            /\[(?:topic|concept|field|question|answer|content|subject|chapter|lesson)\]/gi,
            /\[(?:question \d+|answer \d+|option [a-z])\]/gi,
            
            // Common placeholder words
            /\b(sample|example|placeholder|generic|default|template)\b/gi,
            /\b(lorem ipsum|dolor sit amet)\b/gi,
            /\b(your \w+|the \w+)\s+(here|above|below)\b/gi,
            
            // Content patterns
            /\b(will be|to be|should be)\s+(discussed|covered|explained|provided)\b/gi,
            /\b(various|different|several)\s+(topics|concepts|items|points)\b/gi,
            /\bthis (video|content|material|section) covers?\b/gi,
            
            // Question patterns
            /^(Question \d+|Q\d+|Sample question)/i,
            /^(What is|Define|Explain|Describe)\s+\w+\?$/i,
            
            // Answer patterns  
            /^(Answer|A\d+|Option [A-Z]|Sample answer)/i,
            /^(This is|It is|The answer is)\b/i,
            
            // Generic responses
            /\b(etc\.?|and so on|among others)\b/gi
        ];
    }
    
    validateContent(content) {
        if (!content || typeof content !== 'object') {
            throw new Error('Content must be a valid object');
        }
        
        const contentStr = JSON.stringify(content).toLowerCase();
        
        for (const pattern of this.placeholderPatterns) {
            const match = pattern.exec(contentStr);
            if (match) {
                throw new Error(`Placeholder pattern detected: ${pattern.source} (matched: "${match[0]}")`);
            }
        }
        
        return true;
    }
}

console.log('🧪 Testing ContentValidator functionality...\n');

const validator = new ContentValidator();

// Test cases with placeholder patterns
const testCases = [
    {
        name: "Valid content",
        content: {
            summary: "This comprehensive summary covers machine learning algorithms and their practical applications in data science field.",
            flashcards: [
                { front: "Define supervised learning", back: "A type of machine learning where algorithms learn from labeled training data." }
            ],
            quiz: [
                { question: "Which algorithm works best for classification tasks?", options: ["Linear Regression", "Random Forest", "K-Means", "PCA"], correctAnswer: 1 }
            ]
        },
        shouldPass: true
    },
    {
        name: "Placeholder summary",
        content: {
            summary: "This is a sample summary about [TOPIC] and its applications in [FIELD].",
            flashcards: [
                { front: "Real question", back: "Real answer" }
            ],
            quiz: [
                { question: "Real question?", options: ["A", "B", "C", "D"], correctAnswer: 1 }
            ]
        },
        shouldPass: false
    },
    {
        name: "Placeholder flashcard",
        content: {
            summary: "Valid summary content",
            flashcards: [
                { front: "What is [CONCEPT]?", back: "This is a sample answer about the topic." }
            ],
            quiz: [
                { question: "Real question?", options: ["A", "B", "C", "D"], correctAnswer: 1 }
            ]
        },
        shouldPass: false
    },
    {
        name: "Generic placeholder content",
        content: {
            summary: "This video covers various topics including content that will be discussed.",
            flashcards: [
                { front: "Generic question", back: "Generic answer" }
            ],
            quiz: [
                { question: "Sample question?", options: ["Option A", "Option B", "Option C", "Option D"], correctAnswer: 0 }
            ]
        },
        shouldPass: false
    }
];

// Run tests
for (const testCase of testCases) {
    try {
        console.log(`Testing: ${testCase.name}`);
        const isValid = validator.validateContent(testCase.content);
        
        if (isValid === testCase.shouldPass) {
            console.log(`✅ PASS: ${testCase.name} - Expected ${testCase.shouldPass ? 'valid' : 'invalid'}, got ${isValid ? 'valid' : 'invalid'}\n`);
        } else {
            console.log(`❌ FAIL: ${testCase.name} - Expected ${testCase.shouldPass ? 'valid' : 'invalid'}, got ${isValid ? 'valid' : 'invalid'}\n`);
        }
    } catch (error) {
        if (!testCase.shouldPass) {
            console.log(`✅ PASS: ${testCase.name} - Correctly rejected with error: ${error.message}\n`);
        } else {
            console.log(`❌ FAIL: ${testCase.name} - Unexpected error: ${error.message}\n`);
        }
    }
}

console.log('🏁 ContentValidator testing complete!');