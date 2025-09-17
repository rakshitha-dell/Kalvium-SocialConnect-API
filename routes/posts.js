const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const TMP_FILE = POSTS_FILE + '.tmp';

// Ensure data directory exists
async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// Read posts
async function readPosts() {
  try {
    await ensureDataDir();
    const raw = await fs.readFile(POSTS_FILE, 'utf8');
    const posts = JSON.parse(raw);
    if (!Array.isArray(posts)) throw new Error('posts.json must contain an array');
    return posts;
  } catch (err) {
    if (err.code === 'ENOENT') return []; // no file yet → empty array
    throw err;
  }
}

// Write posts safely
async function writePosts(posts) {
  await ensureDataDir();
  const json = JSON.stringify(posts, null, 2);
  await fs.writeFile(TMP_FILE, json, 'utf8');
  await fs.rename(TMP_FILE, POSTS_FILE);
}

// Validate new post body
function validatePostBody(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    errors.push('Body must be a JSON object');
    return errors;
  }

  const { content, author, tags } = body;

  if (typeof content !== 'string' || !content.trim()) {
    errors.push('content is required and must be a non-empty string');
  } else if (content.trim().length > 280) {
    errors.push('content must be between 1 and 280 characters');
  }

  if (typeof author !== 'string' || !author.trim()) {
    errors.push('author is required and must be a non-empty string');
  }

  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      errors.push('tags must be an array of strings');
    } else if (tags.length > 5) {
      errors.push('a maximum of 5 tags is allowed');
    } else {
      for (const t of tags) {
        if (typeof t !== 'string' || !t.trim()) {
          errors.push('each tag must be a non-empty string');
          break;
        }
      }
    }
  }

  return errors;
}

// POST /api/posts → create a new post
router.post('/posts', async (req, res) => {
  try {
    const errors = validatePostBody(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const { content, author, tags } = req.body;

    const post = {
      postId: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
      content: content.trim(),
      author: author.trim(),
      tags: Array.isArray(tags) ? tags.slice(0, 5).map(t => t.trim()) : [],
      createdAt: new Date().toISOString(),
      likes: 0,
      status: 'published'
    };

    const posts = await readPosts();
    posts.push(post);
    await writePosts(posts);

    res.status(201).json({ post });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// GET /api/posts → return all posts (newest first)
router.get('/posts', async (req, res) => {
  try {
    const posts = await readPosts();
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(posts);
  } catch (err) {
    console.error('Error reading posts:', err);
    res.status(500).json({ error: 'Failed to read posts' });
  }
});

module.exports = router;
