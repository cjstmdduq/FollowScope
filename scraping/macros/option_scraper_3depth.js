// 네이버 브랜드 스토어 가격 스크래퍼 - 3단계 드롭다운 (간소화 & 저부하 모드)
// 2025.09.08 ver
// 사용법: 상품 상세 페이지에서 F12 → Console → 이 코드 전체 붙여넣기 → Enter
// VPN사용 권장 , CSV 버젼으로 업데이트
(function () {
  'use strict';

  const wait = (ms) => new Promise(res => setTimeout(res, ms));

  async function getBasePrice() {
    const el = document.querySelector('strong.Xu9MEKUuIo > span.e1DMQNBPJ_');
    if (el) {
      const txt = el.textContent.trim();
      return txt;
    }
    return 'N/A';
  }

  async function openDropdown(sel) {
    const dropdown = document.querySelector(sel);
    if (!dropdown) return false;
    const isExpanded = dropdown.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      dropdown.click();
      await wait(600);   // (기존 200 → 600ms)
    }
    dropdown.click();
    await wait(1500);    // (기존 500 → 1500ms, 최소 1초 이상)
    return true;
  }

  async function scrapeOptionCombinations() {
    const results = [];

    const d1 = 'div.bd_2dy3Y > div:nth-child(1) > a.bd_1fhc9';
    const d2 = 'div.bd_2dy3Y > div:nth-child(2) > a.bd_1fhc9';
    const d3 = 'div.bd_2dy3Y > div:nth-child(3) > a.bd_1fhc9';

    const o1s = 'div.bd_2dy3Y > div:nth-child(1) ul[role="listbox"] a[role="option"]';
    const o2s = 'div.bd_2dy3Y > div:nth-child(2) ul[role="listbox"] a[role="option"]';
    const o3s = 'div.bd_2dy3Y > div:nth-child(3) ul[role="listbox"] a[role="option"]';

    if (!await openDropdown(d1)) return results;
    await wait(1500);

    const firstOptions = document.querySelectorAll(o1s);
    for (let i = 0; i < firstOptions.length; i++) {
      await openDropdown(d1);
      await wait(1000);  // (기존 300 → 1000ms)
      const opt1s = document.querySelectorAll(o1s);
      const opt1Text = opt1s[i].textContent.trim();
      opt1s[i].click();
      await wait(2400);  // (기존 800 → 2400ms)

      if (!await openDropdown(d2)) continue;
      await wait(900);   // (기존 300 → 900ms)
      const secondOptions = document.querySelectorAll(o2s);

      for (let j = 0; j < secondOptions.length; j++) {
        await openDropdown(d1);
        await wait(600); // (기존 200 → 600ms)
        const opt1sAgain = document.querySelectorAll(o1s);
        opt1sAgain[i].click();
        await wait(1500); // (기존 500 → 1500ms)

        await openDropdown(d2);
        await wait(600);  // (기존 200 → 600ms)
        const opt2s = document.querySelectorAll(o2s);
        const opt2Text = opt2s[j].textContent.trim();
        opt2s[j].click();
        await wait(1500); // (기존 500 → 1500ms)

        if (!await openDropdown(d3)) continue;
        await wait(900);  // (기존 300 → 900ms)
        const opt3s = document.querySelectorAll(o3s);

        for (let k = 0; k < opt3s.length; k++) {
          const opt3Text = opt3s[k].textContent.trim();
          results.push({ 옵션1: opt1Text, 옵션2: opt2Text, 옵션3: opt3Text });
          console.log(`✅ ${opt1Text} | ${opt2Text} | ${opt3Text}`);
          await wait(1000); // 콤보 간 쿨다운
        }
      }
    }
    return results;
  }

  function toCSV(basePrice, results) {
    const basePriceNum = parseInt(basePrice.replace(/[,원]/g, '')) || 0;
    let csv = `기본가격,옵션1,옵션2,옵션3,추가가격,최종가격\n`;
    csv += `${basePriceNum},,,,${basePriceNum}\n\n`;
    results.forEach(row => {
      const match = row.옵션3.match(/\(([+-][\d,]+)원\)/);
      let add = 0;
      if (match) add = parseInt(match[1].replace(/[,원]/g, '')) || 0;
      const opt3Clean = row.옵션3.replace(/\s*\([+-][\d,]+원\)/, '');
      const final = basePriceNum + add;
      csv += `,${row.옵션1},${row.옵션2},${opt3Clean},${add || ''},${final}\n`;
    });
    return csv;
  }

  function downloadCSV(content, filename) {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function main() {
    const base = await getBasePrice();
    console.log('기본가:', base);
    const combos = await scrapeOptionCombinations();
    console.log('총 조합:', combos.length);
    if (combos.length > 0) {
      const csv = toCSV(base, combos);
      const productName = (document.title.split(' : ')[0] || '상품').replace(/[\\/:*?"<>|]/g, ' ');
      const ts = new Date().toISOString().slice(0,16).replace(/[T:]/g,'-');
      downloadCSV(csv, `${productName}_옵션가격_3단계_${ts}.csv`);
    }
    window.scrapingResults = { basePrice: base, combinations: combos };
  }

  main();
})();
