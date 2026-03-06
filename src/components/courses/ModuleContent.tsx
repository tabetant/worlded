"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookOpen, CheckCircle, ExternalLink, XCircle } from "lucide-react";
import Link from "next/link";
import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { motion, useScroll, useSpring, AnimatePresence } from "framer-motion";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ModuleCompletionToggle } from "./ModuleCompletionToggle";
import { saveQuizScore } from "@/app/actions/quiz";

// ---------------------------------------------------------------------------
// Module-specific quiz feedback
// ---------------------------------------------------------------------------
type FeedbackEntry = { correct: string; incorrect: string };

const MODULE_FEEDBACK: Record<string, FeedbackEntry> = {
    limits: {
        correct: "Great job! You understand how to evaluate limits. Keep practicing with different types of limit problems.",
        incorrect: "Not quite. Remember: for limits, check if direct substitution works first. If you get 0/0, try factoring or rationalization.",
    },
    derivatives: {
        correct: "Excellent! You've mastered the derivative rules. Practice combining them with more complex functions.",
        incorrect: "Review the power rule: d/dx(xⁿ) = nxⁿ⁻¹. For products, use (fg)′ = f′g + fg′. Don't forget the chain rule when needed!",
    },
    optimization: {
        correct: "Perfect! You know how to find maximum and minimum values. Try more word problems to build intuition.",
        incorrect: "Remember the optimization process: 1) Define variables 2) Write constraint equation 3) Find derivative 4) Set to zero 5) Verify max/min.",
    },
    integration: {
        correct: "Outstanding! You understand integration fundamentals. The Fundamental Theorem connects derivatives and integrals beautifully.",
        incorrect: "Review: Integration is the reverse of differentiation. ∫xⁿ dx = xⁿ⁺¹/(n+1) + C. Don't forget the constant of integration!",
    },
    vectors: {
        correct: "Great work! You understand the core properties of vectors. Try visualizing them geometrically for deeper intuition.",
        incorrect: "Review: a vector has both magnitude and direction. Vector addition is done component-wise; scalar multiplication scales the length.",
    },
    gaussian: {
        correct: "Excellent! You've got Gaussian Elimination down. Try applying it to larger systems for more practice.",
        incorrect: "Review: the goal is Row Echelon Form. Use row operations to create zeros below each pivot, then back-substitute.",
    },
    matrix: {
        correct: "Great job! You understand matrix operations. Remember: AB ≠ BA in general — multiplication is not commutative.",
        incorrect: "Review: to multiply A (m×n) by B (n×p), the inner dimensions must match. The result is m×p. Addition requires equal dimensions.",
    },
    eigen: {
        correct: "Outstanding! Eigenvectors and eigenvalues are key to many advanced applications. Well done.",
        incorrect: "Review: Av = λv. An eigenvector only gets scaled (not rotated). Solve det(A − λI) = 0 to find eigenvalues first.",
    },
};

function getQuizFeedback(moduleTitle: string, isCorrect: boolean): string {
    const t = moduleTitle.toLowerCase();
    let entry: FeedbackEntry | undefined;
    if (t.includes("limit") || t.includes("continuity")) entry = MODULE_FEEDBACK.limits;
    else if (t.includes("power") || t.includes("product") || t.includes("rule")) entry = MODULE_FEEDBACK.derivatives;
    else if (t.includes("optim")) entry = MODULE_FEEDBACK.optimization;
    else if (t.includes("integr")) entry = MODULE_FEEDBACK.integration;
    else if (t.includes("vector")) entry = MODULE_FEEDBACK.vectors;
    else if (t.includes("gaussian") || t.includes("elimination")) entry = MODULE_FEEDBACK.gaussian;
    else if (t.includes("matrix") || t.includes("matrices")) entry = MODULE_FEEDBACK.matrix;
    else if (t.includes("eigen")) entry = MODULE_FEEDBACK.eigen;
    return isCorrect
        ? (entry?.correct ?? "Correct! Well done.")
        : (entry?.incorrect ?? "Not quite — review the material and try again.");
}

// ---------------------------------------------------------------------------
// Module-specific key concepts (shown in sidebar)
// ---------------------------------------------------------------------------
type Concept = { term: string; definition: string };

const MODULE_CONCEPTS: Record<string, Concept[]> = {
    limits: [
        { term: "One-sided limits", definition: "The limit of a function as x approaches a value from one direction (left or right) only." },
        { term: "Infinite limits", definition: "Limits where the function grows without bound as x approaches a point — indicating a vertical asymptote." },
        { term: "Continuity", definition: "A function is continuous at c if: f(c) is defined, the limit exists, and the limit equals f(c)." },
        { term: "Squeeze theorem", definition: "If g(x) ≤ f(x) ≤ h(x) and lim g = lim h = L, then lim f = L." },
        { term: "Discontinuity", definition: "A point where continuity fails: removable (hole), jump, or infinite (asymptote)." },
    ],
    derivatives: [
        { term: "Power rule", definition: "d/dx(xⁿ) = nxⁿ⁻¹. The exponent comes down and decreases by one." },
        { term: "Product rule", definition: "(fg)′ = f′g + fg′. 'Left d-Right plus Right d-Left'." },
        { term: "Quotient rule", definition: "(f/g)′ = (f′g − fg′) / g². 'Lo d-Hi minus Hi d-Lo over Lo squared'." },
        { term: "Chain rule", definition: "d/dx[f(g(x))] = f′(g(x)) · g′(x). Derivative of outer × derivative of inner." },
        { term: "Higher-order derivatives", definition: "Applying differentiation repeatedly: f′′ is the second derivative, f′′′ the third, etc." },
    ],
    optimization: [
        { term: "Critical points", definition: "Points where f′(x) = 0 or f′(x) is undefined — candidates for local max or min." },
        { term: "First derivative test", definition: "If f′ changes from + to − at c, it's a local max. If − to +, it's a local min." },
        { term: "Second derivative test", definition: "If f′(c) = 0 and f′′(c) < 0, local max. If f′′(c) > 0, local min." },
        { term: "Absolute extrema", definition: "The global maximum or minimum of a function over a closed interval [a, b]." },
        { term: "Related rates", definition: "Using implicit differentiation to relate the rates of change of two or more quantities." },
    ],
    integration: [
        { term: "Antiderivative", definition: "A function F such that F′ = f. Integration finds antiderivatives." },
        { term: "Indefinite integral", definition: "∫f(x) dx = F(x) + C, where C is the constant of integration." },
        { term: "Definite integral", definition: "∫ₐᵇ f(x) dx gives the net signed area between f and the x-axis from a to b." },
        { term: "FTC", definition: "Fundamental Theorem of Calculus: ∫ₐᵇ f(x) dx = F(b) − F(a) if F is an antiderivative of f." },
        { term: "Area under curve", definition: "A definite integral computes the net area between the curve and the x-axis." },
    ],
    vectors: [
        { term: "Magnitude", definition: "The length of a vector, computed as √(x² + y²) in ℝ²." },
        { term: "Scalar multiplication", definition: "Multiplying a vector by a number scales its length without changing direction (unless negative)." },
        { term: "Dot product", definition: "a · b = |a||b|cos θ. Measures how aligned two vectors are; zero means perpendicular." },
        { term: "Unit vector", definition: "A vector of length 1, obtained by dividing a vector by its magnitude." },
        { term: "Span", definition: "The set of all vectors reachable by linear combinations of a given set of vectors." },
    ],
    gaussian: [
        { term: "Pivot", definition: "The leading non-zero entry in a row; used to eliminate values below it." },
        { term: "Row Echelon Form", definition: "An upper-triangular matrix form with pivots moving right as rows go down." },
        { term: "RREF", definition: "Reduced Row Echelon Form: each pivot is 1 and the only non-zero entry in its column." },
        { term: "Back substitution", definition: "Solving for variables from the bottom equation up once REF is achieved." },
        { term: "Augmented matrix", definition: "The coefficient matrix extended with the constants column [A|b]." },
    ],
    matrix: [
        { term: "Matrix multiplication", definition: "(AB)ᵢⱼ = Σ AᵢₖBₖⱼ. Inner dimensions must match; result is m×p for (m×n)(n×p)." },
        { term: "Transpose", definition: "Aᵀ flips A across its diagonal: rows become columns." },
        { term: "Identity matrix", definition: "The matrix I where AI = IA = A. Diagonal of 1s, rest 0s." },
        { term: "Inverse", definition: "A⁻¹ satisfies AA⁻¹ = I. Only square matrices with non-zero determinants are invertible." },
        { term: "Determinant", definition: "A scalar det(A) indicating if a matrix is invertible (non-zero) and how it scales area/volume." },
    ],
    eigen: [
        { term: "Eigenvector", definition: "A non-zero vector v such that Av = λv — it only gets scaled, never rotated." },
        { term: "Eigenvalue", definition: "The scalar λ in Av = λv; represents the scaling factor applied to an eigenvector." },
        { term: "Characteristic equation", definition: "det(A − λI) = 0. Solving this gives the eigenvalues of A." },
        { term: "Diagonalization", definition: "Writing A = PDP⁻¹ where D is diagonal with eigenvalues, P has eigenvectors as columns." },
        { term: "Linear Transformation", definition: "A function between vector spaces preserving addition and scalar multiplication." },
    ],
};

function getKeyConcepts(moduleTitle: string): Concept[] {
    const t = moduleTitle.toLowerCase();
    if (t.includes("limit") || t.includes("continuity")) return MODULE_CONCEPTS.limits;
    if (t.includes("power") || t.includes("product") || t.includes("rule")) return MODULE_CONCEPTS.derivatives;
    if (t.includes("optim")) return MODULE_CONCEPTS.optimization;
    if (t.includes("integr")) return MODULE_CONCEPTS.integration;
    if (t.includes("vector")) return MODULE_CONCEPTS.vectors;
    if (t.includes("gaussian") || t.includes("elimination")) return MODULE_CONCEPTS.gaussian;
    if (t.includes("matrix") || t.includes("matrices")) return MODULE_CONCEPTS.matrix;
    if (t.includes("eigen")) return MODULE_CONCEPTS.eigen;
    return [];
}

type QuizQuestion = {
    question: string;
    options: string[];
    correctAnswer: string;
};

interface ModuleContentProps {
    courseId: string;
    moduleId: string;
    moduleTitle: string;
    contentMarkdown: string;
    youtubeUrl?: string | null;
    textbookUrl?: string | null;
    quizzes: QuizQuestion[];
    videoUrl?: string | null;
    initialCompleted?: boolean;
}

export default function ModuleContent({
    courseId,
    moduleId,
    moduleTitle,
    contentMarkdown,
    youtubeUrl,
    textbookUrl,
    quizzes,
    initialCompleted = false
}: ModuleContentProps) {
    const [showQuiz, setShowQuiz] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ container: scrollRef });
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    return (
        <div className="container mx-auto h-[calc(100vh-4rem)] overflow-hidden flex flex-col lg:flex-row relative">
            {/* Reading Progress Bar */}
            <motion.div
                className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] z-50 origin-left"
                style={{ scaleX }}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden border-r bg-background">
                <div className="p-4 border-b flex flex-col gap-2 bg-[var(--primary)]/5">
                    {/* Breadcrumbs */}
                    <div className="flex items-center text-xs text-[var(--text-muted)] gap-2 mb-1">
                        <Link href="/dashboard" className="hover:text-[var(--primary)] transition-colors">Courses</Link>
                        <span>/</span>
                        <Link href={`/courses/${courseId}`} className="hover:text-[var(--primary)] transition-colors capitalize">{courseId.replace('-', ' ')}</Link>
                        <span>/</span>
                        <span className="font-semibold text-[var(--primary)] truncate max-w-[200px]">{moduleTitle}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href={`/courses/${courseId}`}>
                            <Button variant="ghost" size="icon" className="hover:bg-[var(--primary)]/10 text-[var(--primary)]">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-[var(--primary)] flex items-center gap-2">
                                {moduleTitle}
                            </h1>
                        </div>
                        <ModuleCompletionToggle
                            moduleId={moduleId}
                            courseId={courseId}
                            initialCompleted={initialCompleted}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 p-8 h-[calc(100vh-200px)]" viewportRef={scrollRef}>
                    <div className="prose prose-blue dark:prose-invert max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                        >
                            {contentMarkdown || "No content available."}
                        </ReactMarkdown>
                    </div>

                    <div className="mt-12 mb-8">
                        <Separator className="mb-8" />
                        <h2 className="text-2xl font-bold mb-4 text-[var(--primary)]">Knowledge Check</h2>
                        {!showQuiz ? (
                            <div className="bg-[var(--primary)]/5 p-8 rounded-2xl text-center border border-[var(--primary)]/20">
                                <p className="mb-4 text-[var(--text-muted)]">Ready to test your understanding of this module?</p>
                                <Button onClick={() => setShowQuiz(true)} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl px-8">
                                    Start Quiz
                                </Button>
                            </div>
                        ) : (
                            <QuizInterface quizzes={quizzes} moduleId={moduleId} courseId={courseId} moduleTitle={moduleTitle} />
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Sidebar / Resources */}
            <div className="w-full lg:w-80 bg-white p-4 border-l overflow-y-auto h-[calc(100vh-4rem)]">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-[var(--primary)]">
                    <BookOpen className="w-4 h-4" /> Recommended Resources
                </h3>

                <div className="space-y-6">
                    {/* Video Embed */}
                    {youtubeUrl && (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Video Lecture
                            </label>
                            <div className="aspect-video rounded-lg overflow-hidden border shadow-sm bg-black">
                                <iframe
                                    src={youtubeUrl}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    )}

                    <Separator />

                    {/* Textbook Link */}
                    {textbookUrl && (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Reading Material
                            </label>
                            <Link href={textbookUrl} target="_blank" rel="noopener noreferrer">
                                <Card className="hover:bg-[var(--primary)]/5 transition-colors border-l-4 border-l-[var(--primary)]">
                                    <CardContent className="p-3 flex items-start gap-3">
                                        <div className="p-2 bg-[var(--primary)]/10 rounded-md">
                                            <BookOpen className="w-4 h-4 text-[var(--primary)]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Textbook Resource</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                External Link <ExternalLink className="w-3 h-3" />
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    )}
                </div>

                <Separator className="my-6" />

                {/* Key Concepts — dynamic per module */}
                {getKeyConcepts(moduleTitle).length > 0 && (
                    <div>
                        <h3 className="font-semibold mb-4 flex items-center gap-2 text-[var(--primary)]">
                            <BookOpen className="w-4 h-4" /> Key Concepts
                        </h3>
                        <div className="space-y-3">
                            <TooltipProvider>
                                <div className="flex flex-wrap gap-2">
                                    {getKeyConcepts(moduleTitle).map(({ term, definition }) => (
                                        <Tooltip key={term}>
                                            <TooltipTrigger asChild>
                                                <div className="cursor-help px-3 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg text-xs font-medium border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 transition-colors">
                                                    {term}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs bg-[var(--primary)] text-white border-[var(--primary)]">
                                                <p>{definition}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                </div>
                            </TooltipProvider>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function QuizInterface({ quizzes, moduleId, courseId, moduleTitle }: { quizzes: QuizQuestion[]; moduleId: string; courseId: string; moduleTitle: string }) {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    if (!quizzes || quizzes.length === 0) {
        return <div className="text-muted-foreground">No quiz questions available for this module.</div>;
    }

    const question = quizzes[currentQuestion];

    const handleSubmit = () => {
        if (!selectedOption) return;
        setIsSubmitted(true);
        if (selectedOption === question.correctAnswer) {
            setScore(score + 1);
        }
    };

    const handleNext = () => {
        if (currentQuestion < quizzes.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            setSelectedOption(null);
            setIsSubmitted(false);
        } else {
            setIsComplete(true);
            // `score` is already updated by handleSubmit via setScore — do NOT add 1 again.
            // Adding 1 here caused 133% when all answers correct (double-counted last question).
            saveQuizScore(moduleId, courseId, score, quizzes.length).catch(console.error);
        }
    };

    if (isComplete) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    boxShadow: ["0 0 0 0 rgba(99, 102, 241, 0)", "0 0 0 20px rgba(99, 102, 241, 0)"],
                }}
                transition={{
                    duration: 0.5,
                    boxShadow: {
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "loop"
                    }
                }}
                className="bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-2xl p-8 text-center"
            >
                <div className="relative inline-block">
                    <CheckCircle className="w-12 h-12 text-[var(--success)] mx-auto mb-4 relative z-10" />
                    <motion.div
                        className="absolute inset-0 bg-[var(--primary)] rounded-full z-0"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                </div>
                <h3 className="text-xl font-bold text-[var(--success)] mb-2">Quiz Complete!</h3>
                <p className="text-[var(--success)] mb-4">You scored {score} out of {quizzes.length}</p>
                <div className="flex justify-center gap-4">
                    <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl">
                        Retake Quiz
                    </Button>
                    <Link href="/dashboard">
                        <Button className="bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-xl">
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="bg-card border rounded-xl p-6 shadow-sm overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-medium text-muted-foreground">Question {currentQuestion + 1} of {quizzes.length}</span>
                <span className="text-sm font-medium text-[var(--worlded-blue)]">Score: {score}</span>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentQuestion}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <h3 className="text-lg font-semibold mb-6">{question.question}</h3>

                    <div className="space-y-3 mb-6">
                        {question.options.map((option, idx) => {
                            const isSelected = selectedOption === option;

                            let btnClass = "w-full justify-start h-auto py-4 px-6 text-left hover:bg-[var(--primary)]/5 transition-colors border border-[var(--border-subtle)] rounded-xl relative overflow-hidden";
                            let animate = {};

                            if (isSubmitted) {
                                if (option === question.correctAnswer) {
                                    btnClass = "w-full justify-start h-auto py-4 px-6 text-left bg-[var(--success)]/10 border-[var(--success)] text-[var(--success)] ring-1 ring-[var(--success)] rounded-xl";
                                    animate = { scale: [1, 1.02, 1] }; // Pulse
                                } else if (isSelected) {
                                    btnClass = "w-full justify-start h-auto py-4 px-6 text-left bg-red-50 border-red-500 text-red-900 rounded-xl";
                                    animate = { x: [-5, 5, -5, 5, 0] }; // Shake
                                }
                            } else if (isSelected) {
                                btnClass = "w-full justify-start h-auto py-4 px-6 text-left bg-[var(--primary)]/5 border-[var(--primary)] text-[var(--primary)] ring-1 ring-[var(--primary)] rounded-xl";
                            }

                            return (
                                <motion.button
                                    key={idx}
                                    className={`relative flex items-center rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${btnClass}`}
                                    onClick={() => !isSubmitted && setSelectedOption(option)}
                                    disabled={isSubmitted}
                                    animate={animate}
                                    transition={{ duration: 0.4 }}
                                >
                                    {option}
                                    {isSubmitted && option === question.correctAnswer && <CheckCircle className="ml-auto w-5 h-5 text-[var(--success)]" />}
                                    {isSubmitted && isSelected && option !== question.correctAnswer && <XCircle className="ml-auto w-5 h-5 text-red-600" />}
                                </motion.button>
                            );
                        })}
                    </div>

                    {isSubmitted && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`border rounded-xl p-4 mb-6 ${
                                selectedOption === question.correctAnswer
                                    ? "bg-[var(--success)]/5 border-[var(--success)]/20"
                                    : "bg-red-50 border-red-200"
                            }`}
                        >
                            <h4 className={`font-semibold flex items-center gap-2 mb-1 ${
                                selectedOption === question.correctAnswer
                                    ? "text-[var(--success)]"
                                    : "text-red-700"
                            }`}>
                                {selectedOption === question.correctAnswer
                                    ? <><CheckCircle className="w-4 h-4" /> Well done!</>
                                    : <><XCircle className="w-4 h-4" /> Study tip</>
                                }
                            </h4>
                            <p className={`text-sm ${
                                selectedOption === question.correctAnswer
                                    ? "text-[var(--success)]/80"
                                    : "text-red-700/80"
                            }`}>
                                {getQuizFeedback(moduleTitle, selectedOption === question.correctAnswer)}
                            </p>
                        </motion.div>
                    )}
                </motion.div>
            </AnimatePresence>

            <div className="flex justify-end">
                {!isSubmitted ? (
                    <Button
                        onClick={handleSubmit}
                        disabled={!selectedOption}
                        className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl"
                    >
                        Submit Answer
                    </Button>
                ) : (
                    <Button
                        onClick={handleNext}
                        className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl"
                    >
                        {currentQuestion < quizzes.length - 1 ? "Next Question" : "Finish Quiz"}
                    </Button>
                )}
            </div>
        </div>
    );
}
