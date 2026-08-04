import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const displayDate = (value) => value ? new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value + 'T00:00:00')) : '';

async function loadLabRecords() {
  const { data, error } = await supabase.from('archive_posts').select('id,title,category,event_date,image_url,created_at').eq('published', true).in('category', ['간헐적 은퇴', '지혜와 유산', '몸과 관계']).order('event_date', { ascending: false }).order('created_at', { ascending: false });
  document.querySelectorAll('.lab-records').forEach((section) => {
    const list = section.querySelector('.lab-record-list');
    if (error) { list.innerHTML = '<p class="lab-record-empty">기록을 불러오지 못했습니다.</p>'; return; }
    const posts = data.filter((post) => post.category === section.dataset.lab).slice(0, 3);
    if (!posts.length) { list.innerHTML = '<p class="lab-record-empty">아직 이 연구실에 연결된 기록이 없습니다.</p>'; return; }
    list.innerHTML = posts.map((post) => {
      const href = post.image_url ? 'gallery.html?lab=' + encodeURIComponent(post.category) : 'record.html?mode=writing&view=library&lab=' + encodeURIComponent(post.category);
      const image = post.image_url ? '<img src="' + escapeHtml(post.image_url) + '" alt="" loading="lazy">' : '';
      return '<a class="lab-record-card" href="' + href + '">' + image + '<span><small>' + (post.image_url ? '그림' : '글') + ' · ' + escapeHtml(displayDate(post.event_date)) + '</small><strong>' + escapeHtml(post.title) + '</strong></span></a>';
    }).join('');
  });
}

loadLabRecords();
