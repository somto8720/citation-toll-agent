/* ── Helpers ── */
const $ = (id) => document.getElementById(id);
const showToast = (msg, dur = 3000) => {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), dur);
};

/* ── Mobile Sidebar Toggle ── */
const sidebar        = $('sidebar');
const overlay        = $('sidebar-overlay');
const hamburgerBtn   = $('hamburger-btn');
const sidebarCloseBtn = $('sidebar-close-btn');

function openSidebar() {
    sidebar?.classList.add('open');
    overlay?.classList.add('active');
    document.body.style.overflow = 'hidden'; // prevent background scroll
}
function closeSidebar() {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
}

hamburgerBtn?.addEventListener('click', openSidebar);
sidebarCloseBtn?.addEventListener('click', closeSidebar);
overlay?.addEventListener('click', closeSidebar);

/* 📱 Responsive Layout Shifter 📱 */
function adaptLayout() {
    const publisherCard = document.querySelector('.publisher-card');
    const dash = $('dashboard');
    const side = $('sidebar');
    
    if (!publisherCard || !dash || !side) return;

    if (window.innerWidth <= 768) {
        // On mobile: Move sign-up card to the very top of the dashboard feed so it's instantly visible
        if (publisherCard.parentElement === side) {
            dash.insertBefore(publisherCard, dash.firstChild);
        }
    } else {
        // On desktop: Keep it in the sidebar
        if (publisherCard.parentElement === dash) {
            side.appendChild(publisherCard);
        }
    }
}
window.addEventListener('resize', adaptLayout);
document.addEventListener('DOMContentLoaded', adaptLayout);
adaptLayout(); // Run immediately on load

/* ── Navigation ── */
const navItems = document.querySelectorAll('.nav-item[data-section]');
const sections = document.querySelectorAll('.content-section');
const titles = {
    dashboard:    ['Dashboard', 'Live overview of your monetization activity'],
    catalog:      ['Content Catalog', 'All monetized articles and their dynamic prices'],
    intelligence: ['Agent Intelligence', 'Real-time pricing decisions and reasoning logs'],
};

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        const target = item.dataset.section;
        if (!target || item.href?.includes('leaderboard')) return; // external links handled normally
        e.preventDefault();
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        sections.forEach(s => s.classList.remove('active'));
        const sec = document.getElementById(`section-${target}`);
        if (sec) sec.classList.add('active');
        if (titles[target]) {
            $('page-title').textContent    = titles[target][0];
            $('page-subtitle').textContent = titles[target][1];
        }
        if (target === 'catalog')      refreshCatalog();
        if (target === 'intelligence') refreshLogs();
        // Auto-close sidebar on mobile after navigation
        closeSidebar();
    });
});

/* ── Publisher Sign-Up ── */
const signupForm   = $('signup-form');
const signupStatus = $('signup-status');

signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url    = $('rss-url').value.trim();
    const wallet = $('arc-wallet').value.trim();
    const btn    = $('signup-btn');
    const btnText = btn.querySelector('.btn-text');

    btnText.textContent = 'Registering…';
    btn.disabled = true;
    signupStatus.className = '';
    signupStatus.style.display = 'none';

    try {
        const res  = await fetch('/api/articles/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, arc_wallet: wallet }),
        });
        const data = await res.json();

        if (data.success) {
            signupForm.reset();
            signupStatus.textContent  = '✓ ' + data.message;
            signupStatus.className    = 'success';
            showToast('Publisher registered! Your articles are now monetized.');
            refreshDashboard();
        } else {
            signupStatus.textContent = '✗ ' + (data.error || 'Unknown error');
            signupStatus.className   = 'error';
        }
    } catch (err) {
        signupStatus.textContent = '✗ Network error. Please try again.';
        signupStatus.className   = 'error';
    } finally {
        btnText.textContent = 'Start Earning';
        btn.disabled = false;
    }
});

/* ── Force Settlement ── */
$('force-settlement-btn')?.addEventListener('click', async () => {
    const btn = $('force-settlement-btn');
    btn.textContent = 'Settling…';
    btn.disabled = true;

    try {
        const res  = await fetch('/api/payout/force', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast('✓ On-chain settlement triggered via Circle SDK!');
            refreshDashboard();
        } else {
            showToast('Settlement error: ' + data.error);
        }
    } catch (err) {
        showToast('Network error during settlement.');
    } finally {
        setTimeout(() => { btn.textContent = 'Force Settlement'; btn.disabled = false; }, 2000);
    }
});

/* ── Buyer Agent ── */
let buyerAgentInterval = null;

$('buyer-agent-btn')?.addEventListener('click', async () => {
    const btn = $('buyer-agent-btn');
    
    if (buyerAgentInterval) {
        // Stop the agent
        clearInterval(buyerAgentInterval);
        buyerAgentInterval = null;
        btn.innerHTML = '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M3 21v-1a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v1"/></svg> Run Buyer Agent';
        btn.style.background = '';
        btn.style.color = '';
        showToast('Buyer Agent stopped.');
        return;
    }

    // Start the agent
    btn.innerHTML = '🛑 Stop Buyer Agent';
    btn.style.background = 'var(--danger, #ff4444)';
    btn.style.color = 'white';
    showToast('Buyer Agent activated! Simulating continuous enterprise traffic...');

    async function runAgent() {
        try {
            const res  = await fetch('/api/demo/buyer-agent', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast(`✓ Buyer Agent purchased ${data.purchased} article(s). USDC flowing!`);
                refreshDashboard();
                refreshLogs();
            } else {
                console.error('Buyer Agent error:', data.error);
            }
        } catch (err) {
            console.error('Network error running Buyer Agent.', err);
        }
    }

    // Run immediately, then every 8 seconds
    runAgent();
    buyerAgentInterval = setInterval(runAgent, 8000);
});

/* ── Run Pricing Cycle ── */
$('run-pricing-btn')?.addEventListener('click', async () => {
    const btn = $('run-pricing-btn');
    btn.textContent = 'Running…';
    btn.disabled = true;
    try {
        const res  = await fetch('/api/cron/pricing');
        const data = await res.json();
        if (data.success) {
            showToast('✓ Pricing cycle complete. Logs updated.');
            refreshLogs();
        }
    } catch (err) {
        showToast('Error running pricing cycle.');
    } finally {
        setTimeout(() => { btn.textContent = 'Run Pricing Cycle'; btn.disabled = false; }, 2000);
    }
});

/* ── Data Fetchers ── */
async function refreshDashboard() {
    try {
        const [statsRes, catalogRes] = await Promise.all([
            fetch('/api/stats'),
            fetch('/api/catalog'),
        ]);
        const stats   = await statsRes.json();
        const catalog = await catalogRes.json();

        if (stats.success) {
            $('total-earned').textContent   = `$${stats.stats.totalEarned.toFixed(3)}`;
            $('total-citations').textContent = stats.stats.citations;
        }
        if (catalog.success) {
            const articles = catalog.articles || [];
            $('active-articles').textContent = articles.length;

            // Count unique wallets as publishers
            const wallets = new Set(articles.map(a => a.creator_wallet).filter(Boolean));
            $('total-publishers').textContent = wallets.size;

            // Activity feed from recent articles
            const feed = $('activity-feed');
            if (articles.length > 0) {
                feed.innerHTML = '';
                articles.slice(0, 6).forEach(a => {
                    const el = document.createElement('div');
                    el.className = 'activity-item';
                    el.innerHTML = `
                        <div class="activity-dot green"></div>
                        <div class="activity-body">
                            <strong>${a.title?.substring(0, 60) || 'Untitled'}${(a.title?.length > 60) ? '…' : ''}</strong>
                            <span>Monetized at <strong style="color:var(--success)">$${a.current_price?.toFixed(4) || '0.0010'}</strong> per AI read · ${a.creator_wallet?.substring(0,8)}…</span>
                        </div>`;
                    feed.appendChild(el);
                });
            }

            // Badge count on catalog nav
            $('catalog-count').textContent = `${articles.length} article${articles.length !== 1 ? 's' : ''}`;
        }
    } catch (e) {
        console.error('Dashboard refresh failed:', e);
    }
}

async function refreshCatalog() {
    try {
        const res     = await fetch('/api/catalog');
        const catalog = await res.json();
        const tbody   = $('catalog-body');

        if (!catalog.success || catalog.articles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No articles registered yet. Sign up a publisher to get started.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        catalog.articles.forEach(a => {
            const wallet = a.creator_wallet;
            const shortW = wallet ? `${wallet.substring(0,6)}…${wallet.substring(wallet.length-4)}` : '—';
            const link   = a.source_url
                ? `<a href="${a.source_url}" target="_blank" rel="noopener" style="color:var(--accent);font-weight:600;text-decoration:none;">${(a.title||'Untitled').substring(0,55)}${a.title?.length>55?'…':''}</a>`
                : (a.title || 'Untitled').substring(0, 55);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${link}</td>
                <td><span class="price-pill">$${(a.current_price||0.001).toFixed(4)}</span></td>
                <td><span class="wallet-mono">${shortW}</span></td>
                <td><span class="status-pill"><span class="live-dot small"></span>Active</span></td>`;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Catalog refresh failed:', e);
    }
}

async function refreshLogs() {
    try {
        const res  = await fetch('/api/logs');
        const data = await res.json();
        const container = $('agent-logs-container');

        if (!data.success || data.logs.length === 0) {
            container.innerHTML = `<div class="empty-state">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" opacity=".3"><circle cx="12" cy="12" r="3"/><path d="M19.428 15.428a2 2 0 0 0 .002-2.858l-7.07-7.07a2 2 0 0 0-2.858 0L5.43 9.572a2 2 0 0 0 0 2.858l7.07 7.07a2 2 0 0 0 2.858 0l4.07-4.072z"/></svg>
                <p>No pricing events yet. Register articles and run a pricing cycle.</p>
            </div>`;
            return;
        }

        container.innerHTML = '';
        data.logs.slice(0, 15).forEach(log => {
            const isUp   = log.new_price > log.old_price;
            const isBuyer = log.reasoning?.toLowerCase().includes('buyer');
            const el = document.createElement('div');
            el.className = `log-item ${isBuyer ? 'buyer' : (isUp ? 'increase' : 'decrease')}`;
            el.innerHTML = `
                <div class="log-icon">${isBuyer ? '🤖' : (isUp ? '📈' : '📉')}</div>
                <div class="log-body">
                    <strong>${isBuyer ? 'Buyer Agent Purchase' : ('Price ' + (isUp ? 'Raised' : 'Lowered') + ' → $' + log.new_price?.toFixed(4))}</strong>
                    <span>"${log.reasoning}"</span>
                </div>`;
            container.appendChild(el);
        });
    } catch (e) {
        console.error('Logs refresh failed:', e);
    }
}

/* ── Auto-Poll ── */
refreshDashboard();
setInterval(refreshDashboard, 6000);
