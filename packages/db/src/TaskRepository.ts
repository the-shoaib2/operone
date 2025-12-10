import Database from 'better-sqlite3';
import { AITask, TaskStep, TaskStorage } from '@repo/types';
import path from 'path';

export class SQLiteTaskRepository implements TaskStorage {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS steps (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        description TEXT,
        tool TEXT NOT NULL,
        args TEXT NOT NULL,
        status TEXT NOT NULL,
        result TEXT,
        error TEXT,
        started_at INTEGER,
        completed_at INTEGER,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );
    `);
  }

  async saveTask(task: AITask): Promise<void> {
    const insertTask = this.db.prepare(`
      INSERT OR REPLACE INTO tasks (id, prompt, status, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertStep = this.db.prepare(`
      INSERT OR REPLACE INTO steps (id, task_id, description, tool, args, status, result, error, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      insertTask.run(
        task.id,
        task.prompt,
        task.status,
        task.createdAt,
        task.updatedAt,
        JSON.stringify(task.metadata || {})
      );

      for (const step of task.steps) {
        insertStep.run(
          step.id,
          task.id,
          step.description,
          step.tool,
          JSON.stringify(step.args),
          step.status,
          JSON.stringify(step.result),
          step.error || null,
          step.startedAt || null,
          step.completedAt || null
        );
      }
    });

    transaction();
  }

  async getTask(id: string): Promise<AITask | undefined> {
    const taskRow = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    if (!taskRow) return undefined;

    const stepsRows = this.db.prepare('SELECT * FROM steps WHERE task_id = ? ORDER BY rowid').all(id) as any[];

    const steps: TaskStep[] = stepsRows.map(row => ({
      id: row.id,
      description: row.description,
      tool: row.tool,
      args: JSON.parse(row.args),
      status: row.status,
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error || undefined,
      startedAt: row.started_at,
      completedAt: row.completed_at
    }));

    return {
      id: taskRow.id,
      prompt: taskRow.prompt,
      status: taskRow.status,
      steps,
      currentStepId: steps.find(s => s.status === 'running')?.id,
      createdAt: taskRow.created_at,
      updatedAt: taskRow.updated_at,
      metadata: JSON.parse(taskRow.metadata || '{}')
    };
  }

  async updateTaskStatus(id: string, status: AITask['status']): Promise<void> {
    this.db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, Date.now(), id);
  }

  async updateStepStatus(taskId: string, stepId: string, status: TaskStep['status'], result?: unknown, error?: string): Promise<void> {
    const now = Date.now();
    let query = 'UPDATE steps SET status = ?';
    const params: any[] = [status];

    if (status === 'running') {
      query += ', started_at = ?';
      params.push(now);
    } else if (status === 'completed' || status === 'failed') {
      query += ', completed_at = ?';
      params.push(now);
    }

    if (result !== undefined) {
      query += ', result = ?';
      params.push(JSON.stringify(result));
    }
    
    if (error !== undefined) {
      query += ', error = ?';
      params.push(error);
    }

    query += ' WHERE id = ?';
    params.push(stepId);

    // Also update task updated_at
    const update = this.db.transaction(() => {
      this.db.prepare(query).run(...params);
      this.db.prepare('UPDATE tasks SET updated_at = ? WHERE id = ?').run(now, taskId);
    });

    update();
  }

  async listTasks(limit: number = 50): Promise<AITask[]> {
    const rows = this.db.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
    
    // N+1 query problem acceptable for SQLite and small limits
    const tasks: AITask[] = [];
    for (const row of rows) {
      const task = await this.getTask(row.id);
      if (task) tasks.push(task);
    }
    
    return tasks;
  }
}
