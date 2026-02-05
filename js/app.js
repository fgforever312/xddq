// 应用程序主逻辑
class App {
    constructor() {
        this.washer = new TraitWasher();
        this.isWashing = false;
        this.isSelectionMode = true;
        this.init();
    }

    // 初始化应用
    init() {
        this.populateTypeDropdowns();
        this.bindEvents();
        this.displayInitialStats();
        this.updateButtons();
        this.updateUI();
    }

    // 填充类型下拉菜单
    populateTypeDropdowns() {
        for (let i = 0; i < 4; i++) {
            const typeSelect = document.getElementById(`type-${i}`);
            TRAIT_TYPES.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                typeSelect.appendChild(option);
            });
        }
    }

    // 更新界面模式
    updateUI() {
        const selectionMode = document.getElementById('selectionMode');
        const washMode = document.getElementById('washMode');
        const washButtons = document.getElementById('washButtons');
        const resetBtn = document.getElementById('resetBtn');
        const statsSummary = document.getElementById('statsSummary');

        if (this.isSelectionMode) {
            selectionMode.style.display = 'block';
            washMode.style.display = 'none';
            washButtons.style.display = 'none';
            resetBtn.style.display = 'none';
            statsSummary.style.display = 'none';
        } else {
            selectionMode.style.display = 'none';
            washMode.style.display = 'block';
            washButtons.style.display = 'flex';
            resetBtn.style.display = 'inline-block';
            statsSummary.style.display = 'block';
        }
    }

    // 验证词条选择
    validateSelection() {
        for (let i = 0; i < 4; i++) {
            const typeSelect = document.getElementById(`type-${i}`);
            const qualitySelect = document.getElementById(`quality-${i}`);

            if (!typeSelect.value || !qualitySelect.value) {
                return false;
            }
        }
        return true;
    }

    // 检查词条是否重复
    hasDuplicateTraits() {
        const selected = [];
        for (let i = 0; i < 4; i++) {
            const typeSelect = document.getElementById(`type-${i}`);
            const qualitySelect = document.getElementById(`quality-${i}`);

            if (typeSelect.value && qualitySelect.value) {
                const traitId = `${typeSelect.value}-${qualitySelect.value}`;
                if (selected.includes(traitId)) {
                    return true;
                }
                selected.push(traitId);
            }
        }
        return false;
    }

    // 更新开始按钮状态
    updateStartButton() {
        const startBtn = document.getElementById('startBtn');
        const isValid = this.validateSelection();
        const hasDuplicates = this.hasDuplicateTraits();

        startBtn.disabled = !isValid || hasDuplicates;

        if (hasDuplicates && isValid) {
            startBtn.textContent = '词条不能重复';
        } else {
            startBtn.textContent = '开始洗炼';
        }
    }

    // 处理词条选择变化
    handleSelectionChange() {
        this.updateStartButton();
    }

    // 处理开始洗炼
    handleStart() {
        if (!this.validateSelection() || this.hasDuplicateTraits()) {
            return;
        }

        // 创建初始词条
        const traits = [];
        for (let i = 0; i < 4; i++) {
            const typeSelect = document.getElementById(`type-${i}`);
            const qualitySelect = document.getElementById(`quality-${i}`);

            const type = typeSelect.value;
            const quality = QUALITY[qualitySelect.value];

            const trait = new Trait(type, quality);
            traits.push(trait);
        }

        // 设置当前词条
        this.washer.setCurrentTraits(traits);

        // 切换到洗炼模式
        this.isSelectionMode = false;
        this.displayTraits(traits, 'original');
        this.updateButtons();
        this.updateLockButtons();
        this.updateCostDisplay();
        this.updateStatsDisplay();
        this.updateUI();
    }

    // 处理重新选择
    handleReset() {
        // 重置所有状态
        this.washer.reset();
        this.isSelectionMode = true;

        // 清空选择
        for (let i = 0; i < 4; i++) {
            const typeSelect = document.getElementById(`type-${i}`);
            const qualitySelect = document.getElementById(`quality-${i}`);
            typeSelect.value = '';
            qualitySelect.value = '';
        }

        // 清空词条显示
        for (let i = 0; i < 4; i++) {
            this.updateStatBox('original', i, null);
            this.updateStatBox('new', i, null);
        }

        // 重置按钮文本
        const washBtn = document.getElementById('washBtn');
        washBtn.textContent = '洗炼';

        // 更新界面
        this.updateUI();
        this.updateStartButton();
    }

    // 更新按钮状态
    updateButtons() {
        const cancelBtn = document.getElementById('cancelBtn');
        const current = this.washer.getCurrentTraits();
        const newTraits = this.washer.getNewTraits();

        if (current.length === 0 && newTraits.length === 0) {
            // 上下栏均为空，取消按钮不可点击
            cancelBtn.disabled = true;
            cancelBtn.textContent = '取消';
        } else if (current.length > 0 && newTraits.length === 0) {
            // 上栏有词条，下栏没有，显示"清空"
            cancelBtn.disabled = false;
            cancelBtn.textContent = '清空';
        } else {
            // 下栏有词条，显示"取消"
            cancelBtn.disabled = false;
            cancelBtn.textContent = '取消';
        }
    }

    // 更新锁定按钮状态
    updateLockButtons() {
        const lockState = this.washer.getLockState();
        const current = this.washer.getCurrentTraits();
        const lockedCount = lockState.filter(l => l).length;

        for (let i = 0; i < 4; i++) {
            const lockBtn = document.getElementById(`lock-${i}`);

            // 只有当有词条时才能锁定
            if (current.length === 0 || !current[i]) {
                lockBtn.disabled = true;
                lockBtn.classList.remove('locked');
            } else {
                // 如果已锁定3个且当前未锁定，则禁用（不能锁定4个）
                if (lockedCount >= 3 && !lockState[i]) {
                    lockBtn.disabled = true;
                } else {
                    lockBtn.disabled = false;
                }

                if (lockState[i]) {
                    lockBtn.classList.add('locked');
                    lockBtn.textContent = '🔒';
                } else {
                    lockBtn.classList.remove('locked');
                    lockBtn.textContent = '🔓';
                }
            }
        }
    }

    // 更新材料消耗显示
    updateCostDisplay() {
        const washStoneEl = document.getElementById('washStone');
        const lockStoneEl = document.getElementById('lockStone');

        washStoneEl.textContent = this.washer.getWashStoneCost();
        lockStoneEl.textContent = this.washer.getLockCost();
    }

    // 更新材料统计显示
    updateStatsDisplay() {
        const totalWashStoneEl = document.getElementById('totalWashStone');
        const totalLockStoneEl = document.getElementById('totalLockStone');

        totalWashStoneEl.textContent = this.washer.getTotalWashStone();
        totalLockStoneEl.textContent = this.washer.getTotalLockStone();
    }

    // 处理锁定按钮点击
    handleLock(index) {
        this.washer.toggleLock(index);
        this.updateLockButtons();
        this.updateCostDisplay();
    }

    // 绑定事件
    bindEvents() {
        const washBtn = document.getElementById('washBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const startBtn = document.getElementById('startBtn');
        const resetBtn = document.getElementById('resetBtn');

        washBtn.addEventListener('click', () => this.handleWash());
        cancelBtn.addEventListener('click', () => this.handleCancel());
        startBtn.addEventListener('click', () => this.handleStart());
        resetBtn.addEventListener('click', () => this.handleReset());

        // 绑定词条选择事件
        for (let i = 0; i < 4; i++) {
            const typeSelect = document.getElementById(`type-${i}`);
            const qualitySelect = document.getElementById(`quality-${i}`);

            typeSelect.addEventListener('change', () => this.handleSelectionChange());
            qualitySelect.addEventListener('change', () => this.handleSelectionChange());
        }

        // 绑定锁定按钮事件
        for (let i = 0; i < 4; i++) {
            const lockBtn = document.getElementById(`lock-${i}`);
            lockBtn.addEventListener('click', () => this.handleLock(i));
        }
    }

    // 显示初始状态
    displayInitialStats() {
        for (let i = 0; i < 4; i++) {
            this.updateStatBox('original', i, null);
            this.updateStatBox('new', i, null);
        }
        this.updateLockButtons();
        this.updateCostDisplay();
    }

    // 更新词条框显示
    updateStatBox(row, index, trait) {
        const boxId = `${row}-${index}`;
        const box = document.getElementById(boxId);
        const nameEl = box.querySelector('.stat-name');
        const levelEl = box.querySelector('.stat-level');

        if (!trait) {
            nameEl.textContent = '-';
            levelEl.textContent = '';
            box.className = 'stat-box';
            return;
        }

        const { name, quality } = trait.getDisplayInfo();
        nameEl.textContent = name;
        levelEl.textContent = '';

        // 移除所有品质类
        box.className = 'stat-box';

        // 添加品质类
        if (quality === QUALITY.GOLD) {
            box.classList.add('quality-gold');
        } else if (quality === QUALITY.PURPLE) {
            box.classList.add('quality-purple');
        } else {
            box.classList.add('quality-blue');
        }

        // 添加动画
        box.classList.add('animate');
        setTimeout(() => {
            box.classList.remove('animate');
        }, 400);
    }

    // 显示词条
    displayTraits(traits, row) {
        for (let i = 0; i < 4; i++) {
            if (i < traits.length) {
                this.updateStatBox(row, i, traits[i]);
            } else {
                this.updateStatBox(row, i, null);
            }
        }
    }

    // 更新新词条显示
    displayNewTraits(currentTraits, newTraits) {
        const lockState = this.washer.getLockState();

        for (let i = 0; i < 4; i++) {
            if (i < newTraits.length) {
                this.updateStatBox('new', i, newTraits[i]);

                // 如果该槽位被锁定，添加锁定标记
                const boxId = `new-${i}`;
                const box = document.getElementById(boxId);
                if (lockState[i]) {
                    box.classList.add('locked-slot');
                } else {
                    box.classList.remove('locked-slot');
                }
            } else {
                this.updateStatBox('new', i, null);
            }
        }
    }

    // 处理洗炼
    handleWash() {
        if (this.isWashing) return;

        const washBtn = document.getElementById('washBtn');

        // 检查是否是新洗炼
        if (this.washer.getNewTraits().length > 0) {
            // 如果已有新词条，洗炼按钮变为"保存"
            this.handleSave();
            washBtn.textContent = '洗炼';
            return;
        }

        this.isWashing = true;
        washBtn.disabled = true;

        // 模拟洗炼动画延迟
        setTimeout(() => {
            const result = this.washer.wash();

            // 显示词条
            this.displayTraits(result.current, 'original');
            this.displayNewTraits(result.current, result.new);

            // 更新按钮文本
            washBtn.textContent = '保存结果';
            washBtn.disabled = false;
            this.isWashing = false;
            this.updateButtons();
            this.updateLockButtons();
            this.updateCostDisplay();
            this.updateStatsDisplay();
        }, 300);
    }

    // 处理保存
    handleSave() {
        this.washer.saveResult();
        const current = this.washer.getCurrentTraits();

        // 保存后原词条显示新词条，新词条行清空
        this.displayTraits(current, 'original');
        this.displayTraits([], 'new');
        this.updateButtons();
        this.updateLockButtons();
        this.updateCostDisplay();
    }

    // 处理取消
    handleCancel() {
        const washBtn = document.getElementById('washBtn');

        // 检查是否需要取消
        if (this.washer.getNewTraits().length > 0) {
            this.washer.cancel();
            const current = this.washer.getCurrentTraits();

            // 恢复显示当前词条
            this.displayTraits(current, 'original');

            // 清空新词条显示
            for (let i = 0; i < 4; i++) {
                const boxId = `new-${i}`;
                const box = document.getElementById(boxId);
                const nameEl = box.querySelector('.stat-name');
                const levelEl = box.querySelector('.stat-level');
                nameEl.textContent = '-';
                levelEl.textContent = '';
                box.className = 'stat-box';
            }

            // 更新按钮文本
            washBtn.textContent = '洗炼';
            this.updateButtons();
            this.updateLockButtons();
            this.updateCostDisplay();
        } else {
            // 如果没有新词条，重置所有
            this.washer.reset();
            this.displayInitialStats();
            this.updateButtons();
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
