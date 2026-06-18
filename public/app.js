document.addEventListener('DOMContentLoaded', () => {
    // Chart removed for simplified dashboard layout

    // Fetch live data from backend
    async function fetchData() {
        try {
            // Fetch stats
            const statsRes = await fetch('/api/stats');
            const stats = await statsRes.json();
            
            // Fetch catalog
            const catalogRes = await fetch('/api/catalog');
            const catalog = await catalogRes.json();

            if(stats.success && catalog.success) {
                // Update Overview Cards
                document.getElementById('total-earned').innerText = `$${stats.stats.totalEarned.toFixed(3)}`;
                document.getElementById('total-citations').innerText = stats.stats.citations;
                document.getElementById('active-articles').innerText = catalog.articles.length;

                // Render Catalog Table
                const catalogBody = document.getElementById('catalog-body');
                catalogBody.innerHTML = ''; // Clear mocks
                
                catalog.articles.forEach(item => {
                    const row = document.createElement('tr');
                    const link = item.source_url ? `<a href="${item.source_url}" target="_blank" style="color: var(--text-primary); text-decoration: none;">${item.title.substring(0, 50)}${item.title.length > 50 ? '...' : ''}</a>` : item.title;
                    row.innerHTML = `
                        <td>${link}</td>
                        <td style="color: var(--success);">$${item.current_price.toFixed(3)}</td>
                        <td>--</td>
                        <td><span style="background: rgba(16,185,129,0.2); color: #10b981; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">Active</span></td>
                    `;
                    catalogBody.appendChild(row);
                });
            }
        } catch(e) {
            console.error('Failed to fetch live data:', e);
        }
    }

    // Refresh every 5 seconds to show live traffic bot hits
    fetchData();
    setInterval(fetchData, 5000);
});
