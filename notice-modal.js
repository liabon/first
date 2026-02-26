/**
 * 알아두실사항 플로팅 버튼 + 모달 자동 삽입 컴포넌트
 * 사용법: <script src="/notice-modal.js"></script>
 */
(function() {
    'use strict';

    var style = document.createElement('style');
    style.textContent = [
        '/* 알아두실사항 하단 고정 바 */',
        '.notice-float-btn {',
        '    position: fixed;',
        '    bottom: 0;',
        '    left: 50%;',
        '    transform: translateX(-50%);',
        '    z-index: 9997;',
        '    background: rgba(26,26,26,0.92);',
        '    color: #FFB800;',
        '    border: none;',
        '    border-top: 1.5px solid #FFB800;',
        '    border-radius: 12px 12px 0 0;',
        '    padding: 6px 28px;',
        '    font-size: 0.78rem;',
        '    font-weight: 600;',
        '    cursor: pointer;',
        '    display: flex;',
        '    align-items: center;',
        '    gap: 5px;',
        '    transition: all 0.3s ease;',
        '    font-family: inherit;',
        '    white-space: nowrap;',
        '}',
        '.notice-float-btn:hover {',
        '    padding: 8px 32px;',
        '    background: rgba(26,26,26,1);',
        '}',
        '.notice-float-btn .notice-icon { font-size: 0.85rem; }',
        '',
        '/* 모달 오버레이 */',
        '.notice-modal-overlay {',
        '    display: none;',
        '    position: fixed;',
        '    top: 0; left: 0; right: 0; bottom: 0;',
        '    background: rgba(0,0,0,0.6);',
        '    z-index: 10000;',
        '    justify-content: center;',
        '    align-items: center;',
        '    padding: 16px;',
        '    backdrop-filter: blur(3px);',
        '}',
        '.notice-modal-overlay.active { display: flex; }',
        '',
        '/* 모달 박스 */',
        '.notice-modal-box {',
        '    background: #fff;',
        '    border-radius: 16px;',
        '    width: 100%;',
        '    max-width: 640px;',
        '    max-height: 85vh;',
        '    display: flex;',
        '    flex-direction: column;',
        '    overflow: hidden;',
        '    box-shadow: 0 20px 60px rgba(0,0,0,0.3);',
        '    animation: noticeSlideUp 0.3s ease;',
        '}',
        '@keyframes noticeSlideUp {',
        '    from { transform: translateY(30px); opacity: 0; }',
        '    to { transform: translateY(0); opacity: 1; }',
        '}',
        '',
        '/* 모달 헤더 */',
        '.notice-modal-header {',
        '    background: linear-gradient(135deg, #3d3d3d 0%, #1a1a1a 100%);',
        '    color: #FFB800;',
        '    padding: 18px 24px;',
        '    display: flex;',
        '    align-items: center;',
        '    justify-content: space-between;',
        '    flex-shrink: 0;',
        '}',
        '.notice-modal-header h2 {',
        '    margin: 0; font-size: 1.15rem; font-weight: 700;',
        '    display: flex; align-items: center; gap: 8px;',
        '}',
        '.notice-modal-close {',
        '    background: none; border: none; color: #ccc;',
        '    font-size: 1.6rem; cursor: pointer; padding: 0 4px;',
        '    line-height: 1; transition: color 0.2s;',
        '}',
        '.notice-modal-close:hover { color: #FFB800; }',
        '',
        '/* 모달 본문 */',
        '.notice-modal-body {',
        '    padding: 24px; overflow-y: auto; flex: 1;',
        '    font-size: 0.9rem; line-height: 1.75; color: #333;',
        '}',
        '.notice-modal-body h3 {',
        '    font-size: 1rem; font-weight: 700; color: #1a1a1a;',
        '    margin: 24px 0 8px 0; padding-bottom: 6px;',
        '    border-bottom: 2px solid #FFB800; display: inline-block;',
        '}',
        '.notice-modal-body h3:first-child { margin-top: 0; }',
        '.notice-modal-body p { margin: 6px 0; color: #444; }',
        '.notice-modal-body a { color: #2563eb; text-decoration: underline; word-break: break-all; }',
        '.notice-modal-body a:hover { color: #1d4ed8; }',
        '.notice-modal-body ul { margin: 6px 0 6px 18px; padding: 0; }',
        '.notice-modal-body ul li { margin: 4px 0; color: #555; }',
        '.notice-modal-body .notice-divider { border: none; border-top: 1px solid #eee; margin: 20px 0; }',
        '',
        '/* 모달 푸터 */',
        '.notice-modal-footer {',
        '    padding: 14px 24px; border-top: 1px solid #eee;',
        '    text-align: center; flex-shrink: 0; background: #fafafa;',
        '}',
        '.notice-modal-footer .notice-agency { font-size: 0.82rem; color: #888; line-height: 1.6; }',
        '.notice-modal-footer .notice-approval { font-size: 0.78rem; color: #bbb; margin-top: 6px; }',
        '',
        '@media (max-width: 480px) {',
        '    .notice-float-btn { padding: 5px 20px; font-size: 0.72rem; }',
        '    .notice-modal-body { padding: 16px; font-size: 0.85rem; }',
        '    .notice-modal-header { padding: 14px 18px; }',
        '}'
    ].join('\n');
    document.head.appendChild(style);

    // 플로팅 버튼
    var btn = document.createElement('button');
    btn.className = 'notice-float-btn';
    btn.setAttribute('aria-label', '알아두실사항');
    btn.innerHTML = '<span class="notice-icon">📋</span> 알아두실사항';
    document.body.appendChild(btn);

    // 모달
    var modal = document.createElement('div');
    modal.className = 'notice-modal-overlay';
    modal.innerHTML = [
        '<div class="notice-modal-box">',
        '    <div class="notice-modal-header">',
        '        <h2>\ud83d\udccb 알아두실사항</h2>',
        '        <button class="notice-modal-close" aria-label="닫기">&times;</button>',
        '    </div>',
        '    <div class="notice-modal-body">',
        '        <p>KB손해보험 상품에 대해 충분히 설명할 의무가 있으며, 가입자는 가입에 앞서 상품에 대한 충분한 설명을 받으시기 바랍니다.</p>',
        '        <p>기존 보험계약을 해지하고 새로운 보험계약을 체결하는 경우 보험인수가 거절되거나, 보험료가 인상될 수 있으며 보장내용이 달라질 수 있으니 유의하시기 바랍니다. 가입한 특별약관에 따라 보장내역이 달라질 수 있습니다.</p>',
        '        <p>면책사유 및 지급제한, 지급한도 등에 따라 보험금지급이 제한될 수 있습니다.</p>',
        '        <hr class="notice-divider">',
        '        <h3>계약의 무효</h3>',
        '        <p>계약을 맺을 때에 보험사고가 이미 발생하였을 경우 이 계약은 무효로 합니다. 다만, 회사의 고의 또는 과실로 인하여 계약이 무효로 된 경우와 회사가 승낙 전에 무효임을 알았거나 알 수 있었음에도 불구하고 보험료를 반환하지 않은 경우에는 보험료를 납입한 날의 다음날부터 반환일까지의 기간에 대하여 회사는 보험개발원이 공시하는 보험계약대출이율을 연단위 복리로 계산한 금액을 더하여 돌려드립니다.</p>',
        '        <h3>보장개시일 관련</h3>',
        '        <p>회사는 계약의 청약을 승낙하고 제1회 보험료를 받은 때부터 약관이 정한 바에 따라 보장을 합니다. 또한, 회사가 청약과 함께 제1회 보험료를 받은 후 승낙한 경우에도 제1회 보험료를 받은 때부터 보장이 개시됩니다.</p>',
        '        <h3>배상책임관련 담보 등 다수 계약의 비례보상에 관한 사항</h3>',
        '        <p>이 계약에서 보장하는 위험과 같은 위험을 보장하는 다른 계약(공제계약 포함)이 있을 경우 각 계약에 대하여 다른 계약이 없는 것으로 하여 각각 산출한 보상책임액의 합계액이 손해액을 초과할 때에는 이 계약에 의한 보상책임액에 대한 비율에 따라 보상하여 드립니다.</p>',
        '        <h3>계약자의 자필서명</h3>',
        '        <p>청약서는 계약자 본인이 작성하고 서명란에도 계약자 본인 및 피보험자가 자필서명을 하셔야 합니다. 자필서명을 하지 않으신 경우 보험계약의 효력 등과 관련하여 불이익이 있을 수 있습니다.</p>',
        '        <h3>보험상품에 대한 정보를 안내, 설명받을 권리</h3>',
        '        <p>보험계약자는 가입하고자 하는 보험상품에 대하여 필요한 정보를 안내, 설명 받을 권리가 있습니다.<br>보험계약 체결 전에 반드시 상품설명서 및 약관을 읽어보시기 바랍니다.</p>',
        '        <h3>보험계약 전 알릴 의무</h3>',
        '        <p>보험계약자 및 피보험자는 직업, 질병사항 등 보험사가 질문한 중요한 사항을 반드시 알려야 합니다.<br>보험사가 질문한 중요한 사항을 알리지 않은 경우 보험계약이 해지되거나, 보험금을 지급받지 못할 수 있습니다.</p>',
        '        <h3>계약 후 알릴 의무</h3>',
        '        <p>계약을 맺은 후 보험의 목적에 아래와 같은 사실이 생긴 경우에는 계약자 또는 피보험자는 지체없이 서면으로 회사에 알리고 보험증권에 확인을 받아야 합니다.</p>',
        '        <ul>',
        '            <li>이 계약에서 보장하는 위험과 동일한 위험을 보장하는 계약을 다른 보험자와 체결하고자 할 때 또는 이와 같은 계약이 있음을 알았을 때</li>',
        '            <li>보험의 목적을 양도할 때</li>',
        '            <li>보험의 목적 또는 보험의 목적을 수용하는 건물의 구조를 변경, 개축, 증축할 때</li>',
        '            <li>보험의 목적을 다른 장소로 옮길 때</li>',
        '            <li>위험이 뚜렷이 변경되거나 변경되었음을 알았을 때</li>',
        '        </ul>',
        '        <h3>보험계약의 청약철회</h3>',
        '        <p>계약자는 보험증권을 받은 날부터 15일 이내에 그 청약을 철회할 수 있고, 이 경우 납입한 보험료를 돌려드립니다. 다만, 청약한 날부터 30일(단, 만 65세 이상의 계약자가 통신수단 중 전화를 이용하여 체결한 경우 45일)이 초과된 계약은 청약을 철회할 수 없습니다.</p>',
        '        <p>또한 진단계약, 보장기간이 90일 이내인 계약, 보증보험, 법률에 따른 의무보험, 자동차손해배상 보장법에 따른 책임보험 또는 전문금융소비자가 체결한 계약은 청약을 철회할 수 없습니다. <strong>드론배상책임보험은 의무보험으로 청약 철회가 불가합니다.</strong>(단, 동일한 종류의 다른 의무보험에 가입된 경우에는 가능하며 상세 내용은 약관을 참조하시기 바랍니다)</p>',
        '        <h3>품질보증제도</h3>',
        '        <p>계약자가 청약 후에 약관과 계약자 보관용 청약서를 전달받지 못하거나 약관의 중요한 내용을 설명받지 못한 때 또는 청약서에 자필서명을 하지 않은 때에는 계약이 성립한 날부터 3개월 이내에 계약을 취소할 수 있습니다. 이 경우 이미 납입한 보험료를 계약자에게 돌려드리며, 보험료를 받은 기간에 대하여 보험계약대출이율을 연단위 복리로 계산한 금액을 더하여 지급합니다.</p>',
        '        <h3>해약환급금이 납입보험료보다 적거나 없는 이유</h3>',
        '        <p>해약환급금이란 보험계약이 중도에 해지될 경우에 지급되는 금액을 말합니다. 보험은 은행의 저축과 달리 위험보장과 저축을 겸비한 제도로서, 계약자가 납입한 보험료 중 일부는 불의의 사고를 당한 다른 가입자에게 지급되는 보험금으로 또 다른 일부는 보험회사 운영에 필요한 경비로 사용되므로 중도해지시 지급되는 해약환급금은 납입한 보험료보다 적거나 없을 수도 있습니다.</p>',
        '        <h3>예금자 보호안내</h3>',
        '        <p>이 보험 계약은 예금자보호법에 따라 해약환급금(또는 만기 시 보험금)에 기타지급금을 합한 금액이 1인당 <strong>"1억원까지"</strong>(본 보험회사의 여타 보호상품과 합산) 보호됩니다. 이와 별도로 본 보험회사 보호상품의 사고보험금을 합산한 금액이 1인당 <strong>"1억원까지"</strong> 보호됩니다. (단, 보험계약자 및 보험료 납부자가 법인인 보험계약의 경우에는 보호되지 않습니다.)</p>',
        '        <h3>세제혜택 (보장성보험)</h3>',
        '        <p>소득세법 제95조의 4(특별세액공제) 1항에 의거 근로자가 가입한 보장성보험에 한하여 납입보험료(연간 1백만원 한도)의 12%에 해당하는 금액을 세액공제 받을 수 있습니다. 세제관련사항은 관련 세법의 재·개정이나 폐지에 따라 변경될 수 있습니다.</p>',
        '        <h3>개인정보보호안내</h3>',
        '        <p>회사는 이 계약과 관련된 개인정보를 이 계약의 체결, 유지, 보험금 지급 등을 위하여 관계법령에 정한 경우를 제외하고 계약자, 피보험자 또는 보험수익자의 동의 없이 수집, 이용, 조회 또는 제공하지 않습니다. 다만, 회사는 이 계약의 체결, 유지, 보험금 지급 등을 위하여 관계법령에 따라 계약자 및 피보험자의 동의를 받아 다른 보험회사 및 보험관련단체 등에 개인정보를 제공할 수 있습니다.</p>',
        '        <h3>보험모집질서 확립 및 신고센터 안내</h3>',
        '        <p>보험계약 체결과 관련된 특별이익 제공행위는 보험업법에 의하여 처벌받을 수 있습니다.</p>',
        '        <h3>금융감독원 보험사기방지센터 안내</h3>',
        '        <p>보험범죄는 형법 제347조(사기)에 의거하여 10년 이하의 징역이나 2천만원 이하의 벌금에 처해지며, 보험범죄를 교사한 경우에도 동일한 처벌을 받을 수 있습니다.</p>',
        '        <p>\ud83d\udcde 전화 : <a href="tel:1332">1332</a><br>',
        '        \ud83c\udf10 인터넷 : <a href="https://insucop.fss.or.kr/" target="_blank" rel="noopener">금융감독원 보험사기방지센터</a></p>',
        '        <h3>보험상담 및 보험분쟁조정 안내</h3>',
        '        <p>보험상담 및 보험에 관한 불만이나 분쟁이 발생한 경우에는 KB손해보험 고객콜센터로 문의하시기 바랍니다. 처리결과에 이의가 있을 경우 금융감독원의 금융소비자보호센터에 민원 또는 분쟁조정을 신청하실 수 있습니다.</p>',
        '        <p>\ud83d\udcde 전화 : <a href="tel:1332">1332</a><br>',
        '        \ud83c\udf10 인터넷 : <a href="https://www.fss.or.kr" target="_blank" rel="noopener">금융감독원 (www.fss.or.kr)</a></p>',
        '        <hr class="notice-divider">',
        '        <p style="font-size:0.82rem; color:#888;">위 사항은 약관 내용을 요약 발췌한 것으로 세부 내용은 약관 및 상품설명서를 참조하시기 바랍니다.</p>',
        '    </div>',
        '    <div class="notice-modal-footer">',
        '        <div class="notice-agency">',
        '            <strong>보험가입 전 알아두실 사항</strong><br>',
        '            배상온 보험대리점 (협회등록번호 : 2026010037)<br>',
        '            배상온 보험대리점은 KB손해보험과 전속계약을 체결한 보험 대리점입니다.<br>',
        '            해당 모집종사자는 보험사로부터 보험계약체결권을 부여받지 아니한 금융판매 대리\xb7중개업자입니다.<br><br>',
        '            보험계약자가 기존 보험계약을 해지하고 새로운 보험계약을 체결하는 과정에서<br>',
        '            \u2460 질병이력, 연령증가 등으로 가입이 거절되거나 보험료가 인상될 수 있습니다.<br>',
        '            \u2461 가입 상품에 따라 새로운 보험금 지급제한기간 적용 및 보장 제한 등 기타 불이익이 발생할 수 있습니다.<br><br>',
        '            본 광고는 광고심의기준을 준수하였으며, 유효기간은 심의일로부터 1년입니다.',
        '        </div>',
        '        <div class="notice-approval">KB손해보험 준법감시인 심의필 제2026-00000호 (2026.03.01~2027.03.01)</div>',
        '    </div>',
        '</div>'
    ].join('\n');
    document.body.appendChild(modal);

    // 이벤트
    btn.addEventListener('click', function() {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    modal.querySelector('.notice-modal-close').addEventListener('click', function() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    });
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
})();
