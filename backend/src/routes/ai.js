const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth } = require('../middleware/auth')

// AI response generator - provides helpful responses based on context
// In production, this would connect to an actual AI service
function generateAIResponse(message, history = [], userContext = null) {
    const lowerMessage = message.toLowerCase()

    // Context-aware responses
    const responses = {
        study: [
            "Here are some effective study tips:\n\n1. **Active Recall**: Test yourself frequently instead of passive re-reading\n2. **Spaced Repetition**: Review material at increasing intervals\n3. **Pomodoro Technique**: Study for 25 minutes, break for 5\n4. **Teach Others**: Explaining concepts solidifies understanding\n5. **Create Mind Maps**: Visual connections help retention",
            "For better learning outcomes:\n\n- Set specific, achievable goals for each study session\n- Find your optimal study time (morning vs. evening)\n- Eliminate distractions during focused work\n- Take regular breaks to avoid burnout\n- Use multiple sources to understand concepts from different angles",
        ],
        course: [
            "To get the most from your SparkHub courses:\n\n1. **Engage actively** with all course materials and assignments\n2. **Join discussions** in course channels to learn from peers\n3. **Complete quizzes** to test your understanding\n4. **Attend live sessions** when available\n5. **Download materials** for offline reference",
            "Course success tips:\n\n- Review the syllabus and plan your schedule\n- Don't hesitate to ask questions in the course chat\n- Connect with tutors for personalized guidance\n- Apply what you learn in real projects\n- Track your progress and celebrate milestones",
        ],
        event: [
            "SparkHub events are great for learning and networking:\n\n- **Workshops**: Hands-on skill-building sessions\n- **Webinars**: Expert talks on trending topics\n- **Study Groups**: Collaborative learning sessions\n- **Career Fairs**: Connect with potential employers\n- **Hackathons**: Apply skills in competitive settings",
            "To make the most of events:\n\n1. Check the events page regularly for new opportunities\n2. Sign up early - some events have limited capacity\n3. Prepare questions in advance\n4. Network with other attendees\n5. Follow up on connections made during events",
        ],
        career: [
            "Career development advice:\n\n1. **Build a Portfolio**: Showcase your projects and skills\n2. **Network Actively**: Connect with professionals in your field\n3. **Stay Current**: Keep learning new technologies and trends\n4. **Seek Mentorship**: Learn from experienced professionals\n5. **Practice Interviews**: Prepare for common questions",
            "To stand out in job applications:\n\n- Tailor your resume for each position\n- Highlight measurable achievements\n- Build an online presence (LinkedIn, GitHub)\n- Contribute to open-source or community projects\n- Develop both technical and soft skills",
        ],
        tutor: [
            "Working with SparkHub tutors:\n\n1. **Browse tutor profiles** to find experts in your subject\n2. **Book sessions** at times that work for you\n3. **Come prepared** with specific questions or topics\n4. **Be open to feedback** and different learning approaches\n5. **Follow up** on concepts between sessions",
            "To maximize tutoring sessions:\n\n- Share your learning goals upfront\n- Take notes during sessions\n- Ask for resources and practice exercises\n- Schedule regular sessions for consistency\n- Provide feedback to help tutors adjust their approach",
        ],
        resource: [
            "SparkHub resources include:\n\n- **Articles & Guides**: Written tutorials and explanations\n- **Videos**: Visual learning content\n- **Tools**: Interactive learning applications\n- **Templates**: Ready-to-use documents and frameworks\n- **External Links**: Curated third-party resources",
            "Using resources effectively:\n\n1. Start with foundational materials before advanced content\n2. Bookmark resources you'll need to reference often\n3. Combine different resource types for varied learning\n4. Apply concepts from resources in practical projects\n5. Share helpful resources with your peers",
        ],
        greeting: [
            "Hello! I'm SparkHub AI, your learning assistant. I can help you with:\n\n- Study tips and learning strategies\n- Course guidance and recommendations\n- Career advice and job preparation\n- Finding tutors and resources\n- Event suggestions\n\nWhat would you like to explore?",
            "Hi there! Welcome to SparkHub AI. I'm here to support your learning journey. Feel free to ask me about courses, tutoring, career advice, or study strategies. How can I assist you today?",
        ],
        default: [
            "That's a great question! While I'm focused on helping with learning, courses, and career guidance, I'd be happy to point you in the right direction. Could you tell me more about what you're looking for?",
            "I appreciate your question! My expertise is in education and career guidance. If you're looking for:\n\n- **Learning help**: Ask about study tips\n- **Course info**: Ask about enrolling or course content\n- **Career guidance**: Ask about job preparation\n- **Resources**: Ask about materials and tools\n\nWhat area interests you most?",
        ],
    }

    // Determine response category
    let category = 'default'

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('help')) {
        category = 'greeting'
    } else if (lowerMessage.includes('study') || lowerMessage.includes('learn') || lowerMessage.includes('focus') || lowerMessage.includes('remember')) {
        category = 'study'
    } else if (lowerMessage.includes('course') || lowerMessage.includes('class') || lowerMessage.includes('enroll') || lowerMessage.includes('lesson')) {
        category = 'course'
    } else if (lowerMessage.includes('event') || lowerMessage.includes('workshop') || lowerMessage.includes('webinar') || lowerMessage.includes('meetup')) {
        category = 'event'
    } else if (lowerMessage.includes('job') || lowerMessage.includes('career') || lowerMessage.includes('work') || lowerMessage.includes('opportunity') || lowerMessage.includes('skill')) {
        category = 'career'
    } else if (lowerMessage.includes('tutor') || lowerMessage.includes('mentor') || lowerMessage.includes('session') || lowerMessage.includes('help me')) {
        category = 'tutor'
    } else if (lowerMessage.includes('resource') || lowerMessage.includes('material') || lowerMessage.includes('guide') || lowerMessage.includes('article')) {
        category = 'resource'
    }

    // Get random response from category
    const categoryResponses = responses[category]
    const randomIndex = Math.floor(Math.random() * categoryResponses.length)

    return categoryResponses[randomIndex]
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
