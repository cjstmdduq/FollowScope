/*************** 라이브채팅 구매인증 추출기 ***************/

/*************** 설정 ***************/
const 자동스크롤사용 = false;          // 페이지를 이미 끝까지 로드했다면 false 유지
const 라이브기준일자 = null;           // 예) "20250923" 입력 시 해당 날짜로 시작하는 번호만 매칭
const 최소자리수 = 12;                 // 라이브기준일자 미사용 시: 주문번호로 간주할 최소 연속 숫자 길이
/*************************************/

// === (옵션) 끝까지 자동 스크롤 ===
const 자동스크롤 = async (컨테이너, 대기시간 = 350, 최대이동횟수 = 300) => {
  let 이전높이 = -1;
  let 동일횟수 = 0;
  for (let i = 0; i < 최대이동횟수; i++) {
    컨테이너.scrollTo({ top: 컨테이너.scrollHeight, behavior: 'instant' });
    await new Promise(resolve => setTimeout(resolve, 대기시간));
    const 현재높이 = 컨테이너.scrollHeight;
    if (현재높이 === 이전높이) {
      if (++동일횟수 >= 3) break;
    } else {
      동일횟수 = 0;
    }
    이전높이 = 현재높이;
  }
};

// === 댓글 수집 ===
const 댓글목록수집 = () => {
  // 클래스 해시 변동 대비: 넓게 커버
  const 댓글래퍼목록 = [
    ...document.querySelectorAll('[class*="Comment_wrap"], [class*="NormalComment_wrap"], [role="presentation"]')
  ];
  const 결과 = [];
  const 텍스트정리 = 값 => (값 ?? "").replace(/\u200b/g, "").replace(/\s+/g, " ").trim();

  for (const 래퍼 of 댓글래퍼목록) {
    const 닉네임 =
      텍스트정리(래퍼.querySelector('strong[class*="nickname"], strong')?.textContent)
      || 텍스트정리(래퍼.querySelector('[class*="nickname"]')?.textContent);

    // 본문: comment/content 계열 우선, 없으면 스팬/디브 텍스트 전체에서 닉 제거
    const 본문노드 =
      래퍼.querySelector('span[class*="comment"], [class*="comment_"], [class*="content"]')
      || 래퍼.querySelector('span')
      || 래퍼.querySelector('div');

    let 본문 = 텍스트정리(본문노드?.textContent);
    if (닉네임 && 본문.startsWith(닉네임)) 본문 = 본문.slice(닉네임.length).trim();

    if (닉네임 || 본문) 결과.push({ 닉네임, 본문 });
  }

  const 중복키 = 항목 => `${항목.닉네임}|||${항목.본문}`;
  return Array.from(new Map(결과.map(행 => [중복키(행), 행])).values());
};

// === 주문번호 정규식 생성 (구분점 없이 매칭) ===
const 주문번호정규식 = () => {
  if (라이브기준일자 && /^\d{8}$/.test(라이브기준일자)) {
    return new RegExp(`\\b${라이브기준일자}\\d{4,}\\b`, "g");
  }
  return new RegExp(`\\b\\d{${최소자리수},}\\b`, "g");
};

const 주문번호추출 = (본문텍스트) => {
  const 정규식 = 주문번호정규식();
  const 매칭 = 본문텍스트.match(정규식);
  return 매칭 ? Array.from(new Set(매칭)) : [];
};

// === CSV 변환 ===
const CSV생성 = (목록) => {
  const 필드인용 = (값 = '') => `"${String(값).replace(/"/g, '""')}"`;
  const 행목록 = [['닉네임', '댓글', '추출된주문번호', '주문번호포함']];
  for (const 항목 of 목록) {
    행목록.push([
      항목.닉네임,
      항목.본문,
      항목.주문번호목록.join(' | '),
      항목.주문번호목록.length ? '예' : '아니오'
    ]);
  }
  return 행목록.map(열 => 열.map(필드인용).join(',')).join('\n');
};

// === 실행 ===
(async () => {
  const 컨테이너 =
    document.querySelector('[class*="Scroll_y_"], [class*="CommentList_inner"]')
    || document.scrollingElement;

  if (자동스크롤사용) await 자동스크롤(컨테이너);

  const 원본댓글목록 = 댓글목록수집();
  if (!원본댓글목록.length) console.warn('⚠️ 댓글 영역을 찾지 못했습니다. 셀렉터를 조정해야 할 수 있습니다.');

  const 주문정보댓글목록 = 원본댓글목록.map(댓글 => ({ ...댓글, 주문번호목록: 주문번호추출(댓글.본문) }));

  const 주문번호포함댓글수 = 주문정보댓글목록.filter(댓글 => 댓글.주문번호목록.length).length;
  const 구매인증고유인원수 = new Set(주문정보댓글목록.filter(댓글 => 댓글.주문번호목록.length).map(댓글 => 댓글.닉네임)).size;

  const 구매자대표번호맵 = new Map();
  for (const 댓글 of 주문정보댓글목록) {
    if (댓글.주문번호목록.length && !구매자대표번호맵.has(댓글.닉네임)) {
      구매자대표번호맵.set(댓글.닉네임, 댓글.주문번호목록[0]);
    }
  }
  const 구매자목록 = Array.from(구매자대표번호맵.entries()).map(([닉네임, 주문번호]) => ({ 닉네임, 주문번호 }));

  console.log(`총 댓글 수: ${주문정보댓글목록.length}`);
  console.log(`주문번호 포함 댓글 수: ${주문번호포함댓글수}`);
  console.log(`구매 인증 고유 인원 수: ${구매인증고유인원수}`);
  console.table(구매자목록);

  const csv = CSV생성(주문정보댓글목록);
  console.log('--- CSV (닉네임, 댓글, 추출된주문번호, 주문번호포함) ---');
  console.log(csv);

  try {
    await navigator.clipboard.writeText(csv);
    console.info('✅ CSV가 클립보드에 복사되었습니다.');
  } catch (오류) {
    console.warn('클립보드 복사 실패. 콘솔 출력본을 수동으로 복사해주세요.', 오류);
  }

  window.__라이브주문요약 = {
    라이브기준일자,
    최소자리수,
    총댓글수: 주문정보댓글목록.length,
    주문번호포함댓글수,
    구매인증고유인원수,
    구매자목록,
    상세댓글목록: 주문정보댓글목록
  };
})();
