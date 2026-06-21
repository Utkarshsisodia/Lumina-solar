const express = require('express');
const cors = require('cors');

const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from the root directory so HTML files work
app.use(express.static(__dirname));

// Endpoint to generate PDF quote
app.post('/generate-quote', async (req, res) => {
    const { 
        monthlyBill, 
        roofShade, 
        twentyYearSavings, 
        newMonthlyBill, 
        co2PerYear 
    } = req.body;

    let browser;
    try {
        // Read the HTML template
        const templatePath = path.join(__dirname, 'quote-template.html');
        let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

        // Format currency strings
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        });

        // Inject data into HTML template
        const htmlContent = htmlTemplate
            .replace('{{monthlyBill}}', formatter.format(monthlyBill))
            .replace('{{roofShade}}', roofShade.charAt(0).toUpperCase() + roofShade.slice(1))
            .replace('{{twentyYearSavings}}', formatter.format(twentyYearSavings))
            .replace('{{newMonthlyBill}}', formatter.format(newMonthlyBill))
            .replace('{{co2PerYear}}', co2PerYear.toFixed(1))
            .replace('{{date}}', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));

        // Launch Puppeteer dynamically (since Puppeteer is now an ES Module)
        const puppeteer = (await import('puppeteer')).default;

        browser = await puppeteer.launch({ 
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        
        const page = await browser.newPage();
        
        // We set the content directly. For remote assets like CDNs, waitUntil: 'networkidle0' is helpful
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        // Emulate screen media so CSS @media screen applies
        await page.emulateMediaType('screen');

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            }
        });

        // Send PDF response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="Lumina_Solar_Quote.pdf"');
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF quote' });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// Fallback to index
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'solar-landing.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
