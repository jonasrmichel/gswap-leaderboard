import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateFavicon() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Create HTML with canvas
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { margin: 0; padding: 0; }
            canvas { display: block; }
        </style>
    </head>
    <body>
        <canvas id="canvas" width="32" height="32"></canvas>
        <script>
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            
            // Draw trophy emoji
            ctx.font = '24px system-ui, -apple-system, "Segoe UI", Roboto, "Apple Color Emoji", "Segoe UI Emoji"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🏆', 16, 16);
        </script>
    </body>
    </html>
    `;
    
    await page.setContent(html);
    
    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Take screenshot of canvas
    const element = await page.$('#canvas');
    const screenshot = await element.screenshot({ omitBackground: true });
    
    // Save as favicon.png
    const outputPath = path.join(__dirname, '..', 'static', 'favicon.png');
    fs.writeFileSync(outputPath, screenshot);
    
    console.log(`✅ Generated favicon.png with 🏆 emoji`);
    
    await browser.close();
}

generateFavicon().catch(console.error);