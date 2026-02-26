/**
 * fix-all-pages.js (v2)
 * 
 * CloudFlare Email Obfuscation 우회 + notice-modal.js 삽입
 * 
 * 사용법: 프로젝트 루트에서 실행
 *   node fix-all-pages.js
 * 
 * 핵심: 이메일을 HTML에 직접 쓰면 CloudFlare가 [email protected]로 변환함
 *    -> JavaScript로 동적 생성하면 CloudFlare가 감지 못함
 */

const fs = require('fs');
const path = require('path');

const HTML_FILES = [
    'index.html',
    'drone-insurance.html',
    'event-insurance.html',
    'claims.html',
    'domestic-travel-insurance.html',
    'overseas-travel-insurance.html',
    'my-insurance.html',
    'payment-success.html',
    'payment-fail.html',
    'personal-drone-insurance.html',
    'personal-drone-insurance-terms.html',
    'personal-drone-insurance-complete.html',
    'business-drone-insurance.html',
    'business-drone-insurance-terms.html',
    'business-drone-insurance-complete.html',
];

const NOTICE_TAG = '<script src="/notice-modal.js"></script>';

// CloudFlare가 이미 변환한 패턴
const CF_EMAIL_REGEX = /<a\s+href="\/cdn-cgi\/l\/email-protection"\s+class="__cf_email__"\s+data-cfemail="[^"]*">\[email&#160;protected\]<\/a>/g;

// 원본 mailto 이메일 패턴
const RAW_EMAIL_LINK = /<a\s+href="mailto:liab\.on\.ins@gmail\.com">liab\.on\.ins@gmail\.com<\/a>/g;

// 교체할 span
const REPLACEMENT = '<span class="js-email"></span>';

// CF 디코딩 스크립트
const CF_SCRIPT_REGEX = /<script\s+data-cfasync="false"\s+src="\/cdn-cgi\/scripts\/[^"]*"><\/script>/g;

// 이메일 동적 렌더링 스크립트
const EMAIL_RENDER_SCRIPT = `
<script>
(function(){
    var _u='liab.on'+'.ins',_d='gm'+'ail.com',_e=_u+'@'+_d;
    document.querySelectorAll('.js-email').forEach(function(el){
        var a=document.createElement('a');
        a.href='mai'+'lto:'+_e;
        a.textContent=_e;
        a.style.color='inherit';
        el.appendChild(a);
    });
})();
</script>`;

let fixed = 0;
let skipped = 0;

for (const file of HTML_FILES) {
    const filePath = path.join(__dirname, file);

    if (!fs.existsSync(filePath)) {
        console.log('  skip  ' + file + ' (파일 없음)');
        skipped++;
        continue;
    }

    let html = fs.readFileSync(filePath, 'utf-8');
    let changed = false;

    // 1) CF 변환된 이메일 -> JS span
    const cfMatches = html.match(CF_EMAIL_REGEX);
    if (cfMatches) {
        html = html.replace(CF_EMAIL_REGEX, REPLACEMENT);
        console.log('  email  ' + file + ' - CF email protected -> js-email (' + cfMatches.length + '개)');
        changed = true;
    }

    // 2) 원본 mailto 이메일 -> JS span
    const rawMatches = html.match(RAW_EMAIL_LINK);
    if (rawMatches) {
        html = html.replace(RAW_EMAIL_LINK, REPLACEMENT);
        console.log('  email  ' + file + ' - mailto -> js-email (' + rawMatches.length + '개)');
        changed = true;
    }

    // 3) JS 문자열 안의 이메일 -> 분할 연결
    if (html.includes('liab.on.ins@gmail.com')) {
        html = html.replace(/liab\.on\.ins@gmail\.com/g, "' + ['liab.on','ins@gm','ail.com'].join('') + '");
        console.log('  email  ' + file + ' - JS 문자열 이메일 분할');
        changed = true;
    }

    // 4) CF 스크립트 제거
    const cfScripts = html.match(CF_SCRIPT_REGEX);
    if (cfScripts) {
        html = html.replace(CF_SCRIPT_REGEX, '');
        console.log('  clean  ' + file + ' - CF 디코드 스크립트 제거');
        changed = true;
    }

    // 5) 이메일 렌더링 스크립트 삽입
    if (html.includes('js-email') && !html.includes("var _u='liab.on'")) {
        if (html.includes('</body>')) {
            html = html.replace('</body>', EMAIL_RENDER_SCRIPT + '\n</body>');
            console.log('  script ' + file + ' - 이메일 렌더링 스크립트 삽입');
            changed = true;
        }
    }

    // 6) notice-modal.js 삽입
    if (!html.includes('notice-modal.js')) {
        if (html.includes('</body>')) {
            html = html.replace('</body>', NOTICE_TAG + '\n</body>');
            console.log('  notice ' + file + ' - notice-modal.js 삽입');
            changed = true;
        } else {
            console.log('  WARN   ' + file + ' - </body> 없음! 수동 추가 필요');
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, html, 'utf-8');
        console.log('  DONE   ' + file);
        fixed++;
    } else {
        console.log('  ok     ' + file + ' (변경 없음)');
    }
    console.log('');
}

console.log('완료: ' + fixed + '개 수정, ' + skipped + '개 스킵');
console.log('');
console.log('확인사항:');
console.log('  1. notice-modal.js 가 프로젝트 루트에 있어야 합니다');
console.log('  2. 배포 후 이메일이 정상 표시되는지 확인하세요');
console.log('  3. CloudFlare 대시보드 -> Scrape Shield -> Email Obfuscation OFF 권장');
