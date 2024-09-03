import React, { useState, useEffect } from 'react';
import { db } from '../db';

const Home = ({ session }) => {
  const [newTodo, setNewTodo] = useState('');
  const [todos, setTodos] = useState<
    Array<{ id?: number; text: string; completed: boolean }>
  >([]);

  useEffect(() => {
    const loadTodos = async () => {
      const decryptedTodos = await db.getTodos();
      setTodos(decryptedTodos);
    };
    loadTodos();
  }, []);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      const id = await db.addTodo({ text: newTodo, completed: false });
      setTodos([...todos, { id, text: newTodo, completed: false }]);
      setNewTodo('');
    }
  };

  return (
    <div>
      {session?.user?.email}

      <form onSubmit={addTodo}>
        <input
          type="text"
          placeholder="Enter a new todo item"
          className="todo-input"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
        />

        <button type="submit" className="add-todo-button">
          Add
        </button>
      </form>

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
