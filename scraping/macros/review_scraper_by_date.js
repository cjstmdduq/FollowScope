// review_scraper_by_date.js
// ====== 설정 ======
// 수집할 기간 (일 단위), 7으로 설정 시 7일 전까지 수집
const DAYS_TO_COLLECT = 7;
const DELAY_MS = 2000; // 페이지 이동 후 기다릴 시간 (2초)
// ==================

// --- 아래는 매크로 코드입니다 ---

// 데이터를 CSV 형식으로 변환하고 다운로드하는 함수
function downloadCSV(data, filename) {
  if (data.length === 0) {
    console.log("결과: 수집된 리뷰가 없습니다.");
    return;
  }
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

// 현재 페이지의 리뷰를 파싱하는 함수
function parseReviewsOnPage() {
  const reviews = [];
  document.querySelectorAll('li.BnwL_cs1av').forEach(item => {
    try {
      const rawDate = item.querySelector('div.iWGqB6S4Lq > span._2L3vDiadT9')?.innerText.trim() || 'N/A';
      let formattedDate = 'N/A';
      if (rawDate !== 'N/A') formattedDate = '20' + rawDate.slice(0, -1).replace(/\./g, '-');
      const rating = item.querySelector('em._15NU42F3kT')?.innerText.trim() || 'N/A';
      const userId = item.querySelector('strong._2L3vDiadT9')?.innerText.trim() || 'N/A';
      const optionDiv = item.querySelector('div._2FXNMst_ak');
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
      const content = item.querySelector('div._1kMfD5ErZ6 > span._2L3vDiadT9')?.innerText.trim() || '리뷰 내용 없음';
      const imageUrl = item.querySelector('div._3Bbv1ae9fg img')?.src || '이미지 없음';
      reviews.push({ '평점': rating, '작성자': userId, '작성일': formattedDate, '구매옵션': option, '리뷰내용': content, '이미지URL': imageUrl });
    } catch (e) { console.warn('리뷰 하나를 처리하는 중 오류:', e); }
  });
  return reviews;
}

// 메인 실행 함수
(async () => {
  const collectUntilDate = new Date();
  collectUntilDate.setDate(collectUntilDate.getDate() - DAYS_TO_COLLECT);
  console.log(`🚀 ${DAYS_TO_COLLECT}일 리뷰 수집을 시작합니다.\n- 수집 기준일: ${collectUntilDate.toISOString().slice(0,10)} 이후`);

  let allReviews = [];
  let stopScraping = false;
  let page = 1;

  while (!stopScraping) {
    console.log(`- ${page} 페이지 처리 중...`);
    const reviewsOnPage = parseReviewsOnPage();

    if (reviewsOnPage.length === 0) {
      console.log("더 이상 리뷰가 없어 수집을 종료합니다.");
      break;
    }
    
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
      // [수정됨] '다음' 버튼 대신, 다음 페이지 번호를 직접 찾아 클릭하는 방식으로 변경
      const activeButton = document.querySelector('div._1HJarNZHiI a[aria-current="true"]');
      if (!activeButton) {
        console.warn("페이지네이션에서 현재 페이지를 찾을 수 없어 중단합니다.");
        stopScraping = true;
        continue;
      }

      const currentPageNum = parseInt(activeButton.innerText.trim());
      const nextPageNum = currentPageNum + 1;
      const nextPageLink = Array.from(document.querySelectorAll('div._1HJarNZHiI a[role="menuitem"]'))
                              .find(a => a.innerText.trim() == nextPageNum);
      
      if (nextPageLink) {
        nextPageLink.click();
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