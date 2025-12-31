const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth } = require('../middleware/auth')

// Educational AI System Prompt
const SYSTEM_CONTEXT = `You are SparkHub AI, an educational learning assistant. Your primary role is to GUIDE students toward understanding, not to give direct answers.

CORE PRINCIPLES:
1. **Socratic Method**: Ask guiding questions that lead students to discover answers themselves
2. **Step-by-Step Guidance**: Break down complex problems into manageable steps
3. **Conceptual Understanding**: Focus on WHY things work, not just HOW
4. **Encouragement**: Celebrate progress and effort
5. **Academic Integrity**: Never complete assignments or provide direct answers to homework/tests

RESPONSE FORMAT:
- Use **bold** for key terms and concepts
- Use *italics* for emphasis
- Use bullet points and numbered lists for clarity
- For math equations, use LaTeX format: $inline$ or $$block$$
- Always explain the reasoning behind concepts

WHEN ASKED FOR HOMEWORK/ASSIGNMENT ANSWERS:
- Acknowledge the challenge
- Ask what they've tried so far
- Guide them to the relevant concepts
- Provide hints and scaffolding
- Point to learning resources
- NEVER give the direct answer

EXAMPLE RESPONSES:

For "What is 2+2?":
Good: "Great question! Let's think about this together. If you have 2 apples and someone gives you 2 more, how many do you have total? Try counting them!"
Bad: "The answer is 4."

For "Solve x² + 5x + 6 = 0":
Good: "Let's work through this quadratic equation step by step!

First, do you remember the **factoring method**? We need two numbers that:
- Multiply to give us $6$ (the constant term)
- Add up to $5$ (the coefficient of $x$)

What two numbers do you think fit these criteria? Think about the factors of 6..."

Bad: "x = -2 and x = -3"`

// AI response generator with educational focus
function generateAIResponse(message, history = [], userContext = null) {
    const lowerMessage = message.toLowerCase()

    // Check for homework/assignment-like questions
    const isHomeworkQuestion = detectHomeworkQuestion(lowerMessage)

    // Educational responses with markdown and LaTeX support
    const responses = {
        homework_math: [
            "I see you're working on a math problem! Let me guide you through the thinking process:\n\n**Step 1**: Identify what type of problem this is\n**Step 2**: Recall the relevant formulas or methods\n**Step 3**: Work through it step by step\n\n*What have you tried so far?* Tell me where you're stuck and I can point you in the right direction!\n\n💡 **Hint**: Break the problem into smaller parts - it becomes much more manageable!",
            "Great question! Rather than giving you the answer directly, let me help you *understand* the concept:\n\n**Ask yourself**:\n1. What information do I have?\n2. What am I trying to find?\n3. What tools/formulas might help?\n\nFor equations, remember:\n- $ax^2 + bx + c = 0$ can be solved by factoring, completing the square, or the quadratic formula\n- Linear equations: isolate the variable step by step\n\n*Share what approach you're considering and I'll help you check your reasoning!*",
        ],
        homework_general: [
            "I appreciate you reaching out! My role is to help you **learn** rather than just provide answers.\n\n**Here's how we can work together**:\n\n1. Tell me what you've understood so far\n2. Share any attempts you've made\n3. Identify where you're confused\n\nThis way, I can give you *targeted guidance* that actually helps you learn!\n\n*What's your current understanding of this topic?*",
            "I'm here to be your learning companion, not your homework doer! 📚\n\n**Let's explore this together**:\n\n- What are the key concepts involved?\n- What resources have you checked?\n- Where specifically are you stuck?\n\nWhen you work through problems yourself (with guidance), you:\n- Build **lasting understanding**\n- Develop **problem-solving skills**\n- Feel more *confident* on tests\n\n*Tell me more about what you're finding challenging!*",
        ],
        study: [
            "Here are evidence-based study strategies that really work:\n\n**Active Learning Techniques**:\n1. **Spaced Repetition**: Review material at increasing intervals\n   - Day 1: Learn → Day 2: Review → Day 4: Review → Day 7: Review\n2. **Active Recall**: Test yourself without looking at notes\n3. **Elaborative Interrogation**: Ask *\"Why does this work?\"*\n\n**Practical Tips**:\n- 🍅 *Pomodoro Technique*: 25 min focus + 5 min break\n- 📝 Take notes in your own words\n- 🗣️ Teach concepts to others (or a rubber duck!)\n\n**For Math & Science**:\n- Practice problems > re-reading\n- Focus on understanding *derivations*\n- Build concept maps showing relationships",
            "Let me share some *scientifically-proven* study methods:\n\n**The Feynman Technique** (great for complex topics!):\n1. Choose a concept to learn\n2. Explain it as if teaching a child\n3. Identify gaps in your explanation\n4. Go back and fill those gaps\n5. Simplify and use analogies\n\n**Memory Palace** for memorization:\n- Associate information with familiar locations\n- Walk through your \"palace\" to recall\n\n**Interleaving**: Mix different topics/problem types\n- Example: Don't just do 20 algebra problems\n- Mix: algebra → geometry → algebra → statistics\n\n*Which subject are you studying? I can give more specific advice!*",
        ],
        course: [
            "Here's how to maximize your learning from SparkHub courses:\n\n**Before Starting**:\n- Preview the syllabus and learning objectives\n- Set specific goals: *\"I want to learn X by Y date\"*\n\n**During the Course**:\n1. **Engage actively** - pause videos to think\n2. **Take notes** in your own words\n3. **Do all exercises** - even optional ones\n4. **Participate in discussions** - learning is social!\n\n**After Each Lesson**:\n- Summarize key points without looking\n- Create practice problems for yourself\n- Connect new knowledge to what you already know\n\n*Which course are you working on?*",
            "To get the most from your courses:\n\n**Create a Learning Schedule**:\n```\nWeekly Template:\n- Mon/Wed/Fri: Video lessons (1-2 hours)\n- Tue/Thu: Practice exercises\n- Sat: Review and catch up\n- Sun: Plan next week\n```\n\n**Active Engagement Strategies**:\n- 🎯 Set specific session goals\n- ❓ Write questions as you learn\n- 🔗 Connect concepts to real-world examples\n- 📊 Track your progress\n\n**Don't Just Watch - DO**:\n- Follow along with coding tutorials\n- Recreate examples from scratch\n- Attempt problems before watching solutions\n\n*What's your biggest challenge with the course?*",
        ],
        math: [
            "Mathematics is all about building understanding layer by layer! Let me help you develop mathematical thinking:\n\n**For Problem Solving**:\n1. **Understand** the problem completely\n2. **Devise** a plan (what methods might work?)\n3. **Execute** your plan step by step\n4. **Reflect** - does the answer make sense?\n\n**Common Formulas to Remember**:\n- Quadratic: $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$\n- Distance: $d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$\n- Slope: $m = \\frac{y_2-y_1}{x_2-x_1}$\n\n**Pro tip**: *Understanding WHY formulas work is more valuable than memorizing them!*\n\n*What specific math topic are you working on?*",
            "Let's make math more approachable!\n\n**Key Mathematical Concepts**:\n\n*Algebra*:\n- Variables represent unknown values\n- Equations must stay **balanced** (what you do to one side, do to the other)\n\n*Geometry*:\n- Area of circle: $A = \\pi r^2$\n- Pythagorean theorem: $a^2 + b^2 = c^2$\n\n*Calculus Preview*:\n- Derivatives measure **rate of change**\n- Integrals measure **accumulation**\n\n**Learning Strategies for Math**:\n1. Work through examples step by step\n2. Identify *patterns* in problem types\n3. Make mistakes! They're the best teachers\n4. Practice regularly (daily > weekly cramming)\n\n*Which area of math would you like to explore?*",
        ],
        science: [
            "Science is about understanding how the world works! Here's a scientific approach to learning:\n\n**The Scientific Method**:\n1. **Observe** - What do you notice?\n2. **Question** - Why does this happen?\n3. **Hypothesize** - What might explain it?\n4. **Test** - How can you check?\n5. **Analyze** - What do results show?\n\n**Key Equations to Know**:\n\n*Physics*:\n- Newton's 2nd Law: $F = ma$\n- Kinetic Energy: $KE = \\frac{1}{2}mv^2$\n- Einstein's Famous: $E = mc^2$\n\n*Chemistry*:\n- Ideal Gas Law: $PV = nRT$\n\n**Study Tips for Science**:\n- Draw diagrams and flowcharts\n- Connect concepts to everyday examples\n- Do lab work (even virtual labs)\n\n*What science topic interests you?*",
        ],
        coding: [
            "Programming is a skill built through practice! Here's how to improve:\n\n**Learning to Code Effectively**:\n\n1. **Type out code** - don't copy/paste\n2. **Break problems down** into smaller pieces\n3. **Read error messages** - they're helpful!\n4. **Debug methodically** - use print statements\n\n**Key Programming Concepts**:\n```\n- Variables: Store data\n- Functions: Reusable code blocks\n- Loops: Repeat actions\n- Conditionals: Make decisions\n```\n\n**Problem-Solving Approach**:\n1. Understand what you need to build\n2. Write pseudocode first\n3. Code one piece at a time\n4. Test frequently\n5. Refactor for clarity\n\n*What programming language or concept are you learning?*",
            "Here's a developer's guide to learning code:\n\n**Project-Based Learning**:\n- Start with small, achievable projects\n- Build things you're interested in\n- Each project teaches new skills\n\n**Debugging Mindset**:\n```\nWhen code doesn't work:\n1. Read the error message carefully\n2. Check the line number mentioned\n3. Print variable values to trace logic\n4. Google the specific error\n5. Take a break if stuck!\n```\n\n**Resources to Explore**:\n- Documentation (always start here!)\n- Stack Overflow for specific issues\n- GitHub for code examples\n- SparkHub courses for structured learning\n\n**Remember**: Every expert was once a beginner. *Errors are how you learn!*",
        ],
        career: [
            "Let's plan your career development strategically!\n\n**Building Your Professional Profile**:\n\n1. **Skills Assessment**\n   - Technical skills (hard skills)\n   - Soft skills (communication, leadership)\n   - Identify gaps to fill\n\n2. **Portfolio Building**\n   - Document your projects\n   - Showcase problem-solving process\n   - Include measurable outcomes\n\n3. **Networking**\n   - Connect with professionals in your field\n   - Attend SparkHub events\n   - Engage in online communities\n\n**Interview Preparation**:\n- Practice the STAR method:\n  - **S**ituation\n  - **T**ask\n  - **A**ction\n  - **R**esult\n\n*What career field interests you?*",
        ],
        event: [
            "SparkHub events are great learning opportunities!\n\n**Types of Events**:\n\n🎓 **Workshops** - Hands-on skill building\n📺 **Webinars** - Expert talks and Q&A\n👥 **Study Groups** - Collaborative learning\n💼 **Career Fairs** - Network with employers\n🏆 **Hackathons** - Apply skills competitively\n\n**Getting the Most from Events**:\n1. Prepare questions in advance\n2. Take notes during sessions\n3. Network with other attendees\n4. Follow up on new connections\n5. Apply what you learned immediately\n\n*Check our events page for upcoming sessions!*",
        ],
        tutor: [
            "Working with tutors can accelerate your learning!\n\n**Finding the Right Tutor**:\n- Review their subject expertise\n- Check their teaching style\n- Look for good communication skills\n\n**Making Sessions Productive**:\n\n1. **Come Prepared**\n   - Specific questions ready\n   - Materials reviewed beforehand\n   - Previous session notes\n\n2. **During Sessions**\n   - Be honest about confusion\n   - Ask *why*, not just *how*\n   - Take your own notes\n   - Try problems yourself\n\n3. **After Sessions**\n   - Review notes within 24 hours\n   - Practice similar problems\n   - Note questions for next time\n\n*The best tutoring is interactive, not passive!*",
        ],
        greeting: [
            "Hello! I'm **SparkHub AI**, your educational learning assistant! 🎓\n\nI'm here to *guide* your learning journey, not just give answers. I believe in helping you develop real understanding!\n\n**I can help with**:\n- 📚 Study strategies and techniques\n- 🧮 Math and science concepts\n- 💻 Programming guidance\n- 📖 Course recommendations\n- 💼 Career development\n\n**My approach**:\n- Ask guiding questions\n- Break down complex topics\n- Encourage critical thinking\n- Point you to resources\n\n*What would you like to learn about today?*",
            "Welcome! I'm **SparkHub AI** - your learning companion! ✨\n\nI use the *Socratic method* - that means I'll guide you to discover answers rather than just telling you. This builds **deeper understanding**!\n\n**How I can help**:\n- 🎯 Clarify confusing concepts\n- 📐 Walk through problem-solving\n- 📝 Suggest study strategies\n- 🔍 Point to relevant resources\n\n**My philosophy**: Learning happens when *you* make connections, not when someone hands you answers.\n\n*What brings you here today?*",
        ],
        default: [
            "Great question! Let me help guide your thinking:\n\n**First, let's clarify**:\n- What specifically are you trying to understand?\n- What have you already tried or researched?\n- Is this related to a particular subject or course?\n\nThe more context you share, the better I can *guide* you toward understanding!\n\n**I'm best at helping with**:\n- Academic subjects (math, science, humanities)\n- Study techniques and learning strategies\n- Course and career guidance\n- Explaining concepts in new ways\n\n*Tell me more about what you're working on!*",
            "I'd love to help you learn! Let's approach this together:\n\n**My role is to**:\n- Guide your thinking with questions\n- Break down complex topics\n- Connect concepts you know to new ones\n- Encourage you when things get tough\n\n**Not to**:\n- Give direct answers to assignments\n- Do your work for you\n- Skip the learning process\n\nThis approach might feel slower, but it builds **lasting knowledge**!\n\n*What subject or topic are you exploring?*",
        ],
    }

    // Determine response category
    let category = 'default'

    if (isHomeworkQuestion) {
        if (lowerMessage.includes('math') || /\d+[+\-*/^=]|\d+x|solve|equation|calculate/i.test(lowerMessage)) {
            category = 'homework_math'
        } else {
            category = 'homework_general'
        }
    } else if (/hello|hi |hey|welcome|help me|what can you/i.test(lowerMessage)) {
        category = 'greeting'
    } else if (/study|learn|focus|remember|memorize|exam|test prep/i.test(lowerMessage)) {
        category = 'study'
    } else if (/course|class|enroll|lesson|curriculum/i.test(lowerMessage)) {
        category = 'course'
    } else if (/math|algebra|calculus|geometry|equation|formula|solve|calculate/i.test(lowerMessage)) {
        category = 'math'
    } else if (/science|physics|chemistry|biology|experiment/i.test(lowerMessage)) {
        category = 'science'
    } else if (/code|program|javascript|python|developer|software|debug|function/i.test(lowerMessage)) {
        category = 'coding'
    } else if (/job|career|work|opportunity|interview|resume|skill/i.test(lowerMessage)) {
        category = 'career'
    } else if (/event|workshop|webinar|meetup|conference/i.test(lowerMessage)) {
        category = 'event'
    } else if (/tutor|mentor|session|one.on.one/i.test(lowerMessage)) {
        category = 'tutor'
    }

    // Get response from category
    const categoryResponses = responses[category]
    const randomIndex = Math.floor(Math.random() * categoryResponses.length)

    return categoryResponses[randomIndex]
}

// Detect if the message is likely a homework question asking for direct answers
function detectHomeworkQuestion(message) {
    const homeworkPatterns = [
        /what is \d+[+\-*/]\d+/i,
        /solve (for )?(x|y|the equation)/i,
        /calculate /i,
        /find the (answer|solution|value)/i,
        /what('s| is) the answer/i,
        /help (me )?(with|do) (my |this )?homework/i,
        /can you (solve|do|complete|finish)/i,
        /give me the answer/i,
        /tell me the answer/i,
        /just tell me/i,
        /what does .* equal/i,
    ]

    return homeworkPatterns.some(pattern => pattern.test(message))
}

// Chat endpoint
router.post('/chat', requireAuth, async (req, res) => {
    try {
        const { message, history = [] } = req.body

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ ok: false, msg: 'Message is required' })
        }

        if (message.length > 2000) {
            return res.status(400).json({ ok: false, msg: 'Message too long (max 2000 characters)' })
        }

        // Get user context for personalized responses
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, role: true }
        })

        const response = generateAIResponse(message, history, user)

        res.json({
            ok: true,
            response,
            timestamp: new Date().toISOString()
        })
    } catch (err) {
        console.error('AI chat error:', err)
        res.status(500).json({ ok: false, msg: 'Unable to process your request right now' })
    }
})

// Generate content suggestions (for course creators)
router.post('/suggest-content', requireAuth, async (req, res) => {
    try {
        const { type, context } = req.body

        const suggestions = {
            course_title: [
                'Introduction to [Subject]: A Comprehensive Guide',
                'Mastering [Topic]: From Beginner to Advanced',
                '[Skill] Fundamentals for Modern Professionals',
                'Practical [Subject] for Real-World Applications',
            ],
            course_description: [
                'This course provides a comprehensive introduction to the core concepts and practical applications. You will learn through hands-on projects and real-world examples.',
                'Designed for learners of all levels, this course takes you from foundational concepts to advanced techniques with step-by-step guidance.',
                'Join thousands of students who have transformed their skills. This course combines theory with practical exercises for maximum retention.',
            ],
            lesson_title: [
                'Getting Started: Setting Up Your Environment',
                'Core Concepts and Fundamentals',
                'Building Your First Project',
                'Advanced Techniques and Best Practices',
                'Real-World Applications and Case Studies',
            ],
            event_title: [
                'Workshop: Hands-On Learning Session',
                'Webinar: Expert Insights and Q&A',
                'Study Group: Collaborative Learning',
                'Career Talk: Industry Perspectives',
            ],
            event_description: [
                'Join us for an interactive session where you will learn practical skills through hands-on exercises and expert guidance.',
                'This session brings together learners and experts for in-depth discussions and networking opportunities.',
            ],
        }

        const typeSuggestions = suggestions[type] || suggestions.course_description

        res.json({
            ok: true,
            suggestions: typeSuggestions,
            tip: 'Feel free to customize these suggestions to match your unique content and teaching style.',
        })
    } catch (err) {
        console.error('Content suggestion error:', err)
        res.status(500).json({ ok: false, msg: 'Unable to generate suggestions' })
    }
})

// Generate weekly digest content (for automated emails)
router.get('/weekly-digest', requireAuth, async (req, res) => {
    try {
        // Get stats for the past week
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

        const [
            newCourses,
            upcomingEvents,
            newJobs,
            newResources,
        ] = await Promise.all([
            prisma.course.count({
                where: {
                    isPublished: true,
                    createdAt: { gte: oneWeekAgo }
                }
            }),
            prisma.event.count({
                where: {
                    startsAt: { gte: new Date() }
                }
            }),
            prisma.jobPosting.count({
                where: {
                    createdAt: { gte: oneWeekAgo }
                }
            }),
            prisma.resource.count({
                where: {
                    createdAt: { gte: oneWeekAgo }
                }
            }),
        ])

        // Generate digest content
        const highlights = []

        if (newCourses > 0) {
            highlights.push(`${newCourses} new course${newCourses > 1 ? 's' : ''} published this week`)
        }
        if (upcomingEvents > 0) {
            highlights.push(`${upcomingEvents} upcoming event${upcomingEvents > 1 ? 's' : ''} to explore`)
        }
        if (newJobs > 0) {
            highlights.push(`${newJobs} new opportunity${newJobs > 1 ? 'ies' : ''} posted`)
        }
        if (newResources > 0) {
            highlights.push(`${newResources} fresh resource${newResources > 1 ? 's' : ''} added`)
        }

        const digestContent = {
            title: 'Your Weekly SparkHub Digest',
            summary: highlights.length > 0
                ? `This week on SparkHub: ${highlights.join(', ')}.`
                : 'Stay connected with SparkHub - new content coming soon!',
            stats: {
                newCourses,
                upcomingEvents,
                newJobs,
                newResources,
            },
            callToAction: 'Log in to explore what\'s new and continue your learning journey.',
        }

        res.json({
            ok: true,
            digest: digestContent,
        })
    } catch (err) {
        console.error('Weekly digest error:', err)
        res.status(500).json({ ok: false, msg: 'Unable to generate digest' })
    }
})

module.exports = router
