/**
 * @file 최종 쿠폰 스크래핑 코드 (v3.1)
 * @description 브랜드명 자동인식, 쿠폰/카드사 자동분류, 상세조건 파싱, CSV 파일 생성 및 다운로드
 *
 * =================================================================================
 *
 * ※ 사전 조건
 * - 개인 아이디로 로그인된 상태여야 합니다.
 * - 쿠폰을 다운로드 받을 수 있는 페이지에 있어야 합니다.
 *
 * ※ 사용 방법
 * 1. 사이트에서 [쿠폰받기] -> [상세보기] 등을 통해 쿠폰 모달창을 엽니다.
 * 2. F12를 눌러 개발자 도구를 열고 'Console' 탭으로 이동합니다.
 * 3. 이 코드 전체를 복사하여 콘솔에 붙여넣고 엔터를 누릅니다.
 * 4. 브라우저에서 CSV 파일이 자동으로 다운로드됩니다.
 *
 * =================================================================================
 */

// 1. 페이지 제목에서 브랜드명 자동 추출
let brandName = document.title.split(' : ').pop().replace('몰', '').trim();

// 2. CSV 파일 다운로드 실행 함수
const downloadCSV = (csvString, fileName) => {
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// 3. 텍스트에서 상세 정보를 파싱하는 함수
const parseDetails = (text) => {
    const details = {
        rate: (text.match(/(\d+)%/) || [])[1] || '',
        minPurchase: (text.match(/(\d{1,3}(?:,\d{3})*)\s*원\s*이상/) || [])[1]?.replace(/,/g, '') || '',
        maxDiscount: (text.match(/최대\s*(\d{1,3}(?:,\d{3})*)\s*원/) || [])[1]?.replace(/,/g, '') || '',
    };
    if (details.rate) details.rate += '%';
    return details;
};

// 4. CSV 필드 정리 함수
const sanitizeCsvField = (text) => `"${String(text ?? '').replace(/"/g, '""')}"`;

// ================== 메인 로직 시작 ==================

// CSV 헤더 정의
const csvHeader = 'competitor,type,coupon_name,discount_rate,discount_amount,min_purchase,max_discount,usage_limit,start_date,end_date,description';

// 모든 할인 항목 선택
const couponItems = document.querySelectorAll('li.F4LPn89td9');

// 각 항목을 순회하며 CSV 데이터 생성
const csvRows = Array.from(couponItems).map(item => {
    const coupon_name = item.querySelector('span._1UyvE7hC_E')?.textContent.trim() ?? '';
    const conditionNodes = item.querySelectorAll('ul._1bGA-iwJe6 li');
    const description = Array.from(conditionNodes).map(node => node.textContent.trim()).join(' / ');
    let discount_amount = item.querySelector('span._1rCZ7NxCGb')?.textContent.trim() ?? '';
    
    const type = coupon_name.includes('카드') ? '카드사 할인' : '쿠폰';
    const combinedText = coupon_name + ' ' + description;
    const details = parseDetails(combinedText);

    const rowData = [
        brandName,
        type,
        coupon_name,
        details.rate,
        discount_amount,
        details.minPurchase,
        details.maxDiscount,
        '', // usage_limit
        '', // start_date
        '', // end_date
        description
    ].map(sanitizeCsvField);

    return rowData.join(',');
});

// 최종 CSV 문자열 생성 및 다운로드
const finalCsvString = [csvHeader, ...csvRows].join('\n');
const fileName = `${brandName}_쿠폰_데이터.csv`;
downloadCSV(finalCsvString, fileName);

console.log(`✅ [${brandName}] 브랜드의 쿠폰 정보가 포함된 ${fileName} 파일 다운로드를 시작합니다.`);