const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const questionValidator = require('../validators/questionValidator');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { isMasjidMember, isMasjidImamOrAdmin, canManageMasjid, canViewQuestions, canAnswerQuestions } = require('../middleware/masjidAuth');

// Public route - submit question
router.post('/', questionValidator.createQuestionValidator, validate, questionController.createQuestion);

// All other routes require authentication
router.use(authenticate);

// Get all questions for masjid (requires can_view_questions permission)
router.get('/masjid/:masjidId', questionValidator.masjidIdParamValidator, validate, canViewQuestions, questionController.getQuestionsByMasjid);

// Get question statistics (requires can_view_questions permission)
router.get('/masjid/:masjidId/statistics', questionValidator.masjidIdParamValidator, validate, canViewQuestions, questionController.getQuestionStatistics);

// Get single question (requires can_view_questions permission - checked in controller)
router.get('/:id', questionValidator.questionIdValidator, validate, questionController.getQuestionById);

// Reply to question (requires can_answer_questions permission)
router.put('/:id/reply', questionValidator.replyQuestionValidator, validate, canAnswerQuestions, questionController.replyToQuestion);

// Update question status (requires can_answer_questions permission)
router.put('/:id/status', questionValidator.updateQuestionStatusValidator, validate, canAnswerQuestions, questionController.updateQuestionStatus);

// Delete question (admin only)
router.delete('/:id', questionValidator.questionIdValidator, validate, questionController.deleteQuestion);

module.exports = router;

