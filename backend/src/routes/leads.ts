import { Router } from 'express';
import { getLeads, getLead, updateLead, deleteLead, contactLead } from '../controllers/leadController.js';
import { validate } from '../middlewares/validate.js';
import { listLeadsSchema, updateLeadSchema, leadIdSchema } from '../schemas/leadSchemas.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getLeads);
router.get('/:id', validate(leadIdSchema), getLead);
router.patch('/:id', validate(updateLeadSchema), updateLead);
router.delete('/:id', validate(leadIdSchema), deleteLead);
router.post('/:id/contact', validate(leadIdSchema), contactLead);

export default router;
