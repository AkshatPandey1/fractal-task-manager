const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'admin',
  host: process.env.POSTGRES_HOST || 'db',
  database: process.env.POSTGRES_DB || 'fractal_tasks',
  password: process.env.POSTGRES_PASSWORD || 'rootpassword',
  port: 5432,
});

// --- ROUTES ---

// 1. Get All Nodes
app.get('/api/nodes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM nodes ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get ONLY Leaves
app.get('/api/leaves', async (req, res) => {
  try {
    const query = `
      SELECT * FROM nodes n1
      WHERE NOT EXISTS (
        SELECT 1 FROM nodes n2 WHERE n2.parent_id = n1.id
      )
      AND is_completed = FALSE
      ORDER BY priority DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Create a Node
app.post('/api/nodes', async (req, res) => {
  const { title, parent_id, priority, deadline } = req.body;
  try {
    // UPDATED: Default priority is now 1
    const result = await pool.query(
      'INSERT INTO nodes (title, parent_id, priority, deadline) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, parent_id, priority || 1, deadline]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update a Node
app.patch('/api/nodes/:id', async (req, res) => {
  const { id } = req.params;
  const { title, priority, is_completed } = req.body;
  
  let fields = [];
  let values = [];
  let counter = 1;

  if (title !== undefined) { fields.push(`title = $${counter++}`); values.push(title); }
  if (priority !== undefined) { fields.push(`priority = $${counter++}`); values.push(priority); }
  if (is_completed !== undefined) { fields.push(`is_completed = $${counter++}`); values.push(is_completed); }

  values.push(id); 

  try {
    const result = await pool.query(
      `UPDATE nodes SET ${fields.join(', ')} WHERE id = $${counter} RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Delete a Node
app.delete('/api/nodes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM nodes WHERE id = $1', [id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Focus Mode
app.post('/api/choose', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, priority, created_at FROM nodes n1
      WHERE NOT EXISTS (SELECT 1 FROM nodes n2 WHERE n2.parent_id = n1.id)
      AND is_completed = FALSE
    `);

    let tasks = result.rows;

    if (tasks.length === 0) return res.json(null);

    tasks = tasks.map(task => {
      const created = new Date(task.created_at);
      const now = new Date();
      const ageInDays = (now - created) / (1000 * 60 * 60 * 24);
      const score = (task.priority * 10) + (ageInDays * 2) + (Math.random() * 5);
      return { ...task, score };
    });

    tasks.sort((a, b) => b.score - a.score);
    res.json(tasks[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Calculation failed." });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
