import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const grid = document.querySelector('#archive-grid');
const status = document.querySelector('#archive-status');
const dialog = document.querySelector('#post-dialog');
const escape = (value = '') => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

function displayDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function openPost(post) {
  const image = document.querySelector('#dialog-image');
  image.hidden = !post.image_url;
  image.src = post.image_url || '';
  image.alt = post.title;
  document.querySelector('#dialog-category').textContent = post.category || '기록';
  document.querySelector('#dialog-title').textContent = post.title;
  document.querySelector('#dialog-date').textContent = displayDate(post.event_date);
  document.querySelector('#dialog-body').innerHTML = escape(post.body || '').replace(/\n/g, '<br>');
  dialog.showModal();
}

async function loadPosts() {
  const { data, error } = await supabase.from('archive_posts').select('*').eq('published', true).order('event_date', { ascending: false }).order('created_at', { ascending: false });
  if (error) {
    status.textContent = '첫 기록을 준비하고 있습니다.';
    return;
  }
  if (!data.length) {
    status.textContent = '첫 기록을 준비하고 있습니다.';
    return;
  }
  status.hidden = true;
  data.forEach((post) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'archive-card';
    card.innerHTML = `${post.image_url ? `<img src="${escape(post.image_url)}" alt="${escape(post.title)}" loading="lazy">` : '<div class="archive-card-empty">기록</div>'}<span>${escape(post.category || '기록')}</span><strong>${escape(post.title)}</strong><small>${escape(displayDate(post.event_date))}</small>`;
    card.addEventListener('click', () => openPost(post));
    grid.appendChild(card);
  });
}

document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
loadPosts();
