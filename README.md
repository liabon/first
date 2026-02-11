# KB손해보험 배상온 대리점 웹사이트

## 🚀 404 에러 수정 완료!

### 수정된 사항:

1. **vercel.json 파일 개선**
   - `/event-insurance` → `/event-insurance.html` 라우팅 추가
   - `/drone-insurance` → `/drone-insurance.html` 라우팅 추가
   - cleanUrls 옵션 활성화

2. **API 엔드포인트 추가**
   - `/api/contact.js` 파일 생성
   - 이메일 전송 기능 구현
   - 환경 변수 검증 추가

3. **파일 구조 최적화**

## 📁 파일 구조

```
/
├── index.html              # 메인 페이지
├── event-insurance.html    # 행사보험 페이지
├── drone-insurance.html    # 드론보험 페이지
├── kb-logo.png            # KB 로고
├── vercel.json            # Vercel 설정 파일 (수정됨)
├── package.json           # Node.js 패키지 설정
├── .env.example           # 환경 변수 예시
└── api/
    └── contact.js         # 문의 접수 API
```

## 🔧 배포 방법

### 1. Vercel에 배포

```bash
# Vercel CLI 설치 (처음 한 번만)
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 2. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 설정하세요:

```
EMAIL_USER = your-email@gmail.com
EMAIL_PASS = Gmail 앱 비밀번호
ADMIN_EMAIL = baesangon@example.com
```

## ✅ 체크리스트

- [x] 404 에러 수정
- [x] vercel.json 개선
- [x] API 엔드포인트 추가
- [ ] 환경 변수 설정
- [ ] 도메인 연결

## 🌐 테스트

로컬에서 테스트하려면:

```bash
npm install
npm start
```

브라우저에서 확인:
- http://localhost:3000
- http://localhost:3000/event-insurance
- http://localhost:3000/drone-insurance

## 📞 문의

문제가 있으시면 GitHub Issues에 등록해주세요.
