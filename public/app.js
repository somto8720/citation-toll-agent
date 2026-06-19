document.addEventListener('DOMContentLoaded', () => {
    // Publisher Sign-Up Form Handling
    const signupForm = document.getElementById('signup-form');
    const signupStatus = document.getElementById('signup-status');

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = document.getElementById('rss-url').value;
            const wallet = document.getElementById('arc-wallet').value;
            
            const btn = document.getElementById('signup-btn');
            const originalText = btn.innerText;
            btn.innerText = 'Registering...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/articles/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, arc_wallet: wallet })
                });
                
                const data = await res.json();
                
                if (data.success) {
                    signupForm.reset();
                    signupStatus.innerText = 'Success! Your articles are now monetized.';
                    signupStatus.style.display = 'block';
                    setTimeout(() => { signupStatus.style.display = 'none'; }, 5000);
                    fetchData(); // Refresh catalog immediately
                } else {
                    signupStatus.innerText = 'Error: ' + data.error;
                    signupStatus.style.color = 'var(--color-danger)';
                    signupStatus.style.display = 'block';
                }
            } catch (err) {
                console.error(err);
                signupStatus.innerText = 'Network error. Try again.';
                signupStatus.style.color = 'var(--color-danger)';
                signupStatus.style.display = 'block';
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    // Fetch live data from backend
    async function fetchData() {
        try {
            // Fetch stats
            const statsRes = await fetch('/api/stats');
            const stats = await statsRes.json();
            
            // Fetch catalog
            const catalogRes = await fetch('/api/catalog');
            const catalog = await catalogRes.json();

            // Fetch Agent Reasoning Logs
            const logsRes = await fetch('/api/logs');
            const logs = await logsRes.json();

            if(stats.success && catalog.success) {
                // Update Overview Cards
                document.getElementById('total-earned').innerText = `$${stats.stats.totalEarned.toFixed(3)}`;
                document.getElementById('total-citations').innerText = stats.stats.citations;
                document.getElementById('active-articles').innerText = catalog.articles.length;

                // Render Catalog Table
                const catalogBody = document.getElementById('catalog-body');
                catalogBody.innerHTML = ''; 
                
                catalog.articles.forEach(item => {
                    const row = document.createElement('tr');
                    const link = item.source_url ? `<a href="${item.source_url}" target="_blank" style="color: var(--color-accent); font-weight: 500; text-decoration: none;">${item.title.substring(0, 50)}${item.title.length > 50 ? '...' : ''}</a>` : item.title;
                    const walletSnippet = item.creator_wallet.substring(0,6) + '...' + item.creator_wallet.substring(item.creator_wallet.length-4);
                    
                    row.innerHTML = `
                        <td>${link}</td>
                        <td style="color: var(--color-success); font-weight: 600;">$${item.current_price.toFixed(3)}</td>
                        <td style="color: var(--color-muted); font-family: var(--font-mono); font-size: 0.8rem;">${walletSnippet}</td>
                        <td><span style="background: rgba(16,185,129,0.1); color: var(--color-success); padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">Active</span></td>
                    `;
                    catalogBody.appendChild(row);
                });
            }

            if (logs.success) {
                const logsContainer = document.getElementById('agent-logs-container');
                if (logs.logs.length === 0) {
                    logsContainer.innerHTML = '<div style="color: var(--color-muted); font-size: 0.85rem; text-align: center; margin-top: 2rem;">Waiting for pricing signals...</div>';
                } else {
                    logsContainer.innerHTML = '';
                    logs.logs.slice(0, 10).forEach(log => {
                        const entry = document.createElement('div');
                        const isIncrease = log.new_price > log.old_price;
                        entry.className = 'log-entry';
                        if (!isIncrease) entry.style.borderLeftColor = 'var(--color-danger)';
                        
                        entry.innerHTML = `
                            <strong>Price ${isIncrease ? 'Increased' : 'Decreased'} to $${log.new_price.toFixed(3)}</strong>
                            <span class="reason">"${log.reasoning}"</span>
                        `;
                        logsContainer.appendChild(entry);
                    });
                }
            }
        } catch(e) {
            console.error('Failed to fetch live data:', e);
        }
    }

    // Initial fetch and poll
    fetchData();
    setInterval(fetchData, 5000);
});
