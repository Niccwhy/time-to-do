import React, { useState, useRef, useEffect } from "react";
import db, { type TodoItem } from "./db";
import { clamp, toDigits, getDefaultDate } from "./tools";

/** compute the number of days in a given month (1-12) */
const daysInMonth = (month: number) => new Date(2024, month, 0).getDate();

/** compute the timestamp of the next occurrence of a given month and day */
function computeDeadline(month: number, day: number, now = new Date()): number {
  const year = now.getFullYear();
  const today = new Date(year, now.getMonth(), now.getDate());
  for (let y = year; y <= year + 8; y++) {
    const candidate = new Date(y, month - 1, day);
    if (candidate.getMonth() !== month - 1) continue;
    if (candidate >= today) return candidate.getTime();
  }
  return new Date(year, month - 1, day).getTime();
}

type StepKey = 'title' | 'month' | 'day' | 'hour' | 'minute'
type StepStatus = 'pending' | 'editing' | 'done'

interface Step {
  key: StepKey
  label: string
  value: string
  status: StepStatus
}

/** A single step in the todo form, which can be in pending, editing, or done state */
function FormStep({ step, inputRef, onChange, onKeyDown }: {
  step: Step
  inputRef?: React.RefObject<HTMLInputElement | null>
  onChange: (key: StepKey, newValue: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, key: StepKey) => void
}) {
  if (step.status === 'pending') {
    return null;
  }
  if (step.status === 'done') {
    return (
      <div className="flex items-center gap-1.5 whitespace-nowrap px-3">
        <span className="text-sm font-medium text-slate-400">{step.label}</span>
        <span className="text-base font-semibold text-slate-700">{step.value}</span>
      </div>
    );
  }
  return (
    <div className="flex min-w-[140px] flex-1 items-center gap-2 rounded-lg border border-indigo-300 bg-white px-3 py-3 shadow-sm transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
      <label className="shrink-0 text-sm font-medium text-slate-500">{step.label}</label>
      <input
        type="text"
        value={step.value}
        ref={inputRef}
        onChange={(e) => onChange(step.key, e.target.value)}
        onKeyDown={(e) => onKeyDown(e, step.key)}
        className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none"
      />
    </div>
  );
}

/** The main form component for adding a new todo item */
export default function TodoForm() {
  const [steps, setSteps] = useState<Step[]>(() => [
    { key: 'title', label: 'Title', value: '', status: 'editing' },
    { key: 'month', label: 'Month', value: String(getDefaultDate().month), status: 'pending' },
    { key: 'day', label: 'Day', value: String(getDefaultDate().day), status: 'pending' },
    { key: 'hour', label: 'Hour', value: '0', status: 'pending' },
    { key: 'minute', label: 'Minute', value: '0', status: 'pending' },
  ])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const editingStep = steps.find(step => step.status === 'editing');
    if (editingStep && inputRef.current) {
      inputRef.current.focus();
    }
  }, [steps]);

  function handleChange(key: StepKey, newValue: string) {
    switch (key) {
      case 'title':
        break;
      case 'month':
        if (newValue === '') break;
        newValue = String(clamp(Number(toDigits(newValue)), 1, 12));
        break;
      case 'day':
        if (newValue === '') break;
        const month = Number(steps.find(s => s.key === 'month')?.value ?? 1);
        newValue = String(clamp(Number(toDigits(newValue)), 1, daysInMonth(month)));
        break;
      case 'hour':
        if (newValue === '') break;
        newValue = String(clamp(Number(toDigits(newValue)), 0, 120));
        break;
      case 'minute':
        if (newValue === '') break;
        newValue = String(clamp(Number(toDigits(newValue)), 0, 59));
        break;
    }
    setSteps(prevSteps => {
      const newSteps = prevSteps.map(step => {
        if (step.key === key) {
          return { ...step, value: newValue }
        }
        return step
      })
      return newSteps
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, key: StepKey) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const currentIndex = steps.findIndex(s => s.key === key)
      if (currentIndex === -1) return
      if (steps[currentIndex].value === '') return;
      const nextIndex = currentIndex + 1
      if (nextIndex < steps.length) {
        setSteps(prevSteps => {
          const newSteps = prevSteps.map((step, index) => {
            if (index === currentIndex) {
              return { ...step, status: 'done' as StepStatus }
            } else if (index === nextIndex) {
              return { ...step, status: 'editing' as StepStatus }
            }
            return step;
          });
          return newSteps;
        });
      } else if (nextIndex === steps.length) {
        addTodo();
        setSteps(prevSteps => {
          const newSteps = prevSteps.map((step, index) => {
            if (index === 0) {
              return { ...step, status: 'editing' as StepStatus, value: '' }
            } else if (index === 1) {
              return { ...step, status: 'pending' as StepStatus, value: String(getDefaultDate().month) }
            } else if (index === 2) {
              return { ...step, status: 'pending' as StepStatus, value: String(getDefaultDate().day) }
            } else if (index === 3 || index === 4) {
              return { ...step, status: 'pending' as StepStatus, value: '0' }
            }
            return step;
          });
          return newSteps;
        });
      }
    }
  }

  async function addTodo() {
    const title = steps[0].value;
    const month = Number(steps[1].value);
    const day = Number(steps[2].value);
    const hour = Number(steps[3].value);
    const minute = Number(steps[4].value);

    const deadline = computeDeadline(month, day);
    const expectedTime: number = hour * 60 + minute;
    const newTodo: TodoItem = {
      id: new Date().getTime(),
      title: title,
      completed: false,
      deadline: deadline,
      expectedTime: expectedTime,
      spentTime: 0,
    };
    try {
      await db.todos.add(newTodo);
    } catch (error) {
      console.error("Failed to add todo:", error);
    }
  }

  return (
    <div className="mx-auto mb-10 max-w-5xl px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-slate-100 px-0.5 py-0.5">
        {steps.map(step => (
          <FormStep
            key={step.key}
            step={step}
            inputRef={step.status === 'editing' ? inputRef : undefined}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        ))}
      </div>
    </div>
  );
}