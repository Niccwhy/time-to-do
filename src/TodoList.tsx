import React, { useState, useEffect } from "react";
import db, { type TodoItem } from "./db";
import { useLiveQuery } from "dexie-react-hooks";

/** Determine the color class for spent time based on the ratio of spent time to expected time */
function getSpentTimeColor(spentTime: number, expectedTime: number): string {
  if (expectedTime <= 0) return 'text-indigo-700';
  const ratio = spentTime / expectedTime;
  if (ratio < 0.5) return 'text-indigo-300';
  if (ratio < 0.8) return 'text-indigo-500';
  if (ratio < 1) return 'text-indigo-700';
  return 'text-indigo-800';
}

/** Component to display an uncompleted todo item with interactive controls for starting/stopping time tracking */
function UncompletedTodo({ todo, activeId, setActiveId }: { todo: TodoItem, activeId: number, setActiveId: React.Dispatch<React.SetStateAction<number>> }) {
  const [now, setNow] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const isActive = activeId === todo.id && startTime !== null;

  useEffect(() => {
    if (!isActive) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(id);
  }, [isActive]);

  function handleStart() {
    setActiveId(todo.id);
    setStartTime(Date.now());
    setNow(Date.now());
  }

  function handleStop() {
    setActiveId(0);
    updateSpentTime();
    setStartTime(null);
    setNow(null);
  }

  async function updateSpentTime() {
    if (startTime) {
      const spentTime = todo.spentTime + Math.floor((now! - startTime) / 60000);
      await db.todos.update(todo.id, { spentTime });
    }
  }

  async function updateCompleted() {
    await db.todos.update(todo.id, { completed: true });
  }

  const deadlineDate = new Date(todo.deadline);
  const year = deadlineDate.getFullYear();
  const month = deadlineDate.getMonth() + 1;
  const day = deadlineDate.getDate();
  const expectedTimeHours = Math.floor(todo.expectedTime / 60);
  const expectedTimeMinutes = todo.expectedTime % 60;
  const spentTimeCurrent = todo.spentTime + (todo.id === activeId && now && startTime
    ? Math.floor((now - startTime) / 60000)
    : 0);
  const spentColor = getSpentTimeColor(spentTimeCurrent, todo.expectedTime);
  const spentTimeHours = Math.floor(spentTimeCurrent / 60);
  const spentTimeMinutes = spentTimeCurrent % 60;
  let spentTimeElement: React.JSX.Element = (
    <span>{spentTimeHours > 0 ? `${spentTimeHours} h ` : ""}{spentTimeMinutes}min</span>
  );
  if (todo.id === activeId) {
    spentTimeElement = (
      <span onClick={handleStop}>
        {spentTimeHours > 0 ? `${spentTimeHours} h ` : ""}{spentTimeMinutes}min
      </span>
    );
  } else if (activeId === 0) {
    spentTimeElement = (
      <span onClick={handleStart}>
        {spentTimeHours > 0 ? `${spentTimeHours} h ` : ""}{spentTimeMinutes}min
      </span>
    );
  }

  return (
    <div className={`group flex flex-wrap items-center gap-4 rounded-2xl border p-5 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:shadow-md
        ${isActive
        ? 'border-indigo-300 bg-indigo-50/60'
        : 'border-slate-200/80 bg-white hover:border-indigo-200'
      }`}>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <input type="checkbox"
          checked={todo.completed}
          onChange={updateCompleted}
          disabled={activeId === todo.id}
          className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 text-indigo-600 transition hover:ring-2 hover:ring-indigo-200"
        />
        <span className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">
          {todo.title}
        </span>
      </div>
      <div className="flex w-full shrink-0 gap-x-8 text-sm text-slate-500 sm:w-auto">
        <span className="w-20">{year > new Date().getFullYear() ? `${year}-` : ""}{month.toString().padStart(2, '0')}-{day.toString().padStart(2, '0')}</span>
        <span className="w-20">{expectedTimeHours > 0 ? `${expectedTimeHours} h ` : ""}{expectedTimeHours === 0 || expectedTimeMinutes > 0 ? `${expectedTimeMinutes} min` : ""}</span>
        <div className={`w-20 font-medium transition ${spentColor}`}>
          {spentTimeElement}
        </div>
      </div>
    </div>
  );
}

/** Component to display a completed todo item with its details in a non-interactive format */
function CompletedTodo({ todo }: { todo: TodoItem }) {
  const deadlineDate = new Date(todo.deadline);
  const year = deadlineDate.getFullYear();
  const month = deadlineDate.getMonth() + 1;
  const day = deadlineDate.getDate();
  const expectedTimeHours = Math.floor(todo.expectedTime / 60);
  const expectedTimeMinutes = todo.expectedTime % 60;
  const spentTimeHours = Math.floor(todo.spentTime / 60);
  const spentTimeMinutes = todo.spentTime % 60;
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5 transition hover:bg-slate-50">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <input type="checkbox"
            checked
            disabled
            className="h-5 w-5 shrink-0 rounded border-slate-300 text-slate-400"
          />
          <span className="min-w-0 flex-1 truncate font-semibold text-slate-700 line-through decoration-slate-400">
            {todo.title}
          </span>
        </div>
        <div className="flex w-full shrink-0 gap-x-8 text-sm text-slate-500 sm:w-auto">
          <span className="w-20">{year > new Date().getFullYear() ? `${year}-` : ""}{month.toString().padStart(2, '0')}-{day.toString().padStart(2, '0')}</span>
          <span className="w-20">{expectedTimeHours > 0 ? `${expectedTimeHours} h ` : ""}{expectedTimeHours === 0 || expectedTimeMinutes > 0 ? `${expectedTimeMinutes} min` : ""}</span>
          <span className="w-20">{spentTimeHours > 0 ? `${spentTimeHours} h ` : ""}{spentTimeMinutes} min</span>
        </div>
      </div>
    </div>
  );
}


/** The main component that renders the list of todos, separating uncompleted and completed items */
export default function TodoList() {
  const todos = useLiveQuery(() => db.todos.orderBy("deadline").toArray(), []);
  const [activeId, setActiveId] = useState<number>(0);

  async function deleteCompletedTodos() {
    await db.todos.filter(todo => todo.completed && todo.deadline < Date.now()).delete();
  }
  useEffect(() => { deleteCompletedTodos() }, []);

  return (
    <>
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pb-8 sm:px-6">
        {todos?.filter(todo => !todo.completed).map(todo => (
          <UncompletedTodo key={todo.id} todo={todo} activeId={activeId} setActiveId={setActiveId} />
        ))}
      </div>
      <div className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
        <div className="flex flex-col gap-3">
          {todos?.filter(todo => todo.completed).map(todo => (
            <CompletedTodo key={todo.id} todo={todo} />
          ))}
        </div>
      </div>
    </>
  );
}
