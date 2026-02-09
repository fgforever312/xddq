// 洗炼路径应用
class WashPathApp {
    constructor() {
        this.calculator = new WashPathCalculator();
        this.currentModalType = null; // 'initial' or 'target'
        this.currentModalIndex = null;
        this.pathInitialTraits = [null, null, null, null];
        this.pathTargetTraits = [null, null, null, null];
        this.init();
    }

    init() {
        this.populateTypeDropdowns();
        this.bindPathEvents();
        this.bindModalEvents();
        this.populatePathInitialBoxes();
        this.populatePathTargetBoxes();
    }

    // 填充类型下拉菜单
    populateTypeDropdowns() {
        const modalTypeSelect = document.getElementById('pathModalType');
        if (!modalTypeSelect) return;

        TRAIT_TYPES.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            modalTypeSelect.appendChild(option);
        });
    }

    // 绑定洗炼路径页面事件
    bindPathEvents() {
        // 初始词条点击事件
        for (let i = 0; i < 4; i++) {
            const box = document.getElementById(`path-initial-${i}`);
            box.addEventListener('click', () => this.openPathModal('initial', i));
        }

        // 目标词条点击事件
        for (let i = 0; i < 4; i++) {
            const box = document.getElementById(`path-target-${i}`);
            box.addEventListener('click', () => this.openPathModal('target', i));
        }

        // 计算按钮
        document.getElementById('pathCalcBtn').addEventListener('click', () => this.calculatePath());
    }

    // 绑定弹窗事件
    bindModalEvents() {
        const modalCancel = document.getElementById('pathModalCancel');
        const modalConfirm = document.getElementById('pathModalConfirm');
        const modal = document.getElementById('pathModal');

        if (modalCancel) {
            modalCancel.addEventListener('click', () => this.closePathModal());
        }

        if (modalConfirm) {
            modalConfirm.addEventListener('click', () => this.confirmPathModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'pathModal') {
                    this.closePathModal();
                }
            });
        }
    }

    // 填充初始词条框
    populatePathInitialBoxes() {
        for (let i = 0; i < 4; i++) {
            this.updatePathInitialBox(i);
        }
    }

    // 更新初始词条框
    updatePathInitialBox(index) {
        const box = document.getElementById(`path-initial-${index}`);
        const trait = this.pathInitialTraits[index];

        if (!trait) {
            box.innerHTML = '<div class="stat-name">+</div>';
            box.className = 'stat-box path-initial-box';
        } else {
            const { name, quality } = trait.getDisplayInfo();
            box.innerHTML = `<div class="stat-name">${name}</div><button class="prob-clear-btn" id="path-clear-initial-${index}">×</button>`;
            box.className = 'stat-box path-initial-box';

            if (quality === QUALITY.GOLD) {
                box.classList.add('quality-gold');
            } else if (quality === QUALITY.PURPLE) {
                box.classList.add('quality-purple');
            } else {
                box.classList.add('quality-blue');
            }

            // 绑定清除按钮事件
            const clearBtn = document.getElementById(`path-clear-initial-${index}`);
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearPathInitialTrait(index);
            });
        }
    }

    // 清除初始词条
    clearPathInitialTrait(index) {
        this.pathInitialTraits[index] = null;
        this.updatePathInitialBox(index);
    }

    // 填充目标词条框
    populatePathTargetBoxes() {
        for (let i = 0; i < 4; i++) {
            this.updatePathTargetBox(i);
        }
    }

    // 更新目标词条框
    updatePathTargetBox(index) {
        const box = document.getElementById(`path-target-${index}`);
        const trait = this.pathTargetTraits[index];

        if (!trait) {
            box.innerHTML = '<div class="stat-name">+</div>';
            box.className = 'stat-box path-target-box';
        } else {
            const { name, quality } = trait.getDisplayInfo();
            box.innerHTML = `<div class="stat-name">${name}</div><button class="prob-clear-btn" id="path-clear-target-${index}">×</button>`;
            box.className = 'stat-box path-target-box';

            if (quality === QUALITY.GOLD) {
                box.classList.add('quality-gold');
            } else if (quality === QUALITY.PURPLE) {
                box.classList.add('quality-purple');
            } else {
                box.classList.add('quality-blue');
            }

            // 绑定清除按钮事件
            const clearBtn = document.getElementById(`path-clear-target-${index}`);
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearPathTargetTrait(index);
            });
        }
    }

    // 清除目标词条
    clearPathTargetTrait(index) {
        this.pathTargetTraits[index] = null;
        this.updatePathTargetBox(index);
    }

    // 打开弹窗
    openPathModal(type, index) {
        this.currentModalType = type;
        this.currentModalIndex = index;

        const modal = document.getElementById('pathModal');
        const typeSelect = document.getElementById('pathModalType');
        const qualitySelect = document.getElementById('pathModalQuality');

        // 重置选择
        typeSelect.value = '';
        qualitySelect.value = '';

        // 如果是编辑模式，填充当前值
        if (type === 'initial') {
            const trait = this.pathInitialTraits[index];
            if (trait) {
                typeSelect.value = trait.type;
                qualitySelect.value = trait.quality.key;
            }
        } else {
            const trait = this.pathTargetTraits[index];
            if (trait) {
                typeSelect.value = trait.type;
                qualitySelect.value = trait.quality.key;
            }
        }

        modal.classList.add('active');
    }

    // 关闭弹窗
    closePathModal() {
        const modal = document.getElementById('pathModal');
        modal.classList.remove('active');
        this.currentModalType = null;
        this.currentModalIndex = null;
    }

    // 确认弹窗
    confirmPathModal() {
        const typeSelect = document.getElementById('pathModalType');
        const qualitySelect = document.getElementById('pathModalQuality');

        const type = typeSelect.value;
        const qualityKey = qualitySelect.value;

        if (!type || !qualityKey) {
            this.showToast('请选择词条类型和品质');
            return;
        }

        const trait = new Trait(type, QUALITY[qualityKey]);

        // 检查重复
        if (this.currentModalType === 'initial') {
            for (let i = 0; i < 4; i++) {
                if (i !== this.currentModalIndex && this.pathInitialTraits[i]) {
                    if (this.pathInitialTraits[i].getId() === trait.getId()) {
                        this.showToast('该词条已存在，请选择其他词条');
                        return;
                    }
                }
            }
            this.pathInitialTraits[this.currentModalIndex] = trait;
            this.updatePathInitialBox(this.currentModalIndex);
        } else {
            for (let i = 0; i < 4; i++) {
                if (i !== this.currentModalIndex && this.pathTargetTraits[i]) {
                    if (this.pathTargetTraits[i].getId() === trait.getId()) {
                        this.showToast('该目标词条已存在，请选择其他词条');
                        return;
                    }
                }
            }
            this.pathTargetTraits[this.currentModalIndex] = trait;
            this.updatePathTargetBox(this.currentModalIndex);
        }

        this.closePathModal();
    }

    // 计算最佳路径
    calculatePath() {
        const result = this.calculator.calculateOptimalPath(
            this.pathInitialTraits,
            this.pathTargetTraits
        );

        if (!result) {
            this.showToast('请至少添加一个目标词条');
            return;
        }

        this.displayPathResult(result);
    }

    // 显示路径结果
    displayPathResult(result) {
        const resultDiv = document.getElementById('pathResult');
        const resultContent = document.getElementById('pathResultContent');

        // 如果没有有效步骤，显示提示信息
        if (!result.steps || result.steps.length === 0) {
            resultContent.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: rgba(255,255,255,0.6);">
                    <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
                    <div style="font-size: 16px; margin-bottom: 8px;">无法找到有效的洗炼路径</div>
                    <div style="font-size: 14px;">目标词条可能已被初始词条占用，或者无法通过洗炼达成</div>
                </div>
            `;
            resultDiv.style.display = 'block';
            return;
        }

        let html = '';

        // 显示每个步骤
        result.steps.forEach(step => {
            // 锁定的词条使用样式框
            const lockedBoxes = step.lockedTraits.map(t => {
                const info = t.getDisplayInfo();
                let qualityClass = 'quality-blue';
                if (info.quality === QUALITY.GOLD) {
                    qualityClass = 'quality-gold';
                } else if (info.quality === QUALITY.PURPLE) {
                    qualityClass = 'quality-purple';
                }
                return `<div class="stat-box path-step-trait-box ${qualityClass}"><div class="stat-name">${info.name}</div></div>`;
            }).join('');

            // 目标词条使用样式框
            const targetInfo = step.target.getDisplayInfo();
            let targetQualityClass = 'quality-blue';
            if (targetInfo.quality === QUALITY.GOLD) {
                targetQualityClass = 'quality-gold';
            } else if (targetInfo.quality === QUALITY.PURPLE) {
                targetQualityClass = 'quality-purple';
            }
            const targetBox = `<div class="stat-box path-step-trait-box ${targetQualityClass}"><div class="stat-name">${targetInfo.name}</div></div>`;

            html += `
                <div class="path-step">
                    <div class="path-step-header">
                        <span class="path-step-number">步骤 ${step.stepNumber}</span>
                        <span class="path-step-prob">${(step.probability * 100).toFixed(4)}%</span>
                    </div>
                    <div class="path-step-content">
                        <div class="path-step-locked">
                            <div class="path-step-label">已锁定</div>
                            <div class="path-step-traits">${lockedBoxes || '<span class="path-step-empty">无</span>'}</div>
                        </div>
                        <div class="path-step-target">
                            <div class="path-step-label">目标</div>
                            <div class="path-step-traits">${targetBox}</div>
                        </div>
                    </div>
                    <div class="path-step-materials">
                        <div class="path-step-material">
                            <span class="path-step-material-icon">💎</span>
                            <span>洗炼石：</span>
                            <span class="path-step-material-value">${step.washStone}</span>
                        </div>
                        <div class="path-step-material">
                            <span class="path-step-material-icon">🪨</span>
                            <span>不化岩：</span>
                            <span class="path-step-material-value">${step.lockStone}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        // 显示总消耗
        html += `
            <div class="path-total">
                <div class="path-total-label">预计总材料消耗（期望值）</div>
                <div class="path-total-materials">
                    <div class="path-total-material">
                        <span class="path-total-material-icon">💎</span>
                        <span class="path-total-material-value">${result.totalWashStone}</span>
                    </div>
                    <div class="path-total-material">
                        <span class="path-total-material-icon">🪨</span>
                        <span class="path-total-material-value">${result.totalLockStone}</span>
                    </div>
                </div>
            </div>
        `;

        resultContent.innerHTML = html;
        resultDiv.style.display = 'block';
    }

    // 显示 Toast 提示
    showToast(message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 3000);
    }
}
