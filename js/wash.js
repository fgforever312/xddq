// 词条类型定义（22种）
const TRAIT_TYPES = [
    '攻击', '防御', '生命', '敏捷',
    '击晕', '暴击', '连击', '闪避', '反击', '吸血',
    '抵抗击晕', '抵抗暴击', '抵抗连击', '抵抗闪避', '抵抗反击', '抵抗吸血',
    '强化灵兽', '弱化灵兽',
    '强化治疗', '弱化治疗',
    '强化暴伤', '弱化暴伤'
];

// 词条品质定义
const QUALITY = {
    GOLD: { name: '金', probability: 0.032, class: 'quality-gold' },
    PURPLE: { name: '紫', probability: 0.01, class: 'quality-purple' },
    BLUE: { name: '蓝', probability: 0.005, class: 'quality-blue' }
};

// 词条类
class Trait {
    constructor(type, quality) {
        this.type = type;
        this.quality = quality;
    }

    // 获取词条唯一标识（用于比较是否相同）
    getId() {
        return `${this.type}-${this.quality.name}`;
    }

    // 获取显示信息
    getDisplayInfo() {
        return {
            name: this.type,
            quality: this.quality
        };
    }
}

// 词条洗炼器
class TraitWasher {
    constructor() {
        this.currentTraits = [];
        this.newTraits = [];
        this.lockedSlots = [false, false, false, false]; // 锁定状态
        this.traitPool = this.createTraitPool();
        this.totalWashStone = 0; // 总洗炼石消耗
        this.totalLockStone = 0; // 总不化岩消耗
    }

    // 创建所有66种词条的池子（22种类型 × 3种品质）
    createTraitPool() {
        const pool = [];
        for (const type of TRAIT_TYPES) {
            for (const qualityKey of ['GOLD', 'PURPLE', 'BLUE']) {
                const quality = QUALITY[qualityKey];
                const trait = new Trait(type, quality);
                pool.push({
                    trait: trait,
                    probability: this.getProbability(qualityKey)
                });
            }
        }
        return pool;
    }

    // 获取品质概率
    getProbability(qualityKey) {
        switch (qualityKey) {
            case 'GOLD': return 0.5;
            case 'PURPLE': return 1.0;
            case 'BLUE': return 3.2;
            default: return 0;
        }
    }

    // 从池子中随机选择指定数量的不重复词条
    selectFromPool(count, excludeIds = new Set()) {
        const selected = [];
        const available = this.traitPool.filter(item => !excludeIds.has(item.trait.getId()));
        const selectedIndices = new Set();

        while (selected.length < count && selected.length < available.length) {
            // 计算当前可用的总概率
            const totalProb = available.reduce((sum, item, index) => {
                return selectedIndices.has(index) ? sum : sum + item.probability;
            }, 0);

            const rand = Math.random() * totalProb;
            let cumulative = 0;

            for (let i = 0; i < available.length; i++) {
                if (selectedIndices.has(i)) continue;

                cumulative += available[i].probability;
                if (rand < cumulative) {
                    selectedIndices.add(i);
                    selected.push(available[i].trait);
                    break;
                }
            }
        }

        return selected;
    }

    // 公开 selectFromPool 方法供外部调用
    generateRandomTraits(count, excludeIds = new Set()) {
        return this.selectFromPool(count, excludeIds);
    }

    // 洗炼词条（生成4个不重复的词条）
    wash() {
        // 记录材料消耗
        this.recordMaterialUsage();

        // 第一次洗炼时，上栏为空，结果显示在下栏
        if (this.currentTraits.length === 0) {
            this.newTraits = this.selectFromPool(4);
        } else {
            // 有锁定的词条，洗炼时需要保留锁定的词条
            const newTraits = [];
            const lockedIndices = [];
            const excludeIds = new Set();

            // 收集锁定的词条
            for (let i = 0; i < 4; i++) {
                if (this.lockedSlots[i] && this.currentTraits[i]) {
                    lockedIndices.push(i);
                    excludeIds.add(this.currentTraits[i].getId());
                }
            }

            // 生成未锁定的词条
            const unlockedCount = 4 - lockedIndices.length;
            if (unlockedCount > 0) {
                const generatedTraits = this.selectFromPool(unlockedCount, excludeIds);
                let genIndex = 0;

                for (let i = 0; i < 4; i++) {
                    if (this.lockedSlots[i] && this.currentTraits[i]) {
                        // 保留锁定的词条
                        newTraits[i] = this.currentTraits[i];
                    } else {
                        // 使用新生成的词条
                        newTraits[i] = generatedTraits[genIndex++];
                    }
                }
            } else {
                // 全部锁定，不会发生
                newTraits.push(...this.currentTraits);
            }

            this.newTraits = newTraits;
        }

        return {
            current: this.currentTraits,
            new: this.newTraits
        };
    }

    // 保存洗炼结果
    saveResult() {
        if (this.newTraits.length > 0) {
            this.currentTraits = [...this.newTraits];
            this.newTraits = [];
            return true;
        }
        return false;
    }

    // 取消洗炼
    cancel() {
        this.newTraits = [];
        return {
            current: this.currentTraits,
            new: []
        };
    }

    // 获取当前词条
    getCurrentTraits() {
        return this.currentTraits;
    }

    // 设置当前词条
    setCurrentTraits(traits) {
        this.currentTraits = [...traits];
    }

    // 获取新词条
    getNewTraits() {
        return this.newTraits;
    }

    // 重置
    reset() {
        this.currentTraits = [];
        this.newTraits = [];
        this.lockedSlots = [false, false, false, false];
        this.totalWashStone = 0;
        this.totalLockStone = 0;
    }

    // 记录材料消耗
    recordMaterialUsage() {
        const washStoneCost = this.getWashStoneCost();
        const lockStoneCost = this.getLockCost();
        this.totalWashStone += washStoneCost;
        this.totalLockStone += lockStoneCost;
    }

    // 获取总洗炼石消耗
    getTotalWashStone() {
        return this.totalWashStone;
    }

    // 获取总不化岩消耗
    getTotalLockStone() {
        return this.totalLockStone;
    }

    // 切换锁定状态
    toggleLock(index) {
        if (index >= 0 && index < 4) {
            this.lockedSlots[index] = !this.lockedSlots[index];
            return this.lockedSlots[index];
        }
        return false;
    }

    // 获取锁定状态
    getLockState() {
        return [...this.lockedSlots];
    }

    // 设置锁定状态
    setLockState(lockedSlots) {
        this.lockedSlots = [...lockedSlots];
    }

    // 计算锁定材料消耗
    getLockCost() {
        const lockedCount = this.lockedSlots.filter(l => l).length;
        switch (lockedCount) {
            case 0: return 0;
            case 1: return 20;
            case 2: return 40;
            case 3: return 100;
            default: return 0; // 锁定4个没有意义
        }
    }

    // 获取洗炼石消耗（固定20）
    getWashStoneCost() {
        return 20;
    }
}

// 导出模块
window.TraitWasher = TraitWasher;
window.TRAIT_TYPES = TRAIT_TYPES;
window.QUALITY = QUALITY;
