// 네이버 브랜드 스토어 가격 스크래퍼 - TSV 다운로드 버전
// 사용법: 해당 상품 페이지에서 F12 -> Console 탭 -> 이 코드 붙여넣기 후 실행

(function() {
    'use strict';

    // 설정값
    const SELECTORS = {
        basePrice: 'strong.aICRqgP9zw > span._1LY7DqCnwR',  // strong 태그 내의 상품 가격
        optionsBase: '#content > div > div._2-I30XS1lA > div._2QCa6wHHPy > fieldset > div.bd_2dy3Y',
        // 드롭다운 버튼 (클래스명 기반)
        dropdown1: 'div.bd_2dy3Y > div:nth-child(1) > a.bd_1fhc9',
        dropdown2: 'div.bd_2dy3Y > div:nth-child(2) > a.bd_1fhc9', 
        dropdown3: 'div.bd_2dy3Y > div:nth-child(3) > a.bd_1fhc9',
        // 열린 드롭다운의 옵션들 (더 구체적인 선택자)
        options1: 'div.bd_2dy3Y > div:nth-child(1) > ul[role="listbox"] > li[role="presentation"] > a[role="option"]',
        options2: 'div.bd_2dy3Y > div:nth-child(2) > ul[role="listbox"] > li[role="presentation"] > a[role="option"]',
        options3: 'div.bd_2dy3Y > div:nth-child(3) > ul[role="listbox"] > li[role="presentation"] > a[role="option"]'
    };

    // 유틸리티 함수
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getElement(selector) {
        return document.querySelector(selector);
    }

    function getElements(selector) {
        return document.querySelectorAll(selector);
    }

    function clickElement(element) {
        if (element) {
            element.click();
            return true;
        }
        return false;
    }

    async function getBasePrice() {
        console.log('기본 가격 조회 중...');
        await wait(1000);
        
        // 여러 가능한 선택자 시도 (strong 태그 내의 가격만)
        const possibleSelectors = [
            'strong.aICRqgP9zw > span._1LY7DqCnwR',  // 정확한 클래스명
            'strong > span._1LY7DqCnwR',  // strong 안의 가격
            'div._3k440DUKzy strong > span._1LY7DqCnwR'  // 컨테이너 내 strong
        ];
        
        let priceElement = null;
        for (const selector of possibleSelectors) {
            priceElement = getElement(selector);
            if (priceElement) {
                console.log(`가격 요소 발견: ${selector}`);
                break;
            }
        }
        
        if (priceElement) {
            const price = priceElement.textContent.trim();
            console.log(`기본 가격: ${price}`);
            return price;
        } else {
            console.log('기본 가격을 찾을 수 없습니다.');
            // 디버깅: 모든 span._1LY7DqCnwR 요소 확인
            const allPriceSpans = document.querySelectorAll('span._1LY7DqCnwR');
            console.log(`span._1LY7DqCnwR 요소 개수: ${allPriceSpans.length}`);
            allPriceSpans.forEach((span, idx) => {
                console.log(`  [${idx}] ${span.textContent.trim()}`);
            });
            return 'N/A';
        }
    }

    async function openDropdown(dropdownSelector) {
        const dropdown = getElement(dropdownSelector);
        if (dropdown) {
            // aria-expanded 속성 확인
            const isExpanded = dropdown.getAttribute('aria-expanded') === 'true';
            console.log(`  드롭다운 상태: ${isExpanded ? '열림' : '닫힘'}`);
            
            // 이미 열려있으면 닫고 다시 열기
            if (isExpanded) {
                dropdown.click(); // 닫기
                await wait(200);
            }
            
            dropdown.click(); // 열기
            await wait(500);  // 1000ms -> 500ms
            return true;
        }
        return false;
    }

    async function scrapeOptionCombinations() {
        const results = [];
        
        console.log('=== 종속 드롭다운 스크래핑 시작 ===');
        console.log('로직: 첫 번째 → 두 번째 → 세 번째 (가격 포함) 순차 선택\n');
        
        // 첫 번째 드롭다운 열어서 옵션 개수 확인
        console.log('첫 번째 드롭다운 열기...');
        if (!await openDropdown(SELECTORS.dropdown1)) {
            console.log('첫 번째 드롭다운을 열 수 없습니다.');
            return results;
        }
        await wait(500);
        
        const firstDropdownOptions = getElements(SELECTORS.options1);
        if (firstDropdownOptions.length === 0) {
            console.log('첫 번째 옵션을 찾을 수 없습니다.');
            return results;
        }
        
        console.log(`첫 번째 드롭다운 옵션 개수: ${firstDropdownOptions.length}\n`);
        
        // 진행률 표시 함수
        const showProgress = (current, total, prefix = '') => {
            const percent = Math.round((current / total) * 100);
            console.log(`${prefix} [${current}/${total}] (${percent}%)`);
        };
        
        // 각 첫 번째 옵션별로 처리
        for (let i = 0; i < firstDropdownOptions.length; i++) {
            showProgress(i + 1, firstDropdownOptions.length, '\n📌 첫 번째 옵션');
            
            // 1. 첫 번째 드롭다운 열고 i번째 옵션 선택
            await openDropdown(SELECTORS.dropdown1);
            await wait(300);  // 1000ms -> 300ms
            
            let option1Elements = getElements(SELECTORS.options1);
            if (i >= option1Elements.length) continue;
            
            const option1Text = option1Elements[i].textContent.trim();
            console.log(`\n1️⃣ 첫 번째 옵션 선택: "${option1Text}"`);
            option1Elements[i].click();
            await wait(800);  // 2000ms -> 800ms
            
            // 2. 두 번째 드롭다운 열어서 옵션 개수 확인
            console.log('   두 번째 드롭다운 열기...');
            if (!await openDropdown(SELECTORS.dropdown2)) {
                console.log(`   ❌ "${option1Text}" → 두 번째 드롭다운 열기 실패`);
                continue;
            }
            await wait(300);  // 500ms -> 300ms
            
            const secondDropdownOptions = getElements(SELECTORS.options2);
            if (secondDropdownOptions.length === 0) {
                console.log(`   ❌ "${option1Text}" → 두 번째 옵션 없음`);
                continue;
            }
            
            console.log(`   두 번째 드롭다운 옵션 개수: ${secondDropdownOptions.length}`);
            
            // 각 두 번째 옵션별로 처리
            for (let j = 0; j < secondDropdownOptions.length; j++) {
                console.log(`\n   ${'-'.repeat(50)}`);
                console.log(`   두 번째 옵션 [${j + 1}/${secondDropdownOptions.length}] 처리`);
                
                // 첫 번째 옵션 다시 선택 (리셋)
                await openDropdown(SELECTORS.dropdown1);
                await wait(200);
                option1Elements = getElements(SELECTORS.options1);
                if (i < option1Elements.length) {
                    option1Elements[i].click();
                    await wait(500);  // 2000ms -> 500ms
                }
                
                // 두 번째 드롭다운 열고 j번째 옵션 선택
                await openDropdown(SELECTORS.dropdown2);
                await wait(200);
                
                let option2Elements = getElements(SELECTORS.options2);
                if (j >= option2Elements.length) continue;
                
                const option2Text = option2Elements[j].textContent.trim();
                console.log(`   2️⃣ 두 번째 옵션 선택: "${option2Text}"`);
                option2Elements[j].click();
                await wait(500);  // 2000ms -> 500ms
                
                // 3. 세 번째 드롭다운 열어서 모든 옵션 수집
                console.log('      세 번째 드롭다운 열기...');
                if (!await openDropdown(SELECTORS.dropdown3)) {
                    console.log(`      ❌ "${option1Text}" | "${option2Text}" → 세 번째 드롭다운 열기 실패`);
                    continue;
                }
                await wait(300);  // 500ms -> 300ms
                
                const option3Elements = getElements(SELECTORS.options3);
                if (option3Elements.length === 0) {
                    console.log(`      ❌ "${option1Text}" | "${option2Text}" → 세 번째 옵션 없음`);
                    continue;
                }
                
                console.log(`      3️⃣ 세 번째 드롭다운 옵션 개수: ${option3Elements.length}`);
                
                // 세 번째 드롭다운의 모든 옵션 수집
                for (let k = 0; k < option3Elements.length; k++) {
                    const option3Text = option3Elements[k].textContent.trim();
                    
                    const combination = {
                        옵션1: option1Text,
                        옵션2: option2Text,
                        옵션3: option3Text
                    };
                    
                    results.push(combination);
                    console.log(`         ✅ [${results.length}] ${option1Text} | ${option2Text} | ${option3Text}`);
                }
            }
        }
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`스크래핑 완료: 총 ${results.length}개 조합 수집`);
        console.log(`${'='.repeat(60)}`);
        
        return results;
    }

    // CSV 변환 함수 (Excel용)
    function toCSV(basePrice, results) {
        // 기본 가격을 숫자로 변환 (콤마 제거)
        const basePriceNum = parseInt(basePrice.replace(/[,원]/g, '')) || 0;
        
        // 헤더
        let csv = `기본가격,옵션1,옵션2,옵션3,추가가격,최종가격\n`;
        csv += `${basePriceNum},,,,,${basePriceNum}\n`;
        csv += `\n`;
        
        // 데이터
        results.forEach(row => {
            // 추가 가격 추출 (예: "+10,000원" 부분)
            const priceMatch = row.옵션3.match(/\(([+-][\d,]+원)\)/);
            let additionalNum = 0;
            let additionalPrice = '';
            
            if (priceMatch) {
                // 숫자만 추출 (+/- 포함)
                additionalNum = parseInt(priceMatch[1].replace(/[,원]/g, '')) || 0;
                additionalPrice = additionalNum;
            }
            
            // 최종 가격 계산
            const finalPriceNum = basePriceNum + additionalNum;
            
            // 옵션3에서 가격 부분 제거 (선택사항)
            const option3Clean = row.옵션3.replace(/\s*\([+-][\d,]+원\)/, '');
            
            // CSV 특수문자 처리 (쉼표, 따옴표 등)
            const escapeCSV = (str) => {
                if (str.toString().includes(',') || str.toString().includes('"') || str.toString().includes('\n')) {
                    return `"${str.toString().replace(/"/g, '""')}"`;
                }
                return str;
            };
            
            csv += `${escapeCSV('')},${escapeCSV(row.옵션1)},${escapeCSV(row.옵션2)},${escapeCSV(option3Clean)},${additionalPrice},${finalPriceNum}\n`;
        });
        
        return csv;
    }

    // 다운로드 함수
    function downloadCSV(content, filename) {
        const BOM = '\uFEFF'; // Excel에서 한글 깨짐 방지
        const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    async function main() {
        console.log('=== 네이버 브랜드 스토어 가격 스크래퍼 (CSV/Excel 버전) ===');
        
        try {
            // 기본 가격 조회
            const basePrice = await getBasePrice();
            
            // 옵션 조합 스크래핑
            console.log('옵션 조합 스크래핑 시작...');
            const combinations = await scrapeOptionCombinations();
            
            // 결과 출력
            console.log('\n=== 스크래핑 결과 ===');
            console.log(`기본 가격: ${basePrice}`);
            console.log(`총 조합 개수: ${combinations.length}`);
            console.log('--- 옵션 조합 목록 ---');
            
            combinations.forEach((combo, index) => {
                console.log(`${index + 1}. ${combo.옵션1} | ${combo.옵션2} | ${combo.옵션3}`);
            });
            
            // CSV 변환 및 다운로드
            if (combinations.length > 0) {
                const csv = toCSV(basePrice, combinations);
                
                // 파일명 생성
                const productName = document.title.split(' : ')[0] || '상품';
                const timestamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
                const filename = `${productName}_옵션가격_${timestamp}.csv`;
                
                // 다운로드
                downloadCSV(csv, filename);
                
                console.log(`\n📥 CSV 파일 다운로드: ${filename}`);
                console.log('💡 Excel에서 열면 자동으로 표로 정리됩니다.');
                console.log('📊 모든 가격은 "원" 없이 숫자만 표시됩니다.');
            }
            
            // 결과를 전역 변수에 저장
            window.scrapingResults = {
                basePrice: basePrice,
                combinations: combinations,
                totalCount: combinations.length
            };
            
            console.log('\n결과가 window.scrapingResults 에 저장되었습니다.');
            console.log('=== 스크래핑 완료 ===');
            
        } catch (error) {
            console.error('오류 발생:', error);
        }
    }

    // 실행
    main();
})();