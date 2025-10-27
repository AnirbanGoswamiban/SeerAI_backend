const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const spaceController = require('../controllers/spaceController');
// const interviewController = require('../controllers/interviewController');
const { protect } = require('../middleware/authMiddleware');
const fs = require('fs');
const {upload} =require('../middleware/multer')


// Session routes
router.post('/session/start-new', sessionController.createSession);
router.post('/session/continue', sessionController.findSession);
router.get('/session/profile', protect, sessionController.getProfile);
router.post('/session/update-profile', protect, sessionController.updateProfile);
router.get('/session/end', sessionController.endSession);

// Space routes
router.get('/spaces', protect, spaceController.getSpaces);
router.post('/spaces/create', protect, upload.array('files', 10), spaceController.createSpace);
router.get('/spaces/:id', protect, spaceController.getSpaceDetails);
router.get('/spaces/resume/:id', protect, spaceController.downloadResume);

// Interview routes
// router.get('/interview/:spaceId/:roundName/generate-questions', protect, interviewController.startRound);
// router.post('/interview/:spaceId/:roundName/finish', protect, interviewController.finishRound);
// router.get('/interview/questions-answers/:roundId', protect, interviewController.getQuestionsAnswers);

module.exports = router;