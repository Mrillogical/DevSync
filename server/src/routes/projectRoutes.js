const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  attachProjectContext,
  requireProjectRole,
} = require('../middleware/roleMiddleware');
const projectController = require('../controllers/projectController');

const router = express.Router();

router.use(requireAuth);

router.post('/', projectController.create);
router.get('/', projectController.listMine);
router.get(
  '/:projectId',
  attachProjectContext,
  requireProjectRole('admin', 'member'),
  projectController.getById
);

module.exports = router;
