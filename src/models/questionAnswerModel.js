const mongoose = require('mongoose');

const questionAnswerSchema = new mongoose.Schema({
  spaceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Space', 
    required: true 
  },
  roundName: { 
    type: String, 
    required: true 
  },
  question: { 
    type: String, 
    required: true 
  },
  answer: { 
    type: String, 
    default: '' 
  },
  isFollowUp: { 
    type: Boolean, 
    default: false 
  },
}, { timestamps: true });

const QuestionAnswer = mongoose.model('QuestionAnswer', questionAnswerSchema);
module.exports = QuestionAnswer;