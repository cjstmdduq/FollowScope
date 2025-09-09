// 네이버 브랜드 스토어 가격 스크래퍼 - 2단계 드롭다운 (간소화 & 저부하 모드)
// 2025.09.08 ver
// 사용: 상품 상세 페이지에서 F12 → Console → 이 코드 전체 붙여넣기 → Enter 
// VPN사용 권장
(function () {
  'use strict';

  const wait = (ms) => new Promise(res => setTimeout(res, ms));

  // === 기본 가격 추출 (최신 구조 대응) ===
  async function getBasePrice() {
    await wait(1000);
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
  async function openDropdown(selector) {
    const dropdown = document.querySelector(selector);
    if (!dropdown) return false;

    const isExpanded = dropdown.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      dropdown.click(); // 닫기
      await wait(600);  // (기존 200 → 600ms)
    }
    dropdown.click();   // 열기
    await wait(1500);   // (기존 500 → 1500ms, 최소 1초 이상)
    return true;
  }

  // === 옵션 조합 스크래핑 ===
  async function scrapeOptionCombinations() {
    const results = [];

    const d1 = 'div.bd_2dy3Y > div:nth-child(1) > a.bd_1fhc9';
    const d2 = 'div.bd_2dy3Y > div:nth-child(2) > a.bd_1fhc9';

    const o1s = 'div.bd_2dy3Y > div:nth-child(1) ul[role="listbox"] a[role="option"]';
    const o2s = 'div.bd_2dy3Y > div:nth-child(2) ul[role="listbox"] a[role="option"]';

    if (!await openDropdown(d1)) return results;
    await wait(1500);

    const firstOptions = document.querySelectorAll(o1s);
    for (let i = 0; i < firstOptions.length; i++) {
      await openDropdown(d1);
      await wait(1000); // (기존 300 → 1000ms)
      const opt1s = document.querySelectorAll(o1s);
      const opt1Text = opt1s[i].textContent.trim();
      opt1s[i].click();
      await wait(2400); // (기존 800 → 2400ms)

      if (!await openDropdown(d2)) continue;
      await wait(900); // (기존 300 → 900ms)
      const secondOptions = document.querySelectorAll(o2s);

      for (let j = 0; j < secondOptions.length; j++) {
        const opt2Text = secondOptions[j].textContent.trim();
        results.push({ 옵션1: opt1Text, 옵션2: opt2Text });
        console.log(`✅ ${opt1Text} | ${opt2Text}`);
        await wait(1000); // 조합 간 쿨다운
      }
    }

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
