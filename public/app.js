document.addEventListener('DOMContentLoaded', () => {
    // Initialize Chart
    const ctx = document.getElementById('earningsChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    const earningsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Today'],
            datasets: [{
                label: 'Revenue (USDC)',
                data: [0.005, 0.015, 0.022, 0.045, 0.08, 0.12, 0.25],
                borderColor: '#38bdf8',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });

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
                    row.innerHTML = `
                        <td>${item.title.substring(0, 50)}${item.title.length > 50 ? '...' : ''}</td>
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
