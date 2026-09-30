/* =========================================
   MINDPROBE FRONTEND
   Mock/local-data version

   NOTE: This file uses an ES module import,
   so index.html must load it with:
   <script type="module" src="app.js"></script>
========================================= */

import { selectNextQuestion } from "./firebase.js";


/* =========================================
   APPLICATION STATE
========================================= */

const state = {

    student: {
        name: "Student",
        level: "College",
        dailyTime: "15 min"
    },

    selectedTopic: "Functions",

    onboardingStep: 1,

    currentQuestion: 0,

    selectedAnswer: null,

    confidence: null,

    answers: [],

    questionsAnswered: 0,

    currentStreak: 0,

    finished: false,

    competency: {
        Variables: 90,
        Conditions: 80,
        Loops: 60,
        Functions: 40,
        Recursion: 45,
        Algebra: 70
    },

    learningGap: "Function Parameters",

    errorPattern: "Confusing parameters and arguments"

};


/* =========================================
   QUESTION DATABASE

   This is temporary frontend data.

   Later these questions will come
   from Firestore.
========================================= */

const questionBank = [

    {
        id: 1,
        topic: "Functions",
        difficulty: "Easy",
        question: "What is a parameter in a function?",
        options: [
            "A variable defined by a function that receives a value",
            "A value returned by a function",
            "A loop inside a function",
            "A type of comment"
        ],
        correct: 0,
        explanation:
            "A parameter is a variable defined by a function that receives a value when the function is called."
    },

    {
        id: 2,
        topic: "Functions",
        difficulty: "Medium",
        question:
            "Consider: function add(a, b). In add(5, 10), what are 5 and 10?",
        options: [
            "Parameters",
            "Arguments",
            "Variables",
            "Functions"
        ],
        correct: 1,
        explanation:
            "The values supplied when calling a function are called arguments."
    },

    {
        id: 3,
        topic: "Functions",
        difficulty: "Medium",
        question:
            "Which statement correctly describes the difference between a parameter and an argument?",
        options: [
            "They are always exactly the same thing",
            "A parameter is defined in the function; an argument is supplied when calling it",
            "An argument is defined inside the function",
            "A parameter can only contain text"
        ],
        correct: 1,
        explanation:
            "Parameters appear in the function definition. Arguments are the actual values passed during the function call."
    },

    {
        id: 4,
        topic: "Recursion",
        difficulty: "Medium",
        question:
            "What is essential for a recursive function to eventually stop?",
        options: [
            "A base case",
            "A database",
            "A loop",
            "A parameter with no value"
        ],
        correct: 0,
        explanation:
            "A recursive function needs a base case to stop further recursive calls."
    },

    {
        id: 5,
        topic: "Variables",
        difficulty: "Easy",
        question: "What is a variable generally used for?",
        options: [
            "Storing a value that a program can use",
            "Deleting the program",
            "Connecting to the internet",
            "Creating a database automatically"
        ],
        correct: 0,
        explanation:
            "Variables provide named storage for values used by a program."
    }

];


/* =========================================
   SMALL HELPERS
========================================= */

function $(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
}

function on(id, eventName, handler) {
    const el = $(id);
    if (el) el.addEventListener(eventName, handler);
}


/* =========================================
   DOM ELEMENTS
========================================= */

const pages = {
    dashboard: $("dashboardPage"),
    practice: $("practicePage"),
    competency: $("competencyPage"),
    resources: $("resourcesPage")
};

const pageTitle = $("pageTitle");
const welcomeText = $("welcomeText");


/* =========================================
   NAVIGATION
========================================= */

document
    .querySelectorAll(".nav-item[data-page]")
    .forEach(button => {

        button.addEventListener("click", () => {
            showPage(button.dataset.page);
        });

    });


function showPage(pageName) {

    Object.values(pages).forEach(page => {
        if (page) page.classList.remove("active-page");
    });

    if (pages[pageName]) {
        pages[pageName].classList.add("active-page");
    }

    document
        .querySelectorAll(".nav-item[data-page]")
        .forEach(button => {

            button.classList.remove("active");

            if (button.dataset.page === pageName) {
                button.classList.add("active");
            }

        });

    const titles = {
        dashboard: "Dashboard",
        practice: "Practice",
        competency: "Competency Dashboard",
        resources: "Learning Resources"
    };

    const subtitles = {
        dashboard: "Welcome back to MindProbe",
        practice: "Let's improve your understanding",
        competency: "Your personalized learning profile",
        resources: "Resources selected for your learning gaps"
    };

    if (pageTitle) {
        pageTitle.textContent = titles[pageName] || "MindProbe";
    }

    if (welcomeText && subtitles[pageName]) {
        welcomeText.textContent = subtitles[pageName];
    }

}


/* =========================================
   START PRACTICE
========================================= */

on("startPracticeBtn", "click", () => {

    showPage("practice");

    startOnboarding();

});


function startOnboarding() {

    $("onboardingScreen").classList.remove("hidden");
    $("quizScreen").classList.add("hidden");
    $("resultScreen").classList.add("hidden");

    state.onboardingStep = 1;

    showOnboardingStep();

}


/* =========================================
   ONBOARDING STEP 1 - LEVEL
========================================= */

document
    .querySelectorAll("[data-level]")
    .forEach(button => {

        button.addEventListener("click", () => {

            state.student.level = button.dataset.level;

            state.onboardingStep = 2;

            showOnboardingStep();

        });

    });


/* =========================================
   ONBOARDING STEP 2 - DAILY TIME
========================================= */

document
    .querySelectorAll("[data-time]")
    .forEach(button => {

        button.addEventListener("click", () => {

            state.student.dailyTime = button.dataset.time;

            state.onboardingStep = 3;

            showOnboardingStep();

        });

    });


/* =========================================
   ONBOARDING STEP 3 - TOPIC
========================================= */

document
    .querySelectorAll("[data-topic]")
    .forEach(button => {

        button.addEventListener("click", () => {

            if (button.classList.contains("adaptive-topic")) {
                state.selectedTopic = chooseAdaptiveTopic();
            } else {
                state.selectedTopic = button.dataset.topic;
            }

            beginQuiz();

        });

    });


/* =========================================
   SHOW ONBOARDING STEP
========================================= */

function showOnboardingStep() {

    document
        .querySelectorAll(".onboarding-step")
        .forEach(step => {
            step.classList.remove("active-step");
        });

    const step = $(`step${state.onboardingStep}`);
    if (step) step.classList.add("active-step");

    setText("onboardingStepNumber", state.onboardingStep);

}


/* =========================================
   ADAPTIVE TOPIC SELECTION

   Temporary frontend version.
========================================= */

function chooseAdaptiveTopic() {

    const entries = Object.entries(state.competency);

    entries.sort((a, b) => a[1] - b[1]);

    return entries[0][0];

}


/* =========================================
   BEGIN QUIZ
========================================= */

function beginQuiz() {

    state.currentQuestion = 0;
    state.answers = [];
    state.questionsAnswered = 0;
    state.finished = false;

    setText("nextQuestionBtn", "Next Question →");

    $("onboardingScreen").classList.add("hidden");
    $("quizScreen").classList.remove("hidden");
    $("resultScreen").classList.add("hidden");

    setText("quizTopic", state.selectedTopic);

    loadQuestion();

}


/* =========================================
   LOAD QUESTION
========================================= */

function loadQuestion() {

    const question = questionBank[state.currentQuestion];

    if (!question) {
        finishAssessment();
        return;
    }

    state.selectedAnswer = null;
    state.confidence = null;

    setText("questionNumber", state.currentQuestion + 1);

    const progress = $("quizProgress");
    if (progress) {
        progress.style.width =
            `${((state.currentQuestion + 1) / questionBank.length) * 100}%`;
    }

    setText("questionText", question.question);

    const answerContainer = $("answerOptions");
    answerContainer.innerHTML = "";

    question.options.forEach((option, index) => {

        const button = document.createElement("button");

        button.className = "answer-option";
        button.textContent = option;

        button.addEventListener("click", () => {
            selectAnswer(index, button);
        });

        answerContainer.appendChild(button);

    });

    const reasoning = $("reasoningInput");
    if (reasoning) reasoning.value = "";

    document
        .querySelectorAll(".confidence-btn")
        .forEach(button => {
            button.classList.remove("selected");
        });

}


/* =========================================
   SELECT ANSWER
========================================= */

function selectAnswer(index, button) {

    state.selectedAnswer = index;

    document
        .querySelectorAll(".answer-option")
        .forEach(option => {
            option.classList.remove("selected");
        });

    button.classList.add("selected");

}


/* =========================================
   CONFIDENCE
========================================= */

document
    .querySelectorAll(".confidence-btn")
    .forEach(button => {

        button.addEventListener("click", () => {

            state.confidence = Number(button.dataset.confidence);

            document
                .querySelectorAll(".confidence-btn")
                .forEach(btn => {
                    btn.classList.remove("selected");
                });

            button.classList.add("selected");

        });

    });


/* =========================================
   SUBMIT ANSWER
========================================= */

on("submitAnswerBtn", "click", submitAnswer);


function submitAnswer() {

    if (state.selectedAnswer === null) {
        alert("Please select an answer.");
        return;
    }

    if (!state.confidence) {
        alert("Please select your confidence level.");
        return;
    }

    const reasoning = $("reasoningInput").value.trim();

    if (!reasoning) {
        alert("Please explain your reasoning.");
        return;
    }

    const question = questionBank[state.currentQuestion];

    const isCorrect = state.selectedAnswer === question.correct;

    const answerData = {

        questionId: question.id,

        topic: question.topic,

        question: question.question,

        selectedAnswer: question.options[state.selectedAnswer],

        correctAnswer: question.options[question.correct],

        isCorrect: isCorrect,

        reasoning: reasoning,

        confidence: state.confidence,

        timestamp: new Date().toISOString()

    };

    state.answers.push(answerData);

    state.questionsAnswered++;

    analyzeAnswer(answerData);

}


/* =========================================
   ANALYZE ANSWER

   Temporary rule-based engine.

   Gemini will later perform deeper
   reasoning analysis.
========================================= */

function analyzeAnswer(answerData) {

    const question = questionBank[state.currentQuestion];

    const confidenceText = getConfidenceText(answerData.confidence);

    let errorText = "None";

    let recommendation = "Continue with a slightly harder question.";

    if (!answerData.isCorrect) {

        errorText = detectErrorPattern(answerData);

        recommendation =
            "MindProbe recommends revisiting the prerequisite concept before increasing difficulty.";

    }

    setText("resultEmoji", answerData.isCorrect ? "🎯" : "🔍");

    setText(
        "resultTitle",
        answerData.isCorrect ? "Correct Answer!" : "Let's Investigate This"
    );

    setText("resultMessage", question.explanation);

    setText(
        "resultCorrectness",
        answerData.isCorrect ? "Correct" : "Incorrect"
    );

    setText("resultConfidence", confidenceText);

    setText("resultError", errorText);

    setText("nextRecommendation", recommendation);

    $("quizScreen").classList.add("hidden");
    $("resultScreen").classList.remove("hidden");

    updateCompetency(answerData);

}


/* =========================================
   CONFIDENCE TEXT
========================================= */

function getConfidenceText(value) {

    const levels = {
        1: "Very Low",
        2: "Low",
        3: "Moderate",
        4: "High",
        5: "Very High"
    };

    return levels[value];

}


/* =========================================
   ERROR DETECTION
========================================= */

function detectErrorPattern(answerData) {

    if (answerData.topic === "Functions") {

        state.learningGap = "Function Parameters";
        state.errorPattern = "Confusing parameters and arguments";

        return state.errorPattern;

    }

    if (answerData.topic === "Recursion") {

        state.learningGap = "Recursion Basics";
        state.errorPattern = "Missing understanding of base cases";

        return state.errorPattern;

    }

    state.learningGap = answerData.topic;
    state.errorPattern = "Conceptual misunderstanding";

    return state.errorPattern;

}


/* =========================================
   UPDATE COMPETENCY
========================================= */

function updateCompetency(answerData) {

    const topic = answerData.topic;

    if (state.competency[topic] === undefined) {
        state.competency[topic] = 50;
    }

    if (answerData.isCorrect) {

        state.competency[topic] =
            Math.min(100, state.competency[topic] + 5);

    } else {

        state.competency[topic] =
            Math.max(0, state.competency[topic] - 5);

    }

    updateDashboard();

}


/* =========================================
   NEXT QUESTION / VIEW COMPETENCY
========================================= */

on("nextQuestionBtn", "click", () => {

    // After the assessment ends, this same button
    // becomes "View Competency".
    if (state.finished) {

        showPage("competency");

        updateCompetencyPage();

        return;

    }

    state.currentQuestion++;

    if (state.currentQuestion >= questionBank.length) {

        finishAssessment();

        return;

    }

    $("resultScreen").classList.add("hidden");
    $("quizScreen").classList.remove("hidden");

    loadQuestion();

});


/* =========================================
   FINISH ASSESSMENT
========================================= */

function finishAssessment() {

    state.finished = true;

    $("quizScreen").classList.add("hidden");
    $("resultScreen").classList.remove("hidden");

    setText("resultEmoji", "🧠");

    setText("resultTitle", "Assessment Complete");

    setText(
        "resultMessage",
        "MindProbe has analyzed your performance and updated your competency profile."
    );

    setText(
        "resultCorrectness",
        `${state.answers.filter(a => a.isCorrect).length}/${state.answers.length}`
    );

    setText("resultConfidence", "Analyzed");

    setText("resultError", state.errorPattern);

    setText(
        "nextRecommendation",
        `Your main learning gap is ${state.learningGap}. We recommend targeted practice on this concept.`
    );

    setText("nextQuestionBtn", "View Competency →");

    updateCompetencyPage();

}


/* =========================================
   UPDATE DASHBOARD
========================================= */

function updateDashboard() {

    setText("questionsAnswered", state.questionsAnswered);

    setText(
        "currentStreak",
        state.questionsAnswered > 0 ? "1 day" : "0 days"
    );

    const values = Object.values(state.competency);

    const average =
        values.reduce((sum, value) => sum + value, 0) / values.length;

    setText("overallCompetency", `${Math.round(average)}%`);

    setText("dailyTarget", state.student.dailyTime);

    setText("mainGap", state.learningGap);

    setText("gapDescription", state.errorPattern);

    setText("studentLevel", `${state.student.level} Level`);

    renderDashboardChart();

}


/* =========================================
   COMPETENCY PAGE
========================================= */

function updateCompetencyPage() {

    setText("diagnosisGap", state.learningGap);

    setText("diagnosisError", state.errorPattern);

    renderConceptList();

    renderRadarChart();

}


/* =========================================
   CONCEPT LIST
========================================= */

function renderConceptList() {

    const container = $("conceptList");

    if (!container) return;

    container.innerHTML = "";

    Object.entries(state.competency).forEach(([concept, value]) => {

        const row = document.createElement("div");

        row.className = "concept-row";

        row.innerHTML = `
            <div class="concept-top">
                <span>${concept}</span>
                <span>${value}%</span>
            </div>
            <div class="concept-progress">
                <div style="width:${value}%"></div>
            </div>
        `;

        container.appendChild(row);

    });

}


/* =========================================
   CHARTS
========================================= */

let competencyChart;

let radarChart;


function renderDashboardChart() {

    const canvas = $("competencyChart");

    if (!canvas || typeof Chart === "undefined") return;

    if (competencyChart) {
        competencyChart.destroy();
    }

    competencyChart = new Chart(canvas, {

        type: "bar",

        data: {
            labels: Object.keys(state.competency),
            datasets: [
                {
                    label: "Competency %",
                    data: Object.values(state.competency),
                    borderRadius: 8
                }
            ]
        },

        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }

    });

}


function renderRadarChart() {

    const canvas = $("competencyRadar");

    if (!canvas || typeof Chart === "undefined") return;

    if (radarChart) {
        radarChart.destroy();
    }

    radarChart = new Chart(canvas, {

        type: "radar",

        data: {
            labels: Object.keys(state.competency),
            datasets: [
                {
                    label: "Competency",
                    data: Object.values(state.competency),
                    borderWidth: 2
                }
            ]
        },

        options: {
            responsive: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }

    });

}


/* =========================================
   VIEW COMPETENCY BUTTON
========================================= */

on("viewCompetencyBtn", "click", () => {

    showPage("competency");

    updateCompetencyPage();

});


/* =========================================
   RESET APPLICATION
========================================= */

on("resetApp", "click", () => {

    const confirmation = confirm(
        "Are you sure you want to reset your progress?"
    );

    if (!confirmation) return;

    location.reload();

});


/* =========================================
   FIRESTORE QUESTION LOADING

   Not wired into the quiz yet. This is a
   working helper for when you're ready to
   replace the local questionBank.
========================================= */

async function loadNextQuestionFromFirebase() {

    try {

        const question = await selectNextQuestion(
            state.student.level,
            state.selectedTopic
        );

        if (!question) {
            console.log("No question found in Firestore.");
            return null;
        }

        console.log("Question loaded from Firestore:", question);

        return question;

    } catch (error) {

        console.error("Error loading question from Firestore:", error);

        return null;

    }

}


/* =========================================
   INITIALIZATION
========================================= */

function initializeApp() {

    updateDashboard();

    renderConceptList();

}


initializeApp();