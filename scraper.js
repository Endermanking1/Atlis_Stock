const puppeteer = require('puppeteer');

/**
 * Premium Anti-Cloudflare Precise Isolated Component Scraper
 * @param {string} url - Target Traderie URL
 * @param {string[]} catalog - Array of item names passed dynamically from the bot catalog
 */
async function runCustomScraper(url, catalog) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(res => setTimeout(res, 8000)); 

    // FIX: Verify top execution frame status to completely shut down detached frame exceptions
    const topFrame = page.mainFrame();
    if (!topFrame || page.isClosed()) return null;

    const extractedData = await topFrame.evaluate((itemCatalog) => {
      const itemsFound = [];
      
      // Target individual inventory stock card boxes on the layout grid frame
      const cards = Array.from(document.querySelectorAll('[class*="item_card"], [class*="stock_item"], [class*="ItemComponent"], [class*="stock-card"], a[href*="/product/"], div[class*="Card"]'));
      
      cards.forEach(card => {
        const cardText = card.textContent ? card.textContent.trim() : '';
        if (!cardText) return;

        itemCatalog.forEach(itemName => {
          // Check if this specific layout boundary card matches our item name string
          if (cardText.includes(itemName)) {
            // Isolate the regex quantity lookup strictly to this small bounded string segment
            const qtyMatch = cardText.match(/x\s*(\d+)/i) || cardText.match(/(\d+)\s*x/i) || cardText.match(/\((\d+)\)/);
            const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

            itemsFound.push({ name: itemName, qty: quantity });
          }
        });
      });

      // Fallback check to trap un-nested responsive layout trees if card classes vary
      if (itemsFound.length === 0) {
        const allElements = Array.from(document.querySelectorAll('div, span, p, a'));
        allElements.forEach(el => {
          if (el.children.length > 2) return; 
          const text = el.textContent ? el.textContent.trim() : '';
          if (!text) return;

          itemCatalog.forEach(itemName => {
            if (text.includes(itemName)) {
              const parentContainer = el.closest('div[class*="item"], div[class*="card"], a') || el;
              const containerText = parentContainer.textContent ? parentContainer.textContent.trim() : text;
              const qtyMatch = containerText.match(/x\s*(\d+)/i) || containerText.match(/(\d+)\s*x/i) || containerText.match(/\((\d+)\)/);
              const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

              itemsFound.push({ name: itemName, qty: quantity });
            }
          });
        });
      }

      let timeStr = '';
      const bodyText = document.body.textContent || '';
      const timeMatch = bodyText.match(/Updates in\s*([\dm\s]+s?)/i) || bodyText.match(/Restock in\s*([\dm\s]+s?)/i);
      if (timeMatch) timeStr = timeMatch[1].trim();

      return { timeRemainingStr: timeStr, stocks: itemsFound };
    }, catalog);

    const uniqueItems = extractedData.stocks.reduce((acc, current) => {
      const existing = acc.find(item => item.name === current.name);
      if (!existing) {
        return acc.concat([current]);
      } else {
        if (current.qty > existing.qty) existing.qty = current.qty;
        return acc;
      }
    }, []);

    const finalStockList = uniqueItems.filter(item => item.qty > 0);
    return { timeRemainingStr: extractedData.timeRemainingStr, stocks: finalStockList };

  } catch (error) {
    console.error(`❌ [Scraper Error]:`, error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { runCustomScraper };