/**
 * 드론별 개별 플랜 선택 기능
 * personal-drone-insurance-form.html에 추가할 스크립트
 */

// 플랜 데이터 정의
const PLAN_DATA = {
    camera: {
        title: '📷 촬영용/일반드론',
        plans: [
            { value: 'camera-slim', name: '슬림', price: 49900, coverage: ['대인배상: 5천만원', '대물배상: 5천만원', '인당/사고당', '자기부담금: 10만원'] },
            { value: 'camera-standard', name: '일반', price: 69900, coverage: ['대인배상: 1억원', '대물배상: 1억원', '누구나운전 포함', '자기부담금: 10만원'] },
            { value: 'camera-premium', name: '프리미엄', price: 99900, coverage: ['대인배상: 5억원', '대물배상: 5억원', '누구나운전 + 구조비용', '자기부담금: 10만원'] }
        ]
    },
    fpv: {
        title: '🎮 FPV드론, 프리스타일, 레이싱 드론',
        plans: [
            { value: 'fpv-slim', name: '슬림', price: 59900, coverage: ['대인배상: 5천만원', '대물배상: 5천만원', '드론경기중 보장', '자기부담금: 10만원'] },
            { value: 'fpv-standard', name: '일반', price: 79900, coverage: ['대인배상: 1억원', '대물배상: 1억원', '경기중 + 누구나운전', '자기부담금: 10만원'] },
            { value: 'fpv-premium', name: '프리미엄', price: 109900, coverage: ['대인배상: 5억원', '대물배상: 5억원', '경기중 + 누구나 + 구조비', '자기부담금: 10만원'] }
        ]
    },
    toy: {
        title: '🎯 완구형 드론',
        plans: [
            { value: 'toy-slim', name: '슬림', price: 49900, coverage: ['대인배상: 5천만원', '대물배상: 5천만원', '기본 보장', '자기부담금: 10만원'] },
            { value: 'toy-standard', name: '일반', price: 69900, coverage: ['대인배상: 1억원', '대물배상: 1억원', '누구나운전 포함', '자기부담금: 10만원'] },
            { value: 'toy-premium', name: '프리미엄', price: 99900, coverage: ['대인배상: 5억원', '대물배상: 5억원', '누구나운전 + 구조비용', '자기부담금: 10만원'] }
        ]
    },
    other: {
        title: '🚁 완구형/기타 드론',
        plans: [
            { value: 'other-slim', name: '슬림', price: 49900, coverage: ['대인배상: 5천만원', '대물배상: 5천만원', '기본 보장', '자기부담금: 10만원'] },
            { value: 'other-standard', name: '일반', price: 69900, coverage: ['대인배상: 1억원', '대물배상: 1억원', '누구나운전 포함', '자기부담금: 10만원'] },
            { value: 'other-premium', name: '프리미엄', price: 99900, coverage: ['대인배상: 5억원', '대물배상: 5억원', '누구나운전 + 구조비용', '자기부담금: 10만원'] }
        ]
    }
};

// 초기화
function initIndividualPlans() {
    // 플랜 선택 타입 라디오 버튼 추가
    const planSectionCard = document.querySelector('.section-card:has(.plan-category)');
    if (!planSectionCard) {
        console.error('플랜 섹션을 찾을 수 없습니다.');
        return;
    }
    
    const sectionTitle = planSectionCard.querySelector('.section-title');
    if (!sectionTitle) return;
    
    const planTypeSelector = document.createElement('div');
    planTypeSelector.className = 'plan-type-selector';
    planTypeSelector.style.cssText = 'margin: 1.5rem 0; padding: 1.5rem; background: #f8f9fa; border-radius: 12px;';
    planTypeSelector.innerHTML = `
        <h3 style="margin-bottom: 1rem; font-size: 1.1rem; color: #1a1a1a;">플랜 선택 방식</h3>
        <label style="display: flex; align-items: center; gap: 0.8rem; cursor: pointer; margin-bottom: 0.8rem;">
            <input type="radio" name="plan_selection_type" value="unified" checked onchange="togglePlanSelectionMode()" style="width: 20px; height: 20px;">
            <span style="font-weight: 600;">모든 드론 동일한 플랜</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.8rem; cursor: pointer;">
            <input type="radio" name="plan_selection_type" value="individual" onchange="togglePlanSelectionMode()" style="width: 20px; height: 20px;">
            <span style="font-weight: 600;">가입물건이 달라요 (드론별 플랜 선택)</span>
        </label>
    `;
    
    sectionTitle.after(planTypeSelector);
    
    // 개별 플랜 컨테이너 생성
    const individualContainer = document.createElement('div');
    individualContainer.id = 'individualPlanContainer';
    individualContainer.style.display = 'none';
    planSectionCard.appendChild(individualContainer);
}

// 플랜 선택 모드 전환
window.togglePlanSelectionMode = function() {
    const mode = document.querySelector('input[name="plan_selection_type"]:checked').value;
    const unifiedPlans = document.querySelectorAll('.plan-category');
    const individualContainer = document.getElementById('individualPlanContainer');
    
    if (mode === 'unified') {
        unifiedPlans.forEach(el => el.style.display = '');
        individualContainer.style.display = 'none';
    } else {
        unifiedPlans.forEach(el => el.style.display = 'none');
        individualContainer.style.display = 'block';
        generateIndividualPlanSections();
    }
};

// 드론별 개별 플랜 섹션 생성
function generateIndividualPlanSections() {
    const container = document.getElementById('individualPlanContainer');
    const droneCount = parseInt(document.getElementById('droneCount').value) || 1;
    const droneType = document.querySelector('input[name="drone_type"]:checked')?.value;
    
    if (!droneType) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #e74c3c;">
                <p style="font-size: 1.1rem; font-weight: 600;">⚠️ 먼저 드론 종류를 선택해주세요</p>
            </div>
        `;
        return;
    }
    
    const planData = PLAN_DATA[droneType];
    container.innerHTML = '';
    
    for (let i = 0; i < droneCount; i++) {
        const section = createDronePlanSection(i, planData);
        container.appendChild(section);
    }
}

// 개별 드론 플랜 섹션 생성
function createDronePlanSection(index, planData) {
    const section = document.createElement('div');
    section.className = 'individual-drone-plan';
    section.style.cssText = 'margin-bottom: 3rem; padding: 2rem; background: #ffffff; border: 2px solid #FFB800; border-radius: 15px;';
    
    const plansHTML = planData.plans.map(plan => `
        <label class="plan-card" style="cursor: pointer;">
            <input type="radio" name="plan_drone_${index}" value="${plan.value}" data-price="${plan.price}" data-plan-name="${plan.name}" onchange="updateTotalPrice()">
            <div class="plan-name">${plan.name}</div>
            <div class="plan-coverage">
                ${plan.coverage.map(item => `<div class="plan-coverage-item">• ${item}</div>`).join('')}
            </div>
            <div class="plan-price">${plan.price.toLocaleString()}<span>원/년</span></div>
        </label>
    `).join('');
    
    section.innerHTML = `
        <h3 style="color: #FFB800; margin-bottom: 1.5rem; font-size: 1.3rem; font-weight: 700;">
            드론 ${index + 1} 플랜 선택
        </h3>
        <div class="plan-grid">
            ${plansHTML}
        </div>
    `;
    
    return section;
}

// 총 보험료 업데이트
window.updateTotalPrice = function() {
    const mode = document.querySelector('input[name="plan_selection_type"]:checked')?.value;
    const droneCount = parseInt(document.getElementById('droneCount').value) || 1;
    
    let totalPrice = 0;
    
    if (mode === 'unified') {
        const selectedPlan = document.querySelector('input[name="plan"]:checked');
        if (selectedPlan) {
            const price = parseInt(selectedPlan.getAttribute('data-price'));
            totalPrice = price * droneCount;
        }
    } else {
        for (let i = 0; i < droneCount; i++) {
            const selectedPlan = document.querySelector(`input[name="plan_drone_${i}"]:checked`);
            if (selectedPlan) {
                totalPrice += parseInt(selectedPlan.getAttribute('data-price'));
            }
        }
    }
    
    // 총 보험료 표시 (UI에 추가 가능)
    console.log('총 보험료:', totalPrice.toLocaleString() + '원');
};

// 폼 데이터 수집 (기존 submit 함수 수정 필요)
window.collectFormDataWithIndividualPlans = function() {
    const mode = document.querySelector('input[name="plan_selection_type"]:checked')?.value || 'unified';
    const droneCount = parseInt(document.getElementById('droneCount').value) || 1;
    const formData = new FormData(document.getElementById('droneForm'));
    const data = Object.fromEntries(formData.entries());
    
    // 드론 정보 수집
    data.drones = [];
    for (let i = 0; i < droneCount; i++) {
        data.drones.push({
            model: data[`drone_model_${i}`],
            serial: data[`drone_serial_${i}`],
            weight: data[`drone_weight_${i}`],
            max_weight: data[`drone_max_weight_${i}`]
        });
    }
    
    // 플랜 정보 수집
    data.plan_selection_type = mode;
    data.drone_plans = [];
    let totalPrice = 0;
    
    if (mode === 'unified') {
        const selectedPlan = document.querySelector('input[name="plan"]:checked');
        if (!selectedPlan) {
            alert('플랜을 선택해주세요.');
            return null;
        }
        
        const planName = selectedPlan.closest('.plan-card').querySelector('.plan-name').textContent;
        const price = parseInt(selectedPlan.getAttribute('data-price'));
        
        for (let i = 0; i < droneCount; i++) {
            data.drone_plans.push({
                drone_index: i,
                plan: selectedPlan.value,
                plan_name: planName,
                price: price
            });
        }
        totalPrice = price * droneCount;
        
        data.plan = selectedPlan.value;
        data.plan_name = planName;
        data.plan_price_per_drone = price;
    } else {
        for (let i = 0; i < droneCount; i++) {
            const selectedPlan = document.querySelector(`input[name="plan_drone_${i}"]:checked`);
            if (!selectedPlan) {
                alert(`드론 ${i + 1}의 플랜을 선택해주세요.`);
                return null;
            }
            
            const planName = selectedPlan.getAttribute('data-plan-name');
            const price = parseInt(selectedPlan.getAttribute('data-price'));
            
            data.drone_plans.push({
                drone_index: i,
                plan: selectedPlan.value,
                plan_name: planName,
                price: price
            });
            totalPrice += price;
        }
    }
    
    data.plan_total_price = totalPrice;
    
    return data;
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initIndividualPlans();
    
    // 드론 타입 변경 시 개별 플랜 재생성
    document.querySelectorAll('input[name="drone_type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const mode = document.querySelector('input[name="plan_selection_type"]:checked')?.value;
            if (mode === 'individual') {
                generateIndividualPlanSections();
            }
        });
    });
});
