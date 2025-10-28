// 리뷰 수집 스크립트
// 최신순 정렬 적용
// 실행 위치: 개발자도구 콘솔
// ver.20250909



// ====== 설정 ======
const DAYS_TO_COLLECT = 360; // 수집할 기간 (일 단위)
const DELAY_MS = 2000;      // 페이지 이동 후 기다릴 시간 (2초)
// ==================

// --- 아래는 매크로 코드입니다 ---

function downloadCSV(data, filename) {
  if (data.length === 0) { console.log("결과: 수집된 리뷰가 없습니다."); return; }
  const header = Object.keys(data[0]);
  const rows = data.map(item => header.map(fieldName => `"${String(item[fieldName]).replace(/"/g, '""')}"`).join(','));
  const csvString = [header.join(','), ...rows].join('\r\n');
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  console.log(`✅ ${data.length}개의 리뷰를 '${filename}' 파일로 다운로드 완료!`);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseReviewsOnPage() {
  const reviews = [];
  document.querySelectorAll('li.PxsZltB5tV').forEach(item => {
    try {
      const rawDate = item.querySelector('span.MX91DFZo2F:not(strong.MX91DFZo2F)')?.innerText.trim() || 'N/A';
      let formattedDate = 'N/A';
      if (rawDate !== 'N/A') formattedDate = '20' + rawDate.slice(0, -1).replace(/\./g, '-');
      const rating = item.querySelector('em.n6zq2yy0KA')?.innerText.trim() || 'N/A';
      const userId = item.querySelector('strong.MX91DFZo2F')?.innerText.trim() || 'N/A';
      const optionDiv = item.querySelector('div.b_caIle8kC');
      let option = '옵션 정보 없음';
      if (optionDiv) {
        let optionText = '';
        let child = optionDiv.firstChild;
        while(child) {
          if (child.nodeName === '#text') optionText += child.textContent.trim();
          if (child.nodeName === 'DL') break;
          child = child.nextSibling;
        }
        option = optionText || '옵션 정보 없음';
      }
      const content = item.querySelector('div.KqJ8Qqw082 span.MX91DFZo2F')?.innerText.trim() || '리뷰 내용 없음';
      const imageUrl = item.querySelector('div.s30AvhHfb0 img')?.src || '이미지 없음';
      reviews.push({ '평점': rating, '작성자': userId, '작성일': formattedDate, '구매옵션': option, '리뷰내용': content, '이미지URL': imageUrl });
    } catch (e) { console.warn('리뷰 하나를 처리하는 중 오류:', e); }
  });
  return reviews;
}

(async () => {
  const collectUntilDate = new Date();
  collectUntilDate.setDate(collectUntilDate.getDate() - DAYS_TO_COLLECT);
  console.log(`🚀 ${DAYS_TO_COLLECT}일 리뷰 수집을 시작합니다.\n- 수집 기준일: ${collectUntilDate.toISOString().slice(0,10)} 이후`);
  let allReviews = [];
  let stopScraping = false;
  let page = 1;
  while (!stopScraping) {
    console.log(`- ${page} 페이지 처리 중...`);
    let reviewsOnPage = parseReviewsOnPage();
    if (reviewsOnPage.length === 0) { console.log("페이지에 리뷰가 없어 5초 후 재시도..."); await new Promise(resolve => setTimeout(resolve, 5000)); reviewsOnPage = parseReviewsOnPage(); if(reviewsOnPage.length === 0) { console.log("재시도 실패. 수집을 종료합니다."); break; } }
    
    for (const review of reviewsOnPage) {
      if (review.작성일 === 'N/A') continue;
      const reviewDateObj = new Date(review.작성일);
      if (reviewDateObj >= collectUntilDate) {
        allReviews.push(review);
      } else {
        stopScraping = true;
        break; 
      }
    }

    if (!stopScraping) {
      let moved = false;
      const paginationSelector = 'div.LiT9lKOVbw';
      const pagination = document.querySelector(paginationSelector);

      if (pagination) {
        const activeButton = pagination.querySelector('a[aria-current="true"]');
        if (activeButton) {
          const currentPageNum = parseInt(activeButton.innerText.trim());
          const nextPageNum = currentPageNum + 1;
          const pageLink = Array.from(pagination.querySelectorAll('a')).find(a => a.innerText.trim() == nextPageNum);
          
          if (pageLink) { // 1순위: 다음 페이지 번호 클릭
            pageLink.click();
            moved = true;
          } else { // 2순위: 다음 페이지 번호가 없으면 '다음' 버튼 클릭
            const nextBlockButton = Array.from(pagination.querySelectorAll('a')).find(a => a.innerText.trim() === '다음');
            if (nextBlockButton && getComputedStyle(nextBlockButton).pointerEvents !== 'none') {
              nextBlockButton.click();
              moved = true;
            }
          }
        }
      }

      if (moved) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        page++;
      } else {
        console.log("마지막 페이지에 도달하여 수집을 종료합니다.");
        stopScraping = true;
      }
    }
  }
  
  console.log("✔️ 수집이 완료되었습니다.");
  const title = document.title.split(':')[0] || 'reviews';
  const filename = `${title.trim()} (last ${DAYS_TO_COLLECT} days).csv`;
  downloadCSV(allReviews, filename);
})();