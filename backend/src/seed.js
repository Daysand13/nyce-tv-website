import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool, query } from './db.js';

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error('Set ADMIN_PASSWORD in your .env before seeding (this becomes the real admin login).');
    process.exit(1);
  }
  const { rows: existing } = await query('SELECT id FROM admins WHERE username = $1', [username]);
  if (existing[0]) {
    console.log(`Admin "${username}" already exists — leaving it as is.`);
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  await query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', [username, hash]);
  console.log(`Created admin user "${username}".`);
}

async function seedContent() {
  const { rows: existingCats } = await query('SELECT id, name, is_live FROM categories');
  let categories = existingCats;

  if (categories.length === 0) {
    const defs = [
      ['News', false], ['Politics', false], ['Business', false],
      ['Sports', false], ['Entertainment', false], ['Health', false], ['Live', true],
    ];
    categories = [];
    for (const [name, isLive] of defs) {
      const { rows } = await query('INSERT INTO categories (name, is_live) VALUES ($1,$2) RETURNING id, name, is_live', [name, isLive]);
      categories.push(rows[0]);
    }
    console.log(`Seeded ${categories.length} categories.`);
  } else {
    console.log('Categories already exist — leaving them as is.');
  }

  const byName = (n) => categories.find((c) => c.name === n)?.id;

  const { rows: articleCount } = await query('SELECT COUNT(*)::int AS n FROM articles');
  if (articleCount[0].n === 0) {
    const samples = [
      ['News', 'Welcome to the New NYCE TV Newsroom', 'NYCE Newsroom', true],
      ['Politics', 'Sample Story: Parliament Session Highlights', 'Staff Reporter', false],
      ['Business', 'Sample Story: Markets Close Steady', 'Business Desk', false],
      ['Sports', 'Sample Story: Local Derby Recap', 'Sports Desk', false],
      ['Entertainment', 'Sample Story: Weekend Concert Roundup', 'Culture Desk', false],
      ['Health', 'Sample Story: Health Tips for the Rainy Season', 'Health Desk', false],
    ];
    for (const [cat, title, author, featured] of samples) {
      await query(
        `INSERT INTO articles (category_id, title, excerpt, body, author, featured)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [byName(cat), title, 'Placeholder summary — replace with real reporting from the admin dashboard.',
          'This is placeholder demo copy. Edit this story from the admin dashboard, attach a cover image, embed a video or YouTube link, and publish your own reporting in its place.',
          author, featured]
      );
    }
    console.log(`Seeded ${samples.length} sample articles.`);
  } else {
    console.log('Articles already exist — leaving them as is.');
  }

  const { rows: liveCount } = await query('SELECT COUNT(*)::int AS n FROM live_posts');
  if (liveCount[0].n === 0) {
    await query(
      `INSERT INTO live_posts (category_id, title, description, media_type, status)
       VALUES ($1,$2,$3,'none','ended')`,
      [byName('Live'), 'Studio Walkthrough', 'Sample live post — attach a picture, a video link, or a YouTube link from the admin dashboard.']
    );
    console.log('Seeded 1 sample live post.');
  }

  const { rows: teamCount } = await query('SELECT COUNT(*)::int AS n FROM team_members');
  if (teamCount[0].n === 0) {
    const members = [
      ['Ama Owusu', 'Station Manager'],
      ['Kwame Boateng', 'Lead Anchor'],
      ['Efua Mensah', 'News Editor'],
    ];
    for (const [name, role] of members) {
      await query('INSERT INTO team_members (name, role, bio) VALUES ($1,$2,$3)', [name, role, 'Placeholder bio — edit from the admin dashboard.']);
    }
    console.log(`Seeded ${members.length} team members.`);
  }

  const { rows: linkCount } = await query('SELECT COUNT(*)::int AS n FROM research_links');
  if (linkCount[0].n === 0) {
    await query('INSERT INTO research_links (label, url, description) VALUES ($1,$2,$3)', ['Google News', 'https://news.google.com', 'General news search and aggregation.']);
    await query('INSERT INTO research_links (label, url, description) VALUES ($1,$2,$3)', ['Google', 'https://google.com', 'General web search for fact-checking.']);
    console.log('Seeded 2 research links.');
  }

  await query(
    `INSERT INTO contact_info (id, address, phone, email, socials) VALUES (1, $1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    ['Add your studio address in Admin → Contact & Socials', '+233 00 000 0000', 'hello@nycetv.example', JSON.stringify({ facebook: '', twitter: '', instagram: '', youtube: '', tiktok: '', whatsapp: '' })]
  );

  await query(
    `INSERT INTO donate_info (id, intro) VALUES (1, $1) ON CONFLICT (id) DO NOTHING`,
    ['Support independent local journalism and community broadcasting. Add your real payment details from the admin dashboard.']
  );
  const { rows: methodCount } = await query('SELECT COUNT(*)::int AS n FROM donate_methods');
  if (methodCount[0].n === 0) {
    await query('INSERT INTO donate_methods (label, detail) VALUES ($1,$2)', ['Mobile Money', 'Add your MoMo number in Admin → Donate']);
    await query('INSERT INTO donate_methods (label, detail) VALUES ($1,$2)', ['Bank Transfer', 'Add your bank details in Admin → Donate']);
  }

  await query(
    `INSERT INTO site_settings (id, station_name, tagline, live_stream_url) VALUES (1, $1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    ['NYCE TV', 'Your Pulse. Your News.', '']
  );

  console.log('Content seed complete.');
}

async function run() {
  await seedAdmin();
  await seedContent();
  await pool.end();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
