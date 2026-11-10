const router = require('express').Router();
const ctrl = require('../controllers/taskController');
const { validate } = require('../middleware/validate');
const validateObjectId = require('../middleware/validateObjectId');
const {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  listQuerySchema,
} = require('../validators/taskValidator');

// validateObjectId runs first on :id routes, so a malformed id wins over a bad body and never hits the DB.
router
  .route('/')
  .post(validate({ body: createTaskSchema }), ctrl.createTask)
  .get(validate({ query: listQuerySchema }), ctrl.getTasks);

router
  .route('/:id')
  .get(validateObjectId, ctrl.getTask)
  .put(validateObjectId, validate({ body: updateTaskSchema }), ctrl.updateTask)
  .delete(validateObjectId, ctrl.deleteTask);

router.patch('/:id/status', validateObjectId, validate({ body: updateStatusSchema }), ctrl.updateTaskStatus);

module.exports = router;
