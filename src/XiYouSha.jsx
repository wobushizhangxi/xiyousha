import React, { useState, useEffect, useRef } from 'react';
import { Heart, ScrollText, AlertCircle, RotateCcw, Check, Zap, Shield, X, Target } from 'lucide-react';
import { CARD_TYPES, CARDS_DB, DECK_CONFIG } from './config/gameConfig';
import GameMenu from './components/GameMenu';
import GameCard from './components/GameCard';
import HistoryModal from './components/HistoryModal';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export default function XiYouSha() {
    const scrollRef = useRef(null);
    const logContainerRef = useRef(null);
    const deckRef = useRef([]);

    const playerRef = useRef(null);
    const enemiesRef = useRef([]);

    const [gameState, setGameState] = useState('MENU_PLAYER');
    const [selectedPlayerDef, setSelectedPlayerDef] = useState(null);
    const [selectedEnemyDefs, setSelectedEnemyDefs] = useState([]); // 改为数组，存储两个妖王

    const [player, setPlayer] = useState({ id: '', name: '', hp: 4, maxHp: 4, hand: [], wine: 0, isStunned: false, equips: { weapon: null, armor: null } });
    // 改为 enemies 数组
    const [enemies, setEnemies] = useState([]);
    const [targetIdx, setTargetIdx] = useState(0); // 当前玩家选中的目标索引

    const [phase, setPhase] = useState('IDLE');
    const [hasAttacked, setHasAttacked] = useState(false);
    const [hasUsedActiveSkill, setHasUsedActiveSkill] = useState(false);

    const [promptState, setPromptState] = useState(null);
    const responseResolver = useRef(null);
    const [animatingCard, setAnimatingCard] = useState(null);
    const [animatingText, setAnimatingText] = useState(null);

    const [discardSelection, setDiscardSelection] = useState([]);
    const [currentTurnLogs, setCurrentTurnLogs] = useState([]);
    const [allHistoryLogs, setAllHistoryLogs] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showSkillModal, setShowSkillModal] = useState(null); // 'player' | index | null
    const [isPlayerInfoHidden, setIsPlayerInfoHidden] = useState(false);

    useEffect(() => { playerRef.current = player; }, [player]);
    useEffect(() => { enemiesRef.current = enemies; }, [enemies]);

    useEffect(() => {
        if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }, [currentTurnLogs, phase]);

    // 游戏结束判定
    const isGameOverLogged = useRef(false);
    useEffect(() => {
        if (gameState !== 'PLAYING' || enemies.length === 0) {
            isGameOverLogged.current = false;
            return;
        }
        if (!isGameOverLogged.current) {
            if (player.hp <= 0) {
                isGameOverLogged.current = true;
                addLog("☠️ 你被众妖王击败了！游戏结束！", true);
                setTimeout(() => setGameState('MENU_PLAYER'), 3000);
            } else if (enemies.every(e => e.hp <= 0)) {
                isGameOverLogged.current = true;
                addLog(`🎉 乾坤朗朗！你成功降伏了所有妖王！`, true);
                setTimeout(() => setGameState('MENU_PLAYER'), 3000);
            }
        }
    }, [player.hp, enemies, gameState]);

    const addLog = (msg, isNewRound = false) => {
        if (isNewRound) setCurrentTurnLogs([msg]);
        else setCurrentTurnLogs(prev => [...prev, msg]);
        setAllHistoryLogs(prev => [`[记录] ${msg}`, ...prev]);
    };

    const triggerCardAnim = (card, source) => {
        setAnimatingCard({ card, source, id: Date.now() });
        setTimeout(() => setAnimatingCard(null), 1200);
    };

    const triggerTextAnim = (text, type, source) => {
        // source 可以是 'player' 或 index
        setAnimatingText({ text, type, source, id: Date.now() });
        setTimeout(() => setAnimatingText(null), 1000);
    };

    const requestPlayerDodge = (msg) => {
        return new Promise((resolve) => {
            const hasDodge = playerRef.current.hand.some(c => c.id === CARD_TYPES.DODGE);
            if (!hasDodge) {
                resolve({ dodged: false });
                return;
            }
            setPhase('PLAYER_RESPONSE');
            setPromptState({ message: msg });
            responseResolver.current = resolve;
        });
    };

    const createDeck = () => {
        let d = [];
        Object.keys(DECK_CONFIG).forEach(type => {
            for (let i = 0; i < DECK_CONFIG[type]; i++) {
                d.push({ ...CARDS_DB[type], uid: Math.random().toString(36).substr(2, 9) });
            }
        });
        return d.sort(() => Math.random() - 0.5);
    };

    const drawCards = (target, count) => {
        if (deckRef.current.length < count + 5) deckRef.current = [...deckRef.current, ...createDeck()];
        const newCards = deckRef.current.slice(0, count);
        deckRef.current = deckRef.current.slice(count);

        triggerTextAnim(`摸牌 +${count}`, 'buff', target);

        if (target === 'player') setPlayer(p => ({ ...p, hand: [...p.hand, ...newCards] }));
        else {
            setEnemies(prev => prev.map((e, idx) => idx === target ? { ...e, hand: [...e.hand, ...newCards] } : e));
        }
    };

    // 初始化游戏：接收选中的妖王列表
    const initGame = (defs) => {
        const newDeck = createDeck();
        const pHand = newDeck.splice(0, 4);
        const e1Hand = newDeck.splice(0, 4);
        const e2Hand = newDeck.splice(0, 4);
        deckRef.current = newDeck;

        setSelectedEnemyDefs(defs);
        setPlayer({ ...selectedPlayerDef, hp: selectedPlayerDef.maxHp, hand: pHand, wine: 0, isStunned: false, equips: { weapon: null, armor: null } });

        setEnemies([
            { ...defs[0], hp: defs[0].maxHp, hand: e1Hand, wine: 0, isStunned: false, equips: { weapon: null, armor: null } },
            { ...defs[1], hp: defs[1].maxHp, hand: e2Hand, wine: 0, isStunned: false, equips: { weapon: null, armor: null } }
        ]);

        setTargetIdx(0); // 默认瞄准第一个
        setGameState('PLAYING');
        setPhase('IDLE');
        setDiscardSelection([]);
        setHasAttacked(false);

        addLog("=== 乱战开始 ===", true);
        addLog(`你化身为 ${selectedPlayerDef.name}，只身挑战 ${defs[0].name} 与 ${defs[1].name}！`);
        addLog("众人各摸 4 张牌...");

        setTimeout(startPlayerTurn, 1500);
    };

    const getExcessCardsCount = () => {
        let limit = Math.max(0, player.hp);
        if (player.id === 'bajie') limit += 2;
        return Math.max(0, player.hand.length - limit);
    };

    const startPlayerTurn = () => {
        if (playerRef.current.hp <= 0 || enemiesRef.current.every(e => e.hp <= 0)) return;

        setHasAttacked(false);
        setHasUsedActiveSkill(false);
        setDiscardSelection([]);
        setPlayer(p => ({ ...p, wine: 0 }));

        addLog("=== 你的回合开始 ===", true);

        if (playerRef.current.id === 'xiaobailong' && playerRef.current.hp <= 2) {
            triggerTextAnim('龙脉!', 'buff', 'player');
            addLog(`🐉 【龙族血脉】生效！额外摸 1 张牌！`);
            drawCards('player', 1);
        }

        if (playerRef.current.id === 'wangmu' && playerRef.current.hp < playerRef.current.maxHp) {
            triggerTextAnim('蟠桃!', 'buff', 'player');
            addLog(`🍑 【蟠桃盛会】生效！额外摸 1 张牌！`);
            drawCards('player', 1);
        }

        if (playerRef.current.isStunned) {
            addLog(`🌀 你被禁锢，跳过此回合！`);
            setPlayer(p => ({ ...p, isStunned: false }));
            setTimeout(checkEndTurn, 1500);
            return;
        }

        setPhase('PLAYER_PLAY');
        drawCards('player', 2);
    };

    const handlePlayerActiveSkill = () => {
        if (hasUsedActiveSkill || phase !== 'PLAYER_PLAY') return;
        const pid = player.id;
        const currentTarget = enemies[targetIdx];

        if (currentTarget.hp <= 0) return addLog("⚠️ 目标已阵亡，请点击切换目标！");

        let success = false;
        if (pid === 'wukong') {
            addLog(`🐵 孙悟空发动【火眼金睛】看向 ${currentTarget.name}！`);
            if (currentTarget.hand.length > 0) {
                const rIdx = Math.floor(Math.random() * currentTarget.hand.length);
                setEnemies(prev => prev.map((e, i) => i === targetIdx ? { ...e, hand: e.hand.filter((_, idx) => idx !== rIdx) } : e));
                triggerTextAnim('看破!', 'buff', targetIdx);
                addLog(`👁️ 弃置了 ${currentTarget.name} 1 张手牌`);
            } else {
                addLog(`👁️ 对方无牌可弃。`);
            }
            success = true;
        } else if (pid === 'bajie') {
            if (player.hp <= 1) return addLog("⚠️ 体力过低");
            triggerTextAnim('-1', 'damage', 'player');
            setPlayer(p => ({...p, hp: p.hp - 1, wine: p.wine + 2}));
            addLog(`🐷 猪八戒消耗 1 体力，蓄势待发！`);
            success = true;
        } else if (pid === 'shaseng') {
            if (player.hp <= 1) return addLog("⚠️ 体力过低");
            triggerTextAnim('-1', 'damage', 'player');
            setPlayer(p => ({...p, hp: p.hp - 1}));
            addLog(`🧔 沙悟净消耗 1 体力，宝杖猛击！`);
            processPlayerAttack(1, '【降妖宝杖】');
            success = true;
        } else if (pid === 'xiaobailong') {
            if (player.hand.length === 0) return;
            addLog(`🐉 小白龙发动【乘风破浪】！`);
            setPlayer(p => {
                const rIdx = Math.floor(Math.random() * p.hand.length);
                return { ...p, hand: p.hand.filter((_, i) => i !== rIdx) };
            });
            setTimeout(() => drawCards('player', 2), 500);
            success = true;
        } else if (pid === 'tangseng') {
            if (player.hand.length === 0) return;
            setPlayer(p => {
                const rIdx = Math.floor(Math.random() * p.hand.length);
                return { ...p, hand: p.hand.filter((_, i) => i !== rIdx) };
            });
            addLog(`📿 唐僧念咒！`);
            applyDamageToEnemy(targetIdx, 1, '【紧箍咒语】', true);
            success = true;
        } else if (pid === 'wangmu') {
            if (player.hp >= player.maxHp || player.hand.length === 0) return;
            setPlayer(p => {
                const rIdx = Math.floor(Math.random() * p.hand.length);
                return { ...p, hp: p.hp + 1, hand: p.hand.filter((_, i) => i !== rIdx) };
            });
            triggerTextAnim('+1', 'heal', 'player');
            success = true;
        }

        if (success) setHasUsedActiveSkill(true);
    };

    // 通用的伤害结算逻辑，处理防御、白骨精被动等
    const applyDamageToEnemy = (idx, amount, sourceName, isPierce = false) => {
        const target = enemiesRef.current[idx];
        if (target.hp <= 0) return;

        let finalDmg = amount;

        // 非流失伤害判定
        if (!isPierce) {
            if (target.id === 'ironfan') finalDmg = Math.min(finalDmg, 1);
            if (target.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_GOLD) finalDmg = Math.max(0, finalDmg - 1);
            if (sourceName === '【漫天花雨】' && target.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) finalDmg = 0;
        } else {
            // 流失伤害也判定锦襕袈裟免疫
            if (target.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) finalDmg = 0;
        }

        if (finalDmg <= 0) {
            addLog(`✨ ${target.name} 化解了 ${sourceName} 的伤害！`);
            return;
        }

        triggerTextAnim(`-${finalDmg}`, 'damage', idx);
        addLog(`💥 ${target.name} 受到 ${sourceName} 伤害，失去 ${finalDmg} 点体力`);

        setEnemies(prev => prev.map((e, i) => {
            if (i === idx) {
                const newHp = Math.max(0, e.hp - finalDmg);
                return { ...e, hp: newHp };
            }
            return e;
        }));

        // 被动触发
        if (target.id === 'bone' && finalDmg > 0) {
            setTimeout(() => drawCards(idx, 1), 500);
        }
        if (target.id === 'bull' && !isPierce && finalDmg > 0) {
            setTimeout(() => {
                setPlayer(p => {
                    if (p.hand.length === 0) return p;
                    const rIdx = Math.floor(Math.random() * p.hand.length);
                    return { ...p, hand: p.hand.filter((_, i) => i !== rIdx) };
                });
                addLog(`🐂 牛魔王蛮力震落了你 1 张手牌！`);
            }, 500);
        }
    };

    const processPlayerAttack = (baseDamage, sourceCardName = '【降妖】') => {
        const currentTarget = enemies[targetIdx];
        if (currentTarget.hp <= 0) return addLog("⚠️ 目标已阵亡！");

        let dmg = baseDamage + playerRef.current.wine;
        if (playerRef.current.id === 'wukong') dmg += 1;
        if (playerRef.current.equips.weapon?.id === CARD_TYPES.EQUIP_WEAPON_SPEAR) dmg += 1;
        if (playerRef.current.wine > 0) setPlayer(p => ({ ...p, wine: 0 }));

        addLog(`⚔️ 你对 ${currentTarget.name} 发动${sourceCardName}！(基础伤害: ${dmg})`);

        setTimeout(() => {
            const freshTarget = enemiesRef.current[targetIdx];
            const actIdx = freshTarget.hand.findIndex(c => c.id === CARD_TYPES.DODGE);

            if (actIdx > -1) {
                triggerCardAnim(CARDS_DB[CARD_TYPES.DODGE], targetIdx);
                triggerTextAnim('闪避！', 'dodge', targetIdx);
                addLog(`🛡️ ${freshTarget.name} 打出【腾云】躲开了`);
                setEnemies(prev => prev.map((e, i) => i === targetIdx ? { ...e, hand: e.hand.filter((_, idx) => idx !== actIdx) } : e));
            } else {
                applyDamageToEnemy(targetIdx, dmg, sourceCardName);
            }
        }, 800);
    };

    const handlePlayCard = (card) => {
        if (phase === 'PLAYER_RESPONSE') {
            if (card.id === CARD_TYPES.DODGE) {
                setPhase('AI_TURN');
                setPromptState(null);
                const idx = player.hand.findIndex(c => c.uid === card.uid);
                if (responseResolver.current) responseResolver.current({ dodged: true, cardIdx: idx });
            }
            return;
        }

        if (phase === 'PLAYER_DISCARD') {
            const excessCards = getExcessCardsCount();
            setDiscardSelection(prev => {
                if (prev.includes(card.uid)) return prev.filter(uid => uid !== card.uid);
                if (prev.length < excessCards) return [...prev, card.uid];
                return [...prev.slice(1), card.uid];
            });
            return;
        }

        if (phase !== 'PLAYER_PLAY') return;

        // 装备逻辑
        if (card.type === 'weapon') {
            setPlayer(p => ({ ...p, hand: p.hand.filter(c => c.uid !== card.uid), equips: { ...p.equips, weapon: card } }));
            return;
        }
        if (card.type === 'armor') {
            setPlayer(p => ({ ...p, hand: p.hand.filter(c => c.uid !== card.uid), equips: { ...p.equips, armor: card } }));
            return;
        }

        const canAttackMultiple = player.equips.weapon?.id === CARD_TYPES.EQUIP_WEAPON_STICK;
        if (card.id === CARD_TYPES.ATTACK && hasAttacked && !canAttackMultiple) return;

        const newHand = player.hand.filter(c => c.uid !== card.uid);
        setPlayer(p => ({ ...p, hand: newHand }));
        triggerCardAnim(card, 'player');

        if (card.id === CARD_TYPES.ATTACK) {
            setHasAttacked(true);
            processPlayerAttack(1, '【降妖】');
        } else if (card.id === CARD_TYPES.HEAL || card.id === CARD_TYPES.HEAL_BIG) {
            const healAmount = card.id === CARD_TYPES.HEAL_BIG ? 2 : 1;
            setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + healAmount) }));
            triggerTextAnim(`+${healAmount}`, 'heal', 'player');
        } else if (card.id === CARD_TYPES.SCAN) {
            drawCards('player', 2);
        } else if (card.id === CARD_TYPES.STUN) {
            setEnemies(prev => prev.map((e, i) => i === targetIdx ? { ...e, isStunned: true } : e));
            addLog(`🌀 你对 ${enemies[targetIdx].name} 施展了定身咒`);
        } else if (card.id === CARD_TYPES.WINE) {
            setPlayer(p => ({ ...p, wine: p.wine + 1 }));
        } else if (card.id === CARD_TYPES.WHEELS) {
            setHasAttacked(false);
            drawCards('player', 1);
        } else if (card.id === CARD_TYPES.PIERCE) {
            applyDamageToEnemy(targetIdx, 1, '【紧箍咒】', true);
        } else if (card.id === CARD_TYPES.MIRROR) {
            setEnemies(prev => prev.map((e, i) => i === targetIdx ? { ...e, hand: e.hand.filter(c => c.id !== CARD_TYPES.DODGE) } : e));
            addLog(`🔍 【照妖镜】清除了 ${enemies[targetIdx].name} 的所有【腾云】`);
        } else if (card.id === CARD_TYPES.STEAL) {
            if (enemies[targetIdx].hand.length > 0) {
                const rIdx = Math.floor(Math.random() * enemies[targetIdx].hand.length);
                const stolen = enemies[targetIdx].hand[rIdx];
                setPlayer(p => ({ ...p, hand: [...p.hand, stolen] }));
                setEnemies(prev => prev.map((e, i) => i === targetIdx ? { ...e, hand: e.hand.filter((_, idx) => idx !== rIdx) } : e));
            }
        } else if (card.id === CARD_TYPES.DESTROY) {
            if (enemies[targetIdx].hand.length > 0) {
                const rIdx = Math.floor(Math.random() * enemies[targetIdx].hand.length);
                setEnemies(prev => prev.map((e, i) => i === targetIdx ? { ...e, hand: e.hand.filter((_, idx) => idx !== rIdx) } : e));
            }
        } else if (card.id === CARD_TYPES.ARROW) {
            addLog(`🏹 祭出【漫天花雨】！众妖受创！`);
            enemies.forEach((_, idx) => {
                setTimeout(() => applyDamageToEnemy(idx, 1, '【漫天花雨】'), 500);
            });
        }
    };

    const checkEndTurn = () => {
        const excess = getExcessCardsCount();
        if (excess > 0) {
            setPhase('PLAYER_DISCARD');
            addLog(`🏮 需弃置 ${excess} 张牌`);
        } else {
            startAiTurn();
        }
    };

    const confirmDiscard = () => {
        const excess = getExcessCardsCount();
        if (discardSelection.length !== excess) return;
        setPlayer(p => ({ ...p, hand: p.hand.filter(c => !discardSelection.includes(c.uid)) }));
        setDiscardSelection([]);
        startAiTurn();
    };

    // AI回合逻辑：两个妖王轮流行动
    const startAiTurn = async () => {
        setPhase('AI_TURN');
        for (let i = 0; i < enemiesRef.current.length; i++) {
            const enemy = enemiesRef.current[i];
            if (enemy.hp <= 0) continue; // 阵亡跳过

            addLog(`--- ${enemy.name} 的行动阶段 ---`, true);
            await delay(1000);

            // 被动：金角吸牌
            if (enemy.id === 'gold' && !enemy.isStunned && playerRef.current.hand.length > 0) {
                triggerTextAnim('收!', 'buff', i);
                const rIdx = Math.floor(Math.random() * playerRef.current.hand.length);
                const stolen = playerRef.current.hand[rIdx];
                setPlayer(p => ({ ...p, hand: p.hand.filter((_, idx) => idx !== rIdx) }));
                setEnemies(prev => prev.map((e, idx) => idx === i ? { ...e, hand: [...e.hand, stolen] } : e));
                await delay(800);
            }

            if (enemy.isStunned) {
                addLog(`🌀 ${enemy.name} 被定身，跳过行动`);
                setEnemies(prev => prev.map((e, idx) => idx === i ? { ...e, isStunned: false } : e));
                await delay(1000);
                continue;
            }

            drawCards(i, 2);
            await delay(1000);

            let attacked = false;
            let usedSkill = false;

            while (true) {
                if (playerRef.current.hp <= 0) break;
                const freshEnemy = enemiesRef.current[i];
                let playIdx = -1;

                // 简单的AI决策逻辑
                if (freshEnemy.hp < freshEnemy.maxHp) {
                    playIdx = freshEnemy.hand.findIndex(c => c.id === CARD_TYPES.HEAL || c.id === CARD_TYPES.HEAL_BIG);
                }
                if (playIdx === -1) playIdx = freshEnemy.hand.findIndex(c => c.type === 'weapon' || c.type === 'armor');
                if (playIdx === -1 && !attacked) playIdx = freshEnemy.hand.findIndex(c => c.id === CARD_TYPES.ATTACK);

                if (playIdx > -1) {
                    const card = freshEnemy.hand[playIdx];
                    await playCardAsAi(i, card, playIdx);
                    if (card.id === CARD_TYPES.ATTACK) attacked = true;
                    await delay(1000);
                } else {
                    break;
                }
            }

            // 弃牌
            const finalEnemy = enemiesRef.current[i];
            if (finalEnemy.hand.length > finalEnemy.hp) {
                setEnemies(prev => prev.map((e, idx) => idx === i ? { ...e, hand: e.hand.slice(0, e.hp) } : e));
            }
        }
        startPlayerTurn();
    };

    const playCardAsAi = async (enemyIdx, card, cardIdxInHand) => {
        const enemy = enemiesRef.current[enemyIdx];
        setEnemies(prev => prev.map((e, idx) => idx === enemyIdx ? { ...e, hand: e.hand.filter((_, i) => i !== cardIdxInHand) } : e));
        triggerCardAnim(card, enemyIdx);

        if (card.id === CARD_TYPES.ATTACK) {
            let dmg = 1 + enemy.wine;
            if (enemy.id === 'redboy') dmg += 1;
            if (enemy.equips.weapon?.id === CARD_TYPES.EQUIP_WEAPON_SPEAR) dmg += 1;

            if (enemy.wine > 0) setEnemies(prev => prev.map((e, idx) => idx === enemyIdx ? { ...e, wine: 0 } : e));

            if (playerRef.current.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_GOLD) dmg = Math.max(0, dmg - 1);

            if (dmg > 0) {
                const res = await requestPlayerDodge(`${enemy.name} 发动攻击，是否闪避？`);
                if (res.dodged) {
                    triggerTextAnim('闪避！', 'dodge', 'player');
                    setPlayer(p => ({ ...p, hand: p.hand.filter((_, i) => i !== res.cardIdx) }));
                } else {
                    triggerTextAnim(`-${dmg}`, 'damage', 'player');
                    setPlayer(p => ({ ...p, hp: Math.max(0, p.hp - dmg) }));
                }
            }
        } else if (card.type === 'weapon' || card.type === 'armor') {
            setEnemies(prev => prev.map((e, idx) => {
                if (idx === enemyIdx) {
                    const newEquips = { ...e.equips };
                    if (card.type === 'weapon') newEquips.weapon = card;
                    else newEquips.armor = card;
                    return { ...e, equips: newEquips };
                }
                return e;
            }));
        } else if (card.id === CARD_TYPES.HEAL || card.id === CARD_TYPES.HEAL_BIG) {
            const amt = card.id === CARD_TYPES.HEAL_BIG ? 2 : 1;
            setEnemies(prev => prev.map((e, idx) => idx === enemyIdx ? { ...e, hp: Math.min(e.maxHp, e.hp + amt) } : e));
            triggerTextAnim(`+${amt}`, 'heal', enemyIdx);
        }
    };

    if (gameState === 'MENU_PLAYER') {
        return <GameMenu gameState={gameState} setGameState={setGameState} setSelectedPlayerDef={setSelectedPlayerDef} />;
    }

    // 自定义的妖王多选菜单
    if (gameState === 'MENU_ENEMY') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
                <h2 className="text-3xl font-black mb-4 text-yellow-500">选择两位要挑战的妖王</h2>
                <div className="text-stone-400 mb-8">已选择: {selectedEnemyDefs.length} / 2</div>
                <div className="flex gap-4 flex-wrap justify-center max-w-6xl">
                    {ENEMY_CHARACTERS.map(char => {
                        const isSelected = selectedEnemyDefs.find(s => s.id === char.id);
                        return (
                            <button
                                key={char.id}
                                onClick={() => {
                                    if (isSelected) setSelectedEnemyDefs(prev => prev.filter(p => p.id !== char.id));
                                    else if (selectedEnemyDefs.length < 2) setSelectedEnemyDefs(prev => [...prev, char]);
                                }}
                                className={`flex flex-col items-center w-48 p-4 bg-stone-800 border-4 rounded-3xl transition-all ${isSelected ? 'border-yellow-500 scale-105' : 'border-stone-700 opacity-60'}`}
                            >
                                <div className="text-5xl mb-2">{char.avatar}</div>
                                <div className="font-bold">{char.name}</div>
                            </button>
                        );
                    })}
                </div>
                {selectedEnemyDefs.length === 2 && (
                    <button
                        onClick={() => initGame(selectedEnemyDefs)}
                        className="mt-12 bg-yellow-600 px-12 py-4 rounded-full font-black text-xl hover:bg-yellow-500 animate-bounce shadow-2xl"
                    >
                        开始讨伐
                    </button>
                )}
                <button onClick={() => setGameState('MENU_PLAYER')} className="mt-8 text-stone-500 underline">返回</button>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col h-screen bg-stone-200 overflow-hidden">
            {/* 顶部：双妖王显示 */}
            <div className="relative z-20 bg-stone-800 text-white p-4 flex justify-between items-center shadow-xl">
                <div className="flex gap-8">
                    {enemies.map((enemy, idx) => (
                        <div
                            key={idx}
                            onClick={() => enemy.hp > 0 && setTargetIdx(idx)}
                            className={`flex items-start gap-3 p-2 rounded-2xl transition-all border-2 cursor-pointer ${
                                enemy.hp <= 0 ? 'opacity-30 grayscale' :
                                    targetIdx === idx ? 'border-yellow-500 bg-stone-700 ring-4 ring-yellow-500/20 shadow-2xl' : 'border-transparent hover:bg-stone-700/50'
                            }`}
                        >
                            <div className="relative text-4xl bg-stone-600 w-14 h-14 flex items-center justify-center rounded-full border border-stone-500">
                                {enemy.avatar}
                                {targetIdx === idx && enemy.hp > 0 && <Target className="absolute text-yellow-400 -top-1 -right-1 animate-pulse" size={20} />}
                                {enemy.hp <= 0 && <div className="absolute inset-0 flex items-center justify-center text-red-500 font-black text-xs rotate-12">阵亡</div>}
                            </div>
                            <div>
                                <div className="font-bold flex items-center gap-2">
                                    {enemy.name}
                                    <span className="text-[10px] bg-stone-900 px-1.5 py-0.5 rounded">牌: {enemy.hand.length}</span>
                                </div>
                                <div className="flex gap-0.5 mt-1">
                                    {[...Array(enemy.maxHp)].map((_, i) => (
                                        <Heart key={i} size={12} fill={i < enemy.hp ? "#ef4444" : "transparent"} color="#ef4444" />
                                    ))}
                                </div>
                                <div className="flex gap-1 mt-1">
                                    <div className={`w-3 h-3 rounded-full border ${enemy.equips.weapon ? 'bg-rose-500' : 'bg-stone-600'}`} title="武器"></div>
                                    <div className={`w-3 h-3 rounded-full border ${enemy.equips.armor ? 'bg-amber-500' : 'bg-stone-600'}`} title="防具"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={() => setShowHistory(true)} className="px-4 py-2 bg-stone-700 rounded-xl font-bold border border-stone-600 flex items-center gap-2">
                    <ScrollText size={18} /> 战绩
                </button>
            </div>

            {/* 日志区 */}
            <div ref={logContainerRef} className="absolute inset-0 z-0 overflow-y-auto px-6 pt-40 pb-[42vh] scroll-smooth">
                <div className="flex flex-col items-center space-y-4 min-h-full">
                    <div className="flex-1"></div>
                    {currentTurnLogs.map((log, i) => (
                        <div key={i} className={`text-[15px] font-medium px-5 py-2 rounded-full shadow-sm max-w-lg w-full text-center ${
                            log.includes('===') ? 'bg-stone-300 text-stone-700 font-bold' : 'bg-white text-stone-800'
                        }`}>
                            {log}
                        </div>
                    ))}
                </div>
            </div>

            {/* 动画层 */}
            {animatingCard && (
                <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                    <div className={`animate-in zoom-in-[2] duration-300 w-48 h-64 border-4 rounded-3xl shadow-2xl ${animatingCard.card.bg} ${animatingCard.card.border} flex flex-col items-center justify-center p-4`}>
                        <div className={`font-black text-2xl mb-2 ${animatingCard.card.color}`}>{animatingCard.card.name}</div>
                        <animatingCard.card.icon size={60} className={animatingCard.card.color} />
                    </div>
                </div>
            )}

            {/* 底部操作区 */}
            <div className={`absolute bottom-0 left-0 right-0 h-[40vh] flex flex-row z-20 p-4 backdrop-blur-md border-t transition-all duration-500 ${
                phase === 'PLAYER_DISCARD' ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-stone-200'
            }`}>

                <div className="flex-1 min-w-0 h-full relative pr-4">
                    <div ref={scrollRef} className="absolute inset-0 flex flex-nowrap gap-3 overflow-x-auto scrollbar-hide items-end pb-2 px-2">
                        {player.hand.map((card) => {
                            const isSelected = phase === 'PLAYER_DISCARD' && discardSelection.includes(card.uid);
                            return (
                                <GameCard
                                    key={card.uid}
                                    card={card}
                                    phase={phase}
                                    isSelected={isSelected}
                                    canConfirmDiscard={discardSelection.length === getExcessCardsCount()}
                                    onClick={() => handlePlayCard(card)}
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="w-auto flex flex-col justify-between items-end pl-4 border-l border-stone-300/30">
                    <div className="flex flex-col items-end gap-3">
                        {phase === 'PLAYER_PLAY' && (
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={handlePlayerActiveSkill}
                                    disabled={hasUsedActiveSkill}
                                    className={`flex items-center gap-1 px-5 py-3 rounded-2xl font-black shadow-lg ${!hasUsedActiveSkill ? 'bg-indigo-600 text-white' : 'bg-stone-300 text-stone-500'}`}
                                >
                                    <Zap size={18} /> 发动技能
                                </button>
                                <button onClick={checkEndTurn} className="bg-stone-900 text-white px-8 py-3 rounded-2xl font-black shadow-xl">
                                    结束出牌
                                </button>
                            </div>
                        )}

                        {phase === 'PLAYER_RESPONSE' && promptState && (
                            <div className="flex items-center gap-3">
                                <div className="text-blue-800 bg-blue-50 px-4 py-2 rounded-xl font-bold border-2 border-blue-600">{promptState.message}</div>
                                <button onClick={() => { setPhase('AI_TURN'); if (responseResolver.current) responseResolver.current({ dodged: false }); }} className="bg-stone-700 text-white px-6 py-2 rounded-xl">放弃</button>
                            </div>
                        )}

                        {phase === 'PLAYER_DISCARD' && (
                            <button onClick={confirmDiscard} className="bg-red-600 text-white px-10 py-3 rounded-2xl font-black shadow-xl">确认弃牌</button>
                        )}
                    </div>

                    <div className="flex flex-col items-end relative">
                        <button onClick={() => setIsPlayerInfoHidden(!isPlayerInfoHidden)} className="text-[10px] bg-stone-700 text-stone-300 px-3 py-1 rounded-t-lg">
                            {isPlayerInfoHidden ? '显示' : '隐藏'}
                        </button>
                        {!isPlayerInfoHidden && (
                            <div className="flex items-center gap-4 flex-row-reverse bg-white/60 p-2 rounded-2xl mt-1">
                                <div onClick={() => setShowSkillModal('player')} className="relative text-5xl bg-stone-100 w-16 h-16 flex items-center justify-center rounded-2xl border-2 border-stone-300 cursor-pointer">
                                    {player.avatar}
                                    {player.wine > 0 && <div className="absolute -top-3 -right-3 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300 animate-bounce shadow-md">伤害+{player.wine}</div>}
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">{player.name}</div>
                                    <div className="flex gap-0.5 justify-end">
                                        {[...Array(player.maxHp)].map((_, i) => (
                                            <Heart key={i} size={14} fill={i < player.hp ? "#ef4444" : "transparent"} color="#ef4444" />
                                        ))}
                                    </div>
                                    <div className="flex gap-1 mt-1 justify-end">
                                        <div className={`text-[9px] px-1 rounded border ${player.equips.weapon ? 'border-rose-400 text-rose-600' : 'border-stone-300 text-stone-400'}`}>🗡️</div>
                                        <div className={`text-[9px] px-1 rounded border ${player.equips.armor ? 'border-amber-400 text-amber-600' : 'border-stone-300 text-stone-400'}`}>🛡️</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showHistory && <HistoryModal logs={allHistoryLogs} onClose={() => setShowHistory(false)} />}
        </div>
    );
}