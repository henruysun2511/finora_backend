import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../src/common/errors/app.error';
import { BUDGET_ERROR_CODE } from '../../src/modules/budgets/budgets.constant';
import {
  BudgetDuplicateException,
  BudgetNotFoundException,
  InvalidBudgetCategoryException,
  InvalidBudgetDateException,
} from '../../src/modules/budgets/exceptions/budget.exception';

describe('Budget exceptions', () => {
  it('BudgetNotFoundException exposes its error code and details', () => {
    const error = new BudgetNotFoundException('budget-1');

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(BUDGET_ERROR_CODE.NOT_FOUND);
    expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(error.details).toEqual({ id: 'budget-1' });
  });

  it('BudgetDuplicateException exposes its error code', () => {
    const error = new BudgetDuplicateException();

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(BUDGET_ERROR_CODE.DUPLICATE);
    expect(error.getStatus()).toBe(HttpStatus.CONFLICT);
  });

  it('InvalidBudgetCategoryException exposes its error code', () => {
    const error = new InvalidBudgetCategoryException();

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(BUDGET_ERROR_CODE.INVALID_CATEGORY);
    expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('InvalidBudgetDateException exposes its error code', () => {
    const error = new InvalidBudgetDateException();

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(BUDGET_ERROR_CODE.INVALID_DATE);
    expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });
});
