const PER_PAGE = 9;
let allData = [];
let currentFilter = 'all';
let searchQuery = '';
let currentPage = 1;

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function fd(s) {
  if (!s) return '';
  if (typeof s === 'object' && s.seconds) {
    return new Date(s.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function tl(t) {
  const type = ['online', 'offline', 'walkin'].includes(t) ? t : 'other';
  return type === 'walkin' ? 'Walk-in' : type.charAt(0).toUpperCase() + type.slice(1);
}

function animateCount(el, target) {
  let start = 0;
  const step = Math.ceil(target / 30);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      start = target;
      clearInterval(timer);
    }
    el.textContent = start;
  }, 30);
}

async function loadData() {
  try {
    const response = await fetch('/api/listings');
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    const result = await response.json();
    allData = result.listings;
    renderCards();
    renderStats();
    renderTicker();
  } catch (error) {
    document.getElementById('cardsGrid').innerHTML = '<div class="empty-state">⚠️ Failed to load. Please try again.</div>';
    console.error('Listing API request failed:', error);
  }
}

function getFiltered() {
  return allData.filter(d => {
    const matchesFilter = currentFilter === 'all' || d.type === currentFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query ||
      (d.company || '').toLowerCase().includes(query) ||
      (d.role || '').toLowerCase().includes(query) ||
      (d.skills || []).join(' ').toLowerCase().includes(query) ||
      (d.description || '').toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
}

function renderCards() {
  const filtered = getFiltered();
  const grid = document.getElementById('cardsGrid');
  const total = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  if (currentPage > total) currentPage = 1;
  const start = (currentPage - 1) * PER_PAGE;
  const items = filtered.slice(start, start + PER_PAGE);
  if (!items.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>No interviews found.</p></div>';
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  grid.innerHTML = items.map((d, i) => {
    const type = ['online', 'offline', 'walkin'].includes(d.type) ? d.type : 'other';
    return `
    <div class="card card-delay-${i}" data-detail-id="${encodeURIComponent(d.id)}" tabindex="0">
      <div class="card-meta">
        <span class="badge badge-co">${esc(d.company)}</span>
        <span class="badge badge-${type}">${tl(type)}</span>
        <span class="card-date">${fd(d.date)}</span>
      </div>
      <div class="card-title">${esc(d.role)}</div>
      <div class="card-desc">${esc(d.description || 'No description available.')}</div>
      <div class="card-footer">
        <div class="card-tags">${(d.skills || []).slice(0, 3).map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>
        <a class="card-link" href="detail.html?id=${encodeURIComponent(d.id)}">View &amp; Apply →</a>
      </div>
    </div>`;
  }).join('');
  renderPg(total, filtered.length);
}

function renderPg(total, count) {
  const pagination = document.getElementById('pagination');
  if (total <= 1) {
    pagination.innerHTML = `<span class="pg-info">${count} listing${count !== 1 ? 's' : ''}</span>`;
    return;
  }
  let html = `<span class="pg-info">${count} results</span>`;
  html += `<button class="pg-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>‹ Prev</button>`;
  for (let i = 1; i <= total; i++) {
    if (total > 7 && i > 2 && i < total - 1 && Math.abs(i - currentPage) > 1) {
      if (i === 3 || i === total - 2) html += '<span class="pg-info">…</span>';
      continue;
    }
    html += `<button class="pg-btn${i === currentPage ? ' active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button class="pg-btn" data-page="${currentPage + 1}" ${currentPage === total ? 'disabled' : ''}>Next ›</button>`;
  pagination.innerHTML = html;
}

function goPg(page) {
  const total = Math.ceil(getFiltered().length / PER_PAGE);
  if (page < 1 || page > total) return;
  currentPage = page;
  renderCards();
  document.getElementById('listings').scrollIntoView({ behavior: 'smooth' });
}

function renderStats() {
  const data = allData;
  const today = new Date().toISOString().slice(0, 10);
  const totals = {
    total: data.length,
    online: data.filter(d => d.type === 'online').length,
    offline: data.filter(d => d.type === 'offline').length,
    walkin: data.filter(d => d.type === 'walkin').length,
    today: data.filter(d => d.date === today).length,
  };

  animateCount(document.getElementById('statTotal'), totals.total);
  animateCount(document.getElementById('statOnline'), totals.online);
  animateCount(document.getElementById('statWalkin'), totals.walkin);
  animateCount(document.getElementById('statToday'), totals.today);

  document.getElementById('sw-total').textContent = totals.total;
  document.getElementById('sw-online').textContent = totals.online;
  document.getElementById('sw-offline').textContent = totals.offline;
  document.getElementById('sw-walkin').textContent = totals.walkin;
  document.getElementById('sw-today').textContent = totals.today;

  const companies = {};
  data.forEach(d => companies[d.company] = (companies[d.company] || 0) + 1);
  document.getElementById('companyList').innerHTML =
    Object.entries(companies).sort((a, b) => b[1] - a[1]).slice(0, 7)
      .map(([company, count]) => `<div class="company-item" data-company="${encodeURIComponent(company)}" role="button" tabindex="0"><span>${esc(company)}</span><span class="co-count">${count}</span></div>`)
      .join('');
}

function renderTicker() {
  if (!allData.length) return;
  const items = [...allData].slice(0, 15).map(d => `🔔 ${d.company} – ${d.role} (${tl(d.type)})`).join('   •   ');
  document.getElementById('tickerTrack').innerHTML = `<span>${items}</span><span>${items}</span>`;
}

function filterByCompany(company) {
  document.getElementById('searchInput').value = company;
  searchQuery = company.toLowerCase();
  currentPage = 1;
  renderCards();
  document.getElementById('listings').scrollIntoView({ behavior: 'smooth' });
}

function setFilter(filter) {
  currentFilter = filter;
  currentPage = 1;
  document.querySelectorAll('.pill').forEach(pill => pill.classList.toggle('active', pill.dataset.filter === filter));
  renderCards();
}

document.getElementById('filterPills').addEventListener('click', e => {
  const pill = e.target.closest('.pill');
  if (pill) setFilter(pill.dataset.filter);
});

document.querySelectorAll('.filter-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    setFilter(link.dataset.filter);
    document.getElementById('listings').scrollIntoView({ behavior: 'smooth' });
  });
});

document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.toLowerCase();
  currentPage = 1;
  renderCards();
});

const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');

function closeNavigation() {
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open navigation');
  mainNav.classList.remove('is-open');
}

navToggle.addEventListener('click', () => {
  const isOpen = navToggle.getAttribute('aria-expanded') !== 'true';
  navToggle.setAttribute('aria-expanded', String(isOpen));
  navToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  mainNav.classList.toggle('is-open', isOpen);
});

mainNav.addEventListener('click', event => {
  if (event.target.closest('a')) closeNavigation();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeNavigation();
});

document.getElementById('pagination').addEventListener('click', e => {
  const button = e.target.closest('[data-page]');
  if (button && !button.disabled) goPg(Number(button.dataset.page));
});

document.getElementById('cardsGrid').addEventListener('click', e => {
  if (e.target.closest('a')) return;
  const card = e.target.closest('[data-detail-id]');
  if (card) window.location.href = `detail.html?id=${card.dataset.detailId}`;
});

document.getElementById('cardsGrid').addEventListener('keydown', e => {
  const card = e.target.closest('[data-detail-id]');
  if (card && e.target === card && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    window.location.href = `detail.html?id=${card.dataset.detailId}`;
  }
});

document.getElementById('companyList').addEventListener('click', e => {
  const companyItem = e.target.closest('[data-company]');
  if (companyItem) filterByCompany(decodeURIComponent(companyItem.dataset.company));
});

document.getElementById('companyList').addEventListener('keydown', e => {
  const companyItem = e.target.closest('[data-company]');
  if (companyItem && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    filterByCompany(decodeURIComponent(companyItem.dataset.company));
  }
});

loadData();
