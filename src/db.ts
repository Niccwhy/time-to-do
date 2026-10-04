import { Dexie, type EntityTable } from "dexie";

interface TodoItem {
    id: number;
    title: string;
    completed: boolean;
    deadline: number;
    expectedTime: number;
    spentTime: number;
}

const db = new Dexie("TodoDatabase") as Dexie & {
    todos: EntityTable<TodoItem, "id">;
};

db.version(1).stores({
    todos: "id, completed, deadline",
});

export default db;
export type { TodoItem };