/**
 * personal-drone-insurance-form 페이지 제출 패치
 * ─────────────────────────────────────────────────
 * 기존 페이지의 최종 제출(약관 동의 후 완료 단계) 버튼 핸들러를
 * 아래 로직으로 교체하거나 통합하세요.
 *
 * 사용법: 이 파일을 /public/js/personal-drone-form-submit.js 로 저장하고
 *        personal-drone-insurance-form.html 하단 </body> 직전에 추가:
 *        <script src="/js/personal-drone-form-submit.js"></script>
 *
 * 전제: 기존 폼 JS가 수집한 데이터를 window.__droneFormData 객체에 보관하거나,
 *       아래 collectFormData() 함수를 기존 폼 로직에 맞게 수정하세요.
 */

/**
 * 기존 폼에서 데이터를 수집합니다.
 * 실제 폼의 input id/name 에 맞게 수정하세요.
 */
function collectFormData() {
  const getValue = (selector) => document.querySelector(selector)?.value?.trim() || '';

  // 드론 정보 수집 (각 드론 행의 데이터)
  const droneRows = document.querySelectorAll('.drone-row, [data-drone-row]');
  const drones = [];
  droneRows.forEach((row, idx) => {
    const type    = row.querySelector('[data-field="type"]')?.value || '';
    const serial  = row.querySelector('[data-field="serial"]')?.value?.trim() || '';
    const weight  = row.querySelector('[data-field="weight"]')?.value?.trim() || '';
    const plan    = row.querySelector('[data-plan].selected, [data-plan][aria-selected="true"]')?.dataset?.plan || '';
    const price   = row.querySelector('[data-plan].selected, [data-plan][aria-selected="true"]')?.dataset?.price || 0;
    drones.push({ index: idx + 1, type, serial_number: serial, weight, plan, plan_price: parseInt(price) });
  });

  // 선택한 보험 시작/종료일
  const coverageStart = getValue('input[type="datetime-local"]:first-of-type') ||
                        getValue('#coverage-start') ||
                        getValue('[name="coverage_start"]');
  const coverageEnd   = getValue('input[type="datetime-local"]:last-of-type') ||
                        getValue('#coverage-end') ||
                        getValue('[name="coverage_end"]');

  // 총 보험료 계산 (화면에 표시된 값 파싱)
  const totalText = document.querySelector('.total-premium, #total-premium, [data-total-premium]')?.textContent || '0';
  const totalPremium = parseInt(totalText.replace(/[^0-9]/g, '')) || 0;

  return {
    // 자격 확인 (sessionStorage에 저장된 값 활용)
    is_non_mandatory:    sessionStorage.getItem('droneplay_non_mandatory') !== 'false',
    is_droneplay_member: sessionStorage.getItem('droneplay_member') !== 'false',

    // 고객 정보
    name:       getValue('#name, [name="name"]'),
    birth_date: getValue('#birth-date, [name="birth_date"], #birthDate'),
    gender:     getValue('select[name="gender"], #gender'),
    phone:      getValue('#phone, [name="phone"]'),
    email:      getValue('#email, [name="email"]'),

    // 보험 기간
    coverage_start:    coverageStart ? new Date(coverageStart).toISOString() : null,
    coverage_end:      coverageEnd   ? new Date(coverageEnd).toISOString()   : null,
    coverage_location: getValue('#coverage-location, [name="coverage_location"]'),

    // 드론
    drone_count: drones.length || 1,
    drones:      drones,

    // 보험료
    total_premium: totalPremium,

    // 약관 동의
    terms_agreed: document.querySelector('#terms-agree, [name="terms_agree"]')?.checked || false
  };
}

/**
 * 최종 제출 함수 - 약관 동의 완료 후 호출
 * 기존 완료 버튼의 클릭 핸들러에서 이 함수를 호출하세요:
 *   submitPersonalDroneApplication()
 */
window.submitPersonalDroneApplication = async function (customData) {
  const payload = customData || collectFormData();

  if (!payload.terms_agreed) {
    alert('약관에 동의해주세요.');
    return false;
  }

  try {
    const res = await fetch('/api/submit-personal-drone-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      // 완료 단계로 이동 (기존 step 이동 로직 유지)
      console.log('가입 신청 완료. ID:', data.id);
      return { success: true, id: data.id };
    } else {
      alert(data.error || '오류가 발생했습니다.');
      return { success: false };
    }
  } catch (err) {
    console.error('제출 오류:', err);
    alert('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    return { success: false };
  }
};

// 기존 폼의 약관 동의 완료 버튼을 자동으로 후킹 (선택적)
// 버튼 selector를 실제 HTML에 맞게 수정하세요
document.addEventListener('DOMContentLoaded', function () {
  const completeBtn = document.querySelector('#complete-btn, [data-step="complete"] button, .step-complete-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', async function (e) {
      const result = await window.submitPersonalDroneApplication();
      if (!result?.success) {
        e.stopImmediatePropagation(); // 실패 시 다음 단계 이동 방지
      }
    });
  }
});
