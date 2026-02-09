// 洗炼路径计算器
class WashPathCalculator {
    constructor() {
        this.traitPool = this.buildTraitPool();
    }

    // 构建词条池
    buildTraitPool() {
        const pool = [];
        TRAIT_TYPES.forEach(type => {
            Object.values(QUALITY).forEach(quality => {
                const trait = new Trait(type, quality);
                const probability = this.getProbability(quality.key);
                pool.push({ trait, probability });
            });
        });
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

    // 计算最佳洗炼路径
    calculateOptimalPath(initialTraits, targetTraits) {
        // 过滤出非空的初始词条
        const currentTraits = initialTraits.filter(t => t !== null);
        const targets = targetTraits.filter(t => t !== null);

        console.log('计算最佳路径:', {
            currentTraits: currentTraits.map(t => {
                const info = t.getDisplayInfo();
                return `${info.quality.name}的${info.name}`;
            }),
            targets: targets.map(t => {
                const info = t.getDisplayInfo();
                return `${info.quality.name}的${info.name}`;
            })
        });

        if (targets.length === 0) {
            return null;
        }

        // 1. 排除无效词条（初始词条中不在目标词条中的）
        const effectiveInitials = currentTraits.filter(initial => {
            return targets.some(target => target.getId() === initial.getId());
        });

        // 2. 生成初始词条的所有锁定方案（2^n 种）
        const initialPlans = this.generateRetentionPlans(effectiveInitials);
        console.log('生成初始锁定方案数量:', initialPlans.length);

        let bestResult = null;
        let minTotalCost = Infinity;

        // 3. 遍历所有初始锁定方案
        initialPlans.forEach(initialPlan => {
            const lockedInitials = initialPlan.retained;

            // 找出还需要洗炼的目标词条（目标中没有被初始锁定的）
            const toWash = targets.filter(target => {
                return !lockedInitials.some(locked => locked.getId() === target.getId());
            });

            // 如果没有需要洗炼的词条，说明方案完美
            if (toWash.length === 0) {
                console.log('完美方案：所有目标已在初始锁定中');
                if (0 < minTotalCost) {
                    minTotalCost = 0;
                    bestResult = {
                        steps: [],
                        totalWashStone: 0,
                        totalLockStone: 0
                    };
                }
                return;
            }

            // 4. 生成目标词条的所有排列
            const targetPermutations = this.generateAllPermutations(toWash);
            console.log(`初始方案 [${lockedInitials.map(t => {
                const info = t.getDisplayInfo();
                return info.quality.name;
            }).join(',') || '无'}] 生成 ${targetPermutations.length} 个洗炼顺序`);

            // 5. 遍历所有洗炼顺序
            targetPermutations.forEach(targetPath => {
                const cost = this.calculatePathCost(lockedInitials, targetPath);
                const totalCost = cost.totalWashStone + cost.totalLockStone;

                if (totalCost < minTotalCost && isFinite(totalCost)) {
                    minTotalCost = totalCost;
                    bestResult = cost;
                    console.log('发现更优方案:', {
                        locked: lockedInitials.map(t => {
                            const info = t.getDisplayInfo();
                            return `${info.quality.name}的${info.name}`;
                        }).join(', ') || '无',
                        path: targetPath.map(t => {
                            const info = t.getDisplayInfo();
                            return `${info.quality.name}的${info.name}`;
                        }).join(' -> '),
                        totalCost
                    });
                }
            });
        });

        // 如果没有找到有效路径，返回空结果
        if (!bestResult) {
            return {
                steps: [],
                totalWashStone: 0,
                totalLockStone: 0
            };
        }

        return bestResult;
    }

    // 生成所有排列
    generateAllPermutations(arr) {
        if (arr.length === 0) return [[]];
        if (arr.length === 1) return [arr];

        const result = [];

        for (let i = 0; i < arr.length; i++) {
            const current = arr[i];
            const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
            const remainingPermutations = this.generateAllPermutations(remaining);

            for (const perm of remainingPermutations) {
                result.push([current, ...perm]);
            }
        }

        return result;
    }

    // 生成所有保留方案（用于初始词条的锁定策略）
    generateRetentionPlans(traits) {
        if (traits.length === 0) {
            return [{ retained: [] }];
        }

        const plans = [];
        const n = traits.length;

        // 生成所有 2^n 个子集
        for (let mask = 0; mask < (1 << n); mask++) {
            const retained = [];
            for (let i = 0; i < n; i++) {
                if ((mask >> i) & 1) {
                    retained.push(traits[i]);
                }
            }
            plans.push({ retained });
        }

        return plans;
    }

    // 计算路径消耗
    calculatePathCost(ownedTargets, targetPath) {
        const steps = [];
        let totalWashStone = 0;
        let totalLockStone = 0;

        let lockedTraits = [...ownedTargets];

        // 按顺序洗炼每个目标
        for (let i = 0; i < targetPath.length; i++) {
            const target = targetPath[i];
            const lockedCount = lockedTraits.length;

            // 计算洗出这个目标的概率
            const probability = this.calculateStepProbability(
                lockedTraits,
                target
            );

            // 如果概率为0，说明无法达成，跳过这条路径
            if (probability <= 0) {
                return {
                    steps: [],
                    totalWashStone: Infinity,
                    totalLockStone: Infinity
                };
            }

            // 计算期望洗炼次数
            const expectedAttempts = Math.ceil(1 / probability);

            // 计算材料消耗
            const lockStoneCost = this.getLockStoneCost(lockedCount);
            const washStoneCost = 20;

            const stepWashStone = expectedAttempts * washStoneCost;
            const stepLockStone = expectedAttempts * lockStoneCost;

            totalWashStone += stepWashStone;
            totalLockStone += stepLockStone;

            steps.push({
                stepNumber: i + 1,
                lockedTraits: [...lockedTraits],
                target: target,
                probability: probability,
                expectedAttempts: expectedAttempts,
                washStone: stepWashStone,
                lockStone: stepLockStone
            });

            // 更新状态
            lockedTraits.push(target);
        }

        return {
            steps,
            totalWashStone,
            totalLockStone
        };
    }

    // 计算单步洗炼概率
    calculateStepProbability(lockedTraits, target) {
        // 计算需要洗炼的槽位数
        const unlockedSlots = 4 - lockedTraits.length;

        if (unlockedSlots <= 0) {
            return 0;
        }

        // 计算已排除的词条ID（锁定的词条）
        const excludeIds = new Set();
        lockedTraits.forEach(trait => {
            excludeIds.add(trait.getId());
        });

        // 获取可用词条池
        const availablePool = this.traitPool.filter(item =>
            !excludeIds.has(item.trait.getId())
        );

        if (availablePool.length === 0) {
            return 0;
        }

        const totalWeight = availablePool.reduce((sum, item) =>
            sum + item.probability, 0
        );

        if (totalWeight === 0) {
            return 0;
        }

        // 计算目标词条的权重
        const targetWeight = this.getProbability(target.quality.key);

        if (targetWeight === 0) {
            return 0;
        }

        // 检查目标词条是否在可用池中
        const targetInPool = availablePool.some(item =>
            item.trait.getId() === target.getId()
        );

        if (!targetInPool) {
            return 0;
        }

        // 计算在unlockedSlots次抽取中，至少抽中一次的概率
        // P(至少1次) = 1 - P(0次)

        let notSelectedProbability = 1;
        let remainingWeight = totalWeight;
        let remainingPoolSize = availablePool.length;

        for (let i = 0; i < unlockedSlots; i++) {
            if (remainingWeight <= 0) {
                break;
            }

            const notSelectedThisTime = (remainingWeight - targetWeight) / remainingWeight;
            notSelectedProbability *= notSelectedThisTime;

            // 估算剩余池的平均权重
            if (remainingPoolSize > 1) {
                const avgNonTargetWeight = (totalWeight - targetWeight) / (availablePool.length - 1);
                remainingWeight -= avgNonTargetWeight;
                remainingPoolSize--;
            }
        }

        const result = Math.max(0, 1 - notSelectedProbability);

        return result;
    }

    // 获取锁定材料消耗
    getLockStoneCost(lockedCount) {
        switch (lockedCount) {
            case 0: return 0;
            case 1: return 20;
            case 2: return 40;
            case 3: return 100;
            default: return 0;
        }
    }
}
