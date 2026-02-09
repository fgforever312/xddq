// 概率计算应用
class ProbabilityApp {
    constructor() {
        this.calculator = new TraitProbabilityCalculator();
        this.currentModalType = null; // 'initial' or 'target'
        this.currentModalIndex = null;
        this.probInitialTraits = [null, null, null, null];
        this.probLockedSlots = [false, false, false, false];
        this.targetTraits = [null, null, null, null];
        this.init();
    }

    init() {
        this.populateTypeDropdowns();
        this.bindTabEvents();
        this.bindProbabilityEvents();
        this.bindModalEvents();
        this.populateProbInitialBoxes();
        this.populateProbTargetBoxes();
    }

    // 显示 Toast 提示
    showToast(message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);

        // 3秒后移除 DOM 元素
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 3000);
    }

    // 填充类型下拉菜单
    populateTypeDropdowns() {
        const modalTypeSelect = document.getElementById('probModalType');
        TRAIT_TYPES.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            modalTypeSelect.appendChild(option);
        });
    }

    // 绑定弹窗事件
    bindModalEvents() {
        document.getElementById('probModalCancel').addEventListener('click', () => {
            this.closeProbModal();
        });

        document.getElementById('probModalConfirm').addEventListener('click', () => {
            this.confirmProbModal();
        });

        // 点击背景关闭弹窗
        document.getElementById('probModal').addEventListener('click', (e) => {
            if (e.target.id === 'probModal') {
                this.closeProbModal();
            }
        });
    }

    // 绑定标签切换事件
    bindTabEvents() {
        const tabBtns = document.querySelectorAll('.tab-btn');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;

                // 更新标签状态
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 隐藏所有页面
                document.getElementById('selectionMode').style.display = 'none';
                document.getElementById('washMode').style.display = 'none';
                document.getElementById('washButtons').style.display = 'none';
                document.getElementById('probabilityPage').style.display = 'none';

                const washPathPage = document.getElementById('washPathPage');
                if (washPathPage) {
                    washPathPage.style.display = 'none';
                }

                // 切换到对应页面
                if (tabName === 'wash') {
                    document.getElementById('selectionMode').style.display = 'block';
                } else if (tabName === 'probability') {
                    document.getElementById('probabilityPage').style.display = 'block';
                } else if (tabName === 'washpath' && washPathPage) {
                    washPathPage.style.display = 'block';
                }
            });
        });
    }

    // 绑定概率计算页面事件
    bindProbabilityEvents() {
        // 初始词条点击事件
        for (let i = 0; i < 4; i++) {
            const box = document.getElementById(`prob-initial-${i}`);
            box.addEventListener('click', () => this.openProbModal('initial', i));
        }

        // 目标词条点击事件
        for (let i = 0; i < 4; i++) {
            const box = document.getElementById(`prob-target-${i}`);
            box.addEventListener('click', () => {
                // 如果该槽位被锁定，不允许修改
                if (this.probLockedSlots[i] && this.probInitialTraits[i]) {
                    return;
                }
                this.openProbModal('target', i);
            });
        }

        // 锁定按钮事件
        for (let i = 0; i < 4; i++) {
            const lockBtn = document.getElementById(`prob-lock-${i}`);
            lockBtn.addEventListener('click', () => this.toggleProbLock(i));
        }

        // 计算按钮
        document.getElementById('probCalcBtn').addEventListener('click', () => this.calculateProbability());
    }

    // 填充初始词条框
    populateProbInitialBoxes() {
        for (let i = 0; i < 4; i++) {
            this.updateProbInitialBox(i);
        }
        this.updateProbLockButtons();
    }

    // 填充目标词条框
    populateProbTargetBoxes() {
        for (let i = 0; i < 4; i++) {
            this.updateProbTargetBox(i);
        }
    }

    // 更新目标词条框
    updateProbTargetBox(index) {
        const box = document.getElementById(`prob-target-${index}`);
        const isLocked = this.probLockedSlots[index] && this.probInitialTraits[index];
        const trait = this.targetTraits[index];

        // 如果该槽位被锁定，显示锁定的词条
        if (isLocked) {
            const lockedTrait = this.probInitialTraits[index];
            const { name, quality } = lockedTrait.getDisplayInfo();
            box.innerHTML = `<div class="stat-name">${name}</div>`;
            box.className = 'stat-box prob-target-box locked-slot';

            if (quality === QUALITY.GOLD) {
                box.classList.add('quality-gold');
            } else if (quality === QUALITY.PURPLE) {
                box.classList.add('quality-purple');
            } else {
                box.classList.add('quality-blue');
            }
        } else if (trait) {
            const { name, quality } = trait.getDisplayInfo();
            box.innerHTML = `<div class="stat-name">${name}</div><button class="prob-clear-btn" id="prob-clear-target-${index}">×</button>`;
            box.className = 'stat-box prob-target-box';

            if (quality === QUALITY.GOLD) {
                box.classList.add('quality-gold');
            } else if (quality === QUALITY.PURPLE) {
                box.classList.add('quality-purple');
            } else {
                box.classList.add('quality-blue');
            }

            // 绑定清除按钮事件
            const clearBtn = document.getElementById(`prob-clear-target-${index}`);
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearProbTargetTrait(index);
            });
        } else {
            box.innerHTML = '<div class="stat-name">+</div>';
            box.className = 'stat-box prob-target-box prob-target-click';
        }
    }

    // 更新初始词条框
    updateProbInitialBox(index) {
        const box = document.getElementById(`prob-initial-${index}`);
        const trait = this.probInitialTraits[index];

        if (!trait) {
            box.innerHTML = '<div class="stat-name">+</div>';
            box.className = 'stat-box prob-initial-box';
        } else {
            const { name, quality } = trait.getDisplayInfo();
            box.innerHTML = `<div class="stat-name">${name}</div><button class="prob-clear-btn" id="prob-clear-initial-${index}">×</button>`;
            box.className = 'stat-box prob-initial-box';

            if (quality === QUALITY.GOLD) {
                box.classList.add('quality-gold');
            } else if (quality === QUALITY.PURPLE) {
                box.classList.add('quality-purple');
            } else {
                box.classList.add('quality-blue');
            }

            // 绑定清除按钮事件
            const clearBtn = document.getElementById(`prob-clear-initial-${index}`);
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearProbInitialTrait(index);
            });
        }
    }

    // 清除初始词条
    clearProbInitialTrait(index) {
        if (this.probLockedSlots[index]) {
            // 如果已锁定，先解锁
            this.probLockedSlots[index] = false;
            this.targetTraits[index] = null;
        }
        this.probInitialTraits[index] = null;
        this.updateProbInitialBox(index);
        this.updateProbLockButtons();
        this.populateProbTargetBoxes();
    }

    // 清除目标词条
    clearProbTargetTrait(index) {
        this.targetTraits[index] = null;
        this.updateProbTargetBox(index);
    }

    // 打开选择弹窗
    openProbModal(type, index) {
        this.currentModalType = type;
        this.currentModalIndex = index;
        const modal = document.getElementById('probModal');

        // 重置选择
        document.getElementById('probModalType').value = '';
        document.getElementById('probModalQuality').value = '';

        modal.classList.add('active');
    }

    // 关闭弹窗
    closeProbModal() {
        const modal = document.getElementById('probModal');
        modal.classList.remove('active');
        this.currentModalType = null;
        this.currentModalIndex = null;
    }

    // 确认选择词条
    confirmProbModal() {
        const typeSelect = document.getElementById('probModalType');
        const qualitySelect = document.getElementById('probModalQuality');

        const type = typeSelect.value;
        const quality = QUALITY[qualitySelect.value];

        if (!type || !quality) {
            this.showToast('请选择词条类型和品质');
            return;
        }

        const trait = new Trait(type, quality);

        if (this.currentModalType === 'initial') {
            // 初始词条模式
            // 检查是否重复
            for (let i = 0; i < 4; i++) {
                if (i !== this.currentModalIndex && this.probInitialTraits[i]) {
                    if (this.probInitialTraits[i].getId() === trait.getId()) {
                        this.showToast('该词条已存在，请选择其他词条');
                        return;
                    }
                }
            }

            this.probInitialTraits[this.currentModalIndex] = trait;
            this.updateProbInitialBox(this.currentModalIndex);
            this.updateProbLockButtons(); // 添加这行来更新锁定按钮状态
        } else {
            // 目标词条模式
            // 检查是否重复
            for (let i = 0; i < 4; i++) {
                if (i !== this.currentModalIndex && this.targetTraits[i]) {
                    if (this.targetTraits[i].getId() === trait.getId()) {
                        this.showToast('该目标词条已存在，请选择其他词条');
                        return;
                    }
                }
            }

            this.targetTraits[this.currentModalIndex] = trait;
            this.updateProbTargetBox(this.currentModalIndex);
        }

        this.closeProbModal();
    }

    // 切换锁定状态
    toggleProbLock(index) {
        if (!this.probInitialTraits[index]) {
            return; // 没有词条时不能锁定
        }

        const lockedCount = this.probLockedSlots.filter(l => l).length;

        if (lockedCount >= 3 && !this.probLockedSlots[index]) {
            this.showToast('最多只能锁定3个词条');
            return;
        }

        this.probLockedSlots[index] = !this.probLockedSlots[index];

        // 如果锁定，将锁定的词条添加到目标词条中
        if (this.probLockedSlots[index]) {
            this.targetTraits[index] = this.probInitialTraits[index];
        } else {
            // 如果解锁，清除该目标词条
            this.targetTraits[index] = null;
        }

        this.updateProbLockButtons();
        this.populateProbTargetBoxes();
    }

    // 更新锁定按钮状态
    updateProbLockButtons() {
        for (let i = 0; i < 4; i++) {
            const lockBtn = document.getElementById(`prob-lock-${i}`);

            if (!this.probInitialTraits[i]) {
                lockBtn.disabled = true;
                lockBtn.classList.remove('locked');
            } else {
                const lockedCount = this.probLockedSlots.filter(l => l).length;

                if (lockedCount >= 3 && !this.probLockedSlots[i]) {
                    lockBtn.disabled = true;
                } else {
                    lockBtn.disabled = false;
                }

                if (this.probLockedSlots[i]) {
                    lockBtn.classList.add('locked');
                    lockBtn.textContent = '🔒';
                } else {
                    lockBtn.classList.remove('locked');
                    lockBtn.textContent = '🔓';
                }
            }
        }
    }

    // 计算概率
    calculateProbability() {
        // 收集有效目标词条
        const validTargets = [];

        for (let i = 0; i < 4; i++) {
            if (this.targetTraits[i]) {
                validTargets.push(this.targetTraits[i]);
            }
        }

        if (validTargets.length === 0) {
            this.showToast('请至少添加一个目标词条');
            return;
        }

        // 计算概率
        const result = this.calculator.calculateProbability(
            this.probInitialTraits,
            this.probLockedSlots,
            validTargets
        );

        // 解析概率百分比，转换为小数
        const probabilityStr = result.formula;
        const probability = parseFloat(probabilityStr) / 100;

        // 计算预期洗炼次数
        const expectedAttempts = Math.ceil(1 / probability);

        // 计算锁定数量
        const lockedCount = this.probLockedSlots.filter(l => l).length;

        // 计算每次洗炼的材料消耗
        let lockStoneCost = 0;
        if (lockedCount === 1) {
            lockStoneCost = 20;
        } else if (lockedCount === 2) {
            lockStoneCost = 40;
        } else if (lockedCount === 3) {
            lockStoneCost = 100;
        }

        // 计算总材料消耗
        const totalWashStone = expectedAttempts * 20;
        const totalLockStone = expectedAttempts * lockStoneCost;

        // 显示结果
        const resultDiv = document.getElementById('probResult');
        const resultValue = document.getElementById('probResultValue');

        resultValue.innerHTML = `
            <div style="margin-bottom: 12px;">
                <span style="color: rgba(255,255,255,0.7);">计算结果:</span>
                <span style="color: #ffd700; font-weight: bold; margin-left: 10px;">${result.formula}</span>
            </div>
            <div style="margin-bottom: 12px;">
                <span style="color: rgba(255,255,255,0.7);">模拟结果:</span>
                <span style="color: #87ceeb; font-weight: bold; margin-left: 10px;">${result.simulation}</span>
            </div>
            <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; margin-top: 12px;">
                <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 8px;">预计材料消耗（期望值）</div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 6px;">
                    <span style="font-size: 18px;">💎</span>
                    <span style="color: rgba(255,255,255,0.7); font-size: 14px;">洗炼石:</span>
                    <span style="color: #ffd700; font-weight: bold; font-size: 16px;">${totalWashStone}</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <span style="font-size: 18px;">🪨</span>
                    <span style="color: rgba(255,255,255,0.7); font-size: 14px;">不化岩:</span>
                    <span style="color: #ffd700; font-weight: bold; font-size: 16px;">${totalLockStone}</span>
                </div>
            </div>
        `;
        resultDiv.style.display = 'block';
    }
}

// 全局变量，用于在HTML中调用
let probApp;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    probApp = new ProbabilityApp();
});
