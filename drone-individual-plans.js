/**
 * 드론별 개별 가입물건 및 플랜 선택 기능
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

const DRONE_TYPE_NAMES = {
    camera: '촬영용 센서드론',
    fpv: 'FPV/레이싱 드론',
    toy: '완구형 드론',
    other: '기타 드론'
};

// 초기화
function initIndividualPlans() {
    // 플랜 선택 섹션 찾기
    const planSectionCard = document.querySelector('.section-card:has(.plan-category)');
    if (!planSectionCard) {
        console.error('플랜 섹션을 찾을 수 없습니다.');
        return;
    }
    
    const sectionTitle = planSectionCard.querySelector('.section-title');
    if (!sectionTitle) return;
    
    // 플랜 선택 방식 선택 UI
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
            <span style="font-weight: 600;">가입물건이 달라요 (드론별 가입물건 & 플랜 선택)</span>
        </label>
    `;
    
    sectionTitle.after(planTypeSelector);
    
    // 개별 선택 컨테이너 생성
    const individualContainer = document.createElement('div');
    individualContainer.id = 'individualPlanContainer';
    individualContainer.style.display = 'none';
    planSectionCard.appendChild(individualContainer);
    
    // 기존 가입물건 선택과 플랜 섹션을 unified 컨테이너로 묶기
    const droneTypeSection = document.querySelector('.section-card:has(.drone-type-grid)');
    const existingPlanCategories = planSectionCard.querySelectorAll('.plan-category');
    
    const unifiedContainer = document.createElement('div');
    unifiedContainer.id = 'unifiedPlanContainer';
    unifiedContainer.style.display = 'block';
    
    // 기존 플랜 카테고리들을 unified 컨테이너로 이동
    existingPlanCategories.forEach(category => {
        unifiedContainer.appendChild(category);
    });
    
    planSectionCard.insertBefore(unifiedContainer, individualContainer);
}

// 플랜 선택 모드 전환
window.togglePlanSelectionMode = function() {
    const mode = document.querySelector('input[name="plan_selection_type"]:checked').value;
    const unifiedContainer = document.getElementById('unifiedPlanContainer');
    const individualContainer = document.getElementById('individualPlanContainer');
    const droneTypeSection = document.querySelector('.section-card:has(.drone-type-grid)');
    
    if (mode === 'unified') {
        // 통합 모드: 기존 가입물건 선택 보이기
        if (droneTypeSection) droneTypeSection.style.display = 'block';
        if (unifiedContainer) unifiedContainer.style.display = 'block';
        if (individualContainer) individualContainer.style.display = 'none';
        
        // 선택된 가입물건에 맞는 플랜만 표시
        updateUnifiedPlanDisplay();
    } else {
        // 개별 모드: 기존 가입물건 선택 숨기기
        if (droneTypeSection) droneTypeSection.style.display = 'none';
        if (unifiedContainer) unifiedContainer.style.display = 'none';
        if (individualContainer) individualContainer.style.display = 'block';
        
        generateIndividualDroneSections();
    }
    
    // 모드 전환 시 폼 유효성 검사
    if (typeof checkFormValidity === 'function') {
        checkFormValidity();
    }
};

// 통합 모드에서 선택된 가입물건의 플랜만 표시
function updateUnifiedPlanDisplay() {
    const selectedDroneType = document.querySelector('input[name="drone_type"]:checked');
    const allPlanCategories = document.querySelectorAll('#unifiedPlanContainer .plan-category');
    
    allPlanCategories.forEach(category => {
        category.style.display = 'none';
    });
    
    if (selectedDroneType) {
        const droneType = selectedDroneType.value;
        const matchingCategory = document.querySelector(`#${droneType}DronePlans`);
        if (matchingCategory) {
            matchingCategory.style.display = 'block';
        }
    }
}

// 드론별 개별 가입물건 + 플랜 섹션 생성
function generateIndividualDroneSections() {
    const container = document.getElementById('individualPlanContainer');
    const droneCount = parseInt(document.getElementById('droneCount').value) || 1;
    
    container.innerHTML = '';
    
    for (let i = 0; i < droneCount; i++) {
        const section = createIndividualDroneSection(i);
        container.appendChild(section);
    }
}

// 개별 드론 섹션 생성 (가입물건 + 플랜)
function createIndividualDroneSection(index) {
    const section = document.createElement('div');
    section.className = 'individual-drone-section';
    section.style.cssText = 'margin-bottom: 3rem; padding: 2rem; background: #ffffff; border: 3px solid #FFB800; border-radius: 15px;';
    
    section.innerHTML = `
        <h3 style="color: #FFB800; margin-bottom: 1.5rem; font-size: 1.5rem; font-weight: 700;">
            드론 ${index + 1} 가입물건 & 플랜 선택
        </h3>
        
        <!-- 가입물건 선택 -->
        <div style="margin-bottom: 2rem;">
            <h4 style="color: #1a1a1a; margin-bottom: 1rem; font-size: 1.2rem;">가입물건 선택</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                <label class="drone-type-option" style="padding: 1rem; border: 2px solid #e0e0e0; border-radius: 10px; cursor: pointer; text-align: center; transition: all 0.3s;">
                    <input type="radio" name="drone_type_${index}" value="camera" onchange="updateIndividualDronePlans(${index})" style="display: none;">
                    <div style="font-size: 2rem;">📷</div>
                    <div style="font-size: 0.9rem; margin-top: 0.5rem;">촬영용 센서드론</div>
                </label>
                <label class="drone-type-option" style="padding: 1rem; border: 2px solid #e0e0e0; border-radius: 10px; cursor: pointer; text-align: center; transition: all 0.3s;">
                    <input type="radio" name="drone_type_${index}" value="fpv" onchange="updateIndividualDronePlans(${index})" style="display: none;">
                    <div style="font-size: 2rem;">🎮</div>
                    <div style="font-size: 0.9rem; margin-top: 0.5rem;">FPV/레이싱 드론</div>
                </label>
                <label class="drone-type-option" style="padding: 1rem; border: 2px solid #e0e0e0; border-radius: 10px; cursor: pointer; text-align: center; transition: all 0.3s;">
                    <input type="radio" name="drone_type_${index}" value="toy" onchange="updateIndividualDronePlans(${index})" style="display: none;">
                    <div style="font-size: 2rem;">🎯</div>
                    <div style="font-size: 0.9rem; margin-top: 0.5rem;">완구형 드론</div>
                </label>
                <label class="drone-type-option" style="padding: 1rem; border: 2px solid #e0e0e0; border-radius: 10px; cursor: pointer; text-align: center; transition: all 0.3s;">
                    <input type="radio" name="drone_type_${index}" value="other" onchange="updateIndividualDronePlans(${index})" style="display: none;">
                    <div style="font-size: 2rem;">🚁</div>
                    <div style="font-size: 0.9rem; margin-top: 0.5rem;">기타</div>
                </label>
            </div>
        </div>
        
        <!-- 플랜 선택 영역 -->
        <div id="drone_${index}_plans" style="display: none;">
            <h4 style="color: #1a1a1a; margin-bottom: 1rem; font-size: 1.2rem;">보험 플랜 선택</h4>
            <div id="drone_${index}_plan_grid"></div>
        </div>
    `;
    
    // 가입물건 선택 시 스타일 변경
    const droneTypeOptions = section.querySelectorAll('.drone-type-option');
    droneTypeOptions.forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        option.addEventListener('click', function() {
            droneTypeOptions.forEach(opt => {
                opt.style.border = '2px solid #e0e0e0';
                opt.style.background = '#fff';
            });
            this.style.border = '3px solid #FFB800';
            this.style.background = '#fff9e6';
            radio.checked = true;
            radio.dispatchEvent(new Event('change'));
        });
    });
    
    return section;
}

// 드론별 플랜 업데이트
window.updateIndividualDronePlans = function(droneIndex) {
    const selectedType = document.querySelector(`input[name="drone_type_${droneIndex}"]:checked`);
    if (!selectedType) return;
    
    const droneType = selectedType.value;
    const planData = PLAN_DATA[droneType];
    const plansContainer = document.getElementById(`drone_${droneIndex}_plans`);
    const planGrid = document.getElementById(`drone_${droneIndex}_plan_grid`);
    
    if (!planData || !plansContainer || !planGrid) return;
    
    plansContainer.style.display = 'block';
    
    const plansHTML = planData.plans.map(plan => `
        <label class="individual-plan-card" data-drone="${droneIndex}" data-plan="${plan.value}" style="position: relative; padding: 1.5rem; border: 2px solid #e0e0e0; border-radius: 12px; cursor: pointer; transition: all 0.3s; background: #fff;">
            <input type="radio" name="plan_drone_${droneIndex}" value="${plan.value}" data-price="${plan.price}" data-plan-name="${plan.name}" onchange="updatePlanCardSelection(${droneIndex})" style="display: none;">
            <div style="text-align: center; margin-bottom: 1rem;">
                <div style="font-size: 1.3rem; font-weight: 700; color: #1a1a1a; margin-bottom: 0.5rem;">${plan.name}</div>
                <div style="font-size: 1.5rem; font-weight: 900; color: #FFB800;">${plan.price.toLocaleString()}<span style="font-size: 0.9rem; font-weight: 500;">원/년</span></div>
            </div>
            <div style="text-align: left; font-size: 0.9rem; color: #666;">
                ${plan.coverage.map(item => `<div style="margin: 0.3rem 0;">• ${item}</div>`).join('')}
            </div>
        </label>
    `).join('');
    
    planGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;';
    planGrid.innerHTML = plansHTML;
    
    // 플랜 카드 클릭 이벤트
    const planCards = planGrid.querySelectorAll('.individual-plan-card');
    planCards.forEach(card => {
        card.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            planCards.forEach(c => {
                c.style.border = '2px solid #e0e0e0';
                c.style.background = '#fff';
                c.style.transform = 'scale(1)';
            });
            this.style.border = '3px solid #FFB800';
            this.style.background = '#fff9e6';
            this.style.transform = 'scale(1.02)';
            radio.checked = true;
            radio.dispatchEvent(new Event('change'));
        });
    });
    
    // 가입물건 선택 시 폼 유효성 검사
    if (typeof checkFormValidity === 'function') {
        checkFormValidity();
    }
};

// 플랜 카드 선택 상태 업데이트
window.updatePlanCardSelection = function(droneIndex) {
    console.log(`드론 ${droneIndex + 1} 플랜 선택됨`);
    updateTotalPrice();
    
    // 폼 유효성 검사 (버튼 활성화)
    if (typeof checkFormValidity === 'function') {
        checkFormValidity();
    }
};

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
    
    console.log('총 보험료:', totalPrice.toLocaleString() + '원');
};

// 폼 데이터 수집
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
        
        const selectedDroneType = document.querySelector('input[name="drone_type"]:checked');
        if (!selectedDroneType) {
            alert('가입물건(드론 종류)을 선택해주세요.');
            return null;
        }
        
        const planName = selectedPlan.closest('.plan-card').querySelector('.plan-name').textContent;
        const price = parseInt(selectedPlan.getAttribute('data-price'));
        
        for (let i = 0; i < droneCount; i++) {
            data.drone_plans.push({
                drone_index: i,
                drone_type: selectedDroneType.value,
                drone_type_name: DRONE_TYPE_NAMES[selectedDroneType.value],
                plan: selectedPlan.value,
                plan_name: planName,
                price: price
            });
        }
        totalPrice = price * droneCount;
        
        data.drone_type = selectedDroneType.value;
        data.plan = selectedPlan.value;
        data.plan_name = planName;
        data.plan_price_per_drone = price;
    } else {
        for (let i = 0; i < droneCount; i++) {
            const selectedDroneType = document.querySelector(`input[name="drone_type_${i}"]:checked`);
            const selectedPlan = document.querySelector(`input[name="plan_drone_${i}"]:checked`);
            
            if (!selectedDroneType) {
                alert(`드론 ${i + 1}의 가입물건을 선택해주세요.`);
                return null;
            }
            
            if (!selectedPlan) {
                alert(`드론 ${i + 1}의 플랜을 선택해주세요.`);
                return null;
            }
            
            const droneType = selectedDroneType.value;
            const planName = selectedPlan.getAttribute('data-plan-name');
            const price = parseInt(selectedPlan.getAttribute('data-price'));
            
            data.drone_plans.push({
                drone_index: i,
                drone_type: droneType,
                drone_type_name: DRONE_TYPE_NAMES[droneType],
                plan: selectedPlan.value,
                plan_name: planName,
                price: price
            });
            totalPrice += price;
        }
    }
    
    data.plan_total_price = totalPrice;
    data.drone_count = droneCount;
    
    return data;
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initIndividualPlans();
    
    // 통합 모드에서 가입물건 변경 시 플랜 업데이트
    document.querySelectorAll('input[name="drone_type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const mode = document.querySelector('input[name="plan_selection_type"]:checked')?.value;
            if (mode === 'unified') {
                updateUnifiedPlanDisplay();
            }
        });
    });
});
