// review_scraper_by_page.js
// ====== 설정 ======
const START_PAGE = 1; // 수집 시작 페이지
const END_PAGE = 3;   // 수집 종료 페이지
const DELAY_MS = 2000; // 페이지 이동 후 기다릴 시간 (밀리초, 2초 = 2000)
// ==================

// --- 아래는 매크로 코드입니다 ---

// 파일명으로 사용할 수 없는 문자를 제거하는 함수
function sanitizeFilename(name) {
  return name.replace(/[\/\\?%*:|"<>]/g, '-').trim();
}

// 현재 페이지의 제목 또는 URL에서 파일명을 추출하는 함수
function generateFilename() {
  let filename = document.title;
  if (!filename || filename.toLowerCase().includes('naver')) {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    filename = pathParts.length > 1 ? pathParts[1] : 'reviews';
  }
  return sanitizeFilename(filename) + '.csv';
}

// 데이터를 CSV 형식으로 변환하고 다운로드하는 함수
function downloadCSV(data, filename) {
  if (data.length === 0) {
    console.log("다운로드할 데이터가 없습니다.");
    return;
  }
  
  const header = Object.keys(data[0]);
  const rows = data.map(item => 
    header.map(fieldName => `"${String(item[fieldName]).replace(/"/g, '""')}"`).join(',')
  );
  
  const csvString = [header.join(','), ...rows].join('\r\n');
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);

  console.log(`✅ ${data.length}개의 리뷰를 '${filename}' 파일로 다운로드합니다.`);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


// 현재 페이지의 리뷰를 파싱하는 함수
function parseReviewsOnPage() {
  const reviews = [];
  const reviewItems = document.querySelectorAll('li.BnwL_cs1av');
  
  reviewItems.forEach(item => {
    try {
      const rating = item.querySelector('em._15NU42F3kT')?.innerText.trim() || 'N/A';
      const userId = item.querySelector('strong._2L3vDiadT9')?.innerText.trim() || 'N/A';
      
      // [수정됨] 날짜를 표준 서식(YYYY-MM-DD)으로 변경
      const rawDate = item.querySelector('div.iWGqB6S4Lq > span._2L3vDiadT9')?.innerText.trim() || 'N/A';
      let formattedDate = 'N/A';
      if (rawDate !== 'N/A') {
          // '25.07.09.' 형식의 문자열에서 마지막 '.'을 제거하고, '.'을 '-'로 바꾼 후, 앞에 '20'을 붙여 '2025-07-09'로 만듭니다.
          formattedDate = '20' + rawDate.slice(0, -1).replace(/\./g, '-');
      }

      const optionDiv = item.querySelector('div._2FXNMst_ak');
      let option = '옵션 정보 없음';
      if (optionDiv) {
        let optionText = '';
        let child = optionDiv.firstChild;
        while(child) {
          if (child.nodeName === '#text') {
            optionText += child.textContent.trim();
          }
          if (child.nodeName === 'DL') {
            break;
          }
          child = child.nextSibling;
        }
        option = optionText || '옵션 정보 없음';
      }

      const content = item.querySelector('div._1kMfD5ErZ6 > span._2L3vDiadT9')?.innerText.trim() || '리뷰 내용 없음';
      const imageUrl = item.querySelector('div._3Bbv1ae9fg img')?.src || '이미지 없음';

      reviews.push({ '평점': rating, '작성자': userId, '작성일': formattedDate, '구매옵션': option, '리뷰내용': content, '이미지URL': imageUrl });
    } catch (e) {
      console.warn('리뷰 하나를 처리하는 중 오류:', e);
    }
  });
  return reviews;
}

// 매크로 실행을 위한 메인 함수
(async () => {
  const FILENAME = generateFilename();
  console.log(`🚀 페이지 지정 수집을 시작합니다. (대상: ${START_PAGE}~${END_PAGE} 페이지)`);
  console.log(`저장될 파일명: ${FILENAME}`);
  let allReviews = [];

  for (let currentPage = START_PAGE; currentPage <= END_PAGE; currentPage++) {
    console.log(`- ${currentPage} 페이지의 리뷰를 수집합니다...`);
    allReviews.push(...parseReviewsOnPage());

    if (currentPage < END_PAGE) {
      const nextPageButton = Array.from(document.querySelectorAll('div._1HJarNZHiI a')).find(a => a.innerText.trim() == (currentPage + 1));
      if (nextPageButton) {
        nextPageButton.click();
        console.log(`  -> ${currentPage + 1} 페이지로 이동합니다. ${DELAY_MS / 1000}초 대기...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      } else {
        console.warn(`❗️ ${currentPage + 1} 페이지 버튼을 찾을 수 없어 수집을 중단합니다.`);
        break;
      }
    }
  }

  downloadCSV(allReviews, FILENAME);
})();