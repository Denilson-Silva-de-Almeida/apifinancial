const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/scrape", async (req, res) => {
  const { codigo } = req.body;
  if (!codigo) return res.status(400).json({ error: "Código não informado." });

  try {
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();

    await page.goto("https://www.compradiretaparceiros.com.br/whrlarstorefront/", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("#js-site-search-input");
    await page.type("#js-site-search-input", codigo);
    await page.keyboard.press("Enter");

    await page.waitForTimeout(5000);

    const links = await page.$$eval(".product__list--name > a", (as) =>
      as.map((a) => a.href)
    );
    if (!links.length) {
      await browser.close();
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    await page.goto(links[0], { waitUntil: "domcontentloaded" });

    const descricao = await page.$eval(".product__description", (el) => el.innerText).catch(() => "");
    const imagem = await page.$eval(".product__image img", (img) => img.src).catch(() => "");

    await browser.close();

    return res.json({ descricao, imagem });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no scraping" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));