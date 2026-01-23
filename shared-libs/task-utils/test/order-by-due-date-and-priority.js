const { expect } = require('chai');
const taskUtils = require('../src/task-utils');

describe('TaskUtils shared lib - orderByDueDateAndPriority function', function () {
  'use strict';
  it('should sort provided tasks by due date', () => {
    const result = taskUtils.orderByDueDateAndPriority(
      { _id: 'task5', dueDate: 5, state: 'Ready', overdue: true },
      { _id: 'task6', dueDate: 2, state: 'Ready', overdue: true },
    );
    expect(result).to.be.equal(3);
  });

  it('should sort tasks by priority over due date', () => {
    const result = taskUtils.orderByDueDateAndPriority(
      { _id: 'task1', priority: 1, dueDate: 5, state: 'Ready', overdue: true },
      { _id: 'task2', priority: 10, dueDate: 2, state: 'Ready', overdue: true },
    );
    expect(result).to.be.equal(9);
  });

  it('should treat invalid due date and priority as lowest priority', () => {
    const result = taskUtils.orderByDueDateAndPriority(
      { _id: 'task1', priority: 'invalid', dueDate: 'invalid-date', state: 'Ready', overdue: true },
      { _id: 'task2', priority: 2, dueDate: '2025-05-30', state: 'Ready', overdue: true },
    );
    expect(result).to.be.equal(1);
  });

  it('maintains original order for tasks with invalid due date and priority', () => {
    const result = taskUtils.orderByDueDateAndPriority(
      { _id: 'task1', priority: 'invalid', dueDate: 'invalid-date', state: 'Ready', overdue: true },
      { _id: 'task2', priority: 'also-invalid', dueDate: null, state: 'Ready', overdue: true },
    );
    expect(result).to.be.equal(0);
  });

  it('should sort equal priority by due date', () => {
    const result = taskUtils.orderByDueDateAndPriority(
      { _id: 'task1', priority: 5, dueDate: '2025-05-30', state: 'Ready', overdue: true },
      { _id: 'task2', priority: 5, dueDate: '2025-05-29', state: 'Ready', overdue: true },
    );
    expect(result).to.be.equal(1000 * 60 * 60 * 24);
  });

  it('should maintain original order for tasks with equal due date and equal priority', () => {
    const result = taskUtils.orderByDueDateAndPriority(
      { _id: 'task1', priority: 5, dueDate: '2025-05-30', state: 'Ready', overdue: true },
      { _id: 'task2', priority: 5, dueDate: '2025-05-30', state: 'Ready', overdue: true },
    );
    expect(result).to.be.equal(0);
  });

  it('should treat various due date formats correctly', () => {
    const result0 = taskUtils.orderByDueDateAndPriority(
      { _id: 'task1', dueDate: '2025-05-30', state: 'Ready', overdue: true },
      { _id: 'task2', dueDate: '2025-05-31', state: 'Ready', overdue: true },
    );
    expect(result0).to.be.equal(-1000 * 60 * 60 * 24);

    const result1 = taskUtils.orderByDueDateAndPriority(
      { _id: 'task1', dueDate: '1748552400000', state: 'Ready', overdue: true },
      { _id: 'task2', dueDate: '1748638800000', state: 'Ready', overdue: true },
    );
    expect(result1).to.be.equal(-1000 * 60 * 60 * 24);

    const result2 = taskUtils.orderByDueDateAndPriority(
      { _id: 'task1', dueDate: '2025-05-30T12:00:00Z', state: 'Ready', overdue: true },
      { _id: 'task2', dueDate: '2025-05-30T15:00:00Z', state: 'Ready', overdue: true },
    );
    expect(result2).to.be.equal(-1000 * 60 * 60 * 3);
  });

  it('should prioritize a task with priority over a task with due date', () => {
    const result = taskUtils.orderByDueDateAndPriority(
      { _id: 'task1', priority: 1, state: 'Ready', overdue: true },
      { _id: 'task2', dueDate: '2025-05-29', state: 'Ready', overdue: true },
    );
    expect(result).to.be.equal(-1);
  });
});
