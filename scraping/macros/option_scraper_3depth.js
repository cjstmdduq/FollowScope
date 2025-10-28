// 네이버 브랜드 스토어 가격 스크래퍼 - 3단계 드롭다운 (간소화 & 저부하 모드)
// 수정일 : 2025.10.14 
// 사용법: 상품 상세 페이지에서 F12 → Console → 이 코드 전체 붙여넣기 → Enter

(function () {
  'use strict';

  const wait = (ms) => new Promise(res => setTimeout(res, ms));
  const humanDelay = (min, max = min + 200) => {
    const lower = Math.max(50, min);
    const upper = Math.max(lower + 50, max);
    const duration = Math.round(lower + Math.random() * (upper - lower));
    return wait(duration);
  };

  // === 기본가 셀렉터 (할인 적용된 판매가) ===
  async function getBasePrice() {
    // 렌더 지연 대비 소폭 재시도
    for (let t = 0; t < 6; t++) {
      const el = document.querySelector('strong.Xu9MEKUuIo span.e1DMQNBPJ_');
      if (el) {
        const txt = (el.textContent || '').trim();
        if (txt) return txt;
      }
      await humanDelay(120, 260);
    }
    return 'N/A';
  }

  async function openDropdown(dropdown) {
    if (!dropdown) return false;
    const isExpanded = dropdown.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      dropdown.click();
      await humanDelay(320, 480);
    }
    dropdown.click();
    await humanDelay(780, 1080);
    return true;
  }

  async function scrapeOptionCombinations() {
    const results = [];
    const logBuffer = [];
    const newline = String.fromCharCode(10);
    const flushLogs = () => {
      if (!logBuffer.length) return;
      console.log(logBuffer.join(newline));
      logBuffer.length = 0;
    };

    // === 드롭다운 버튼 (순서 기반) ===
    const dropdowns = document.querySelectorAll('a[role="button"][aria-haspopup="listbox"]');
    const d1 = dropdowns[0];
    const d2 = dropdowns[1];
    const d3 = dropdowns[2];

    // === 옵션 리스트 셀렉터 (열린 레이어 공통) ===
    const o1s = 'ul[role="listbox"] a[role="option"]';
    const o2s = 'ul[role="listbox"] a[role="option"]';
    const o3s = 'ul[role="listbox"] a[role="option"]';

    if (!await openDropdown(d1)) return results;
    await humanDelay(680, 940);

    const firstOptions = document.querySelectorAll(o1s);
    for (let i = 0; i < firstOptions.length; i++) {
      await openDropdown(d1);
      await humanDelay(460, 680);
      const opt1s = document.querySelectorAll(o1s);
      const opt1Text = opt1s[i].textContent.trim();
      opt1s[i].click();
      await humanDelay(1060, 1460);

      if (!await openDropdown(d2)) continue;
      await humanDelay(460, 700);
      const secondOptions = document.querySelectorAll(o2s);

      for (let j = 0; j < secondOptions.length; j++) {
        await openDropdown(d1);
        await humanDelay(320, 480);
        const opt1sAgain = document.querySelectorAll(o1s);
        opt1sAgain[i].click();
        await humanDelay(780, 1090);

        await openDropdown(d2);
        await humanDelay(330, 500);
        const opt2s = document.querySelectorAll(o2s);
        const opt2Text = opt2s[j].textContent.trim();
        opt2s[j].click();
        await humanDelay(780, 1090);

        if (!await openDropdown(d3)) continue;
        await humanDelay(460, 720);
        const opt3s = document.querySelectorAll(o3s);

        for (let k = 0; k < opt3s.length; k++) {
          const opt3Text = opt3s[k].textContent.trim();
          results.push({ 옵션1: opt1Text, 옵션2: opt2Text, 옵션3: opt3Text });
          logBuffer.push(`✅ ${opt1Text} | ${opt2Text} | ${opt3Text}`);
          await humanDelay(380, 560);
        }
        flushLogs();
      }
    }
    flushLogs();
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