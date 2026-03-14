import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://rshctgrgzjimfmdaxjnz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzaGN0Z3JnemppbWZtZGF4am56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjk4NTIsImV4cCI6MjA4ODkwNTg1Mn0.xDY0kreOeu9d1LeH9ytWDEqI5I--cnt00GSoFuBlFQY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentPage = 'public';

const state = {
    interviews: [],
    filteredInterviews: [],
    filters: {
        search: '',
        result: 'All',
        difficulty: 'All'
    }
};

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
    return currentUser;
}

async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw error;
    currentUser = data.user;
    return data;
}

async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    currentUser = null;
}

async function fetchInterviews() {
    const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    state.interviews = data || [];
    applyFilters();
}

function applyFilters() {
    let filtered = [...state.interviews];

    if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        filtered = filtered.filter(i =>
            i.company_name.toLowerCase().includes(search) ||
            i.position.toLowerCase().includes(search) ||
            i.location.toLowerCase().includes(search)
        );
    }

    state.filteredInterviews = filtered;
    renderInterviews();
}

async function saveInterview(interview) {
    if (interview.id) {
        const { error } = await supabase
            .from('interviews')
            .update({
                ...interview,
                updated_at: new Date().toISOString()
            })
            .eq('id', interview.id);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('interviews')
            .insert([interview]);
        if (error) throw error;
    }
    await fetchInterviews();
}

async function deleteInterview(id) {
    const { error } = await supabase
        .from('interviews')
        .delete()
        .eq('id', id);
    if (error) throw error;
    await fetchInterviews();
}

function getStats() {
    const total = state.interviews.length;
    const companies = new Set(state.interviews.map(i => i.company_name)).size;
    const selected = state.interviews.filter(i => i.result === 'Selected').length;
    const successRate = total > 0 ? Math.round((selected / total) * 100) : 0;
    const avgRounds = total > 0 ? (state.interviews.reduce((sum, i) => sum + i.rounds, 0) / total).toFixed(1) : 0;

    return { total, companies, selected, successRate, avgRounds };
}

function getDifficultyClass(difficulty) {
    const classes = {
        'Easy': 'easy',
        'Medium': 'medium',
        'Hard': 'hard',
        'Very Hard': 'veryhard'
    };
    return classes[difficulty] || '';
}

function getResultClass(result) {
    const classes = {
        'Selected': 'selected',
        'Rejected': 'rejected',
        'Pending': 'pending'
    };
    return classes[result] || '';
}

// function renderStats() {
//     const stats = getStats();
//     return `
//         <div class="stats">
//             <div class="stat-card">
//                 <div class="stat-content">
//                     <h3>Total Stories</h3>
//                     <p>${stats.total}</p>
//                 </div>
//                 <div class="stat-icon">📊</div>
//             </div>
//             <div class="stat-card">
//                 <div class="stat-content">
//                     <h3>Companies</h3>
//                     <p>${stats.companies}</p>
//                 </div>
//                 <div class="stat-icon">🏢</div>
//             </div>
//             <div class="stat-card">
//                 <div class="stat-content">
//                     <h3>Success Rate</h3>
//                     <p>${stats.successRate}%</p>
//                 </div>
//                 <div class="stat-icon">✅</div>
//             </div>
//             <div class="stat-card">
//                 <div class="stat-content">
//                     <h3>Avg Rounds</h3>
//                     <p>${stats.avgRounds}</p>
//                 </div>
//                 <div class="stat-icon">🎯</div>
//             </div>
//         </div>
//     `;
// }

function renderFilters() {
    return `
        <div class="filters">
            <div class="filter-group">
                <label>Search</label>
                <input type="text" id="searchInput" placeholder="Company, position, location..."
                    value="${state.filters.search}" />
            </div>
            
        </div>
    `;
}

// function renderInterviews() {
//     if (state.filteredInterviews.length === 0) {
//         return '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No interviews found</p></div>';
//     }

//     return state.filteredInterviews.map((interview, index) => `
//         <div class="interview-card">
//             <div class="interview-header">
//                 <div class="interview-title">
//                     <h2>${interview.company_name}</h2>
//                     <div class="interview-position">${interview.position}</div>
//                 </div>
//                 <div class="tags">
//                     <span class="tag tag-result ${getResultClass(interview.result)}">${interview.result}</span>
//                     <span class="tag tag-difficulty ${getDifficultyClass(interview.difficulty_level)}">${interview.difficulty_level}</span>
//                 </div>
//             </div>

//             <div class="interview-meta">
//                 <div class="meta-item">📍 ${interview.location}</div>
//                 <div class="meta-item">📅 ${new Date(interview.interview_date).toLocaleDateString()}</div>
//                 <div class="meta-item">🔄 ${interview.rounds} Round${interview.rounds > 1 ? 's' : ''}</div>
//             </div>

//             <div class="interview-description">${interview.description}</div>

//             <div class="interview-details">
//                 ${interview.topics_covered ? `
//                     <div class="detail-box">
//                         <h4>Topics Covered</h4>
//                         <p>${interview.topics_covered}</p>
//                     </div>
//                 ` : ''}
//                 ${interview.salary_range ? `
//                     <div class="detail-box">
//                         <h4>Salary Range</h4>
//                         <p>${interview.salary_range}</p>
//                     </div>
//                 ` : ''}
//                 ${interview.tips ? `
//                     <div class="detail-box">
//                         <h4>Tips for Candidates</h4>
//                         <p>${interview.tips}</p>
//                     </div>
//                 ` : ''}
//                 <div class="apply-section">
//                     <button class="btn-primary apply-btn" onclick="applyJob('${interview.id}')">
//                         Apply Now
//                     </button>
//                 </div>
//             </div>

//             ${currentUser ? `
//                 <div class="admin-actions">
//                     <button class="action-btn edit-btn" onclick="editInterview('${interview.id}')">✏️ Edit</button>
//                     <button class="action-btn delete-btn" onclick="deleteInterviewHandler('${interview.id}')">🗑️ Delete</button>
//                 </div>
//             ` : ''}
//         </div>
//         ${(index + 1) % 3 === 0 ? '<div class="ad-block"><p>💰 Google AdSense Placement</p><p>Advertisement space</p></div>' : ''}
//     `).join('');
// }
let currentPageNum = 1;


function getCardsPerPage(){
    return 20; 
}
function renderInterviews() {

    const cardsPerPage = getCardsPerPage();

    const start = (currentPageNum - 1) * cardsPerPage;
    const end = start + cardsPerPage;

    const pageData = state.filteredInterviews.slice(start, end);

    if (pageData.length === 0) {
        return `
        <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <p>No jobs available</p>
        </div>`;
    }

    return pageData.map(interview => `

        <div class="interview-card">

            <div class="interview-header">

                <div class="interview-title">
                    <h2>${interview.company_name}</h2>
                    <div class="interview-position">${interview.position}</div>
                </div>

            </div>

            <div class="interview-meta">

                <div class="meta-item">
                    📍 ${interview.location}
                </div>

                <div class="meta-item">
                    📅 ${new Date(interview.interview_date).toLocaleDateString()}
                </div>

            </div>

            <div class="apply-section">

                <button class="btn-primary apply-btn"
                    onclick="applyJob('${interview.id}')">

                    Apply Now

                </button>

            </div>

            ${currentUser ? `
            <div class="admin-actions">

                <button class="action-btn edit-btn"
                    onclick="editInterview('${interview.id}')">

                    ✏️ Edit
                </button>

                <button class="action-btn delete-btn"
                    onclick="deleteInterviewHandler('${interview.id}')">

                    🗑️ Delete
                </button>

            </div>
            ` : ''}

        </div>

    `).join('');
}
function renderPagination(){

    const cardsPerPage = getCardsPerPage();
    const totalPages = Math.ceil(state.filteredInterviews.length / cardsPerPage);

    let html = `<div class="pagination">`;

    for(let i=1;i<=totalPages;i++){

        html += `
        <button 
        class="page-btn ${i===currentPageNum ? 'active':''}"
        onclick="changePage(${i})">

        ${i}

        </button>`;
    }

    html += `</div>`;

    const paginationDiv = document.getElementById("pagination");
    if(paginationDiv){
        paginationDiv.innerHTML = html;
    }
}

function changePage(page){

    currentPageNum = page;

    document.getElementById("interviewsList").innerHTML = renderInterviews();

    renderPagination();

    window.scrollTo({top:0,behavior:"smooth"});
}
window.changePage = changePage;

function applyJob(id) {
    window.location.href = `apply.html?id=${id}`;
}

window.applyJob = applyJob;

// function renderPublicPage() {
//     return `
//         <nav>
//             <div class="container">
//                 <div class="nav-content">
//                     <div class="nav-brand">📚 Interview Hub</div>
//                     <div class="nav-buttons">
//                         <button class="btn-primary" onclick="showAdminModal()">🔐 Admin</button>
//                     </div>
//                 </div>
//             </div>
//         </nav>

//         <div class="header">
//             <h1>Interview Experiences Hub</h1>
//             <p>Real interview stories shared by candidates.</p>
//         </div>

        
//         <div class="container">

//             ${renderFilters()}

//             <div class="interviews-grid" id="interviewsList"></div>

//             <div id="pagination"></div>

//         </div>

//         <footer style="background:#1f2937;color:white;padding:2rem;text-align:center;margin-top:3rem;">
//             <p>© 2024 Interview Experiences Hub</p>
//         </footer>
//     `;
// }
function renderPublicPage() {

return `

<nav>
<div class="container">
<div class="nav-content">
<div class="nav-brand">📚 Interview Hub</div>

<div class="nav-buttons">
<button class="btn-primary" onclick="showAdminModal()">🔐 Admin</button>
</div>

</div>
</div>
</nav>


<div class="header">
<h1>Interview Experiences Hub</h1>
<p>Real interview stories shared by candidates. Get insights and prepare better for your next opportunity.</p>
</div>


${renderFeaturedSection()}


<!-- TOP ADSENSE -->

<div class="container">
<div class="adsense-top">

<!-- Replace with AdSense code -->

<div class="ad-block">
Google AdSense Top Banner
</div>

</div>
</div>


<div class="container">

${renderFilters()}


<div class="interviews-grid" id="interviewsList"></div>


<!-- MIDDLE ADSENSE -->

<div class="adsense-middle">

<div class="ad-block">
Google AdSense Middle Banner
</div>

</div>


<div id="pagination"></div>


</div>


<!-- FOOTER ADSENSE -->

<div class="adsense-footer">

<div class="ad-block">
Google AdSense Footer Banner
</div>

</div>


<footer style="background:#1f2937;color:white;padding:2rem;text-align:center;margin-top:3rem;">
<p>© 2024 Interview Experiences Hub</p>
</footer>

`;
}

function renderFeaturedSection(){
return `

<div class="featured-section">

<div class="featured-box">

<h2>🚀 Latest Interview Opportunities</h2>

<p>
Explore real interview experiences shared by candidates.
Learn about company interview processes, preparation tips,
and job opportunities to improve your chances of success.
</p>

<div class="featured-stats">

<div class="stat-item">
<h3>500+</h3>
<p>Interview Stories</p>
</div>

<div class="stat-item">
<h3>200+</h3>
<p>Companies</p>
</div>

<div class="stat-item">
<h3>10K+</h3>
<p>Monthly Visitors</p>
</div>

</div>

</div>

</div>

`;
}

function renderAdminPage() {
    return `
        <nav>
            <div class="container">
                <div class="nav-content">
                    <div class="nav-brand">📚 Interview Hub - Admin</div>
                    <div class="nav-buttons">
                        <button class="btn-danger" onclick="logoutUser()">Logout</button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="container" style="padding-top: 2rem;">
            <div class="dashboard-header">
                <h2>Admin Dashboard</h2>
                <button class="btn-primary" onclick="showInterviewModal()">➕ Add Interview</button>
            </div>

            <h3 style="margin-top: 2rem; margin-bottom: 1rem;">Manage Interviews</h3>
            <div class="interviews-grid" id="interviewsList"></div>
        </div>
    `;
}

function renderAuthPage() {
    return `
        <div class="auth-container">
            <div class="auth-box">
                <h2>Admin Login</h2>
                <p>Access your interview management dashboard</p>
                <form onsubmit="handleLogin(event)">
                    <div id="authMessage"></div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="loginEmail" placeholder="your@email.com" required>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="loginPassword" placeholder="Enter password" required>
                    </div>
                    <button type="submit" class="btn-primary" style="width: 100%;">Sign In</button>
                    <button type="button" class="btn-secondary" style="width: 100%; margin-top: 1rem;" onclick="currentPage='public'; render();">Cancel</button>
                </form>
            </div>
        </div>
    `;
}

async function render() {
    const app = document.getElementById('app');

    if (currentPage === 'auth') {
        app.innerHTML = renderAuthPage();
    } else if (currentUser) {
        currentPage = 'admin';
        app.innerHTML = renderAdminPage();
        attachEventListeners();
    } else {
        currentPage = 'public';
        app.innerHTML = renderPublicPage();
        attachEventListeners();
    }

    const interviewsList = document.getElementById('interviewsList');
    if (interviewsList) {
        interviewsList.innerHTML = renderInterviews();
        renderPagination();
    }
}

function attachEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const resultFilter = document.getElementById('resultFilter');
    const difficultyFilter = document.getElementById('difficultyFilter');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.filters.search = e.target.value;
            applyFilters();
        });
    }

    if (resultFilter) {
        resultFilter.addEventListener('change', (e) => {
            state.filters.result = e.target.value;
            applyFilters();
        });
    }

    if (difficultyFilter) {
        difficultyFilter.addEventListener('change', (e) => {
            state.filters.difficulty = e.target.value;
            applyFilters();
        });
    }
}

function showAdminModal() {
    currentPage = 'auth';
    render();
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const messageDiv = document.getElementById('authMessage');

    try {
        messageDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Signing in...</div>';
        await login(email, password);
        render();
    } catch (error) {
        messageDiv.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

async function logoutUser() {
    try {
        await logout();
        render();
    } catch (error) {
        alert('Logout failed: ' + error.message);
    }
}

function showInterviewModal() {
    const modal = document.createElement('div');
    modal.id = 'interviewModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add Interview</h2>
                <button class="close-btn" onclick="closeModal()">✕</button>
            </div>
            <form onsubmit="handleSaveInterview(event)">
                <div class="form-group">
                    <label>Company Name *</label>
                    <input type="text" id="formCompany" required>
                </div>
                <div class="form-group">
                    <label>Position *</label>
                    <input type="text" id="formPosition" required>
                </div>
                <div class="form-group">
                    <label>Location *</label>
                    <input type="text" id="formLocation" placeholder="City, Country or Remote" required>
                </div>
                <div class="form-group">
                    <label>Interview Date *</label>
                    <input type="date" id="formDate" required>
                </div>
                <div class="form-group">
                    <label>Number of Rounds *</label>
                    <input type="number" id="formRounds" value="1" min="1" required>
                </div>
                <div class="form-group">
                    <label>Description *</label>
                    <textarea id="formDescription" required></textarea>
                </div>
                <div class="form-group">
                    <label>Salary Range</label>
                    <input type="text" id="formSalary" placeholder="₹8-12 LPA">
                </div>
                <div class="form-group">
                    <label>Tips for Candidates</label>
                    <textarea id="formTips"></textarea>
                </div>
                <div class="form-group">
                <label>Apply Link</label>
                <input type="url" id="formApplyLink" placeholder="https://company-careers-page.com">
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button type="button" class="btn-secondary" onclick="closeModal()" style="flex: 1;">Cancel</button>
                    <button type="submit" class="btn-primary" style="flex: 1;">Save Interview</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function editInterview(id) {
    const interview = state.interviews.find(i => i.id === id);
    if (!interview) return;

    const modal = document.createElement('div');
    modal.id = 'interviewModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Interview</h2>
                <button class="close-btn" onclick="closeModal()">✕</button>
            </div>
            <form onsubmit="handleSaveInterview(event, '${id}')">
                <div class="form-group">
                    <label>Company Name *</label>
                    <input type="text" id="formCompany" value="${interview.company_name}" required>
                </div>
                <div class="form-group">
                    <label>Position *</label>
                    <input type="text" id="formPosition" value="${interview.position}" required>
                </div>
                <div class="form-group">
                    <label>Location *</label>
                    <input type="text" id="formLocation" value="${interview.location}" required>
                </div>
                <div class="form-group">
                    <label>Interview Date *</label>
                    <input type="date" id="formDate" value="${interview.interview_date}" required>
                </div>
                <div class="form-group">
                    <label>Number of Rounds *</label>
                    <input type="number" id="formRounds" value="${interview.rounds}" min="1" required>
                </div>
                <div class="form-group">
                    <label>Description *</label>
                    <textarea id="formDescription" required>${interview.description}</textarea>
                </div>
                <div class="form-group">
                    <label>Topics Covered</label>
                    <input type="text" id="formTopics" value="${interview.topics_covered || ''}">
                </div>
                <div class="form-group">
                    <label>Salary Range</label>
                    <input type="text" id="formSalary" value="${interview.salary_range || ''}">
                </div>
                <div class="form-group">
                    <label>Tips for Candidates</label>
                    <textarea id="formTips">${interview.tips || ''}</textarea>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button type="button" class="btn-secondary" onclick="closeModal()" style="flex: 1;">Cancel</button>
                    <button type="submit" class="btn-primary" style="flex: 1;">Update Interview</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

async function handleSaveInterview(e, id = null) {
    e.preventDefault();

    const interview = {
        company_name: document.getElementById('formCompany').value,
        position: document.getElementById('formPosition').value,
        location: document.getElementById('formLocation').value,
        interview_date: document.getElementById('formDate').value,
        result: document.getElementById('formResult').value,
        description: document.getElementById('formDescription').value,
        topics_covered: document.getElementById('formTopics').value,
        salary_range: document.getElementById('formSalary').value,
        tips: document.getElementById('formTips').value,
        apply_link: document.getElementById('formApplyLink').value
    };

    if (id) interview.id = id;

    try {
        await saveInterview(interview);
        closeModal();
    } catch (error) {
        alert('Error saving interview: ' + error.message);
    }
}

function closeModal() {
    const modal = document.getElementById('interviewModal');
    if (modal) modal.remove();
}

async function deleteInterviewHandler(id) {
    if (!confirm('Are you sure you want to delete this interview?')) return;
    try {
        await deleteInterview(id);
    } catch (error) {
        alert('Error deleting interview: ' + error.message);
    }
}

async function init() {
    await checkAuth();
    await fetchInterviews();
    render();
}
window.showAdminModal = showAdminModal;
window.handleLogin = handleLogin;
window.logoutUser = logoutUser;
window.showInterviewModal = showInterviewModal;
window.editInterview = editInterview;
window.deleteInterviewHandler = deleteInterviewHandler;
window.closeModal = closeModal;
window.handleSaveInterview = handleSaveInterview;

init();