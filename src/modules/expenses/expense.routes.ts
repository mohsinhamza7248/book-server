import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { getExpenses, getExpenseSummary, createExpense, deleteExpense } from './expense.controller';

const router = Router();

router.use(authenticate);

router.get('/', getExpenses);
router.get('/summary', getExpenseSummary);
router.post('/', createExpense);
router.delete('/:id', deleteExpense);

export default router;
