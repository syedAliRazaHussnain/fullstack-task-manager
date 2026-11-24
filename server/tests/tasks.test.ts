import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { migrate } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';

const app = createApp();

/** Creates a task through the API and returns the response body. */
async function createTask(body: Record<string, unknown>) {
  const res = await request(app).post('/api/tasks').send(body).expect(201);
  return res.body;
}

beforeAll(async () => {
  await migrate();
});

beforeEach(async () => {
  // Fresh, empty table before every test so tests can't affect each other.
  await pool.query('TRUNCATE tasks RESTART IDENTITY');
});

afterAll(async () => {
  await pool.end();
});

describe('GET /api/health', () => {
  it('returns ok when the database is reachable', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/tasks', () => {
  it('creates a task and returns 201 with the stored task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: '  Buy milk  ', description: '2 litres' })
      .expect(201);

    expect(res.body).toMatchObject({
      id: 1,
      title: 'Buy milk', // trimmed
      description: '2 litres',
      completed: false,
    });
    expect(new Date(res.body.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('stores a missing or empty description as null', async () => {
    expect((await createTask({ title: 'A' })).description).toBeNull();
    expect((await createTask({ title: 'B', description: '   ' })).description).toBeNull();
  });

  it.each([
    ['missing title', {}],
    ['blank title', { title: '   ' }],
    ['title over 200 chars', { title: 'x'.repeat(201) }],
    ['title not a string', { title: 42 }],
    ['unknown field', { title: 'Ok', id: 99 }],
    ['completed on create', { title: 'Ok', completed: true }],
  ])('rejects %s with 400', async (_label, body) => {
    const res = await request(app).post('/api/tasks').send(body).expect(400);
    expect(res.body.error.message).toBe('Validation failed');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title": ')
      .expect(400);
    expect(res.body.error.message).toBe('Request body is not valid JSON');
  });

  it('rejects a body larger than 10kb with 413', async () => {
    await request(app)
      .post('/api/tasks')
      .send({ title: 'Big', description: 'x'.repeat(20_000) })
      .expect(413);
  });
});

describe('GET /api/tasks', () => {
  it('returns an empty array when there are no tasks', async () => {
    const res = await request(app).get('/api/tasks').expect(200);
    expect(res.body).toEqual([]);
  });

  it('returns all tasks, newest first', async () => {
    await createTask({ title: 'First' });
    await createTask({ title: 'Second' });

    const res = await request(app).get('/api/tasks').expect(200);
    expect(res.body.map((t: { title: string }) => t.title)).toEqual(['Second', 'First']);
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns one task', async () => {
    const task = await createTask({ title: 'Find me' });
    const res = await request(app).get(`/api/tasks/${task.id}`).expect(200);
    expect(res.body).toEqual(task);
  });

  it('returns 404 for an id that does not exist', async () => {
    const res = await request(app).get('/api/tasks/999').expect(404);
    expect(res.body.error.message).toBe('Task 999 not found');
  });

  it.each(['abc', '1.5', '-3', '0', '99999999999'])('returns 400 for invalid id "%s"', async (id) => {
    await request(app).get(`/api/tasks/${id}`).expect(400);
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('marks a task complete without touching other fields', async () => {
    const task = await createTask({ title: 'Walk dog', description: 'Evening' });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .send({ completed: true })
      .expect(200);

    expect(res.body).toMatchObject({ title: 'Walk dog', description: 'Evening', completed: true });
    expect(Date.parse(res.body.updatedAt)).toBeGreaterThanOrEqual(Date.parse(task.updatedAt));
  });

  it('edits the title and clears the description', async () => {
    const task = await createTask({ title: 'Old', description: 'Remove me' });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .send({ title: 'New', description: null })
      .expect(200);

    expect(res.body).toMatchObject({ title: 'New', description: null, completed: false });
  });

  it('persists the change', async () => {
    const task = await createTask({ title: 'Persist' });
    await request(app).patch(`/api/tasks/${task.id}`).send({ completed: true }).expect(200);

    const res = await request(app).get(`/api/tasks/${task.id}`).expect(200);
    expect(res.body.completed).toBe(true);
  });

  it.each([
    ['an empty body', {}],
    ['a blank title', { title: '' }],
    ['completed as a string', { completed: 'yes' }],
    ['an unknown field', { priority: 'high' }],
  ])('rejects %s with 400', async (_label, body) => {
    const task = await createTask({ title: 'Valid' });
    await request(app).patch(`/api/tasks/${task.id}`).send(body).expect(400);
  });

  it('returns 404 for an id that does not exist', async () => {
    await request(app).patch('/api/tasks/999').send({ completed: true }).expect(404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('deletes a task and returns 204 with no body', async () => {
    const task = await createTask({ title: 'Delete me' });

    const res = await request(app).delete(`/api/tasks/${task.id}`).expect(204);
    expect(res.text).toBe('');

    await request(app).get(`/api/tasks/${task.id}`).expect(404);
  });

  it('returns 404 when deleting the same task twice', async () => {
    const task = await createTask({ title: 'Once' });
    await request(app).delete(`/api/tasks/${task.id}`).expect(204);
    await request(app).delete(`/api/tasks/${task.id}`).expect(404);
  });
});

describe('app-level behaviour', () => {
  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error.message).toBe('Route not found: GET /api/nope');
  });

  it('sends CORS headers only to the allowed frontend origin', async () => {
    const allowed = await request(app).get('/api/tasks').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const other = await request(app).get('/api/tasks').set('Origin', 'https://evil.example');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });
});
