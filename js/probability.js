// 词条概率计算器
class TraitProbabilityCalculator {
    constructor() {
        this.traitPool = this.createTraitPool();
    }

    // 创建所有66种词条的池子
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

    // 获取品质权重
    getProbability(qualityKey) {
        switch (qualityKey) {
            case 'GOLD': return 0.5;
            case 'PURPLE': return 1.0;
            case 'BLUE': return 3.2;
            default: return 0;
        }
    }

    /**
     * 计算洗炼到目标词条的概率
     * @param {Array} currentTraits - 当前4个词条（Trait对象数组）
     * @param {Array} lockedSlots - 锁定状态数组（4个布尔值）
     * @param {Array} targetTraits - 目标词条数组（Trait对象数组）
     * @returns {object} 包含公式结果和模拟结果
     */
    calculateProbability(currentTraits, lockedSlots, targetTraits) {
        // 找出未锁定的槽位数量
        const unlockedCount = lockedSlots.filter(l => !l).length;

        if (unlockedCount === 0) {
            return {
                formula: "0.0000%",
                simulation: "0.0000%"
            }; // 全部锁定，无法洗炼
        }

        // 收集需要排除的词条ID（只排除未锁定的当前词条）
        const excludeIds = new Set();
        for (let i = 0; i < 4; i++) {
            // 只排除未锁定槽位的词条
            if (currentTraits[i] && !lockedSlots[i]) {
                excludeIds.add(currentTraits[i].getId());
            }
        }

        // 过滤掉锁定的目标词条（因为它们已经固定，不需要计算概率）
        const unlockedTargets = [];
        for (let i = 0; i < 4; i++) {
            // 只处理未锁定槽位的目标词条
            if (!lockedSlots[i] && targetTraits[i]) {
                unlockedTargets.push(targetTraits[i]);
            }
        }

        // 检查未锁定的目标数量是否超过未锁定槽位数量
        if (unlockedTargets.length > unlockedCount) {
            return {
                formula: "0.0000%",
                simulation: "0.0000%"
            }; // 目标数量超过可用槽位
        }

        // 如果没有未锁定的目标，说明所有目标都已达成（被锁定）
        if (unlockedTargets.length === 0) {
            return {
                formula: "100.0000%",
                simulation: "100.0000%"
            };
        }

        // 计算概率
        const result = this.calculateExactProbability(unlockedCount, unlockedTargets, excludeIds);

        return {
            formula: (result.formula * 100).toFixed(4) + "%",
            simulation: (result.simulation * 100).toFixed(4) + "%"
        };
    }

    /**
     * 计算精确概率
     * @param {number} slotsCount - 需要洗炼的槽位数量
     * @param {Array} targetTraits - 目标词条数组
     * @param {Set} excludeIds - 需要排除的词条ID集合
     * @returns {object} 包含公式结果和模拟结果
     */
    calculateExactProbability(slotsCount, targetTraits, excludeIds) {
        // 获取可用的词条池（排除已存在的词条）
        const availablePool = this.traitPool.filter(item => !excludeIds.has(item.trait.getId()));

        // 计算总权重
        const totalWeight = availablePool.reduce((sum, item) => sum + item.probability, 0);

        // 获取目标词条的权重
        const targetWeights = targetTraits.map(target => {
            const item = availablePool.find(p => p.trait.getId() === target.getId());
            return item ? item.probability : 0;
        });

        // 目标词条数量
        const m = targetTraits.length;
        // 需要选择的槽位数
        const k = slotsCount;

        let formulaResult = 0;
        let simulationResult = 0;

        // 如果恰好需要选择m个槽位且有m个目标，计算直接概率
        if (k === m) {
            formulaResult = this.calculateAllTargetsProbability(targetTraits, availablePool, totalWeight);
            simulationResult = this.calculateByMonteCarlo(targetTraits, availablePool, k);
        } else if (m === 1) {
            // 单个目标的特殊处理
            formulaResult = this.calculateAtLeastOneProbability(targetWeights[0], totalWeight, k, availablePool.length);
            simulationResult = this.calculateByMonteCarlo(targetTraits, availablePool, k);
        } else {
            // 多个目标的情况
            formulaResult = this.calculateMultipleTargetsProbability(targetWeights, totalWeight, k);
            simulationResult = this.calculateByMonteCarlo(targetTraits, availablePool, k);
        }

        return {
            formula: formulaResult,
            simulation: simulationResult
        };
    }

    /**
     * 计算选择所有目标词条的概率（当槽位数等于目标数时）
     */
    calculateAllTargetsProbability(targetTraits, availablePool, totalWeight) {
        let probability = 1;
        let remainingWeight = totalWeight;

        // 按顺序计算选中每个目标的概率
        for (let i = 0; i < targetTraits.length; i++) {
            const target = targetTraits[i];
            const item = availablePool.find(p => p.trait.getId() === target.getId());

            if (!item) {
                return 0;
            }

            const targetWeight = item.probability;
            probability *= (targetWeight / remainingWeight);
            remainingWeight -= targetWeight;
        }

        return probability;
    }

    /**
     * 计算至少选中一次目标词条的概率（针对单个目标，多个槽位）
     * 使用补集法：P(至少选中1次) = 1 - P(一次都没选中)
     */
    calculateAtLeastOneProbability(targetWeight, totalWeight, slotCount, poolSize) {
        // P(一次都没选中) = 从(poolSize-1)个非目标中选slotCount个的概率
        // 对于加权抽样，我们需要精确计算

        let notSelectedProbability = 1;
        let remainingWeight = totalWeight;
        let remainingPoolSize = poolSize;

        // 计算连续slotCount次都没选中的概率
        for (let i = 0; i < slotCount; i++) {
            // 第i次没选中的概率 = (总权重 - 目标权重) / 总权重
            const notSelectedThisTime = (remainingWeight - targetWeight) / remainingWeight;
            notSelectedProbability *= notSelectedThisTime;

            // 更新剩余权重（减去被选中的非目标词条的平均权重）
            // 被选中的是某个非目标词条，其期望权重是 (总权重 - 目标权重) / (poolSize - 1)
            const avgNonTargetWeight = (totalWeight - targetWeight) / (poolSize - 1);
            remainingWeight -= avgNonTargetWeight;
            remainingPoolSize--;
        }

        return 1 - notSelectedProbability;
    }
    calculateAllTargetsProbability(targetTraits, availablePool, totalWeight) {
        let probability = 1;
        let remainingWeight = totalWeight;

        // 按顺序计算选中每个目标的概率
        for (let i = 0; i < targetTraits.length; i++) {
            const target = targetTraits[i];
            const item = availablePool.find(p => p.trait.getId() === target.getId());

            if (!item) {
                return 0;
            }

            const targetWeight = item.probability;
            probability *= (targetWeight / remainingWeight);
            remainingWeight -= targetWeight;
        }

        return probability;
    }

    /**
     * 计算多个目标词条都出现的概率
     */
    calculateMultipleTargetsProbability(targetWeights, totalWeight, slotCount) {
        // 简化计算：使用组合概率公式
        // P(所有目标都出现) ≈ P(目标1出现) × P(目标2出现|目标1已出现) × ...

        let probability = 1;
        let remainingWeight = totalWeight;
        let remainingSlots = slotCount;

        for (let i = 0; i < targetWeights.length; i++) {
            const targetWeight = targetWeights[i];

            // 在剩余的槽位和权重中选中这个目标的概率
            // 简化：假设均匀分布
            const probThisTarget = (targetWeight / remainingWeight) * remainingSlots;

            // 限制概率不超过1
            const clampedProb = Math.min(probThisTarget, 1);

            probability *= clampedProb;

            // 更新剩余权重和槽位
            remainingWeight -= targetWeight;
            remainingSlots--;
        }

        return Math.min(probability, 1);
    }

    /**
     * 使用蒙特卡洛模拟计算概率
     */
    calculateByMonteCarlo(targetTraits, availablePool, slotsCount) {
        const SIMULATIONS = 100000;
        let successCount = 0;

        const targetIds = new Set(targetTraits.map(t => t.getId()));
        console.log('目标词条ID集合:', Array.from(targetIds));
        console.log('目标数量:', targetIds.size);
        console.log('洗炼槽位数:', slotsCount);

        for (let sim = 0; sim < SIMULATIONS; sim++) {
            // 模拟洗炼：从可用池中选择指定数量的词条
            const selectedIds = this.selectTraits(availablePool, slotsCount);

            // 判断是否成功
            let success = false;

            if (targetIds.size === 1) {
                // 单个目标：只要任意一个槽位选中该目标即可
                const targetId = Array.from(targetIds)[0];
                success = selectedIds.includes(targetId);
            } else if (targetIds.size === slotsCount) {
                // 目标数量等于槽位数：必须选中所有目标词条
                success = Array.from(targetIds).every(id => selectedIds.includes(id));
            } else if (targetIds.size < slotsCount) {
                // 目标数量小于槽位数：必须选中所有目标词条
                success = Array.from(targetIds).every(id => selectedIds.includes(id));
            }

            if (success) {
                successCount++;
            }
        }

        console.log(`模拟结果: ${successCount}/${SIMULATIONS}`);
        const probability = successCount / SIMULATIONS;
        console.log('计算概率:', probability);
        return probability;
    }

    /**
     * 从词条池中选择指定数量的词条（不重复）
     * 模拟洗炼的选择过程
     */
    selectTraits(pool, count) {
        const selected = [];
        const selectedIndices = new Set();

        for (let i = 0; i < count && i < pool.length; i++) {
            // 计算当前可用的总权重
            const totalWeight = pool.reduce((sum, item, index) => {
                return selectedIndices.has(index) ? sum : sum + item.probability;
            }, 0);

            const rand = Math.random() * totalWeight;
            let cumulative = 0;

            for (let j = 0; j < pool.length; j++) {
                if (selectedIndices.has(j)) continue;

                cumulative += pool[j].probability;
                if (rand < cumulative) {
                    selectedIndices.add(j);
                    selected.push(pool[j].trait.getId());
                    break;
                }
            }
        }

        return selected;
    }
}

// 导出模块
window.TraitProbabilityCalculator = TraitProbabilityCalculator;
