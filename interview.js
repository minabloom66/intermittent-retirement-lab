import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const list = document.querySelector('#interview-list');
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

function splitBody(body = '') {
  const text = String(body).trim();
  const match = text.match(/(?:관련\s*링크|링크):\s*(https?:\/\/\S+)\s*$/i);
  if (!match) return { text, link: '' };
  return { text: text.slice(0, match.index).trim(), link: match[1] };
}

const { data, error } = await supabase
  .from('archive_posts')
  .select('id,title,body,event_date,created_at')
  .eq('published', true)
  .eq('category', '인터뷰 소식')
  .order('event_date', { ascending: false })
  .order('created_at', { ascending: false });

if (error) {
  list.innerHTML = '<p class="empty">인터뷰 소식을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.</p>';
} else if (!data.length) {
  list.innerHTML = '<p class="empty">아직 올린 인터뷰 소식이 없습니다. 첫 소식을 남겨보세요.</p>';
} else {
  list.innerHTML = data.map((post) => {
    const content = splitBody(post.body);
    const link = content.link ? '<a href="' + escapeHtml(content.link) + '" target="_blank" rel="noopener noreferrer">관련 링크 열기 ↗</a>' : '';
    return '<article class="news-card"><small>' + escapeHtml(post.event_date || '') + '</small><h3>' + escapeHtml(post.title) + '</h3><p>' + escapeHtml(content.text) + '</p>' + link + '</article>';
  }).join('');
}
