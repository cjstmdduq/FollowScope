// 네이버 쇼핑라이브 일정 구글 캘린더 변환기 - 콘솔 버전
// 개발자 도구(F12)의 콘솔 탭에 이 코드를 붙여넣기 하여 실행하세요.

(function() {
    'use strict';
    
    // XPath로 요소 찾기
    function getElementByXPath(xpath) {
        try {
            return document.evaluate(
                xpath, 
                document, 
                null, 
                XPathResult.FIRST_ORDERED_NODE_TYPE, 
                null
            ).singleNodeValue;
        } catch (e) {
            console.error('XPath 오류:', e);
            return null;
        }
    }
    
    // 배열을 Google 캘린더 CSV 형식으로 변환
    function convertToGoogleCalendarCSV(data) {
        const headers = ['Subject', 'Start Date', 'Start Time', 'End Date', 'End Time', 'All Day Event', 'Description', 'Location', 'Private'];
        const csvRows = [];
        
        // 헤더 추가
        csvRows.push(headers.join(','));
        
        // 데이터 행 추가
        for (const item of data) {
            // 날짜 형식 변환 (예: '4월 18일' -> '2025-04-18')
            const dateMatch = item.date.match(/(\d+)월\s*(\d+)일/);
            let formattedDate = '';
            
            if (dateMatch) {
                const month = String(dateMatch[1]).padStart(2, '0');
                const day   = String(dateMatch[2]).padStart(2, '0');
                const year  = new Date().getFullYear();  // 현재 연도 사용
                formattedDate = `${year}-${month}-${day}`;
            } else {
                formattedDate = item.date;
            }
            
            // 시간 형식 변환 (예: '오후 2:00' -> '02:00 PM')
            const timeMatch = item.time.match(/(오전|오후)\s*(\d+):(\d+)/);
            let startTime = '';
            
            if (timeMatch) {
                const ampmKor = timeMatch[1];
                const hours   = parseInt(timeMatch[2]);
                const minutes = String(timeMatch[3]).padStart(2, '0');
                
                // 24시간제로 변환
                let hour24 = hours;
                if (ampmKor === '오후' && hours < 12) hour24 = hours + 12;
                else if (ampmKor === '오전' && hours === 12) hour24 = 0;
                
                // 시작 시간 포맷
                const ampm   = hour24 >= 12 ? 'PM' : 'AM';
                const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
                startTime    = `${String(hour12).padStart(2, '0')}:${minutes} ${ampm}`;
            } else {
                startTime = item.time;
            }
            
            // 쉼표가 포함된 텍스트는 따옴표로 감싸기
            const values = [
                `"${item.brandName.replace(/"/g, '""')}"`,         // Subject (브랜드명)
                `"${formattedDate}"`,                                  // Start Date
                `"${startTime}"`,                                      // Start Time
                `"${formattedDate}"`,                                  // End Date (같은 날에 종료)
                `""`,                                                  // End Time (공란)
                'False',                                                 // All Day Event
                `"${item.liveName.replace(/"/g, '""')}"`,           // Description (라이브명)
                '""',                                                  // Location (공란)
                'False'                                                  // Private
            ];
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }
    
    // CSV 파일 다운로드
    function downloadCSV(csvContent) {
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // 현재 날짜 포맷팅 (YYYYMMDD)
        const now   = new Date();
        const year  = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day   = String(now.getDate()).padStart(2, '0');
        const formattedDate = `${year}${month}${day}`;
        
        // 다운로드 링크 설정
        link.href = url;
        link.setAttribute('download', `NSLive_GCal_${formattedDate}.csv`);
        link.style.display = 'none';
        
        // 링크를 클릭하여 다운로드 시작
        document.body.appendChild(link);
        link.click();
        
        // 링크 제거
        document.body.removeChild(link);
    }
    
    // 일정 추출 메인 함수
    function extractLiveSchedules() {
        console.log('네이버 쇼핑라이브 일정 추출 시작...');
        
        // 기본 XPath 패턴 정의
        const baseXPath = '//*[@id="wa_search_tabpanel_0"]/section/div[2]/div/div';
        
        // 추출 결과를 저장할 배열
        const schedules = [];
        
        // 페이지에 표시된 모든 라이브 정보 추출
        let index = 1;
        
        while (true) {
            // 라이브명 XPath 패턴 생성
            const liveNameXPath = `${baseXPath}[${index}]/a[1]/span`;
            const liveNameElement = getElementByXPath(liveNameXPath);
            if (!liveNameElement) {
                const altLiveNameXPath = `${baseXPath}[${index}]/a/span`;
                if (!getElementByXPath(altLiveNameXPath)) break;
            }
            
            let liveName = '정보 없음', brandName = '정보 없음', date = '정보 없음', time = '정보 없음';
            const patterns = [
                { liveName: `${baseXPath}[${index}]/a[1]/span`, brandName: `${baseXPath}[${index}]/a[2]/span`, date: `${baseXPath}[${index}]/a[1]/div/div[2]/div[1]/div/time/span[1]`, time: `${baseXPath}[${index}]/a[1]/div/div[2]/div[1]/div/time/span[2]` },
                { liveName: `${baseXPath}[${index}]/a/span`, brandName: `${baseXPath}[${index}]/a/div/div[1]/span`, date: `${baseXPath}[${index}]/a/div/div[2]/div[1]/div/time/span[1]`, time: `${baseXPath}[${index}]/a/div/div[2]/div[1]/div/time/span[2]` }
            ];
            
            for (const pattern of patterns) {
                const lnEl = getElementByXPath(pattern.liveName);
                if (lnEl) {
                    liveName  = lnEl.textContent.trim();
                    brandName = getElementByXPath(pattern.brandName)?.textContent.trim() || brandName;
                    date      = getElementByXPath(pattern.date)?.textContent.trim() || date;
                    time      = getElementByXPath(pattern.time)?.textContent.trim() || time;
                    break;
                }
            }
            
            if (liveName !== '정보 없음') schedules.push({ liveName, brandName, date, time });
            index++;
            if (index > 100) break;
        }
        
        if (schedules.length === 0) {
            alert('추출할 라이브 일정을 찾을 수 없습니다. 페이지가 로드된 후 다시 시도하세요.');
            return;
        }
        
        const csvContent = convertToGoogleCalendarCSV(schedules);
        downloadCSV(csvContent);
        console.table(schedules);
        alert(`총 ${schedules.length}개의 라이브 일정이 구글 캘린더 형식으로 추출되었습니다.\n구글 캘린더에서 '파일 → 가져오기'를 선택하여 다운로드한 CSV 파일을 불러오세요.`);
        return schedules;
    }
    
    // 코드 실행
    return extractLiveSchedules();
})();
