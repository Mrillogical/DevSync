const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  attachProjectContext,
  requireProjectRole,
} = require('../middleware/roleMiddleware');
const memberController = require('../controllers/memberController');

const router = express.Router({ mergeParams: true });

router.use(requireAuth);
router.use(attachProjectContext);

router.get('/', requireProjectRole('admin', 'member'), memberController.list);
router.post('/', requireProjectRole('admin'), memberController.add);
router.delete('/:userId', requireProjectRole('admin'), memberController.remove);

module.exports = router;
