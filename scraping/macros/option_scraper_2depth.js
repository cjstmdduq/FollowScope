// 네이버 브랜드 스토어 가격 스크래퍼 - 2단계 드롭다운 (간소화 & 저부하 모드)
// 2025.10.28 ver (humanDelay로 대기 랜덤화)
// 사용: 상품 상세 페이지에서 F12 → Console → 이 코드 전체 붙여넣기 → Enter 
// VPN사용 권장
(function () {
  'use strict';

  const wait = (ms) => new Promise(res => setTimeout(res, ms));
  const humanDelay = (min, max = min + 200) => {
    const lower = Math.max(50, min);
    const upper = Math.max(lower + 50, max);
    const duration = Math.round(lower + Math.random() * (upper - lower));
    return wait(duration);
  };

  // === 기본 가격 추출 (최신 구조 대응) ===
  async function getBasePrice() {
    await humanDelay(420, 680);
    const el = document.querySelector('strong.Xu9MEKUuIo > span.e1DMQNBPJ_');
    if (el) {
      const txt = el.textContent.trim();
      console.log('기본 가격:', txt);
      return txt;
    }
    console.warn('⚠️ 기본 가격을 찾지 못했습니다.');
    return 'N/A';
  }

  // === 드롭다운 열기 ===
  async function openDropdown(dropdown) {
    if (!dropdown) return false;

    const isExpanded = dropdown.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      dropdown.click(); // 닫기
      await humanDelay(320, 480);
    }
    dropdown.click();   // 열기
    await humanDelay(780, 1080);
    return true;
  }

  // === 옵션 조합 스크래핑 ===
  async function scrapeOptionCombinations() {
    const results = [];
    const logBuffer = [];
    const newline = String.fromCharCode(10);
    const flushLogs = () => {
      if (!logBuffer.length) return;
      console.log(logBuffer.join(newline));
      logBuffer.length = 0;
    };

    const dropdowns = document.querySelectorAll('a[role="button"][aria-haspopup="listbox"]');
    const d1 = dropdowns[0];
    const d2 = dropdowns[1];

    const o1s = 'ul[role="listbox"] a[role="option"]';
    const o2s = 'ul[role="listbox"] a[role="option"]';

    if (!await openDropdown(d1)) return results;
    await humanDelay(680, 940);

    const firstOptions = document.querySelectorAll(o1s);
    for (let i = 0; i < firstOptions.length; i++) {
      await openDropdown(d1);
      await humanDelay(460, 680);
      const opt1s = document.querySelectorAll(o1s);
      const opt1Text = opt1s[i].textContent.trim();
      opt1s[i].click();
      await humanDelay(1050, 1450);

      if (!await openDropdown(d2)) continue;
      await humanDelay(460, 700);
      const secondOptions = document.querySelectorAll(o2s);

      for (let j = 0; j < secondOptions.length; j++) {
        const opt2Text = secondOptions[j].textContent.trim();
        results.push({ 옵션1: opt1Text, 옵션2: opt2Text });
        logBuffer.push(`✅ ${opt1Text} | ${opt2Text}`);
        await humanDelay(380, 560);
      }
      flushLogs();
    }
    flushLogs();

    console.log(`\n=== 스크래핑 완료: 총 ${results.length}개 ===`);
    return results;
  }

  // === CSV 변환 ===
  function toCSV(basePrice, results) {
    const basePriceNum = parseInt(basePrice.replace(/[,원]/g, '')) || 0;
    let csv = `기본가격,옵션1,옵션2,추가가격,최종가격\n`;
    csv += `${basePriceNum},,,,${basePriceNum}\n\n`;

    results.forEach(row => {
      const match = row.옵션2.match(/\(([+-][\d,]+)원\)/);
      let add = 0;
      if (match) add = parseInt(match[1].replace(/[,원]/g, '')) || 0;
      const opt2Clean = row.옵션2.replace(/\s*\([+-][\d,]+원\)/, '');
      const final = basePriceNum + add;
      csv += `,${row.옵션1},${opt2Clean},${add || ''},${final}\n`;
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

  // === 메인 ===
  async function main() {
    console.clear();
    console.log('=== 네이버 브랜드 스토어 가격 스크래퍼 (2단계·간소화) ===');

    const base = await getBasePrice();
    const combos = await scrapeOptionCombinations();

    console.log('\n총 조합:', combos.length);
    if (combos.length > 0) {
      const csv = toCSV(base, combos);
      const productName = (document.title.split(' : ')[0] || '상품').replace(/[\\/:*?"<>|]/g, ' ');
      const ts = new Date().toISOString().slice(0,16).replace(/[T:]/g,'-');
      downloadCSV(csv, `${productName}_옵션가격_2단계_${ts}.csv`);
    }

    window.scrapingResults = { basePrice: base, combinations: combos };
    console.log('=== 완료 ===');
  }

  main();
})();