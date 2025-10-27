const Space = require('../models/spaceModel');
const QuestionAnswer = require('../models/questionAnswerModel');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Start Interview Round
exports.startRound = async (req, res) => {
  try {
    const { spaceId, roundName } = req.params;
    
    // Find the space
    const space = await Space.findById(spaceId);
    
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }
    
    // Check if user owns this space
    if (space.studentId !== req.session.uniqueId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this space'
      });
    }
    
    // Find the round
    const round = space.interviewRounds.find(r => r.name === roundName);
    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Round not found'
      });
    }
    
    // Update round status to in_progress if not already completed
    if (round.status !== 'completed') {
      round.status = 'in_progress';
      await space.save();
    }
    
    // Generate interview questions
    const prompt = `
    Based on the following details:
    - Job Role: ${space.jobPosition}
    - Company: ${space.companyName}
    - Job Description: ${space.jobDescription.substring(0, 1000)}
    - Resume Summary: ${space.purifiedSummary.substring(0, 1000)}
    - Interview Round: ${roundName}
    
    Generate exactly 15 high-quality personalized interview questions for this round. The questions should be appropriate for the specific round type and challenging but fair. Structure the questions as follows:
    1. Start with 3 warm-up questions.
    2. Include 10 role-specific and challenging questions related to the candidate's background.
    3. End with 2 reflective or open-ended questions.

    Format the response as a numbered list:
    1. [Question 1]
    2. [Question 2]
    ...
    15. [Question 15]
    `;
    
    try {
      const result = await model.generateContent(prompt);
      const content = result.response.text();
      
      // Extract questions by looking for numbered lines
      const questions = content
        .split('\n')
        .filter(line => /^\d+\./.test(line.trim()))
        .map(line => line.replace(/^\d+\.\s*/, '').trim());
      
      if (questions.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate interview questions'
        });
      }
      
      res.status(200).json({
        success: true,
        questions
      });
    } catch (err) {
      console.error('Error generating questions:', err);
      res.status(500).json({
        success: false,
        message: 'Error generating interview questions'
      });
    }
  } catch (err) {
    console.error('Error starting round:', err);
    res.status(500).json({
      success: false,
      message: 'Error starting interview round'
    });
  }
};

// Finish Interview Round
exports.finishRound = async (req, res) => {
  try {
    const { spaceId, roundName } = req.params;
    const { answers } = req.body;
    
    // Validate input
    if (!answers || Object.keys(answers).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No answers provided'
      });
    }
    
    // Find the space
    const space = await Space.findById(spaceId);
    
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }
    
    // Check if user owns this space
    if (space.studentId !== req.session.uniqueId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this space'
      });
    }
    
    // Find the round
    const round = space.interviewRounds.find(r => r.name === roundName);
    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Round not found'
      });
    }
    
    // Format questions and answers for storing
    const questionsAndAnswers = Object.entries(answers).map(([question, answer]) => ({
      spaceId,
      roundName,
      question,
      answer,
    }));
    
    // Save questions and answers
    await QuestionAnswer.insertMany(questionsAndAnswers);
    
    // Generate summary using Gemini
    const prompt = `
    Summarize the following interview for a ${roundName} round at ${space.companyName} for a ${space.jobPosition} position:
    
    ${Object.entries(answers).map(([q, a]) => `Q: ${q}\nA: ${a}\n`).join('\n')}
    
    Provide a comprehensive evaluation of the candidate's performance, including:
    1. Overall impression
    2. Key strengths demonstrated
    3. Areas for improvement
    4. Specific examples from their answers to support your assessment
    5. Actionable advice for future interviews
    
    Ensure the summary is balanced, constructive, and helpful for the candidate's growth.
    `;
    
    try {
      const result = await model.generateContent(prompt);
      const summary = result.response.text();
      
      // Save the summary to the space
      round.summary = summary;
      round.status = 'completed';
      
      await space.save();
      
      res.status(200).json({
        success: true,
        message: 'Round completed and summary generated'
      });
    } catch (err) {
      console.error('Error generating summary:', err);
      res.status(500).json({
        success: false,
        message: 'Error generating summary'
      });
    }
  } catch (err) {
    console.error('Error finishing round:', err);
    res.status(500).json({
      success: false,
      message: 'Error finishing interview round'
    });
  }
};

// Get Questions and Answers for a round
exports.getQuestionsAnswers = async (req, res) => {
  try {
    const { roundId } = req.params;
    
    // Find the space that contains this round
    const space = await Space.findOne({
      'interviewRounds._id': roundId
    });
    
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Round not found'
      });
    }
    
    // Check if user owns this space
    if (space.studentId !== req.session.uniqueId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this round'
      });
    }
    
    // Find the round
    const round = space.interviewRounds.find(r => r._id.toString() === roundId);
    
    // Find all questions and answers for this round
    const questionsAnswers = await QuestionAnswer.find({
      spaceId: space._id,
      roundName: round.name
    }).sort({ createdAt: 1 });
    
    res.status(200).json({
      success: true,
      questionsAnswers
    });
  } catch (err) {
    console.error('Error fetching questions and answers:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions and answers'
    });
  }
};