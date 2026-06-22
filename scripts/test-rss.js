const Parser = require('rss-parser');

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*'
    },
    timeout: 10000,
});

const testUrls = [
    'https://medium.com/feed/@somtouwazie',
    'https://medium.com/@somtouwazie/feed',
    'https://api.rss2json.com/v1/api.json?rss_url=https://medium.com/feed/@somtouwazie'
];

async function test() {
    for (const url of testUrls) {
        try {
            console.log(`\nTrying: ${url}`);
            const feed = await parser.parseURL(url);
            console.log(`SUCCESS: ${feed.items.length} articles`);
            feed.items.slice(0, 3).forEach(i => console.log(`  - ${i.title}`));
            break;
        } catch (e) {
            console.log(`FAIL: ${e.message}`);
        }
    }
}

test();
