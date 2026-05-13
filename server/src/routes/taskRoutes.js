const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  attachProjectContext,
  requireProjectRole,
} = require('../middleware/roleMiddleware');
const taskController = require('../controllers/taskController');

const router = express.Router({ mergeParams: true });

router.use(requireAuth);
router.use(attachProjectContext);

router.post('/', requireProjectRole('admin'), taskController.create);
router.get('/', requireProjectRole('admin', 'member'), taskController.list);
router.get('/:taskId', requireProjectRole('admin', 'member'), taskController.getById);
router.patch('/:taskId', requireProjectRole('admin', 'member'), taskController.update);

module.exports = router;
