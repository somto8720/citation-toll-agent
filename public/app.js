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

    // Mock data for initial render until backend is fully wired
    const mockCatalog = [
        { title: 'The Future of AI Agents', price: 0.005, citations: 42, status: 'Active' },
        { title: 'Arc Nanopayments Deep Dive', price: 0.012, citations: 15, status: 'Active' },
        { title: 'State of LLM Scraping', price: 0.001, citations: 3, status: 'Active' }
    ];

    const mockLogs = [
        { msg: 'Increased "Arc Nanopayments" by 15%', reason: 'Demand velocity > 5/hr', type: 'increase' },
        { msg: 'Decreased "State of LLM" by 5%', reason: 'Low citations & age > 7 days', type: 'decrease' },
        { msg: 'Increased "Future of AI" by 10%', reason: 'Unique AI consumers rising rapidly', type: 'increase' }
    ];

    // Render Catalog
    const catalogBody = document.getElementById('catalog-body');
    mockCatalog.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.title}</td>
            <td style="color: var(--success);">$${item.price.toFixed(3)}</td>
            <td>${item.citations}</td>
            <td><span style="background: rgba(16,185,129,0.2); color: #10b981; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">${item.status}</span></td>
        `;
        catalogBody.appendChild(row);
    });

    // Render Logs
    const logContainer = document.getElementById('agent-logs-container');
    mockLogs.forEach(log => {
        const div = document.createElement('div');
        div.className = `log-entry ${log.type}`;
        div.innerHTML = `
            <strong>${log.msg}</strong>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">Reason: ${log.reason}</p>
        `;
        logContainer.appendChild(div);
    });

    // We would fetch real data here
    async function fetchData() {
        try {
            const statsRes = await fetch('http://localhost:3000/api/stats');
            const stats = await statsRes.json();
            if(stats.success) {
                document.getElementById('total-earned').innerText = `$${stats.stats.totalEarned.toFixed(3)}`;
                document.getElementById('total-citations').innerText = stats.stats.citations;
            }
        } catch(e) {
            console.log('Backend not fully hooked up yet, using mock values.');
            document.getElementById('total-earned').innerText = '$0.250';
            document.getElementById('total-citations').innerText = '60';
            document.getElementById('active-articles').innerText = '3';
        }
    }

    fetchData();
});
