import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import {
    getAuth,
    signInAnonymously,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    setDoc,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

import {
    getAI,
    getGenerativeModel,
    GoogleAIBackend
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-ai.js";


/* =========================================
   FIREBASE CONFIG
========================================= */

const firebaseConfig = {
    apiKey: "AIzaSyA8t5CRyHCVpGS4J22wM_MGUlAACRJIv-o",
    authDomain: "mindprobe-f7bdb.firebaseapp.com",
    projectId: "mindprobe-f7bdb",
    storageBucket: "mindprobe-f7bdb.firebasestorage.app",
    messagingSenderId: "984167288351",
    appId: "1:984167288351:web:6d2e328e731b9343ea0f2a",
    measurementId: "G-0ZB4T43G2F"
};


/* =========================================
   INITIALIZE FIREBASE
========================================= */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


/* =========================================
   FIREBASE AI (GEMINI)
========================================= */

const ai = getAI(app, {
    backend: new GoogleAIBackend()
});

const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash",
    generationConfig: {
        responseMimeType: "application/json"
    }
});


/* =========================================
   SIGN IN (ANONYMOUS FALLBACK)

   Waits for Firebase to restore any saved
   session first, so a logged-in user is not
   replaced by a new anonymous user.
   Never throws, so the rest of the app
   still loads if sign-in fails.
========================================= */

async function initializeUser() {

    try {

        await auth.authStateReady();

        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }

    } catch (error) {

        console.error(
            "Anonymous sign-in failed. Enable it in Firebase Console → Authentication → Sign-in method → Anonymous.",
            error
        );

    }

}

await initializeUser();


/* =========================================
   GET CURRENT USER
========================================= */

function getCurrentUser() {
    return auth.currentUser;
}


/* =========================================
   GET USER PROFILE
========================================= */

async function getUserProfile() {

    const user = getCurrentUser();

    if (!user) {
        throw new Error("User is not authenticated.");
    }

    const userRef = doc(db, "users", user.uid);

    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {

        const defaultProfile = {

            uid: user.uid,

            level: "College",

            dailyTime: "30 minutes",

            preferredTopic: "Let MindProbe Choose",

            competency: {
                Variables: 50,
                Conditions: 50,
                Loops: 50,
                Functions: 50,
                Recursion: 50
            },

            weakTopics: [],

            errorPatterns: [],

            totalQuestions: 0,

            correctAnswers: 0,

            createdAt: serverTimestamp(),

            updatedAt: serverTimestamp()

        };

        await setDoc(userRef, defaultProfile);

        return defaultProfile;

    }

    return snapshot.data();

}


/* =========================================
   SAVE USER PROFILE
========================================= */

async function saveUserProfile(profile) {

    const user = getCurrentUser();

    if (!user) {
        throw new Error("User is not authenticated.");
    }

    const userRef = doc(db, "users", user.uid);

    await setDoc(
        userRef,
        {
            ...profile,
            updatedAt: serverTimestamp()
        },
        { merge: true }
    );

}


/* =========================================
   HELPER: READ QUERY INTO ARRAY
========================================= */

async function readQuestions(q) {

    const snapshot = await getDocs(q);

    const items = [];

    snapshot.forEach(docSnapshot => {
        items.push({
            id: docSnapshot.id,
            ...docSnapshot.data()
        });
    });

    return items;

}


/* =========================================
   GET QUESTIONS (LEVEL + TOPIC)
========================================= */

async function getQuestions(level, topic) {

    const q = query(
        collection(db, "questionBank"),
        where("level", "==", level),
        where("topic", "==", topic),
        where("active", "==", true)
    );

    return readQuestions(q);

}


/* =========================================
   GET ALL QUESTIONS FOR LEVEL
========================================= */

async function getQuestionsByLevel(level) {

    const q = query(
        collection(db, "questionBank"),
        where("level", "==", level),
        where("active", "==", true)
    );

    return readQuestions(q);

}


/* =========================================
   GET PREVIOUS ATTEMPTS
========================================= */

async function getPreviousAttempts() {

    const user = getCurrentUser();

    if (!user) return [];

    const q = query(
        collection(db, "attempts"),
        where("uid", "==", user.uid)
    );

    return readQuestions(q);

}


/* =========================================
   SAVE ATTEMPT
========================================= */

async function saveAttempt(attempt) {

    const user = getCurrentUser();

    if (!user) {
        throw new Error("User is not authenticated.");
    }

    await addDoc(collection(db, "attempts"), {
        ...attempt,
        uid: user.uid,
        createdAt: serverTimestamp()
    });

}


/* =========================================
   CHOOSE DIFFICULTY
========================================= */

function chooseDifficulty(competency) {

    if (competency < 40) return "Easy";

    if (competency < 70) return "Medium";

    return "Hard";

}


/* =========================================
   ADAPTIVE ENGINE
========================================= */

async function selectNextQuestion(level, topic) {

    const profile = await getUserProfile();

    let selectedTopic = topic;

    /* Let MindProbe choose the weakest topic */

    if (!selectedTopic || selectedTopic === "Let MindProbe Choose") {

        const sortedTopics = Object.entries(
            profile.competency || {}
        ).sort((a, b) => a[1] - b[1]);

        if (sortedTopics.length > 0) {
            selectedTopic = sortedTopics[0][0];
        }

    }

    /* Get questions, falling back to the whole level */

    let questions = await getQuestions(level, selectedTopic);

    if (questions.length === 0) {
        questions = await getQuestionsByLevel(level);
    }

    if (questions.length === 0) {
        throw new Error("No questions found.");
    }

    /* Previous attempts */

    const attempts = await getPreviousAttempts();

    const answeredIds = new Set(
        attempts.map(attempt => attempt.questionId)
    );

    /* Score questions */

    const topicCompetency = Number(
        profile.competency?.[selectedTopic] ?? 50
    );

    const desiredDifficulty = chooseDifficulty(topicCompetency);

    const scoredQuestions = questions.map(question => {

        let score = 0;

        if (question.difficulty === desiredDifficulty) {
            score += 40;
        }

        if (profile.weakTopics?.includes(question.subtopic)) {
            score += 30;
        }

        if (profile.weakTopics?.includes(question.prerequisite)) {
            score += 20;
        }

        if (answeredIds.has(question.id)) {
            score -= 50;
        } else {
            score += 20;
        }

        return {
            ...question,
            adaptiveScore: score
        };

    });

    scoredQuestions.sort((a, b) => b.adaptiveScore - a.adaptiveScore);

    return scoredQuestions[0];

}


/* =========================================
   GEMINI ANALYSIS
========================================= */

async function analyzeAnswerWithGemini({
    question,
    selectedAnswer,
    reasoning,
    confidence,
    isCorrect,
    profile
}) {

    // Supports both "correctAnswer" (Firestore) and "correct" (local data)
    const correctIndex = question.correctAnswer ?? question.correct;

    const prompt = `
You are the diagnostic AI for MindProbe.

Your purpose is to diagnose the learner,
not simply say whether the answer is correct.

Student level:
${profile.level}

Topic:
${question.topic}

Subtopic:
${question.subtopic ?? "N/A"}

Question:
${question.question}

Options:
${JSON.stringify(question.options)}

Correct answer:
${question.options[correctIndex]}

Student answer:
${question.options[selectedAnswer]}

Is correct:
${isCorrect}

Student reasoning:
${reasoning}

Confidence:
${confidence}/5

Current competency:
${JSON.stringify(profile.competency)}

Analyze the learner.

Identify:

1. Error pattern
2. Learning gap
3. Prerequisite gap
4. Reasoning quality
5. Recommended next action
6. Suggested next difficulty
7. Suggested next topic

Return ONLY valid JSON:

{
  "errorPattern": "...",
  "learningGap": "...",
  "prerequisiteGap": "...",
  "reasoningQuality": "...",
  "recommendedAction": "...",
  "nextDifficulty": "...",
  "nextTopic": "..."
}
`;

    const fallback = {
        errorPattern: "Analysis unavailable",
        learningGap: "No clear gap detected",
        prerequisiteGap: "None detected",
        reasoningQuality: "Not available",
        recommendedAction: "Continue practicing",
        nextDifficulty: question.difficulty,
        nextTopic: question.topic
    };

    try {

        const result = await model.generateContent(prompt);

        // Strip ```json fences in case the model adds them
        const text = result.response
            .text()
            .replace(/```json|```/g, "")
            .trim();

        return JSON.parse(text);

    } catch (error) {

        console.error("Gemini analysis failed:", error);

        return fallback;

    }

}


/* =========================================
   LOGIN & SIGN UP FUNCTIONS
========================================= */

async function registerUser(email, password) {

    const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
    );

    return userCredential.user;

}


async function loginUser(email, password) {

    const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
    );

    return userCredential.user;

}


async function loginWithGoogle() {

    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(auth, provider);

    return result.user;

}


async function logoutUser() {
    await signOut(auth);
}


/* =========================================
   EXPORTS
========================================= */

export {

    app,
    auth,
    db,
    model,

    onAuthStateChanged,

    getCurrentUser,
    getUserProfile,
    saveUserProfile,

    getQuestions,
    getQuestionsByLevel,
    getPreviousAttempts,
    saveAttempt,

    selectNextQuestion,
    analyzeAnswerWithGemini,

    registerUser,
    loginUser,
    loginWithGoogle,
    logoutUser

};