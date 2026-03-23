import React, { useState, useEffect, useRef } from 'react';
import {
    Heart, ScrollText, AlertCircle, RotateCcw, Check, Zap, Shield, X, Sword, Shirt, Search, Wind, CloudLightning
} from 'lucide-react';
import { CARD_TYPES, CARDS_DB, DECK_CONFIG, WEATHERS } from './config/gameConfig';
import GameMenu from './components/GameMenu';
import GameCard from './components/GameCard';
import HistoryModal from './components/HistoryModal';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export default function XiYouSha() {
    const scrollRef = useRef(null);
    const logContainerRef = useRef(null);
    const deckRef = useRef([]);

    const [gameState, setGameState] = useState('MENU_PLAYER');
    const [selectedPlayerDef, setSelectedPlayerDef] = useState(null);

    const [player, setPlayer] = useState({ id: '', def: null, hp: 4, maxHp: 4, hand: [], wine: 0, isStunned: false, equips: { weapon: null, armor: null }, buffs: {} });
    const [enemies, setEnemies] = useState([]);

    // 新增：全局天气状态
    const [weather, setWeather] = useState(WEATHERS.NORMAL);

    const playerRef = useRef(player);
    const enemiesRef = useRef(enemies);
    const weatherRef = useRef(weather);
    const isGameStartedRef = useRef(false);
    useEffect(() => { playerRef.current = player; }, [player]);
    useEffect(() => { enemiesRef.current = enemies; }, [enemies]);
    useEffect(() => { weatherRef.current = weather; }, [weather]);

    const [phase, setPhase] = useState('IDLE');
    const [hasAttacked, setHasAttacked] = useState(false);
    const [hasUsedActiveSkill, setHasUsedActiveSkill] = useState(false);

    const [pendingCard, setPendingCard] = useState(null);
    const [pendingSkill, setPendingSkill] = useState(null);

    const [promptState, setPromptState] = useState(null);
    const responseResolver = useRef(null);
    const [animatingCard, setAnimatingCard] = useState(null);
    const [animatingText, setAnimatingText] = useState(null);
    const [discardSelection, setDiscardSelection] = useState([]);

    const [currentTurnLogs, setCurrentTurnLogs] = useState([]);
    const [allHistoryLogs, setAllHistoryLogs] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showSkillModal, setShowSkillModal] = useState(null);
    const [isPlayerInfoHidden, setIsPlayerInfoHidden] = useState(false);
    const [showHandModal, setShowHandModal] = useState(null);

    const addLog = (msg, isNewRound = false) => {
        if (isNewRound) setCurrentTurnLogs([msg]);
        else setCurrentTurnLogs(prev => [...prev, msg]);
        setAllHistoryLogs(prev => [`[记录] ${msg}`, ...prev]);
    };

    const triggerCardAnim = (card, targetUid) => {
        setAnimatingCard({ card, targetUid, id: Date.now() });
        setTimeout(() => setAnimatingCard(null), 1200);
    };

    const triggerTextAnim = (text, type, targetUid) => {
        setAnimatingText({ text, type, targetUid, id: Date.now() });
        setTimeout(() => setAnimatingText(null), 1000);
    };

    const getAnimStyle = (uid, animType = 'text') => {
        if (uid === 'player') {
            return animType === 'text'
                ? { bottom: '35%', left: '50%', transform: 'translate(-50%, 0)' }
                : { bottom: '25%', left: '50%', transform: 'translate(-50%, 0)' };
        }
        const idx = enemiesRef.current.findIndex(e => e.uid === uid);
        if (idx === -1) return { top: '30%', left: '50%', transform: 'translate(-50%, -50%)' };

        const total = Math.max(1, enemiesRef.current.length);
        const step = 100 / total;
        const leftPercent = (step * idx) + (step / 2);

        return animType === 'text'
            ? { top: '15%', left: `${leftPercent}%`, transform: 'translate(-50%, -50%)' }
            : { top: '10%', left: `${leftPercent}%`, transform: 'translate(-50%, 0)' };
    };

    const requestPlayerResponse = (msg, options) => {
        return new Promise((resolve) => {
            const { anyCard, validIds } = options;
            let hasValidCard = false;

            if (anyCard) {
                hasValidCard = playerRef.current.hand.length > 0;
            } else if (validIds) {
                hasValidCard = playerRef.current.hand.some(c => validIds.includes(c.id));
            }

            if (!hasValidCard) {
                resolve({ provided: false });
                return;
            }

            setPhase('PLAYER_RESPONSE');
            setPromptState({ message: msg, ...options });
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

    const drawCards = (targetType, targetUid, count) => {
        if (deckRef.current.length < count + 5) deckRef.current = [...deckRef.current, ...createDeck()];
        const newCards = deckRef.current.slice(0, count);
        deckRef.current = deckRef.current.slice(count);

        if (targetType === 'player') {
            triggerTextAnim(`摸牌 +${count}`, 'buff', 'player');
            setPlayer(p => ({ ...p, hand: [...p.hand, ...newCards] }));
        } else {
            triggerTextAnim(`摸牌 +${count}`, 'buff', targetUid);
            setEnemies(prev => prev.map(e => e.uid === targetUid ? { ...e, hand: [...e.hand, ...newCards] } : e));
        }
    };

    const getExcessCardsCount = () => {
        let limit = Math.max(0, player.hp);
        if (player.id === 'bajie') limit += 2;
        return Math.max(0, player.hand.length - limit);
    };

    const initGame = (enemiesDefs) => {
        const newDeck = createDeck();
        const pHand = newDeck.splice(0, 4);

        const initEnemies = enemiesDefs.map(def => ({
            uid: Math.random().toString(36).substr(2, 9),
            def: def, hp: def.maxHp, maxHp: def.maxHp,
            hand: newDeck.splice(0, 4), wine: 0, isStunned: false,
            equips: { weapon: null, armor: null }, buffs: {}
        }));

        deckRef.current = newDeck;
        setPlayer({
            id: selectedPlayerDef.id, def: selectedPlayerDef,
            hp: selectedPlayerDef.maxHp, maxHp: selectedPlayerDef.maxHp,
            hand: pHand, wine: 0, isStunned: false, equips: { weapon: null, armor: null }, buffs: {}
        });
        setEnemies(initEnemies);
        setWeather(WEATHERS.NORMAL);

        setGameState('PLAYING');
        setPhase('IDLE');
        setDiscardSelection([]);
        setHasAttacked(false);
        isGameStartedRef.current = true;
        isGameOverLogged.current = false;
        processedDeadEnemies.current = new Set();

        addLog("=== 游戏开始 ===", true);
        addLog(`你化身为 ${selectedPlayerDef.name}，迎战 ${initEnemies.length} 位妖王！`);
        addLog("双方各摸 4 张牌...");

        setTimeout(startPlayerTurn, 1500);
    };

    const isGameOverLogged = useRef(false);
    const processedDeadEnemies = useRef(new Set());

    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        let anyDied = false;
        enemies.forEach(e => {
            if (e.hp <= 0 && !processedDeadEnemies.current.has(e.uid)) {
                processedDeadEnemies.current.add(e.uid);
                anyDied = true;
                addLog(`☠️ 妖王 ${e.def.name} 被击败了！`, true);
                setTimeout(() => {
                    addLog(`✨ 【斩妖除魔】获得喘息！恢复1点体力并摸3张牌！`);
                    setPlayer(p => ({...p, hp: Math.min(p.maxHp, p.hp + 1)}));
                    drawCards('player', null, 3);
                }, 800);
            }
        });

        const aliveEnemies = enemies.filter(e => e.hp > 0);
        if (anyDied) {
            setTimeout(() => setEnemies(aliveEnemies), 2000);
        }

        if (player.hp <= 0 && !isGameOverLogged.current) {
            isGameOverLogged.current = true;
            addLog("☠️ 你被击败了！游戏结束！", true);
            setTimeout(() => { setGameState('MENU_PLAYER'); isGameStartedRef.current = false; }, 3500);
        } else if (isGameStartedRef.current && aliveEnemies.length === 0 && !anyDied && !isGameOverLogged.current) {
            isGameOverLogged.current = true;
            addLog(`🎉 恭喜！你成功降伏了所有妖王！`, true);
            setTimeout(() => { setGameState('MENU_PLAYER'); isGameStartedRef.current = false; }, 3500);
        }
    }, [enemies, player.hp, gameState]);

    // 每轮开始改变天气
    const rollWeather = () => {
        const weatherKeys = Object.keys(WEATHERS);
        const randomKey = weatherKeys[Math.floor(Math.random() * weatherKeys.length)];
        const newWeather = WEATHERS[randomKey];
        setWeather(newWeather);

        if (newWeather.id !== 'NORMAL') {
            addLog(`🌁 天气异变：当前天气转为【${newWeather.name}】！`);
            addLog(`=> ${newWeather.effect}`);
        } else {
            addLog(`☀️ 阴云散去：当前天气转为【晴空万里】。`);
        }
    };

    const startPlayerTurn = () => {
        if (playerRef.current.hp <= 0 || enemiesRef.current.length === 0) return;

        setHasAttacked(false);
        setHasUsedActiveSkill(false);
        setDiscardSelection([]);
        setPendingCard(null);
        setPendingSkill(null);
        setPlayer(p => ({ ...p, wine: 0, buffs: {} }));

        const aliveCount = enemiesRef.current.filter(e=>e.hp > 0).length;
        const dynamicDraw = 1 + aliveCount;

        addLog(`=== 你的回合开始 (面对${aliveCount}名妖王) ===`, true);
        rollWeather();

        if (playerRef.current.id === 'xiaobailong') {
            if (playerRef.current.hp <= 2) {
                triggerTextAnim('真龙!', 'buff', 'player');
                addLog(`🐉 【龙族血脉】真龙觉醒！额外摸 2 张牌！`);
                drawCards('player', null, 2);
            } else if (playerRef.current.hp === 3) {
                triggerTextAnim('龙脉!', 'buff', 'player');
                addLog(`🐉 【龙族血脉】触发！额外摸 1 张牌！`);
                drawCards('player', null, 1);
            }
        }

        if (playerRef.current.id === 'wangmu' && playerRef.current.hp < playerRef.current.maxHp) {
            triggerTextAnim('蟠桃!', 'buff', 'player');
            addLog(`🍑 【蟠桃盛会】触发！额外摸 1 张牌！`);
            drawCards('player', null, 1);
        }

        if (playerRef.current.isStunned) {
            addLog(`🌀 你被定身咒禁锢，无法行动！`);
            setPlayer(p => ({ ...p, isStunned: false }));
            setTimeout(checkEndTurn, 1500);
            return;
        }

        setPhase('PLAYER_PLAY');
        addLog(`摸取了 ${dynamicDraw} 张牌`);
        drawCards('player', null, dynamicDraw);
    };

    const handlePlayerActiveSkill = async () => {
        if (hasUsedActiveSkill || phase !== 'PLAYER_PLAY') return;
        const pid = player.id;
        let success = false;

        if (pid === 'wukong') {
            if (player.hp >= 3 && player.hand.length === 0) return addLog("⚠️ 体力充沛时，需要1张手牌来发动【火眼金睛】");
            const aliveEnemies = enemiesRef.current.filter(e => e.hand.length > 0 && e.hp > 0);
            if (aliveEnemies.length > 0) {
                if (player.hp >= 3) {
                    setPlayer(p => ({ ...p, hand: p.hand.filter((_, i) => i !== Math.floor(Math.random() * p.hand.length)) }));
                    addLog(`🐵 弃置1张手牌发动【火眼金睛】！`);
                } else {
                    addLog(`🐵 体力衰竭，无消耗发动【火眼金睛】！`);
                }
                const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
                const rIdx = Math.floor(Math.random() * target.hand.length);
                setEnemies(prev => prev.map(e => e.uid === target.uid ? {...e, hand: e.hand.filter((_, i) => i !== rIdx)} : e));
                triggerTextAnim('看破!', 'buff', target.uid);
                addLog(`洞察破绽，随机弃置了 ${target.def.name} 1 张手牌`);
                success = true;
            } else {
                addLog(`⚠️ 没有手中有牌的妖王，无法发动【火眼金睛】。`);
            }
        } else if (pid === 'bajie') {
            if (player.hp >= 4) {
                triggerTextAnim('-1', 'damage', 'player');
                setPlayer(p => ({...p, hp: p.hp - 1, wine: p.wine + 1}));
                addLog(`🐷 消耗 1 体力发动【蓄力一击】！下一击伤害+1！`);
            } else if (player.hp >= 2) {
                triggerTextAnim('-1', 'damage', 'player');
                setPlayer(p => ({...p, hp: p.hp - 1, wine: p.wine + 2}));
                addLog(`🐷 消耗 1 体力发动【蓄力一击】！下一击伤害+2！`);
            } else {
                triggerTextAnim('背水一击!', 'buff', 'player');
                setPlayer(p => ({...p, wine: p.wine + 2, buffs: {...p.buffs, lifesteal: true}}));
                addLog(`🐷 【背水一击】！无需消耗体力，下一击伤害+2且附带吸血！`);
            }
            success = true;
        } else if (pid === 'xiaobailong') {
            if (player.hand.length === 0) return addLog("⚠️ 没有手牌，无法发动【乘风破浪】");
            setPlayer(p => {
                const rIdx = Math.floor(Math.random() * p.hand.length);
                return { ...p, hand: p.hand.filter((_, i) => i !== rIdx) };
            });
            addLog(`🐉 发动【乘风破浪】弃置了 1 张手牌`);
            setTimeout(() => drawCards('player', null, 2), 500);
            success = true;
        } else if (pid === 'wangmu') {
            if (player.hp >= player.maxHp) return addLog("⚠️ 体力已满，无法发动【瑶池仙丹】");
            if (player.hand.length === 0) return addLog("⚠️ 没有手牌，无法发动【瑶池仙丹】");
            setPlayer(p => {
                const rIdx = Math.floor(Math.random() * p.hand.length);
                return { ...p, hp: p.hp + 1, hand: p.hand.filter((_, i) => i !== rIdx) };
            });
            triggerTextAnim('+1', 'heal', 'player');
            addLog(`🍑 发动【瑶池仙丹】！弃置1张手牌，恢复 1 点体力！`);
            success = true;
        } else if (pid === 'shaseng') {
            if (player.hp <= 1) return addLog("⚠️ 体力过低，无法发动【降妖宝杖】");
            setPendingSkill('shaseng');
            setPhase('PLAYER_CHOOSE_TARGET');
            addLog(`🧔 准备发动【降妖宝杖】，👆 请选择目标妖王`);
            return;
        } else if (pid === 'tangseng') {
            if (player.hp >= 3 && player.hand.length < 2) return addLog("⚠️ 体力充沛时，需弃置 2 张手牌发动【紧箍咒语】");
            if (player.hp <= 2 && player.hand.length < 1) return addLog("⚠️ 需弃置 1 张手牌发动【紧箍咒语】");

            if (player.hp === 1) {
                setPlayer(p => {
                    let newHand = [...p.hand];
                    newHand.splice(Math.floor(Math.random() * newHand.length), 1);
                    return { ...p, hand: newHand };
                });
                addLog(`📿 唐僧残血爆发，佛光普照！弃置1牌对所有妖王念动【紧箍咒语】！`);
                setHasUsedActiveSkill(true);

                await delay(800);
                let anyBoneHit = false;
                setEnemies(prev => prev.map(e => {
                    if (e.hp <= 0) return e;
                    if (e.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) {
                        addLog(`🛡️ ${e.def.name}的【锦襕袈裟】免疫了【紧箍咒语】！`);
                        return e;
                    }
                    triggerTextAnim('-1', 'damage', e.uid);
                    addLog(`💥 ${e.def.name}受到1点流失伤害！`);
                    if (e.def.id === 'bone') anyBoneHit = true;
                    return { ...e, hp: Math.max(0, e.hp - 1) };
                }));
                if (anyBoneHit) setTimeout(() => { drawCards('enemy', enemiesRef.current.find(e=>e.def.id==='bone').uid, 1); }, 500);
                return;
            } else {
                setPendingSkill('tangseng');
                setPhase('PLAYER_CHOOSE_TARGET');
                addLog(`📿 准备发动【紧箍咒语】，👆 请选择要念咒的目标妖王`);
                return;
            }
        }

        if (success) setHasUsedActiveSkill(true);
    };

    const processPlayerAttack = (baseDmg, sourceCardName, targetUid, isArrow = false) => {
        let dmg = baseDmg + playerRef.current.wine;
        let isArmorPiercing = false;
        let isUnblockable = false;

        // 天气：肃杀之气 (金属增强)
        if (weatherRef.current.id === 'METALLIC') {
            dmg += 1;
            addLog(`⚔️ 【天气加成】肃杀之气让金属性攻击伤害+1！`);
        }

        if (playerRef.current.id === 'wukong') {
            if (playerRef.current.hp === 1) {
                dmg += 1; isUnblockable = true; isArmorPiercing = true;
            } else if (playerRef.current.hp <= 3) {
                dmg += 1;
            }
        }
        if (!isArrow && playerRef.current.equips.weapon?.id === CARD_TYPES.EQUIP_WEAPON_STICK) isUnblockable = true;
        if (!isArrow && playerRef.current.equips.weapon?.id === CARD_TYPES.EQUIP_WEAPON_SPEAR) dmg += 1;
        if (playerRef.current.wine > 0) setPlayer(p => ({ ...p, wine: 0 }));

        const targetEnemy = enemiesRef.current.find(e => e.uid === targetUid);
        if (!targetEnemy) return;

        addLog(`⚔️ 对 ${targetEnemy.def.name} 发动${sourceCardName}！(面板伤害: ${dmg})`);

        setTimeout(() => {
            const ce = enemiesRef.current.find(e => e.uid === targetUid);
            if (!ce || ce.hp <= 0) return;
            let finalDmg = dmg;

            if (ce.def.id === 'ironfan') {
                finalDmg = Math.min(finalDmg, 1);
                addLog(`🪭 ${ce.def.name}【护体罡风】生效，将伤害化解至 ${finalDmg} 点`);
            }
            if (!isArrow && ce.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_GOLD) {
                if (isArmorPiercing) {
                    addLog(`🐵 孙悟空无视了 ${ce.def.name} 的【锁子黄金甲】！`);
                } else {
                    finalDmg = Math.max(0, finalDmg - 1);
                    addLog(`🛡️ ${ce.def.name}的【锁子黄金甲】强行抵消了 1 点伤害！`);
                }
            }

            if (finalDmg <= 0) {
                addLog(`✨ ${ce.def.name} 毫发无损，化解了此次攻击！`);
                return;
            }

            const actIdx = ce.hand.findIndex(c => c.id === CARD_TYPES.DODGE);

            if (actIdx > -1 && !isUnblockable) {
                triggerCardAnim(CARDS_DB[CARD_TYPES.DODGE], targetUid);
                triggerTextAnim('闪避！', 'dodge', targetUid);
                addLog(`🛡️ ${ce.def.name} 使用【腾云】躲开了`);
                setEnemies(prev => prev.map(e => e.uid === targetUid ? { ...e, hand: e.hand.filter((_, i) => i !== actIdx) } : e));

                // 天气：狂风大作 (风属性增强)
                if (weatherRef.current.id === 'STORM') {
                    addLog(`🌪️ 【天气加成】狂风大作！${ce.def.name} 腾云成功，额外摸 1 张牌！`);
                    drawCards('enemy', targetUid, 1);
                }
            } else {
                if (isUnblockable && actIdx > -1) {
                    addLog(`🐵 此招迅猛异常，强行打破了【腾云】闪避！`);
                }

                triggerTextAnim(`-${finalDmg}`, 'damage', targetUid);
                addLog(`💥 命中！${ce.def.name} 失去 ${finalDmg} 点体力`);
                setEnemies(prev => prev.map(e => e.uid === targetUid ? { ...e, hp: Math.max(0, e.hp - finalDmg) } : e));

                if (playerRef.current.id === 'bajie' && playerRef.current.buffs?.lifesteal) {
                    setTimeout(() => {
                        triggerTextAnim('+1', 'heal', 'player');
                        setPlayer(p => ({...p, hp: Math.min(p.maxHp, p.hp + 1), buffs: {...p.buffs, lifesteal: false}}));
                        addLog(`🐷 【背水一击】吸血生效，恢复 1 点体力！`);
                    }, 400);
                }

                if (ce.def.id === 'bull' && playerRef.current.hand.length > ce.hand.length) {
                    setTimeout(() => {
                        triggerTextAnim('震落!', 'buff', targetUid);
                        addLog(`🐂 ${ce.def.name}【蛮牛护体】！你的手牌多于它，被震落了 1 张手牌！`);
                        setPlayer(p => {
                            if (p.hand.length > 0) {
                                const rIdx = Math.floor(Math.random() * p.hand.length);
                                return { ...p, hand: p.hand.filter((_, i) => i !== rIdx) };
                            }
                            return p;
                        });
                    }, 500);
                }

                if (ce.def.id === 'bone') {
                    setTimeout(() => {
                        triggerTextAnim('遗恨!', 'buff', targetUid);
                        addLog(`💀 【遗恨】生效！${ce.def.name}摸取 1 张牌！`);
                        drawCards('enemy', targetUid, 1);
                    }, 500);
                }
            }
        }, 800);
    };

    const handlePlayCard = (card) => {
        if (phase === 'PLAYER_RESPONSE') {
            const isValid = promptState.anyCard || (promptState.validIds && promptState.validIds.includes(card.id));
            if (!isValid) {
                addLog("⚠️ 此牌无法用于当前的响应！");
                return;
            }
            setPhase('ENEMY_TURN');
            setPromptState(null);
            const idx = player.hand.findIndex(c => c.uid === card.uid);
            if (responseResolver.current) responseResolver.current({ provided: true, cardIdx: idx, card: card });
            return;
        }

        if (phase === 'PLAYER_DISCARD') {
            const excess = getExcessCardsCount();
            setDiscardSelection(prev => {
                if (prev.includes(card.uid)) return prev.filter(uid => uid !== card.uid);
                if (prev.length < excess) return [...prev, card.uid];
                if (prev.length === excess && excess > 0) return [...prev.slice(1), card.uid];
                return prev;
            });
            return;
        }

        if (phase !== 'PLAYER_PLAY') return;

        const canAttackMultiple = player.buffs?.wheelsActive;
        if (card.id === CARD_TYPES.ATTACK && hasAttacked && !canAttackMultiple) return addLog("⚠️ 本回合已出过【降妖】(可使用【风火轮】解除)");
        if ((card.id === CARD_TYPES.HEAL || card.id === CARD_TYPES.HEAL_BIG) && player.hp >= player.maxHp) return addLog("⚠️ 体力已满");
        if (card.id === CARD_TYPES.DODGE) return addLog("⚠️ 【腾云】需在特定时刻响应打出");
        if (card.id === CARD_TYPES.WINE && player.wine > 0) return addLog("⚠️ 药效还在，不可叠加使用");

        const targetingCards = [CARD_TYPES.ATTACK, CARD_TYPES.STUN, CARD_TYPES.STEAL, CARD_TYPES.DESTROY, CARD_TYPES.PIERCE, CARD_TYPES.MIRROR];
        if (targetingCards.includes(card.id)) {
            setPendingCard(card);
            setPhase('PLAYER_CHOOSE_TARGET');
            addLog(`👆 请点击上方选择要对哪位妖王使用 ${card.name}`);
            return;
        }

        executeCardPlayer(card, null);
    };

    const executeCardPlayer = async (card, targetUid) => {
        const newHand = player.hand.filter(c => c.uid !== card.uid);
        setPlayer(p => ({ ...p, hand: newHand }));
        triggerCardAnim(card, 'player');

        if (card.type === 'weapon') {
            setPlayer(p => ({ ...p, equips: { ...p.equips, weapon: card } }));
            addLog(`🗡️ 你装备了武器 ${card.name}`);
        } else if (card.type === 'armor') {
            setPlayer(p => ({ ...p, equips: { ...p.equips, armor: card } }));
            addLog(`🛡️ 你装备了防具 ${card.name}`);
        } else if (card.id === CARD_TYPES.ATTACK) {
            setHasAttacked(true);
            processPlayerAttack(1, '【降妖】', targetUid);
        } else if (card.id === CARD_TYPES.HEAL || card.id === CARD_TYPES.HEAL_BIG) {
            const amount = card.id === CARD_TYPES.HEAL_BIG ? 2 : 1;
            triggerTextAnim(`+${amount}`, 'heal', 'player');
            setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + amount) }));
            addLog(`🍎 你使用了${card.name}，恢复了 ${amount} 点体力`);

            if (player.id === 'shaseng') setTimeout(() => { addLog("🧔 【任劳任怨】生效！额外化得 1 张手牌！"); drawCards('player', null, 1); }, 400);
            if (player.id === 'tangseng') setTimeout(() => { addLog("📿 【慈悲】生效！佛光普照，额外摸取 1 张手牌！"); drawCards('player', null, 1); }, 400);

            // 天气：瓢泼大雨 (水/木属性增强)
            if (weather.id === 'RAIN') {
                setTimeout(() => { addLog("🌧️ 【天气加成】瓢泼大雨万物生发，额外摸 1 张牌！"); drawCards('player', null, 1); }, 600);
            }

        } else if (card.id === CARD_TYPES.SCAN) {
            const drawCount = weather.id === 'THUNDERSTORM' ? 3 : 2;
            if (drawCount === 3) addLog("⚡ 【天气加成】电闪雷鸣，神眼洞穿！摸3张牌！");
            else addLog("👁️ 火眼金睛！额外摸2张牌");
            drawCards('player', null, drawCount);
        } else if (card.id === CARD_TYPES.WINE) {
            const buffAmount = weather.id === 'SCORCHING' ? 2 : 1;
            triggerTextAnim('蓄力！', 'buff', 'player');
            setPlayer(p => ({ ...p, wine: p.wine + buffAmount }));
            if (buffAmount === 2) addLog("🔥 【天气加成】烈日炎炎烘烤金丹！下一张【降妖】伤害将惊人地 +2！");
            else addLog("💊 你饮下了【九转金丹】，下一张【降妖】伤害将 +1！");
        } else if (card.id === CARD_TYPES.WHEELS) {
            const extraDraw = weather.id === 'SCORCHING' ? 2 : 1;
            triggerTextAnim('疾风！', 'buff', 'player');
            setPlayer(p => ({ ...p, buffs: { ...p.buffs, wheelsActive: true } }));
            if (extraDraw === 2) addLog("🔥 【天气加成】烈日炎炎借火势！出招限制解除，额外摸 2 张牌！");
            else addLog("🔥 踏上【风火轮】！出招限制解除，并摸 1 张牌！");
            drawCards('player', null, extraDraw);
        } else if (card.id === CARD_TYPES.ARROW) {
            addLog(`🏹 祭出【漫天花雨】！无差别范围攻击...`);
            await delay(800);
            for (let enemy of enemiesRef.current) {
                if (enemy.hp <= 0) continue;
                if (enemy.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) {
                    addLog(`🛡️ ${enemy.def.name}的【锦襕袈裟】散发佛光，防住了【漫天花雨】！`);
                    continue;
                }

                // 处理满天花雨（也是攻击判定）
                processPlayerAttack(1, '【漫天花雨】', enemy.uid, true);
                await delay(800);
            }
        } else if (card.id === CARD_TYPES.STUN) {
            const te = enemiesRef.current.find(e => e.uid === targetUid);
            triggerTextAnim('定身！', 'buff', targetUid);
            setEnemies(prev => prev.map(e => e.uid === targetUid ? { ...e, isStunned: true } : e));
            addLog(`✨ 对 ${te.def.name} 施展了定身咒`);

            // 天气：电闪雷鸣 (雷属性增强)
            if (weather.id === 'THUNDERSTORM') {
                setTimeout(() => {
                    triggerTextAnim('-1', 'damage', targetUid);
                    addLog(`⚡ 【天气加成】雷霆之怒附着于定身咒！${te.def.name} 受到 1 点伤害！`);
                    setEnemies(prev => prev.map(e => e.uid === targetUid ? { ...e, hp: Math.max(0, e.hp - 1) } : e));
                }, 600);
            }
        } else if (card.id === CARD_TYPES.PIERCE) {
            const te = enemiesRef.current.find(e => e.uid === targetUid);
            if (te.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) {
                addLog(`🛡️ ${te.def.name}的【锦襕袈裟】散发佛光，完美防御了【紧箍咒】！`);
            } else {
                let blockIdx = te.hand.findIndex(c => c.id === CARD_TYPES.DODGE);
                if (blockIdx === -1) blockIdx = te.hand.findIndex(c => c.id === CARD_TYPES.ATTACK);

                if (blockIdx > -1) {
                    const blockCard = te.hand[blockIdx];
                    triggerCardAnim(blockCard, targetUid);
                    addLog(`🛡️ ${te.def.name} 弃置了【${blockCard.name}】抵御了紧箍咒！`);
                    setEnemies(prev => prev.map(e => e.uid === targetUid ? { ...e, hand: e.hand.filter((_, i) => i !== blockIdx) } : e));
                } else {
                    const dmg = weather.id === 'THUNDERSTORM' ? 2 : 1;
                    triggerTextAnim(`-${dmg}`, 'damage', targetUid);
                    if (dmg === 2) addLog(`⚡ 【天气加成】惊雷轰顶！你念动【紧箍咒】，${te.def.name}无牌可挡，受到 2 点流失伤害！`);
                    else addLog(`📿 你念动【紧箍咒】，${te.def.name}无牌可挡，受到 1 点流失伤害！`);

                    setEnemies(prev => prev.map(e => e.uid === targetUid ? { ...e, hp: Math.max(0, e.hp - dmg) } : e));
                    if (te.def.id === 'bone') setTimeout(() => { drawCards('enemy', targetUid, 1); }, 500);
                }
            }
        } else if (card.id === CARD_TYPES.MIRROR) {
            const te = enemiesRef.current.find(e => e.uid === targetUid);
            const handNames = te.hand.map(c => c.name).join(', ') || '空空如也';
            addLog(`🔍 【照妖镜】展示了 ${te.def.name} 的所有手牌：${handNames}`);

            setShowHandModal({ title: `${te.def.name} 的手牌 (被照妖镜看破)`, cards: te.hand });

            const dodgesRemoved = te.hand.filter(c => c.id === CARD_TYPES.DODGE).length;
            if (dodgesRemoved > 0) {
                triggerTextAnim('破法！', 'buff', targetUid);
                addLog(`✨ 强行销毁了其中的 ${dodgesRemoved} 张【腾云】！`);
                setEnemies(prev => prev.map(e => e.uid === targetUid ? { ...e, hand: e.hand.filter(c => c.id !== CARD_TYPES.DODGE) } : e));
            } else {
                addLog(`⚠️ 但是并没有发现【腾云】。`);
            }
        } else if (card.id === CARD_TYPES.STEAL) {
            const te = enemiesRef.current.find(e => e.uid === targetUid);
            if (te && te.hand.length > 0) {
                triggerTextAnim('窃取！', 'buff', 'player');
                const stealCount = (weather.id === 'RAIN' && te.hand.length >= 2) ? 2 : 1;

                let tHand = [...te.hand];
                let stolenCards = [];
                for(let i=0; i<stealCount; i++) {
                    if(tHand.length > 0) {
                        const idx = Math.floor(Math.random() * tHand.length);
                        stolenCards.push(tHand.splice(idx, 1)[0]);
                    }
                }

                if (stealCount === 2) addLog(`🌧️ 【天气加成】大雨瓢泼乘水摸鱼！窃取了 ${te.def.name} 2 张手牌`);
                else addLog(`🧲 使用【探囊取物】，窃取了 ${te.def.name} 1 张手牌`);

                setPlayer(p => ({ ...p, hand: [...p.hand, ...stolenCards] }));
                setEnemies(prev => prev.map(e => e.uid === targetUid ? { ...e, hand: tHand } : e));
            } else {
                addLog(`⚠️ ${te.def.name} 手里已经没牌了`);
            }
        } else if (card.id === CARD_TYPES.DESTROY) {
            const te = enemiesRef.current.find(e => e.uid === targetUid);
            if (te && te.hand.length > 0) {
                triggerTextAnim('摧毁！', 'buff', 'player');
                const destroyCount = (weather.id === 'STORM' && te.hand.length >= 2) ? 2 : 1;

                let tHand = [...te.hand];
                for(let i=0; i<destroyCount; i++) {
                    if(tHand.length > 0) tHand.splice(Math.floor(Math.random() * tHand.length), 1);
                }

                if (destroyCount === 2) addLog(`🌪️ 【天气加成】狂风大作！芭蕉扇威能大涨，吹飞了 ${te.def.name} 2 张手牌`);
                else addLog(`🌪️ 使用【芭蕉扇】，吹飞了 ${te.def.name} 1 张手牌`);

                setEnemies(prev => prev.map(e => e.uid === targetUid ? { ...e, hand: tHand } : e));
            } else {
                addLog(`⚠️ ${te.def.name} 手里已经没牌了`);
            }
        }
    };

    const handleEnemyClick = (targetUid) => {
        if (phase !== 'PLAYER_CHOOSE_TARGET') return;

        const targetEnemy = enemiesRef.current.find(e => e.uid === targetUid);
        if (!targetEnemy || targetEnemy.hp <= 0) return;

        setPhase('PLAYER_PLAY');

        if (pendingCard) {
            executeCardPlayer(pendingCard, targetUid);
            setPendingCard(null);
        } else if (pendingSkill) {
            if (pendingSkill === 'shaseng') {
                triggerTextAnim('-1', 'damage', 'player');
                setPlayer(p => ({...p, hp: p.hp - 1}));
                addLog(`🧔 消耗 1 体力发动【降妖宝杖】！`);
                processPlayerAttack(1, '【降妖宝杖】', targetUid);
            } else if (pendingSkill === 'tangseng') {
                const discardCount = playerRef.current.hp >= 3 ? 2 : 1;
                setPlayer(p => {
                    let newHand = [...p.hand];
                    for(let i=0; i<discardCount; i++) newHand.splice(Math.floor(Math.random()*newHand.length), 1);
                    return { ...p, hand: newHand };
                });

                if (targetEnemy.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) {
                    addLog(`🛡️ ${targetEnemy.def.name}的【锦襕袈裟】免疫了【紧箍咒语】！`);
                } else {
                    triggerTextAnim('-1', 'damage', targetUid);
                    setEnemies(prev => prev.map(e => e.uid === targetUid ? { ...e, hp: Math.max(0, e.hp - 1) } : e));
                    addLog(`📿 唐僧弃置${discardCount}张手牌发动【紧箍咒语】，${targetEnemy.def.name}无视防御受到 1 点流失伤害！`);
                    if (targetEnemy.def.id === 'bone') setTimeout(() => { drawCards('enemy', targetUid, 1); }, 500);
                }
            }
            setHasUsedActiveSkill(true);
            setPendingSkill(null);
        }
    };

    const cancelTargetSelection = () => {
        setPhase('PLAYER_PLAY');
        addLog(`取消了操作`);
        setPendingCard(null);
        setPendingSkill(null);
    };

    const checkEndTurn = () => {
        if (phase === 'PLAYER_CHOOSE_TARGET') cancelTargetSelection();
        const excess = getExcessCardsCount();
        if (excess > 0) {
            setPhase('PLAYER_DISCARD');
            setDiscardSelection([]);
            addLog(`🏮 弃牌阶段：需弃置 ${excess} 张牌`);
        } else {
            addLog(`🏮 结束回合`);
            startEnemiesTurn();
        }
    };

    const confirmDiscard = () => {
        const excess = getExcessCardsCount();
        if (discardSelection.length !== excess) return;

        const newHand = player.hand.filter(c => !discardSelection.includes(c.uid));
        setPlayer(p => ({ ...p, hand: newHand }));
        addLog(`🗑️ 弃置了 ${excess} 张牌，回合结束`);
        setDiscardSelection([]);
        startEnemiesTurn();
    };

    const startEnemiesTurn = async () => {
        setPhase('ENEMY_TURN');
        let i = 0;
        while(i < enemiesRef.current.length) {
            const ce = enemiesRef.current[i];
            if (ce && ce.hp > 0 && playerRef.current.hp > 0) {
                addLog(`--- ${ce.def.name} 的回合 ---`, true);
                await playSingleEnemyTurn(ce.uid);
                await delay(1200);
            }
            i++;
        }

        if (playerRef.current.hp > 0 && enemiesRef.current.filter(e => e.hp > 0).length > 0) {
            startPlayerTurn();
        }
    };

    const playSingleEnemyTurn = async (enemyUid) => {
        const getEnemy = () => enemiesRef.current.find(e => e.uid === enemyUid);
        if (!getEnemy() || getEnemy().hp <= 0) return;

        let aiHasUsedSkill = false;
        await delay(800);

        let ce = getEnemy();
        if (ce.def.id === 'gold' && !ce.isStunned && playerRef.current.hand.length > 0) {
            triggerTextAnim('紫金葫芦!', 'buff', ce.uid);
            setPlayer(p => {
                const idx = Math.floor(Math.random() * p.hand.length);
                const stolen = p.hand[idx];
                setEnemies(prev => prev.map(e => e.uid === ce.uid ? {...e, hand: [...e.hand, stolen]} : e));
                return { ...p, hand: p.hand.filter((_, i) => i !== idx) };
            });
            addLog(`✨ 【紫金葫芦】发威！${ce.def.name} 吸走了你 1 张手牌！`);
            await delay(800);
        }

        ce = getEnemy();
        if (ce.def.id === 'bull' && !ce.isStunned) {
            if (ce.hp === 1) {
                aiHasUsedSkill = true;
                triggerTextAnim('死斗!', 'buff', ce.uid);
                addLog(`🐂 ${ce.def.name} 发动【死斗模式】！摸2张牌，下击伤害+2！`);
                drawCards('enemy', ce.uid, 2);
                setEnemies(prev => prev.map(e => e.uid === ce.uid ? {...e, wine: e.wine + 2, buffs: {...e.buffs, bullRage: true}} : e));
                await delay(800);
            } else if (ce.hp <= 3) {
                aiHasUsedSkill = true;
                triggerTextAnim('狂暴!', 'buff', ce.uid);
                addLog(`🐂 ${ce.def.name} 发动【狂暴】！额外摸1张牌，下击伤害+1！`);
                drawCards('enemy', ce.uid, 1);
                setEnemies(prev => prev.map(e => e.uid === ce.uid ? {...e, wine: e.wine + 1} : e));
                await delay(800);
            }
        }

        ce = getEnemy();
        if (ce.def.id === 'redboy' && !aiHasUsedSkill && ce.hp > 1 && !ce.isStunned) {
            if (playerRef.current.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) {
                addLog(`🔥 ${ce.def.name}试图发动【吐火】，但被【锦襕袈裟】完美防御！`);
            } else {
                aiHasUsedSkill = true;
                triggerTextAnim('吐火!', 'damage', 'player');
                addLog(`🔥 ${ce.def.name}消耗 1 点体力发动【吐火】！烧伤你 1 点体力！`);
                setEnemies(prev => prev.map(e => e.uid === ce.uid ? {...e, hp: e.hp - 1} : e));
                setPlayer(p => ({...p, hp: Math.max(0, p.hp - 1)}));
            }
            await delay(800);
        }

        ce = getEnemy();
        if (!ce || playerRef.current.hp <= 0 || ce.hp <= 0) return;

        if (ce.isStunned) {
            addLog(`🌀 ${ce.def.name}被定身，本回合无法行动！`);
            setEnemies(prev => prev.map(e => e.uid === ce.uid ? { ...e, isStunned: false } : e));
            return;
        }

        drawCards('enemy', ce.uid, 2);
        await delay(1000);

        let aiHasAttacked = false;

        while (true) {
            if (playerRef.current.hp <= 0) break;
            ce = getEnemy();
            if (!ce || ce.hp <= 0) break;

            let playIdx = -1;

            if (ce.def.id === 'gold' && !aiHasUsedSkill && ce.hand.length < ce.hp && ce.hp < ce.maxHp) {
                aiHasUsedSkill = true;
                triggerTextAnim('玉净瓶!', 'heal', ce.uid);
                addLog(`✨ ${ce.def.name}发动【玉净瓶】，恢复了 1 点体力！`);
                setEnemies(prev => prev.map(e => e.uid === ce.uid ? {...e, hp: e.hp + 1} : e));
                await delay(800);
                continue;
            }

            if (ce.def.id === 'bone' && !aiHasUsedSkill) {
                aiHasUsedSkill = true;
                triggerTextAnim('吸魂!', 'buff', ce.uid);
                if (ce.hp === 1) {
                    if (playerRef.current.hand.length > 0) {
                        const pHand = playerRef.current.hand;
                        const rIdx = Math.floor(Math.random() * pHand.length);
                        const stolen = pHand[rIdx];
                        addLog(`💀 【九阴白骨】！${ce.def.name}强行夺走你1张牌并恢复1点体力！`);
                        setPlayer(p => ({...p, hand: p.hand.filter((_, i) => i !== rIdx)}));
                        setEnemies(prev => prev.map(e => e.uid === ce.uid ? {...e, hp: Math.min(e.maxHp, e.hp + 1), hand: [...e.hand, stolen]} : e));
                    }
                } else if (ce.hp === 2) {
                    if (playerRef.current.hand.length > 0) {
                        const pHand = playerRef.current.hand;
                        const rIdx = Math.floor(Math.random() * pHand.length);
                        const dropped = pHand[rIdx];
                        addLog(`💀 ${ce.def.name}无消耗发动【吸魂】！随机弃置了你 1 张手牌`);
                        setPlayer(p => ({...p, hand: p.hand.filter((_, i) => i !== rIdx)}));
                        if (dropped.id === CARD_TYPES.ATTACK || dropped.id === CARD_TYPES.DODGE) {
                            addLog(`🩸 吸取精血，白骨精恢复 1 点体力！`);
                            setEnemies(prev => prev.map(e => e.uid === ce.uid ? {...e, hp: Math.min(e.maxHp, e.hp + 1)} : e));
                        }
                    }
                } else {
                    if (ce.hand.length > 0 && playerRef.current.hand.length > 0) {
                        const pHand = playerRef.current.hand;
                        const rIdx = Math.floor(Math.random() * pHand.length);
                        addLog(`💀 ${ce.def.name}弃置1牌发动【吸魂】！随机弃置了你 1 张手牌`);
                        setEnemies(prev => prev.map(e => e.uid === ce.uid ? {...e, hand: e.hand.filter((_, i) => i !== Math.floor(Math.random() * e.hand.length))} : e));
                        setPlayer(p => ({...p, hand: p.hand.filter((_, i) => i !== rIdx)}));
                    }
                }
                await delay(800);
                continue;
            }

            if (ce.def.id === 'spider' && !aiHasUsedSkill && ce.hand.length > 0 && playerRef.current.hand.length > 0) {
                if (playerRef.current.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) {
                    addLog(`🕸️ ${ce.def.name}试图发动【夺命蛛丝】，但被你的【锦襕袈裟】抵挡！`);
                } else {
                    aiHasUsedSkill = true;
                    triggerTextAnim('吐丝!', 'damage', 'player');
                    addLog(`🕸️ ${ce.def.name}发动【夺命蛛丝】！强制使你失去 1 张牌并受 1 点伤害！`);
                    setEnemies(prev => prev.map(e => {
                        if (e.uid === ce.uid) return {...e, hand: e.hand.filter((_, i) => i !== Math.floor(Math.random() * e.hand.length))};
                        return e;
                    }));
                    setPlayer(p => ({
                        ...p,
                        hand: p.hand.length > 0 ? p.hand.filter((_, i) => i !== Math.floor(Math.random() * p.hand.length)) : p.hand,
                        hp: Math.max(0, p.hp - 1)
                    }));
                }
                await delay(800);
            }

            if (ce.hp < ce.maxHp) {
                playIdx = ce.hand.findIndex(c => c.id === CARD_TYPES.HEAL_BIG);
                if (playIdx === -1) playIdx = ce.hand.findIndex(c => c.id === CARD_TYPES.HEAL);
            }
            if (playIdx === -1) playIdx = ce.hand.findIndex(c => c.type === 'weapon' || c.type === 'armor');
            if (playIdx === -1) playIdx = ce.hand.findIndex(c => [CARD_TYPES.SCAN, CARD_TYPES.DESTROY, CARD_TYPES.STEAL, CARD_TYPES.ARROW, CARD_TYPES.MIRROR, CARD_TYPES.PIERCE, CARD_TYPES.WHEELS].includes(c.id));
            if (playIdx === -1 && !playerRef.current.isStunned) playIdx = ce.hand.findIndex(c => c.id === CARD_TYPES.STUN);

            const aiCanAttackMultiple = ce.buffs?.wheelsActive;

            if (playIdx === -1 && ce.wine === 0 && (!aiHasAttacked || aiCanAttackMultiple)) {
                if (ce.hand.some(c => c.id === CARD_TYPES.ATTACK)) playIdx = ce.hand.findIndex(c => c.id === CARD_TYPES.WINE);
            }
            if (playIdx === -1 && (!aiHasAttacked || aiCanAttackMultiple)) playIdx = ce.hand.findIndex(c => c.id === CARD_TYPES.ATTACK);

            if (playIdx > -1) {
                const card = ce.hand[playIdx];
                await playCardAsAi(card, playIdx, ce.uid);
                if (card.id === CARD_TYPES.ATTACK) aiHasAttacked = true;
                await delay(1000);
            } else {
                break;
            }
        }

        ce = getEnemy();
        if (ce) {
            const excess = ce.hand.length - ce.hp;
            if (excess > 0) {
                addLog(`${ce.def.name} 弃置了 ${excess} 张牌`);
                setEnemies(prev => prev.map(e => e.uid === ce.uid ? { ...e, hand: e.hand.slice(0, Math.max(0, e.hp)), buffs: { ...e.buffs, wheelsActive: false } } : e));
            } else {
                addLog(`${ce.def.name} 结束了回合`);
                setEnemies(prev => prev.map(e => e.uid === ce.uid ? { ...e, buffs: { ...e.buffs, wheelsActive: false } } : e));
            }

            if (ce.def.id === 'spider' && playerRef.current.hp > 0) {
                if (ce.hp <= 2) {
                    addLog(`🕸️ ${ce.def.name} 触发【盘丝阵】！`);
                    const response = await requestPlayerResponse(`【盘丝阵】触发！请弃置任意1张牌挣脱，否则被定身并受毒伤！`, { anyCard: true });

                    if (response.provided) {
                        triggerTextAnim('挣脱！', 'dodge', 'player');
                        addLog(`💨 你弃置了【${response.card.name}】挣脱了蛛丝！`);
                        setPlayer(p => ({ ...p, hand: p.hand.filter((_, i) => i !== response.cardIdx) }));
                    } else {
                        triggerTextAnim('剧毒盘丝!', 'damage', 'player');
                        addLog(`🕸️ 挣脱失败！你被【定身】并受到 1 点毒伤！`);
                        setPlayer(p => ({...p, isStunned: true, hp: Math.max(0, p.hp - 1)}));
                    }
                }
            }
        }
    };

    const playCardAsAi = async (card, idx, enemyUid) => {
        setEnemies(prev => prev.map(e => e.uid === enemyUid ? { ...e, hand: e.hand.filter((_, i) => i !== idx) } : e));
        const ce = enemiesRef.current.find(e => e.uid === enemyUid);
        const aiName = ce.def.name;

        triggerCardAnim(card, enemyUid);

        if (card.type === 'weapon') {
            setEnemies(prev => prev.map(e => e.uid === enemyUid ? { ...e, equips: { ...e.equips, weapon: card } } : e));
            addLog(`🗡️ ${aiName} 装备了武器 ${card.name}`);
            return null;
        }
        if (card.type === 'armor') {
            setEnemies(prev => prev.map(e => e.uid === enemyUid ? { ...e, equips: { ...e.equips, armor: card } } : e));
            addLog(`🛡️ ${aiName} 装备了防具 ${card.name}`);
            return null;
        }

        if (card.id === CARD_TYPES.ATTACK) {
            let dmg = 1 + ce.wine;
            if (weatherRef.current.id === 'METALLIC') {
                dmg += 1;
                addLog(`⚔️ 【天气加成】肃杀之气让金属性攻击伤害+1！`);
            }
            if (ce.def.id === 'redboy') dmg += 1;
            if (ce.equips.weapon?.id === CARD_TYPES.EQUIP_WEAPON_SPEAR) dmg += 1;
            if (ce.wine > 0) setEnemies(prev => prev.map(e => e.uid === enemyUid ? { ...e, wine: 0 } : e));

            let isUnblockable = false;
            if (ce.equips.weapon?.id === CARD_TYPES.EQUIP_WEAPON_STICK) isUnblockable = true;

            addLog(`🔥 ${aiName} 祭出【降妖】袭来！(面板伤害${dmg})`);
            await delay(800);

            if (ce.def.id === 'ironfan') {
                triggerTextAnim('阴风阵阵!', 'buff', enemyUid);
                setPlayer(p => p.hand.length > 0 ? { ...p, hand: p.hand.filter((_, i) => i !== Math.floor(Math.random() * p.hand.length)) } : p);
                addLog(`🪭 ${aiName}【阴风阵阵】卷走了你 1 张手牌！`);
                await delay(500);
            }

            if (playerRef.current.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_GOLD) {
                dmg = Math.max(0, dmg - 1);
                addLog(`🛡️ 你的【锁子黄金甲】强制抵消了 1 点伤害！`);
            }

            if (dmg <= 0) {
                addLog(`✨ 你身披宝甲，毫发无损！`);
                return null;
            }

            if (isUnblockable) {
                addLog(`💥 ${aiName} 挥舞【混铁棍】，势大力沉，此击无法被闪避！`);
                triggerTextAnim(`-${dmg}`, 'damage', 'player');
                addLog(`🩸 你被击中，失去 ${dmg} 点体力`);
                setPlayer(p => ({ ...p, hp: Math.max(0, p.hp - dmg) }));
            } else {
                const response = await requestPlayerResponse(`${aiName} 对你发动【降妖】(伤害${dmg})，是否打出【腾云】？`, { validIds: [CARD_TYPES.DODGE] });

                if (response.provided) {
                    triggerCardAnim(CARDS_DB[CARD_TYPES.DODGE], 'player');
                    triggerTextAnim('闪避！', 'dodge', 'player');
                    addLog(`💨 你打出【腾云】，惊险躲开一击`);
                    setPlayer(p => ({ ...p, hand: p.hand.filter((_, i) => i !== response.cardIdx) }));

                    if (weatherRef.current.id === 'STORM') {
                        addLog(`🌪️ 【天气加成】狂风大作！你腾云成功，额外摸 1 张牌！`);
                        drawCards('player', null, 1);
                    }

                    if (ce.def.id === 'bull' && ce.buffs?.bullRage) {
                        setTimeout(() => {
                            addLog(`🐂 【死斗】追击！牛魔王强行震落了你 2 张手牌！`);
                            setPlayer(p => {
                                let newH = [...p.hand];
                                for(let j=0; j<2 && newH.length>0; j++) newH.splice(Math.floor(Math.random()*newH.length), 1);
                                return {...p, hand: newH};
                            });
                        }, 500);
                    }
                } else {
                    triggerTextAnim(`-${dmg}`, 'damage', 'player');
                    addLog(`🩸 你被击中，失去 ${dmg} 点体力`);
                    setPlayer(p => ({ ...p, hp: Math.max(0, p.hp - dmg) }));
                }
            }
        } else if (card.id === CARD_TYPES.HEAL || card.id === CARD_TYPES.HEAL_BIG) {
            const amount = card.id === CARD_TYPES.HEAL_BIG ? 2 : 1;
            triggerTextAnim(`+${amount}`, 'heal', enemyUid);
            addLog(`🍎 ${aiName} 服下${card.name}，体力恢复`);
            setEnemies(prev => prev.map(e => e.uid === enemyUid ? { ...e, hp: Math.min(e.maxHp, e.hp + amount) } : e));

            if (weatherRef.current.id === 'RAIN') {
                setTimeout(() => { addLog(`🌧️ 【天气加成】瓢泼大雨！${aiName} 额外摸 1 张牌！`); drawCards('enemy', enemyUid, 1); }, 600);
            }
        } else if (card.id === CARD_TYPES.SCAN) {
            const drawCount = weatherRef.current.id === 'THUNDERSTORM' ? 3 : 2;
            if (drawCount === 3) addLog(`⚡ 【天气加成】电闪雷鸣，${aiName} 神眼洞穿！摸3张牌！`);
            else addLog(`👁️ ${aiName} 施展【火眼金睛】，摸了 2 张牌`);
            drawCards('enemy', enemyUid, drawCount);
        } else if (card.id === CARD_TYPES.WINE) {
            const buffAmount = weatherRef.current.id === 'SCORCHING' ? 2 : 1;
            triggerTextAnim('蓄力！', 'buff', enemyUid);
            if (buffAmount === 2) addLog(`🔥 【天气加成】烈日炎炎！${aiName} 吞服金丹，下一招杀意暴增+2！`);
            else addLog(`💊 ${aiName} 吞服【九转金丹】，杀意暴增！`);
            setEnemies(prev => prev.map(e => e.uid === enemyUid ? { ...e, wine: e.wine + buffAmount } : e));
        } else if (card.id === CARD_TYPES.STUN) {
            triggerTextAnim('定身！', 'buff', 'player');
            addLog(`✨ ${aiName} 对你念动了【定身咒】！`);
            setPlayer(p => ({ ...p, isStunned: true }));

            if (weatherRef.current.id === 'THUNDERSTORM') {
                setTimeout(() => {
                    triggerTextAnim('-1', 'damage', 'player');
                    addLog(`⚡ 【天气加成】雷霆之怒！你被定身并受到 1 点雷击伤害！`);
                    setPlayer(p => ({...p, hp: Math.max(0, p.hp - 1)}));
                }, 600);
            }
        } else if (card.id === CARD_TYPES.WHEELS) {
            const extraDraw = weatherRef.current.id === 'SCORCHING' ? 2 : 1;
            triggerTextAnim('疾风！', 'buff', enemyUid);
            setEnemies(prev => prev.map(e => e.uid === enemyUid ? { ...e, buffs: { ...e.buffs, wheelsActive: true } } : e));
            if (extraDraw === 2) addLog(`🔥 【天气加成】烈日炎炎借火势！${aiName} 踏上风火轮，出招限制解除，额外摸2牌！`);
            else addLog(`🔥 ${aiName} 踏上【风火轮】，出招限制解除！`);
            drawCards('enemy', enemyUid, extraDraw);
            return null;
        } else if (card.id === CARD_TYPES.PIERCE) {
            if (playerRef.current.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) {
                addLog(`🛡️ 你的【锦襕袈裟】完美防御了【紧箍咒】！`);
            } else {
                const response = await requestPlayerResponse(`${aiName} 念动【紧箍咒】，请打出【腾云】或【降妖】抵御，否则流失体力！`, { validIds: [CARD_TYPES.DODGE, CARD_TYPES.ATTACK] });
                if (response.provided) {
                    triggerCardAnim(response.card, 'player');
                    addLog(`💨 你弃置了【${response.card.name}】，成功抵御了紧箍咒！`);
                    setPlayer(p => ({ ...p, hand: p.hand.filter((_, i) => i !== response.cardIdx) }));
                } else {
                    const dmg = weatherRef.current.id === 'THUNDERSTORM' ? 2 : 1;
                    triggerTextAnim(`-${dmg}`, 'damage', 'player');
                    if (dmg === 2) addLog(`⚡ 【天气加成】惊雷轰顶！避无可避，你受到 2 点流失伤害！`);
                    else addLog(`📿 避无可避，你受到 1 点流失伤害！`);
                    setPlayer(p => ({ ...p, hp: Math.max(0, p.hp - dmg) }));
                }
            }
        } else if (card.id === CARD_TYPES.MIRROR) {
            const pHandNames = playerRef.current.hand.map(c => c.name).join(', ') || '空空如也';
            addLog(`🔍 ${aiName} 祭出【照妖镜】，你的手牌被看光了：${pHandNames}`);

            setShowHandModal({ title: `你的手牌 (被 ${aiName} 的照妖镜看破)`, cards: playerRef.current.hand });

            setPlayer(p => {
                const dodgesRemoved = p.hand.filter(c => c.id === CARD_TYPES.DODGE).length;
                if (dodgesRemoved > 0) {
                    triggerTextAnim('破法！', 'buff', 'player');
                    addLog(`✨ 你被迫丢弃了其中的 ${dodgesRemoved} 张【腾云】！`);
                    return { ...p, hand: p.hand.filter(c => c.id !== CARD_TYPES.DODGE) };
                }
                return p;
            });
        } else if (card.id === CARD_TYPES.ARROW) {
            addLog(`🏹 ${aiName} 洒出【漫天花雨】！`);
            await delay(800);

            if (playerRef.current.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) {
                addLog(`🛡️ 你的【锦襕袈裟】将【漫天花雨】全部挡下！`);
                return null;
            }

            const response = await requestPlayerResponse(`${aiName} 洒出【漫天花雨】，是否打出【腾云】躲避？`, { validIds: [CARD_TYPES.DODGE] });

            if (response.provided) {
                triggerCardAnim(CARDS_DB[CARD_TYPES.DODGE], 'player');
                triggerTextAnim('闪避！', 'dodge', 'player');
                addLog(`💨 你打出【腾云】化险为夷`);
                setPlayer(p => ({ ...p, hand: p.hand.filter((_, i) => i !== response.cardIdx) }));

                // 天气：狂风大作
                if (weatherRef.current.id === 'STORM') {
                    addLog(`🌪️ 【天气加成】狂风大作！你腾云成功，额外摸 1 张牌！`);
                    drawCards('player', null, 1);
                }
            } else {
                let dmg = 1;
                if (weatherRef.current.id === 'METALLIC') {
                    dmg = 2;
                    addLog(`⚔️ 【天气加成】肃杀之气让飞刀更锋利！`);
                }
                triggerTextAnim(`-${dmg}`, 'damage', 'player');
                addLog(`🩸 避无可避，你失去 ${dmg} 点体力`);
                setPlayer(p => ({ ...p, hp: Math.max(0, p.hp - dmg) }));
            }
        } else if (card.id === CARD_TYPES.STEAL) {
            if (playerRef.current.hand.length > 0) {
                triggerTextAnim('窃取！', 'buff', enemyUid);
                const stealCount = (weatherRef.current.id === 'RAIN' && playerRef.current.hand.length >= 2) ? 2 : 1;

                let pHand = [...playerRef.current.hand];
                let stolenCards = [];
                for(let i=0; i<stealCount; i++) {
                    if(pHand.length > 0) {
                        const idx = Math.floor(Math.random() * pHand.length);
                        stolenCards.push(pHand.splice(idx, 1)[0]);
                    }
                }

                if (stealCount === 2) addLog(`🌧️ 【天气加成】大雨瓢泼乘水摸鱼！${aiName} 窃取了你 2 张手牌`);
                else addLog(`🧲 ${aiName} 使用【探囊取物】，窃走了你 1 张牌`);

                setEnemies(prev => prev.map(e => e.uid === enemyUid ? { ...e, hand: [...e.hand, ...stolenCards] } : e));
                setPlayer(p => ({ ...p, hand: pHand }));
            }
        } else if (card.id === CARD_TYPES.DESTROY) {
            if (playerRef.current.hand.length > 0) {
                triggerTextAnim('摧毁！', 'buff', enemyUid);
                const destroyCount = (weatherRef.current.id === 'STORM' && playerRef.current.hand.length >= 2) ? 2 : 1;

                let pHand = [...playerRef.current.hand];
                for(let i=0; i<destroyCount; i++) {
                    if(pHand.length > 0) pHand.splice(Math.floor(Math.random() * pHand.length), 1);
                }

                if (destroyCount === 2) addLog(`🌪️ 【天气加成】狂风大作！${aiName} 的芭蕉扇威力大增，吹飞了你 2 张牌`);
                else addLog(`🌪️ ${aiName} 挥舞【芭蕉扇】，扇飞了你 1 张牌`);

                setPlayer(p => ({ ...p, hand: pHand }));
            }
        }
        return null;
    };

    if (gameState.startsWith('MENU')) {
        return <GameMenu gameState={gameState} setGameState={setGameState} setSelectedPlayerDef={setSelectedPlayerDef} initGame={initGame} />;
    }

    const excessCards = getExcessCardsCount();
    const canConfirmDiscard = discardSelection.length === excessCards;

    return (
        <div className="relative flex flex-col h-screen bg-stone-200 overflow-hidden font-sans">

            {/* 顶栏天气系统悬浮窗 */}
            <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
                <div className={`px-4 py-2.5 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-500 
                    ${weather.id !== 'NORMAL' ? 'bg-stone-900/90 border-yellow-500/50 text-white shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-white/80 border-stone-300 text-stone-700'}`}>
                    <div className="font-black text-lg">{weather.name}</div>
                    {weather.effect && <div className="text-xs mt-1 text-yellow-400 font-bold max-w-[200px] leading-tight">{weather.effect}</div>}
                </div>
            </div>

            <div className="relative z-20 bg-stone-800 text-white p-4 flex flex-col items-center shadow-xl border-b border-stone-700">
                <div className="flex gap-4 w-full overflow-x-auto pb-2 scrollbar-hide justify-center px-4 ml-[220px]">
                    {enemies.map((enemy) => {
                        if (enemy.hp <= 0) return null;
                        return (
                            <div
                                key={enemy.uid}
                                className={`flex items-start gap-3 p-2.5 rounded-2xl border-4 transition-all min-w-[260px] max-w-[320px] shadow-lg
                                ${phase === 'PLAYER_CHOOSE_TARGET'
                                    ? 'border-yellow-400 bg-stone-700/80 cursor-pointer hover:bg-stone-600 hover:scale-105 animate-pulse shadow-[0_0_20px_rgba(250,204,21,0.3)]'
                                    : 'border-stone-600 bg-stone-900/40'}`}
                                onClick={() => handleEnemyClick(enemy.uid)}
                            >
                                <div className="relative text-5xl bg-stone-700 w-16 h-16 flex items-center justify-center rounded-xl border border-stone-500 flex-shrink-0 cursor-pointer hover:border-white transition-colors"
                                     onClick={(e) => { e.stopPropagation(); setShowSkillModal({type: 'enemy', entity: enemy}); }}>
                                    {enemy.def.avatar}
                                    {enemy.isStunned && <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-stone-900 font-bold text-[10px] px-1.5 rounded shadow">定身</div>}
                                    {enemy.wine > 0 && <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] px-1.5 rounded-full shadow animate-bounce">伤害+</div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-base flex items-center justify-between mb-1">
                                        <span className="truncate pr-1">{enemy.def.name}</span>
                                        <span className="text-[10px] text-stone-300 font-mono border border-stone-600 bg-stone-800 px-1.5 py-0.5 rounded flex-shrink-0">牌: {enemy.hand.length}</span>
                                    </div>
                                    <div className="flex items-center gap-0.5 mb-2 flex-wrap">
                                        {[...Array(Math.max(0, enemy.hp))].map((_, i) => <Heart key={i} size={14} fill="#ef4444" color="#ef4444" />)}
                                    </div>
                                    <div className="flex gap-1.5">
                                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${enemy.equips.weapon ? 'bg-rose-900/50 text-rose-300 border-rose-700' : 'bg-stone-700/50 text-stone-400 border-stone-600'}`}>
                                            🗡️ {enemy.equips.weapon ? enemy.equips.weapon.name : '无武器'}
                                        </div>
                                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${enemy.equips.armor ? 'bg-amber-900/50 text-amber-300 border-amber-700' : 'bg-stone-700/50 text-stone-400 border-stone-600'}`}>
                                            🛡️ {enemy.equips.armor ? enemy.equips.armor.name : '无防具'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )})}
                    {enemies.filter(e=>e.hp>0).length === 0 && <div className="text-stone-400 py-4 font-bold tracking-widest">妖王已全部被消灭</div>}
                </div>

                <button onClick={() => setShowHistory(true)} className="absolute right-4 top-4 flex items-center gap-2 px-3 py-2 bg-stone-700 rounded-xl hover:bg-stone-600 border border-stone-500 transition-colors shadow-lg z-30">
                    <ScrollText size={18} /> <span className="text-sm font-bold hidden sm:inline">战绩</span>
                </button>
            </div>

            {phase === 'PLAYER_CHOOSE_TARGET' && (
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center animate-in zoom-in fade-in">
                    <div className="bg-yellow-500/90 text-yellow-950 font-black text-xl px-8 py-4 rounded-full shadow-[0_0_40px_rgba(234,179,8,0.6)] mb-4 border-2 border-yellow-300 animate-pulse flex items-center gap-2">
                        👆 请点击上方选择目标妖王
                    </div>
                    <button
                        onClick={cancelTargetSelection}
                        className="bg-stone-800 text-stone-300 px-6 py-2.5 rounded-xl hover:bg-stone-700 hover:text-white font-bold shadow-xl border border-stone-600 transition-colors"
                    >
                        取消操作
                    </button>
                </div>
            )}

            <div ref={logContainerRef} className={`absolute inset-0 z-0 overflow-y-auto px-6 pt-40 pb-[42vh] scroll-smooth ${phase === 'PLAYER_CHOOSE_TARGET' ? 'opacity-30 blur-sm pointer-events-none' : ''} transition-all duration-300`}>
                <div className="flex flex-col items-center space-y-4 min-h-full">
                    <div className="flex-1"></div>
                    {currentTurnLogs.map((log, i) => (
                        <div key={i} className={`text-[15px] font-medium px-5 py-2.5 rounded-2xl shadow-sm max-w-lg w-full text-center ${
                            log.includes('===') ? 'bg-stone-300 text-stone-800 text-base font-bold my-3 shadow-md' :
                                log.includes('🌁') ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 text-base font-bold my-2 shadow-sm' :
                                    log.includes('---') ? 'bg-stone-200 text-stone-500 text-base font-bold my-2' :
                                        'bg-white text-stone-800 animate-in fade-in slide-in-from-bottom-2'
                        }`}>
                            {log}
                        </div>
                    ))}
                </div>
            </div>

            {animatingCard && (
                <div className="absolute inset-0 z-[60] flex pointer-events-none">
                    <div key={animatingCard.id} className={`
                        absolute animate-in zoom-in-[2] fade-in duration-300 ease-out
                        flex flex-col items-center justify-center
                        w-48 h-64 border-4 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.5)]
                        ${animatingCard.card.bg} ${animatingCard.card.border}
                    `} style={getAnimStyle(animatingCard.targetUid, 'card')}>
                        <div className={`font-black text-3xl mb-3 ${animatingCard.card.color}`}>{animatingCard.card.name}</div>
                        <animatingCard.card.icon size={80} className={`mx-auto my-3 ${animatingCard.card.color} animate-pulse`} />
                        <div className="text-xs text-stone-700 font-bold bg-white/80 p-2 rounded-xl px-3 text-center w-5/6">{animatingCard.card.desc}</div>
                    </div>
                </div>
            )}

            {animatingText && (
                <div className={`absolute z-[60] pointer-events-none font-black text-6xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] italic tracking-widest
                    animate-in zoom-in-50 slide-in-from-bottom-10 fade-in duration-500 ease-out
                    ${animatingText.type === 'damage' ? 'text-red-500' : ''}
                    ${animatingText.type === 'heal' ? 'text-green-400' : ''}
                    ${animatingText.type === 'dodge' ? 'text-blue-300' : ''}
                    ${animatingText.type === 'buff' ? 'text-amber-400' : ''}
                `} style={getAnimStyle(animatingText.targetUid, 'text')} key={animatingText.id}>
                    {animatingText.text}
                </div>
            )}

            <div className={`absolute bottom-0 left-0 right-0 h-[40vh] flex flex-row z-40 p-4 backdrop-blur-md border-t transition-all duration-500 ${
                phase === 'PLAYER_DISCARD' ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-stone-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]'
            }`}>
                <div className="flex-1 min-w-0 h-full relative pr-4">
                    <div ref={scrollRef} className="absolute inset-0 flex flex-nowrap gap-3 overflow-x-auto scrollbar-hide items-end pb-2 px-2">
                        {player.hand.map((card) => {
                            const isSelected = phase === 'PLAYER_DISCARD' && discardSelection.includes(card.uid);
                            const isValidResponse = phase === 'PLAYER_RESPONSE' && promptState && (promptState.anyCard || (promptState.validIds && promptState.validIds.includes(card.id)));
                            return (
                                <GameCard
                                    key={card.uid} card={card} phase={phase}
                                    isSelected={isSelected} canConfirmDiscard={canConfirmDiscard}
                                    isValidResponse={isValidResponse}
                                    onClick={() => handlePlayCard(card)}
                                />
                            );
                        })}
                        {player.hand.length === 0 && (
                            <div className="w-full text-center py-10 text-stone-400 italic flex items-end justify-center h-full pb-10">手中空空如也...</div>
                        )}
                    </div>
                </div>

                <div className="w-auto flex flex-col justify-between items-end pl-4 pointer-events-none border-l border-stone-300/30">
                    <div className="flex flex-col items-end gap-3 pointer-events-auto">
                        {phase === 'PLAYER_PLAY' && (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handlePlayerActiveSkill}
                                    disabled={hasUsedActiveSkill}
                                    className={`flex items-center gap-1 px-5 py-3 rounded-2xl font-black transition-all shadow-lg ${
                                        !hasUsedActiveSkill ? 'bg-indigo-600 text-white hover:bg-indigo-500 hover:-translate-y-1 active:scale-95' : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                                    }`}
                                >
                                    <Zap size={18} /> {hasUsedActiveSkill ? '技能已发动' : '发动技能'}
                                </button>
                                <button onClick={checkEndTurn} className="bg-stone-900 text-white px-8 py-3 rounded-2xl font-black hover:bg-black hover:-translate-y-1 active:scale-95 transition-all shadow-xl">
                                    结束出牌
                                </button>
                            </div>
                        )}

                        {phase === 'PLAYER_RESPONSE' && promptState && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-white bg-blue-800 px-5 py-3 rounded-2xl border-2 border-blue-600 font-bold animate-pulse shadow-lg shadow-blue-900/50">
                                    <Shield size={20} className="text-blue-300" />
                                    {promptState.message}
                                </div>
                                <button
                                    onClick={() => {
                                        setPhase('ENEMY_TURN');
                                        setPromptState(null);
                                        if (responseResolver.current) responseResolver.current({ provided: false });
                                    }}
                                    className="bg-stone-700 text-stone-200 px-8 py-3 rounded-2xl font-black hover:bg-stone-600 active:scale-95 transition-all shadow-lg"
                                >
                                    放弃响应
                                </button>
                            </div>
                        )}

                        {phase === 'PLAYER_DISCARD' && (
                            <div className="flex flex-col items-end gap-3">
                                <div className="flex items-center gap-2 text-white bg-slate-800 px-4 py-2 rounded-xl border border-slate-600 font-bold shadow-lg">
                                    <AlertCircle size={18} className="text-yellow-400" />
                                    弃置 <span className="text-yellow-400 mx-1">{excessCards}</span> 张牌
                                    <span className="text-slate-400 text-sm ml-2 font-normal">(已选 {discardSelection.length})</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {discardSelection.length > 0 && (
                                        <button onClick={() => setDiscardSelection([])} className="p-3 text-slate-300 hover:text-white bg-slate-700 rounded-2xl hover:bg-slate-600 transition-colors shadow-lg">
                                            <RotateCcw size={20} />
                                        </button>
                                    )}
                                    <button
                                        onClick={confirmDiscard}
                                        disabled={!canConfirmDiscard}
                                        className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all shadow-lg ${
                                            canConfirmDiscard ? 'bg-red-600 text-white hover:bg-red-500 hover:scale-105 active:scale-95 animate-pulse' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        }`}
                                    >
                                        <Check size={20} /> 确定弃牌
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-end relative pointer-events-auto">
                        <button
                            onClick={() => setIsPlayerInfoHidden(!isPlayerInfoHidden)}
                            className="absolute -top-6 right-0 text-[10px] bg-stone-700 text-stone-300 px-3 py-1 rounded-t-lg hover:text-white hover:bg-stone-600 transition-colors shadow-md"
                        >
                            {isPlayerInfoHidden ? '显示信息' : '隐藏信息'}
                        </button>

                        {!isPlayerInfoHidden ? (
                            <div className="flex items-center gap-4 flex-row-reverse text-right bg-white/60 p-2 pr-0 rounded-2xl mt-4">
                                <div className="relative text-5xl bg-stone-100 w-16 h-16 flex items-center justify-center rounded-2xl border-2 border-stone-300 shadow-inner cursor-pointer hover:border-yellow-500 hover:scale-105 transition-all flex-shrink-0"
                                     onClick={() => setShowSkillModal({type: 'player', entity: player})}>
                                    {player.def?.avatar}
                                    {player.wine > 0 && (
                                        <div className="absolute -top-3 -right-3 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300 animate-bounce shadow-md">
                                            伤害+{player.wine}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold text-lg flex items-center justify-end gap-2 text-stone-800">
                                        <span className={`text-xs font-bold mt-1 tracking-tighter mr-2 ${phase === 'PLAYER_DISCARD' ? 'text-slate-400' : 'text-stone-500'}`}>
                                            HP {player.hp} / {player.maxHp}
                                        </span>
                                        {player.def?.name}
                                    </div>
                                    <div className="flex gap-1 mt-1 mb-1 justify-end">
                                        {[...Array(Math.max(0, player.hp))].map((_, i) => <Heart key={i} size={18} fill="#ef4444" color="#ef4444" />)}
                                    </div>
                                    <div className="flex gap-2 text-[10px] justify-end">
                                        <div className="text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Zap size={10}/> {player.def?.activeName}</div>
                                        <div className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Shield size={10}/> {player.def?.passiveName}</div>
                                    </div>
                                    <div className="flex gap-2 mt-2 justify-end">
                                        <div className={`text-[11px] font-bold px-2 py-0.5 rounded border ${player.equips.weapon ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-stone-100 text-stone-400 border-stone-200'}`}>
                                            🗡️ {player.equips.weapon ? player.equips.weapon.name : '武器栏空'}
                                        </div>
                                        <div className={`text-[11px] font-bold px-2 py-0.5 rounded border ${player.equips.armor ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-stone-100 text-stone-400 border-stone-200'}`}>
                                            🛡️ {player.equips.armor ? player.equips.armor.name : '防具栏空'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative text-3xl bg-stone-100 w-12 h-12 flex items-center justify-center rounded-xl border-2 border-stone-300 shadow-md cursor-pointer hover:border-yellow-500 hover:scale-105 transition-all mt-2"
                                 onClick={() => setShowSkillModal({type: 'player', entity: player})}>
                                {player.def?.avatar}
                                <div className="absolute -bottom-2 -left-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border border-red-300 shadow">
                                    HP {player.hp}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showSkillModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={() => setShowSkillModal(null)}>
                    <div className="bg-stone-800 text-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border-4 border-stone-600 p-6 relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowSkillModal(null)} className="absolute top-4 right-4 p-2 hover:bg-stone-700 rounded-full text-stone-400 hover:text-white transition-colors"><X size={20}/></button>
                        <div className="flex flex-col items-center mt-2">
                            <div className="text-7xl mb-4 drop-shadow-lg">{showSkillModal.entity.def.avatar}</div>
                            <h3 className="text-2xl font-black mb-1 text-yellow-500">{showSkillModal.entity.def.name}</h3>
                            <div className="flex items-center gap-1 text-red-400 mb-6 font-mono text-sm">
                                <Heart size={14} fill="currentColor"/> 当前体力: {showSkillModal.entity.hp} / {showSkillModal.entity.def.maxHp}
                            </div>

                            <div className="w-full bg-stone-900/80 p-4 rounded-xl border border-stone-700 text-left mb-4">
                                <div className="text-yellow-400 text-sm font-black mb-2 flex items-center gap-1.5"><Zap size={16}/> {showSkillModal.entity.def.activeName}</div>
                                <div className="text-[13px] text-stone-300 leading-relaxed mb-5">{showSkillModal.entity.def.activeDesc}</div>

                                <div className="text-blue-400 text-sm font-black mb-2 flex items-center gap-1.5"><Shield size={16}/> {showSkillModal.entity.def.passiveName}</div>
                                <div className="text-[13px] text-stone-300 leading-relaxed">{showSkillModal.entity.def.passiveDesc}</div>
                            </div>

                            {(showSkillModal.entity.equips.weapon || showSkillModal.entity.equips.armor) && (
                                <div className="w-full bg-stone-900/50 p-3 rounded-xl border border-stone-600 text-left mt-2">
                                    <div className="text-stone-400 text-xs font-bold mb-3 border-b border-stone-700 pb-1">当前装备：</div>

                                    {showSkillModal.entity.equips.weapon && (
                                        <div className="mb-3">
                                            <div className="text-rose-400 text-sm font-black mb-1 flex items-center gap-1.5">
                                                <Sword size={14} /> {showSkillModal.entity.equips.weapon.name}
                                            </div>
                                            <div className="text-xs text-stone-400 leading-snug">{showSkillModal.entity.equips.weapon.desc}</div>
                                        </div>
                                    )}

                                    {showSkillModal.entity.equips.armor && (
                                        <div>
                                            <div className="text-amber-400 text-sm font-black mb-1 flex items-center gap-1.5">
                                                <Shirt size={14} /> {showSkillModal.entity.equips.armor.name}
                                            </div>
                                            <div className="text-xs text-stone-400 leading-snug">{showSkillModal.entity.equips.armor.desc}</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showHistory && (
                <HistoryModal logs={allHistoryLogs} onClose={() => setShowHistory(false)} />
            )}

            {showHandModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4" onClick={() => setShowHandModal(null)}>
                    <div className="bg-stone-800 text-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border-4 border-stone-600 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-stone-600 flex justify-between items-center bg-stone-900">
                            <h3 className="text-2xl font-black flex items-center gap-2 text-cyan-400">
                                <Search size={24} /> {showHandModal.title}
                            </h3>
                            <button onClick={() => setShowHandModal(null)} className="p-2 hover:bg-stone-700 rounded-full text-stone-400 hover:text-white transition-colors">
                                <X size={24}/>
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto bg-stone-800 flex-1 flex flex-wrap justify-center gap-6 items-center min-h-[300px]">
                            {showHandModal.cards.length === 0 ? (
                                <div className="text-stone-500 text-2xl font-bold tracking-widest flex flex-col items-center gap-4">
                                    <Wind size={48} className="opacity-50" />
                                    空空如也
                                </div>
                            ) : (
                                showHandModal.cards.map((card, i) => (
                                    <GameCard key={card.uid || i} card={card} phase="IDLE" isSelected={false} canConfirmDiscard={false} onClick={() => {}} />
                                ))
                            )}
                        </div>
                        <div className="p-4 border-t border-stone-600 bg-stone-900 flex justify-center">
                            <button onClick={() => setShowHandModal(null)} className="px-10 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-lg">
                                确认
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
