const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SERP_API_KEY = process.env.SERP_API_KEY || 'f09191e9529ac5c8524214e0fe7f5a79dbf754f912330921b57829c6b2fc6ff5';

// כאן מגיע תיקון ה-CORS שיפתור לך את הבעיה:
app.use(cors({
  origin: '*'
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const domainsFilePath = path.join(__dirname, 'domains.json');

// Load domains from file
const loadDomains = () => {
    if (!fs.existsSync(domainsFilePath)) {
        fs.writeFileSync(domainsFilePath, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(domainsFilePath, 'utf8'));
};

// Save domains to file
const saveDomains = (domains) => fs.writeFileSync(domainsFilePath, JSON.stringify(domains, null, 2));

app.post('/check-rank', async (req, res) => {
    const { domain, keywords, searchType } = req.body;

    const domainsData = loadDomains();
    domainsData[domain] = keywords;
    saveDomains(domainsData);

    try {
        const results = await Promise.all(keywords.map(async (keyword) => {
            let position = "לא נמצא בעמוד 1-2";

            for (let page = 1; page <= 2; page++) {
                const params = {
                    engine: 'google',
                    q: keyword,
                    gl: 'il',
                    hl: 'he',
                    api_key: SERP_API_KEY,
                    device: searchType,
                    start: (page - 1) * 10
                };

                const response = await axios.get('https://serpapi.com/search', { params });
                const serpResults = response.data.organic_results;

                const indexInPage = serpResults.findIndex(result => result.link.includes(domain));

                if (indexInPage >= 0) {
                    position = (page - 1) * 10 + indexInPage + 1;
                    break;
                }
            }

            return {
                keyword,
                position: typeof position === 'number' ? `מיקום ${position}` : position
            };
        }));

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/domains', (req, res) => {
    const domainsData = loadDomains();
    res.json(Object.keys(domainsData));
});

app.get('/domains/:domain', (req, res) => {
    const domainsData = loadDomains();
    const domain = req.params.domain;
    res.json(domainsData[domain] || []);
});

app.listen(PORT, () => {
    console.log(`🔥 השרת המשודרג רץ על פורט ${PORT}`);
});
