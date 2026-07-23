import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const authPanel = document.querySelector('#auth-panel');
const editorPanel = document.querySelector('#editor-panel');
const authMessage = document.querySelector('#auth-message');
const postMessage = document.querySelector('#post-message');
const today = new Date().toISOString().slice(0, 10);
document.querySelector('[name="eventDate"]').value = today;

function showEditor(user) {
  authPanel.hidden = true;
  editorPanel.hidden = false;
  document.querySelector('#signed-in-email').textContent = user.email;
}
function showLogin() { authPanel.hidden = false; editorPanel.hidden = true; }

const { data: { session } } = await supabase.auth.getSession();
if (session) showEditor(session.user);

document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault(); authMessage.textContent = '로그인 중입니다.';
  const form = new FormData(event.currentTarget);
  const { data, error } = await supabase.auth.signInWithPassword({ email: form.get('email'), password: form.get('password') });
  if (error) { authMessage.textContent = '이메일 또는 비밀번호를 다시 확인해 주세요.'; return; }
  showEditor(data.user);
});

document.querySelector('#signup-button').addEventListener('click', async () => {
  const form = new FormData(document.querySelector('#login-form'));
  if (!form.get('email') || !form.get('password')) { authMessage.textContent = '먼저 이메일과 비밀번호를 적어 주세요.'; return; }
  authMessage.textContent = '계정을 만드는 중입니다.';
  const { error } = await supabase.auth.signUp({ email: form.get('email'), password: form.get('password'), options: { emailRedirectTo: `${location.origin}/record.html` } });
  authMessage.textContent = error ? '계정을 만들지 못했습니다. 비밀번호를 6자 이상으로 적어 주세요.' : '이메일로 확인 링크를 보냈습니다. 링크를 누른 뒤 다시 로그인해 주세요.';
});

document.querySelector('#signout-button').addEventListener('click', async () => { await supabase.auth.signOut(); showLogin(); });

document.querySelector('#post-form').addEventListener('submit', async (event) => {
  event.preventDefault(); postMessage.textContent = '기록을 저장하는 중입니다.';
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { postMessage.textContent = '로그인이 필요합니다.'; return; }
  const form = new FormData(event.currentTarget); const image = form.get('image'); let imageUrl = null;
  if (image && image.size) {
    const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${user.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('archive-images').upload(path, image, { cacheControl: '3600', contentType: image.type });
    if (uploadError) { postMessage.textContent = '그림을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.'; return; }
    imageUrl = supabase.storage.from('archive-images').getPublicUrl(path).data.publicUrl;
  }
  const { error } = await supabase.from('archive_posts').insert({ title: form.get('title'), category: form.get('category'), event_date: form.get('eventDate'), body: form.get('body'), image_url: imageUrl, published: form.get('published') === 'on', author_id: user.id });
  if (error) { postMessage.textContent = '저장하지 못했습니다. Supabase 설정을 한 번 확인해 주세요.'; return; }
  event.currentTarget.reset(); document.querySelector('[name="eventDate"]').value = today; postMessage.textContent = '저장했습니다. 공개 기록은 갤러리에 바로 나타납니다.';
});
