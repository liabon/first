# 🚀 Liab 웹사이트 배포 가이드

## 📋 목차
1. [Vercel 배포 방법](#vercel-배포)
2. [도메인 연결 (www.liab.co.kr)](#도메인-연결)
3. [이메일/카카오톡 알림 설정](#알림-설정)

---

## 1️⃣ Vercel 배포

### Step 1: Vercel 계정 생성
1. https://vercel.com 접속
2. "Sign Up" 클릭
3. GitHub 계정으로 가입 (추천)

### Step 2: GitHub에 코드 업로드
1. GitHub (https://github.com) 로그인
2. "New repository" 클릭
3. 저장소 이름: `liab-insurance` 입력
4. "Create repository" 클릭
5. 터미널에서 다음 명령어 실행:

```bash
cd /path/to/your/project
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/liab-insurance.git
git push -u origin main
```

### Step 3: Vercel에 배포
1. Vercel 대시보드에서 "Add New" > "Project" 클릭
2. GitHub 저장소 연결
3. `liab-insurance` 저장소 선택
4. "Deploy" 클릭
5. 배포 완료! (약 1-2분 소요)

✅ **배포 완료 후 Vercel이 제공하는 URL 확인**
   예: `liab-insurance.vercel.app`

---

## 2️⃣ 도메인 연결 (www.liab.co.kr)

### Option A: 도메인이 가비아에 있는 경우

#### 1. Vercel에서 도메인 추가
1. Vercel 프로젝트 대시보드 > "Settings" > "Domains"
2. "Add" 버튼 클릭
3. `www.liab.co.kr` 입력
4. Vercel이 제공하는 DNS 정보 확인:
   - Type: `CNAME`
   - Name: `www`
   - Value: `cname.vercel-dns.com`

#### 2. 가비아에서 DNS 설정
1. 가비아 로그인 > "My가비아" > "서비스 관리"
2. 도메인 관리 > `liab.co.kr` 선택
3. "DNS 정보" > "DNS 설정" 클릭
4. 새 레코드 추가:
   ```
   타입: CNAME
   호스트: www
   값: cname.vercel-dns.com
   TTL: 3600
   ```
5. "저장" 클릭

#### 3. 루트 도메인 (liab.co.kr) 연결 (선택사항)
Vercel에서 `liab.co.kr` 도메인도 추가한 후:
```
타입: A
호스트: @
값: 76.76.21.21
```

⏰ **DNS 전파 시간: 최대 48시간 (보통 1-2시간)**

---

### Option B: 도메인이 다른 업체에 있는 경우

1. 도메인 제공업체 로그인
2. DNS 관리 페이지 이동
3. 위와 동일한 CNAME 레코드 추가
4. 저장

---

## 3️⃣ 이메일/카카오톡 알림 설정

### 이메일 알림 설정 (Gmail 사용)

#### 1. Gmail 앱 비밀번호 생성
1. Google 계정 설정 (https://myaccount.google.com)
2. "보안" > "2단계 인증" 활성화
3. "앱 비밀번호" 생성
4. "메일" 선택 > 비밀번호 복사

#### 2. Vercel 환경 변수 설정
1. Vercel 프로젝트 > "Settings" > "Environment Variables"
2. 다음 변수 추가:
   ```
   EMAIL_USER = your-email@gmail.com
   EMAIL_PASS = (앱 비밀번호 붙여넣기)
   ADMIN_EMAIL = baesangon@example.com
   ```
3. "Save" 클릭
4. 프로젝트 재배포

---

### 카카오톡 알림 설정 (선택사항)

#### 카카오 비즈니스 계정 필요
1. https://business.kakao.com 접속
2. 비즈니스 계정 생성
3. 알림톡 템플릿 등록 (심사 필요)
4. Access Token 발급
5. Vercel 환경 변수에 추가:
   ```
   KAKAO_ACCESS_TOKEN = your-kakao-token
   ```

⚠️ **참고**: 카카오톡 알림은 비즈니스 계정 승인이 필요하므로,
처음에는 이메일 알림만 사용하는 것을 추천합니다.

---

## 🔧 HTML 파일에서 API 연결 수정

`index.html` 파일의 JavaScript 부분 수정:

```javascript
// 기존 코드 (79번째 줄 근처)
try {
    // 여기에 실제 API 엔드포인트를 연결하세요
    
    // 현재는 콘솔에 데이터 출력
    console.log('폼 데이터:', formData);
```

**수정 후:**
```javascript
try {
    // Vercel 서버로 데이터 전송
    const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.message);
    }
```

---

## ✅ 최종 체크리스트

- [ ] GitHub 저장소 생성 및 코드 업로드
- [ ] Vercel 계정 생성 및 프로젝트 연결
- [ ] 배포 완료 확인
- [ ] 가비아에서 DNS 설정
- [ ] Gmail 앱 비밀번호 생성
- [ ] Vercel 환경 변수 설정
- [ ] index.html API 연결 코드 수정
- [ ] 테스트 문의 전송
- [ ] 이메일 수신 확인

---

## 🆘 문제 해결

### 도메인이 연결되지 않을 때
- DNS 전파 확인: https://dnschecker.org
- 48시간 후에도 안 되면 Vercel 지원팀 문의

### 이메일이 전송되지 않을 때
- Gmail 앱 비밀번호 재생성
- Vercel 환경 변수 확인
- 서버 로그 확인 (Vercel Dashboard > Functions)

### 기타 문제
- Vercel 공식 문서: https://vercel.com/docs
- Node.js 이메일 문서: https://nodemailer.com

---

## 📞 추가 도움이 필요하시면

1. Vercel Discord 커뮤니티
2. GitHub Issues
3. 개발자 커뮤니티 (예: 인프런, 생활코딩)

**배포 성공을 기원합니다! 🎉**
