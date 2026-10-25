const PER_PAGE = 8;
let allData = [];
let currentFilter = 'all';
let searchQuery = '';
let currentPage = 1;

function esc(value) {
  const element = document.createElement('div');
  element.textContent = value || '';
  return element.innerHTML;
}

function formatDate(value) {
  if (!value) return '';
  const date = typeof value === 'object' && value.seconds
    ? new Date(value.seconds * 1000)
    : new Date(value);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function typeLabel(type) {
  return type === 'walkin' ? 'Walk-in' : type.charAt(0).toUpperCase() + type.slice(1);
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
    document.getElementById('cardsGrid').innerHTML =
      '<div class="empty-state">⚠️ Failed to load listings. Please try again later.</div>';
    console.error('Listing API request failed:', error);
  }
}

function getFiltered() {
  return allData.filter(item => {
    const matchesFilter = currentFilter === 'all' || item.type === currentFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query ||
      (item.company || '').toLowerCase().includes(query) ||
      (item.role || '').toLowerCase().includes(query) ||
      (item.skills || []).join(' ').toLowerCase().includes(query) ||
      (item.description || '').toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
}

function renderCards() {
  const filtered = getFiltered();
  const grid = document.getElementById('cardsGrid');
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  if (currentPage > totalPages) currentPage = 1;
  const items = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  if (!items.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No interviews found.</p></div>';
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  grid.innerHTML = items.map(item => {
    const detailUrl = `../detail.html?id=${encodeURIComponent(item.id)}`;
    return `
      <div class="card" data-detail-url="${detailUrl}">
        <div class="card-meta">
          <span class="badge badge-company">${esc(item.company)}</span>
          <span class="badge badge-type-${esc(item.type)}">${typeLabel(item.type)}</span>
          <span class="card-date">${formatDate(item.date)}</span>
        </div>
        <div class="card-title">${esc(item.role)}</div>
        <div class="card-desc">${esc(item.description || 'No description available.')}</div>
        <div class="card-footer">
          <div class="card-tags">${(item.skills || []).slice(0, 3).map(skill => `<span class="tag">${esc(skill)}</span>`).join('')}</div>
          <a class="card-link" href="${detailUrl}">View &amp; Apply →</a>
        </div>
      </div>`;
  }).join('');
  renderPagination(totalPages, filtered.length);
}

function renderPagination(totalPages, count) {
  const pagination = document.getElementById('pagination');
  if (totalPages <= 1) {
    pagination.innerHTML = `<span class="pg-info">${count} listing${count !== 1 ? 's' : ''}</span>`;
    return;
  }

  let html = `<span class="pg-info">${count} results</span>`;
  html += `<button class="pg-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>‹ Prev</button>`;
  for (let page = 1; page <= totalPages; page++) {
    if (totalPages > 7 && page > 2 && page < totalPages - 1 && Math.abs(page - currentPage) > 1) {
      if (page === 3 || page === totalPages - 2) html += '<span class="pg-info">…</span>';
      continue;
    }
    html += `<button class="pg-btn${page === currentPage ? ' active' : ''}" data-page="${page}">${page}</button>`;
  }
  html += `<button class="pg-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next ›</button>`;
  pagination.innerHTML = html;
}

function goToPage(page) {
  const totalPages = Math.ceil(getFiltered().length / PER_PAGE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderCards();
  window.scrollTo({ top: 280, behavior: 'smooth' });
}

function renderStats() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('statTotal').textContent = allData.length;
  document.getElementById('statOnline').textContent = allData.filter(item => item.type === 'online').length;
  document.getElementById('statOffline').textContent = allData.filter(item => item.type === 'offline').length;
  document.getElementById('statWalkin').textContent = allData.filter(item => item.type === 'walkin').length;
  document.getElementById('statToday').textContent = allData.filter(item => item.date === today).length;

  const companies = {};
  allData.forEach(item => companies[item.company] = (companies[item.company] || 0) + 1);
  document.getElementById('companyList').innerHTML = Object.entries(companies)
    .sort((first, second) => second[1] - first[1])
    .slice(0, 6)
    .map(([company, count]) =>
      `<div class="company-item" data-company="${encodeURIComponent(company)}"><span>${esc(company)}</span><span class="company-count">${count}</span></div>`
    ).join('');
}

function renderTicker() {
  if (!allData.length) return;
  const tickerItems = allData.slice(0, 15)
    .map(item => `🔔 ${item.company} – ${item.role} (${typeLabel(item.type)})`)
    .join('   •   ');
  document.getElementById('tickerTrack').innerHTML = `<span>${tickerItems}</span><span>${tickerItems}</span>`;
}

function filterByCompany(company) {
  document.getElementById('searchInput').value = company;
  searchQuery = company.toLowerCase();
  currentPage = 1;
  renderCards();
  window.scrollTo({ top: 280, behavior: 'smooth' });
}

function setFilter(filter) {
  currentFilter = filter;
  currentPage = 1;
  document.querySelectorAll('.pill').forEach(pill =>
    pill.classList.toggle('active', pill.dataset.filter === filter)
  );
  renderCards();
  window.scrollTo({ top: 280, behavior: 'smooth' });
}

document.addEventListener('click', event => {
  const filterControl = event.target.closest('.pill, [data-filter-link]');
  if (filterControl) {
    event.preventDefault();
    setFilter(filterControl.dataset.filter);
    return;
  }

  const pageButton = event.target.closest('[data-page]');
  if (pageButton) {
    goToPage(Number(pageButton.dataset.page));
    return;
  }

  const companyItem = event.target.closest('[data-company]');
  if (companyItem) {
    filterByCompany(decodeURIComponent(companyItem.dataset.company));
    return;
  }

  const card = event.target.closest('[data-detail-url]');
  if (card && !event.target.closest('a')) window.location.href = card.dataset.detailUrl;
});

document.getElementById('searchInput').addEventListener('input', event => {
  searchQuery = event.target.value.toLowerCase();
  currentPage = 1;
  renderCards();
});

loadData();
