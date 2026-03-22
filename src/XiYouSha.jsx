import React, { useState, useEffect, useRef } from 'react';
import { Heart, ScrollText, AlertCircle, RotateCcw, Check, Zap, Shield, X } from 'lucide-react';
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
    const aiRef = useRef(null);

    const [gameState, setGameState] = useState('MENU_PLAYER');
    const [selectedPlayerDef, setSelectedPlayerDef] = useState(null);
    const [selectedEnemyDef, setSelectedEnemyDef] = useState(null);
    const [player, setPlayer] = useState({ id: '', name: '', hp: 4, maxHp: 4, hand: [], wine: 0, isStunned: false, equips: { weapon: null, armor: null } });
    const [ai, setAi] = useState({ id: '', name: '', hp: 5, maxHp: 5, hand: [], wine: 0, isStunned: false, equips: { weapon: null, armor: null } });

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

    const [showSkillModal, setShowSkillModal] = useState(null);
    // 新增：用于控制是否隐藏玩家详细信息的开关状态
    const [isPlayerInfoHidden, setIsPlayerInfoHidden] = useState(false);

    useEffect(() => { playerRef.current = player; }, [player]);
    useEffect(() => { aiRef.current = ai; }, [ai]);

    useEffect(() => {
        if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }, [currentTurnLogs, phase]);

    const isGameOverLogged = useRef(false);
    useEffect(() => {
        if (gameState !== 'PLAYING') {
            isGameOverLogged.current = false;
            return;
        }
        if (!isGameOverLogged.current) {
            if (player.hp <= 0) {
                isGameOverLogged.current = true;
                addLog("☠️ 你被击败了！游戏结束！", true);
                setTimeout(() => setGameState('MENU_PLAYER'), 3000);
            } else if (ai.hp <= 0) {
                isGameOverLogged.current = true;
                addLog(`🎉 恭喜！你成功降伏了妖王！`, true);
                setTimeout(() => setGameState('MENU_PLAYER'), 3000);
            }
        }
    }, [player.hp, ai.hp, gameState]);

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
        else setAi(a => ({ ...a, hand: [...a.hand, ...newCards] }));
    };

    const initGame = (enemyDef) => {
        const newDeck = createDeck();
        const pHand = newDeck.splice(0, 4);
        const aHand = newDeck.splice(0, 4);
        deckRef.current = newDeck;

        setSelectedEnemyDef(enemyDef);
        setPlayer({ ...selectedPlayerDef, hp: selectedPlayerDef.maxHp, hand: pHand, wine: 0, isStunned: false, equips: { weapon: null, armor: null } });
        setAi({ ...enemyDef, hp: enemyDef.maxHp, hand: aHand, wine: 0, isStunned: false, equips: { weapon: null, armor: null } });

        setGameState('PLAYING');
        setPhase('IDLE');
        setDiscardSelection([]);
        setHasAttacked(false);

        addLog("=== 游戏开始 ===", true);
        addLog(`你化身为 ${selectedPlayerDef.name}，迎战 ${enemyDef.name}！`);
        addLog("双方各摸 4 张牌...");

        setTimeout(startPlayerTurn, 1500);
    };

    const getExcessCardsCount = () => {
        let limit = Math.max(0, player.hp);
        if (player.id === 'bajie') limit += 2;
        return Math.max(0, player.hand.length - limit);
    };

    const startPlayerTurn = () => {
        if (playerRef.current.hp <= 0 || aiRef.current.hp <= 0) return;

        setHasAttacked(false);
        setHasUsedActiveSkill(false);
        setDiscardSelection([]);
        setPlayer(p => ({ ...p, wine: 0 }));

        addLog("=== 你的回合开始 ===", true);

        if (playerRef.current.id === 'xiaobailong' && playerRef.current.hp <= 2) {
            triggerTextAnim('龙脉!', 'buff', 'player');
            addLog(`🐉 【龙族血脉】触发！小白龙绝境逢生，额外摸 1 张牌！`);
            drawCards('player', 1);
        }

        if (playerRef.current.id === 'wangmu' && playerRef.current.hp < playerRef.current.maxHp) {
            triggerTextAnim('蟠桃!', 'buff', 'player');
            addLog(`🍑 【蟠桃盛会】触发！王母娘娘体力未满，天降恩泽额外摸 1 张牌！`);
            drawCards('player', 1);
        }

        if (playerRef.current.isStunned) {
            addLog(`🌀 你被定身咒禁锢，无法行动！`);
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
        let success = false;

        if (pid === 'wukong') {
            addLog(`🐵 孙悟空发动【火眼金睛】！`);
            if (ai.hand.length > 0) {
                const rIdx = Math.floor(Math.random() * ai.hand.length);
                setAi(a => ({...a, hand: a.hand.filter((_, i) => i !== rIdx)}));
                triggerTextAnim('看破!', 'buff', 'ai');
                addLog(`👁️ 洞察破绽！随机弃置了妖王 1 张手牌`);
            } else {
                addLog(`👁️ 妖王手中无牌，未能弃置。`);
            }
            success = true;
        } else if (pid === 'bajie') {
            if (player.hp <= 1) return addLog("⚠️ 体力过低，无法发动【蓄力一击】");
            triggerTextAnim('-1', 'damage', 'player');
            setPlayer(p => ({...p, hp: p.hp - 1, wine: p.wine + 2}));
            addLog(`🐷 猪八戒消耗 1 体力发动【蓄力一击】！下一击伤害急剧提升！`);
            success = true;
        } else if (pid === 'shaseng') {
            if (player.hp <= 1) return addLog("⚠️ 体力过低，无法发动【降妖宝杖】");
            triggerTextAnim('-1', 'damage', 'player');
            setPlayer(p => ({...p, hp: p.hp - 1}));
            addLog(`🧔 沙悟净消耗 1 体力发动【降妖宝杖】！`);
            processPlayerAttack(1, '【降妖宝杖】');
            success = true;
        } else if (pid === 'xiaobailong') {
            if (player.hand.length === 0) return addLog("⚠️ 没有手牌，无法发动【乘风破浪】");
            addLog(`🐉 小白龙发动【乘风破浪】！`);
            setPlayer(p => {
                const rIdx = Math.floor(Math.random() * p.hand.length);
                return { ...p, hand: p.hand.filter((_, i) => i !== rIdx) };
            });
            addLog(`🌊 弃置了 1 张手牌`);
            setTimeout(() => drawCards('player', 2), 500);
            success = true;
        } else if (pid === 'tangseng') {
            if (player.hand.length === 0) return addLog("⚠️ 没有手牌，无法发动【紧箍咒语】");
            setPlayer(p => {
                const rIdx = Math.floor(Math.random() * p.hand.length);
                return { ...p, hand: p.hand.filter((_, i) => i !== rIdx) };
            });

            if (ai.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) {
                addLog(`🛡️ 妖王的【锦襕袈裟】散发佛光，免疫了【紧箍咒语】！`);
            } else {
                triggerTextAnim('-1', 'damage', 'ai');
                setAi(a => ({ ...a, hp: Math.max(0, a.hp - 1) }));
                addLog(`📿 唐僧发动【紧箍咒语】！弃置1张手牌，妖王无视防御失去 1 点体力！`);
                if (ai.id === 'bone') {
                    setTimeout(() => {
                        triggerTextAnim('遗恨!', 'buff', 'ai');
                        addLog(`💀 【遗恨】生效！白骨精遭受折磨，摸取 1 张牌！`);
                        drawCards('ai', 1);
                    }, 500);
                }
            }
            success = true;
        } else if (pid === 'wangmu') {
            if (player.hp >= player.maxHp) return addLog("⚠️ 体力已满，无法发动【瑶池仙丹】");
            if (player.hand.length === 0) return addLog("⚠️ 没有手牌，无法发动【瑶池仙丹】");
            setPlayer(p => {
                const rIdx = Math.floor(Math.random() * p.hand.length);
                return { ...p, hp: p.hp + 1, hand: p.hand.filter((_, i) => i !== rIdx) };
            });
            triggerTextAnim('+1', 'heal', 'player');
            addLog(`🍑 王母娘娘发动【瑶池仙丹】！弃置1张手牌，恢复 1 点体力！`);
            success = true;
        }

        if (success) setHasUsedActiveSkill(true);
    };

    const processPlayerAttack = (baseDamage, sourceCardName = '【降妖】') => {
        let dmg = baseDamage + playerRef.current.wine;

        if (playerRef.current.id === 'wukong') dmg += 1;
        if (playerRef.current.equips.weapon?.id === CARD_TYPES.EQUIP_WEAPON_SPEAR) dmg += 1;

        if (playerRef.current.wine > 0) setPlayer(p => ({ ...p, wine: 0 }));

        addLog(`⚔️ 对敌发动${sourceCardName}！(基础面板伤害: ${dmg})`);

        setTimeout(() => {
            const currentAi = aiRef.current;
            let finalDmg = dmg;

            if (currentAi.id === 'ironfan') {
                finalDmg = Math.min(finalDmg, 1);
                addLog(`🪭 【护体罡风】生效！铁扇公主将伤害化解至 ${finalDmg} 点`);
            }
            if (currentAi.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_GOLD) {
                finalDmg = Math.max(0, finalDmg - 1);
                addLog(`🛡️ 妖王的【锁子黄金甲】金光一闪，强行抵消了 1 点伤害！`);
            }

            if (finalDmg <= 0) {
                addLog(`✨ 妖王毫发无损，化解了此次攻击！`);
                return;
            }

            const actIdx = currentAi.hand.findIndex(c => c.id === CARD_TYPES.DODGE);
            if (actIdx > -1) {
                triggerCardAnim(CARDS_DB[CARD_TYPES.DODGE], 'ai');
                triggerTextAnim('闪避！', 'dodge', 'ai');
                addLog(`🛡️ 妖王使用【腾云】躲开了`);
                setAi(a => ({ ...a, hand: a.hand.filter((_, i) => i !== actIdx) }));
            } else {
                triggerTextAnim(`-${finalDmg}`, 'damage', 'ai');
                addLog(`💥 命中！妖王失去 ${finalDmg} 点体力`);
                setAi(a => ({ ...a, hp: Math.max(0, a.hp - finalDmg) }));

                if (currentAi.id === 'bull' && playerRef.current.hand.length > 0) {
                    setTimeout(() => {
                        triggerTextAnim('震落!', 'buff', 'ai');
                        addLog(`🐂 【蛮牛护体】震荡！你被震落了 1 张手牌！`);
                        setPlayer(p => {
                            if (p.hand.length > 0) {
                                const rIdx = Math.floor(Math.random() * p.hand.length);
                                return { ...p, hand: p.hand.filter((_, i) => i !== rIdx) };
                            }
                            return p;
                        });
                    }, 500);
                }

                if (currentAi.id === 'bone') {
                    setTimeout(() => {
                        triggerTextAnim('遗恨!', 'buff', 'ai');
                        addLog(`💀 【遗恨】生效！白骨精遭受攻击，摸取 1 张牌！`);
                        drawCards('ai', 1);
                    }, 500);
                }
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
            } else {
                addLog("⚠️ 现在只能打出【腾云】进行响应，或点击放弃！");
            }
            return;
        }

        if (phase === 'PLAYER_DISCARD') {
            const excessCards = getExcessCardsCount();
            setDiscardSelection(prev => {
                if (prev.includes(card.uid)) return prev.filter(uid => uid !== card.uid);
                if (prev.length < excessCards) return [...prev, card.uid];
                if (prev.length === excessCards && excessCards > 0) return [...prev.slice(1), card.uid];
                return prev;
            });
            return;
        }

        if (phase !== 'PLAYER_PLAY') return;

        if (card.type === 'weapon') {
            setPlayer(p => ({ ...p, hand: p.hand.filter(c => c.uid !== card.uid), equips: { ...p.equips, weapon: card } }));
            addLog(`🗡️ 你装备了武器 ${card.name}`);
            return;
        }
        if (card.type === 'armor') {
            setPlayer(p => ({ ...p, hand: p.hand.filter(c => c.uid !== card.uid), equips: { ...p.equips, armor: card } }));
            addLog(`🛡️ 你装备了防具 ${card.name}`);
            return;
        }

        const canAttackMultiple = player.equips.weapon?.id === CARD_TYPES.EQUIP_WEAPON_STICK;
        if (card.id === CARD_TYPES.ATTACK && hasAttacked && !canAttackMultiple) return addLog("⚠️ 本回合已出过【降妖】(可使用【混铁棍】/【风火轮】解除)");

        if ((card.id === CARD_TYPES.HEAL || card.id === CARD_TYPES.HEAL_BIG) && player.hp >= player.maxHp) return addLog("⚠️ 体力已满");
        if (card.id === CARD_TYPES.DODGE) return addLog("⚠️ 【腾云】需在被攻击时被动使用");
        if (card.id === CARD_TYPES.WINE && player.wine > 0) return addLog("⚠️ 药效还在，不可叠加使用");
        if ((card.id === CARD_TYPES.STEAL || card.id === CARD_TYPES.DESTROY || card.id === CARD_TYPES.MIRROR) && ai.hand.length === 0) return addLog(`⚠️ 妖王手里已经没牌了`);

        const newHand = player.hand.filter(c => c.uid !== card.uid);
        setPlayer(p => ({ ...p, hand: newHand }));
        triggerCardAnim(card, 'player');

        if (card.id === CARD_TYPES.ATTACK) {
            setHasAttacked(true);
            processPlayerAttack(1, '【降妖】');
        } else if (card.id === CARD_TYPES.HEAL || card.id === CARD_TYPES.HEAL_BIG) {
            const healAmount = card.id === CARD_TYPES.HEAL_BIG ? 2 : 1;
            triggerTextAnim(`+${healAmount}`, 'heal', 'player');
            setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + healAmount) }));
            addLog(`🍎 你使用了${card.name}，恢复了 ${healAmount} 点体力`);

            if (player.id === 'shaseng') {
                setTimeout(() => {
                    triggerTextAnim('化缘!', 'buff', 'player');
                    addLog("🧔 【任劳任怨】生效！额外化得 1 张手牌！");
                    drawCards('player', 1);
                }, 400);
            }
            if (player.id === 'tangseng') {
                setTimeout(() => {
                    triggerTextAnim('慈悲!', 'buff', 'player');
                    addLog("📿 【慈悲】生效！佛光普照，额外摸取 2 张手牌！");
                    drawCards('player', 2);
                }, 400);
            }
        } else if (card.id === CARD_TYPES.SCAN) {
            addLog("👁️ 火眼金睛！额外摸2张牌");
            drawCards('player', 2);
        } else if (card.id === CARD_TYPES.STUN) {
            triggerTextAnim('定身！', 'buff', 'ai');
            setAi(a => ({ ...a, isStunned: true }));
            addLog(`✨ 对妖王施展了定身咒`);
        } else if (card.id === CARD_TYPES.WINE) {
            triggerTextAnim('蓄力！', 'buff', 'player');
            setPlayer(p => ({ ...p, wine: p.wine + 1 }));
            addLog("💊 你饮下了【九转金丹】，下一张【降妖】伤害将 +1！");
        } else if (card.id === CARD_TYPES.WHEELS) {
            triggerTextAnim('疾风！', 'buff', 'player');
            setHasAttacked(false);
            addLog("🔥 踏上【风火轮】！出招限制解除，并摸 1 张牌！");
            drawCards('player', 1);
        } else if (card.id === CARD_TYPES.PIERCE) {
            if (ai.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) {
                addLog(`🛡️ 妖王的【锦襕袈裟】散发佛光，完全免疫了【紧箍咒】！`);
            } else {
                triggerTextAnim('-1', 'damage', 'ai');
                addLog(`📿 你念动【紧箍咒】，妖王无视防御失去 1 点体力！`);
                setAi(a => ({ ...a, hp: Math.max(0, a.hp - 1) }));
                if (ai.id === 'bone') {
                    setTimeout(() => {
                        triggerTextAnim('遗恨!', 'buff', 'ai');
                        addLog(`💀 【遗恨】生效！白骨精遭受折磨，摸取 1 张牌！`);
                        drawCards('ai', 1);
                    }, 500);
                }
            }
        } else if (card.id === CARD_TYPES.MIRROR) {
            setAi(a => {
                const dodgesRemoved = a.hand.filter(c => c.id === CARD_TYPES.DODGE).length;
                if (dodgesRemoved > 0) {
                    triggerTextAnim('破法！', 'buff', 'ai');
                    addLog(`🔍 【照妖镜】金光一闪！强行销毁了妖王 ${dodgesRemoved} 张【腾云】！`);
                    return { ...a, hand: a.hand.filter(c => c.id !== CARD_TYPES.DODGE) };
                } else {
                    addLog(`🔍 【照妖镜】金光一闪，但妖王手里并没有【腾云】。`);
                    return a;
                }
            });
        } else if (card.id === CARD_TYPES.STEAL) {
            if (ai.hand.length > 0) {
                triggerTextAnim('窃取！', 'buff', 'player');
                const targetIdx = Math.floor(Math.random() * ai.hand.length);
                const stolenCard = ai.hand[targetIdx];
                addLog(`🧲 使用【探囊取物】，窃取了妖王 1 张手牌`);
                setPlayer(p => ({ ...p, hand: [...p.hand, stolenCard] }));
                setAi(a => ({ ...a, hand: a.hand.filter((_, i) => i !== targetIdx) }));
            }
        } else if (card.id === CARD_TYPES.DESTROY) {
            if (ai.hand.length > 0) {
                triggerTextAnim('摧毁！', 'buff', 'player');
                const targetIdx = Math.floor(Math.random() * ai.hand.length);
                addLog(`🌪️ 使用【芭蕉扇】，吹飞了妖王 1 张手牌`);
                setAi(a => ({ ...a, hand: a.hand.filter((_, i) => i !== targetIdx) }));
            }
        } else if (card.id === CARD_TYPES.ARROW) {
            addLog(`🏹 祭出【漫天花雨】！无差别范围攻击...`);
            setTimeout(() => {
                const currentAi = aiRef.current;

                if (currentAi.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) {
                    addLog(`🛡️ 妖王的【锦襕袈裟】散发佛光，完美防住了【漫天花雨】！`);
                    return;
                }

                const actIdx = currentAi.hand.findIndex(c => c.id === CARD_TYPES.DODGE);
                if (actIdx > -1) {
                    triggerCardAnim(CARDS_DB[CARD_TYPES.DODGE], 'ai');
                    triggerTextAnim('闪避！', 'dodge', 'ai');
                    addLog(`🛡️ 妖王极速飞退，使用【腾云】躲过了一劫`);
                    setAi(a => ({ ...a, hand: a.hand.filter((_, i) => i !== actIdx) }));
                } else {
                    triggerTextAnim('-1', 'damage', 'ai');
                    addLog(`💥 妖王无处可躲！失去 1 点体力`);
                    setAi(a => ({ ...a, hp: Math.max(0, a.hp - 1) }));

                    if (currentAi.id === 'bone') {
                        setTimeout(() => {
                            triggerTextAnim('遗恨!', 'buff', 'ai');
                            addLog(`💀 【遗恨】生效！白骨精摸取 1 张牌！`);
                            drawCards('ai', 1);
                        }, 500);
                    }
                }
            }, 800);
        }
    };

    const checkEndTurn = () => {
        const excessCards = getExcessCardsCount();
        if (excessCards > 0) {
            setPhase('PLAYER_DISCARD');
            setDiscardSelection([]);
            addLog(`🏮 弃牌阶段：需弃置 ${excessCards} 张牌`);
        } else {
            addLog(`🏮 手牌未超上限，结束回合`);
            startAiTurn();
        }
    };

    const confirmDiscard = () => {
        const excessCards = getExcessCardsCount();
        if (discardSelection.length !== excessCards) return;

        const newHand = player.hand.filter(c => !discardSelection.includes(c.uid));
        const discardedCards = player.hand.filter(c => discardSelection.includes(c.uid));

        setPlayer(p => ({ ...p, hand: newHand }));
        addLog(`🗑️ 弃置了 ${discardedCards.length} 张牌`);
        setDiscardSelection([]);
        addLog("✅ 回合结束");
        startAiTurn();
    };

    const startAiTurn = async () => {
        if (playerRef.current.hp <= 0 || aiRef.current.hp <= 0) return;
        setPhase('AI_TURN');
        addLog(`--- ${aiRef.current.name} 的回合 ---`, true);

        let aiHasUsedSkill = false;
        await delay(800);

        if (aiRef.current.id === 'gold' && !aiRef.current.isStunned && playerRef.current.hand.length > 0) {
            triggerTextAnim('紫金葫芦!', 'buff', 'ai');
            setPlayer(p => {
                const idx = Math.floor(Math.random() * p.hand.length);
                const stolen = p.hand[idx];
                setAi(a => ({...a, hand: [...a.hand, stolen]}));
                return { ...p, hand: p.hand.filter((_, i) => i !== idx) };
            });
            addLog(`✨ 【紫金葫芦】发威！${aiRef.current.name} 吸走了你 1 张手牌！`);
            await delay(800);
        }

        if (aiRef.current.id === 'bull' && aiRef.current.hp <= 3 && !aiRef.current.isStunned) {
            aiHasUsedSkill = true;
            triggerTextAnim('狂暴!', 'buff', 'ai');
            addLog(`🐂 牛魔王体力过低，发动【狂暴】！额外摸1张牌，下一击威力提升！`);
            drawCards('ai', 1);
            setAi(a => ({...a, wine: a.wine + 1}));
            await delay(800);
        }

        if (aiRef.current.id === 'spider' && !aiHasUsedSkill && aiRef.current.hand.length > 0 && !aiRef.current.isStunned && playerRef.current.hand.length > 0) {
            if (playerRef.current.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) {
                addLog(`🕸️ 蜘蛛精试图发动【夺命蛛丝】，但被你的【锦襕袈裟】抵挡了伤害！`);
            } else {
                aiHasUsedSkill = true;
                triggerTextAnim('吐丝!', 'damage', 'player');
                addLog(`🕸️ 蜘蛛精发动【夺命蛛丝】！消耗 1 张牌，强制使你失去 1 张牌并受 1 点伤害！`);
                setAi(a => {
                    const rIdx = Math.floor(Math.random() * a.hand.length);
                    return {...a, hand: a.hand.filter((_, i) => i !== rIdx)};
                });
                setPlayer(p => {
                    let newHand = p.hand;
                    if (p.hand.length > 0) {
                        const pIdx = Math.floor(Math.random() * p.hand.length);
                        newHand = p.hand.filter((_, i) => i !== pIdx);
                    }
                    return {...p, hand: newHand, hp: Math.max(0, p.hp - 1)};
                });
            }
            await delay(800);
        }

        if (aiRef.current.id === 'redboy' && !aiHasUsedSkill && aiRef.current.hp > 1 && !aiRef.current.isStunned) {
            if (playerRef.current.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) {
                addLog(`🔥 红孩儿试图发动【吐火】，但被你的【锦襕袈裟】完美防御！`);
            } else {
                aiHasUsedSkill = true;
                triggerTextAnim('吐火!', 'damage', 'player');
                addLog(`🔥 红孩儿消耗 1 点体力发动【吐火】！直接烧伤你 1 点体力！`);
                setAi(a => ({...a, hp: a.hp - 1}));
                setPlayer(p => ({...p, hp: Math.max(0, p.hp - 1)}));
            }
            await delay(800);
        }

        if (aiRef.current.isStunned) {
            addLog(`🌀 妖王被定身，本回合无法行动！`);
            setAi(a => ({ ...a, isStunned: false }));
            await delay(1200);
            startPlayerTurn();
            return;
        }

        drawCards('ai', 2);
        await delay(1000);

        let aiHasAttacked = false;

        while (true) {
            if (playerRef.current.hp <= 0 || aiRef.current.hp <= 0) break;
            const currentAi = aiRef.current;
            let playIdx = -1;

            if (currentAi.id === 'gold' && !aiHasUsedSkill && currentAi.hand.length < currentAi.hp && currentAi.hp < currentAi.maxHp) {
                aiHasUsedSkill = true;
                triggerTextAnim('玉净瓶!', 'heal', 'ai');
                addLog(`✨ 金角大王发动【玉净瓶】，恢复了 1 点体力！`);
                setAi(a => ({...a, hp: a.hp + 1}));
                await delay(800);
                continue;
            }

            if (currentAi.id === 'bone' && !aiHasUsedSkill) {
                aiHasUsedSkill = true;
                triggerTextAnim('吸魂!', 'buff', 'ai');
                if (playerRef.current.hand.length > 0) {
                    const pHand = playerRef.current.hand;
                    const rIdx = Math.floor(Math.random() * pHand.length);
                    const dropped = pHand[rIdx];
                    addLog(`💀 白骨精发动【吸魂】！随机弃置了你 1 张手牌`);
                    setPlayer(p => ({...p, hand: p.hand.filter((_, i) => i !== rIdx)}));
                    if (dropped.id === CARD_TYPES.ATTACK || dropped.id === CARD_TYPES.DODGE) {
                        addLog(`🩸 吸取了精血，白骨精恢复 1 点体力！`);
                        setAi(a => ({...a, hp: Math.min(a.maxHp, a.hp + 1)}));
                    }
                } else {
                    addLog(`💀 白骨精发动【吸魂】，但你无牌可弃。`);
                }
                await delay(800);
                continue;
            }

            if (currentAi.hp < currentAi.maxHp) {
                playIdx = currentAi.hand.findIndex(c => c.id === CARD_TYPES.HEAL_BIG);
                if (playIdx === -1) playIdx = currentAi.hand.findIndex(c => c.id === CARD_TYPES.HEAL);
            }
            if (playIdx === -1) playIdx = currentAi.hand.findIndex(c => c.type === 'weapon' || c.type === 'armor');
            if (playIdx === -1) {
                playIdx = currentAi.hand.findIndex(c => [
                    CARD_TYPES.SCAN, CARD_TYPES.DESTROY, CARD_TYPES.STEAL,
                    CARD_TYPES.ARROW, CARD_TYPES.MIRROR, CARD_TYPES.PIERCE, CARD_TYPES.WHEELS
                ].includes(c.id));
            }
            if (playIdx === -1 && !playerRef.current.isStunned) playIdx = currentAi.hand.findIndex(c => c.id === CARD_TYPES.STUN);

            const canAttackMultiple = currentAi.equips.weapon?.id === CARD_TYPES.EQUIP_WEAPON_STICK;
            if (playIdx === -1 && currentAi.wine === 0 && (!aiHasAttacked || canAttackMultiple)) {
                if (currentAi.hand.some(c => c.id === CARD_TYPES.ATTACK)) playIdx = currentAi.hand.findIndex(c => c.id === CARD_TYPES.WINE);
            }
            if (playIdx === -1 && (!aiHasAttacked || canAttackMultiple)) playIdx = currentAi.hand.findIndex(c => c.id === CARD_TYPES.ATTACK);

            if (playIdx > -1) {
                const card = currentAi.hand[playIdx];
                const result = await playCardAsAi(card, playIdx);
                if (card.id === CARD_TYPES.ATTACK) aiHasAttacked = true;
                if (result === 'RESET_ATTACK') aiHasAttacked = false;
                await delay(1000);
            } else {
                break;
            }
        }

        const finalAi = aiRef.current;
        const excess = finalAi.hand.length - finalAi.hp;
        if (excess > 0) {
            addLog(`${finalAi.name} 结束出牌，弃置了 ${excess} 张牌`);
            setAi(a => ({ ...a, hand: a.hand.slice(0, Math.max(0, a.hp)) }));
        } else {
            addLog(`${finalAi.name} 结束了回合`);
        }

        if (aiRef.current.id === 'spider' && aiRef.current.hand.length >= 3 && playerRef.current.hp > 0) {
            triggerTextAnim('盘丝!', 'buff', 'player');
            addLog(`🕸️ 【盘丝阵】生效！蜘蛛精手牌充裕，吐出漫天蛛网将你【定身】！`);
            setPlayer(p => ({...p, isStunned: true}));
        }

        await delay(1200);
        startPlayerTurn();
    };

    const playCardAsAi = async (card, idx) => {
        setAi(a => ({ ...a, hand: a.hand.filter((_, i) => i !== idx) }));
        const aiName = aiRef.current.name;

        triggerCardAnim(card, 'ai');

        if (card.type === 'weapon') {
            setAi(a => ({ ...a, equips: { ...a.equips, weapon: card } }));
            addLog(`🗡️ ${aiName} 装备了武器 ${card.name}`);
            return null;
        }
        if (card.type === 'armor') {
            setAi(a => ({ ...a, equips: { ...a.equips, armor: card } }));
            addLog(`🛡️ ${aiName} 装备了防具 ${card.name}`);
            return null;
        }

        if (card.id === CARD_TYPES.ATTACK) {
            let dmg = 1 + aiRef.current.wine;
            if (aiRef.current.id === 'redboy') dmg += 1;
            if (aiRef.current.equips.weapon?.id === CARD_TYPES.EQUIP_WEAPON_SPEAR) dmg += 1;
            if (aiRef.current.wine > 0) setAi(a => ({ ...a, wine: 0 }));
            addLog(`🔥 ${aiName} 祭出【降妖】向你袭来！(基础面板伤害${dmg})`);
            await delay(800);

            if (aiRef.current.id === 'ironfan') {
                triggerTextAnim('阴风阵阵!', 'buff', 'ai');
                setPlayer(p => {
                    if (p.hand.length > 0) {
                        const rIdx = Math.floor(Math.random() * p.hand.length);
                        return { ...p, hand: p.hand.filter((_, i) => i !== rIdx) };
                    }
                    return p;
                });
                addLog(`🪭 【阴风阵阵】！狂风附带卷走了你 1 张手牌！`);
                await delay(500);
            }

            if (playerRef.current.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_GOLD) {
                dmg = Math.max(0, dmg - 1);
                addLog(`🛡️ 你的【锁子黄金甲】发威，强制抵消了 1 点伤害！`);
            }

            if (dmg <= 0) {
                addLog(`✨ 你身披宝甲，毫发无损！`);
                return null;
            }

            const response = await requestPlayerDodge(`妖王对你发动【降妖】(伤害${dmg})，是否打出【腾云】？`);

            if (response && response.dodged) {
                const dIdx = response.cardIdx;
                triggerCardAnim(CARDS_DB[CARD_TYPES.DODGE], 'player');
                triggerTextAnim('闪避！', 'dodge', 'player');
                addLog(`💨 你打出【腾云】，惊险躲开一击`);
                setPlayer(p => ({ ...p, hand: p.hand.filter((_, i) => i !== dIdx) }));
            } else {
                triggerTextAnim(`-${dmg}`, 'damage', 'player');
                addLog(`🩸 你被击中，失去 ${dmg} 点体力`);
                setPlayer(p => ({ ...p, hp: Math.max(0, p.hp - dmg) }));
            }
        } else if (card.id === CARD_TYPES.HEAL || card.id === CARD_TYPES.HEAL_BIG) {
            const healAmount = card.id === CARD_TYPES.HEAL_BIG ? 2 : 1;
            triggerTextAnim(`+${healAmount}`, 'heal', 'ai');
            addLog(`🍎 ${aiName} 服下${card.name}，体力大量恢复`);
            setAi(a => ({ ...a, hp: Math.min(a.maxHp, a.hp + healAmount) }));
        } else if (card.id === CARD_TYPES.SCAN) {
            addLog(`👁️ ${aiName} 施展【火眼金睛】，多摸了 2 张牌`);
            drawCards('ai', 2);
        } else if (card.id === CARD_TYPES.WINE) {
            triggerTextAnim('蓄力！', 'buff', 'ai');
            addLog(`💊 ${aiName} 吞服【九转金丹】，杀意暴增！`);
            setAi(a => ({ ...a, wine: a.wine + 1 }));
        } else if (card.id === CARD_TYPES.STUN) {
            triggerTextAnim('定身！', 'buff', 'player');
            addLog(`✨ ${aiName} 对你念动了【定身咒】！`);
            setPlayer(p => ({ ...p, isStunned: true }));
        } else if (card.id === CARD_TYPES.WHEELS) {
            triggerTextAnim('疾风！', 'buff', 'ai');
            addLog(`🔥 ${aiName} 踏上【风火轮】，出招限制解除，并摸了 1 张牌！`);
            drawCards('ai', 1);
            return 'RESET_ATTACK';
        } else if (card.id === CARD_TYPES.PIERCE) {
            if (playerRef.current.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) {
                addLog(`🛡️ 你的【锦襕袈裟】散发佛光，完美防御了【紧箍咒】！`);
            } else {
                triggerTextAnim('-1', 'damage', 'player');
                addLog(`📿 ${aiName} 竟懂【紧箍咒】！你头痛欲裂，失去 1 点体力！`);
                setPlayer(p => ({ ...p, hp: Math.max(0, p.hp - 1) }));
            }
        } else if (card.id === CARD_TYPES.MIRROR) {
            setPlayer(p => {
                const dodgesRemoved = p.hand.filter(c => c.id === CARD_TYPES.DODGE).length;
                if (dodgesRemoved > 0) {
                    triggerTextAnim('破法！', 'buff', 'player');
                    addLog(`🔍 ${aiName} 祭出【照妖镜】！你被金光定住，被迫丢弃了所有【腾云】！`);
                    return { ...p, hand: p.hand.filter(c => c.id !== CARD_TYPES.DODGE) };
                } else {
                    addLog(`🔍 ${aiName} 祭出【照妖镜】，但你手里本就没有【腾云】。`);
                    return p;
                }
            });
        } else if (card.id === CARD_TYPES.ARROW) {
            addLog(`🏹 ${aiName} 洒出【漫天花雨】！范围攻击降临！`);
            await delay(800);

            if (playerRef.current.equips.armor?.id === CARD_TYPES.EQUIP_ARMOR_CLOTH) {
                addLog(`🛡️ 你的【锦襕袈裟】金光护体，将【漫天花雨】全部挡下！`);
                return null;
            }

            const response = await requestPlayerDodge(`妖王洒出【漫天花雨】，是否打出【腾云】躲避？`);

            if (response && response.dodged) {
                const dIdx = response.cardIdx;
                triggerCardAnim(CARDS_DB[CARD_TYPES.DODGE], 'player');
                triggerTextAnim('闪避！', 'dodge', 'player');
                addLog(`💨 你身轻如燕，打出【腾云】化险为夷`);
                setPlayer(p => ({ ...p, hand: p.hand.filter((_, i) => i !== dIdx) }));
            } else {
                triggerTextAnim('-1', 'damage', 'player');
                addLog(`🩸 避无可避，你失去 1 点体力`);
                setPlayer(p => ({ ...p, hp: Math.max(0, p.hp - 1) }));
            }
        } else if (card.id === CARD_TYPES.STEAL) {
            if (playerRef.current.hand.length > 0) {
                triggerTextAnim('窃取！', 'buff', 'ai');
                addLog(`🧲 ${aiName} 使用【探囊取物】，窃走了你 1 张牌`);
                setPlayer(p => {
                    const rIdx = Math.floor(Math.random() * p.hand.length);
                    const stolen = p.hand[rIdx];
                    setAi(a => ({ ...a, hand: [...a.hand, stolen] }));
                    return { ...p, hand: p.hand.filter((_, i) => i !== rIdx) };
                });
            }
        } else if (card.id === CARD_TYPES.DESTROY) {
            if (playerRef.current.hand.length > 0) {
                triggerTextAnim('摧毁！', 'buff', 'ai');
                addLog(`🌪️ ${aiName} 挥舞【芭蕉扇】，扇飞了你 1 张牌`);
                setPlayer(p => {
                    const rIdx = Math.floor(Math.random() * p.hand.length);
                    return { ...p, hand: p.hand.filter((_, i) => i !== rIdx) };
                });
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
        <div className="relative flex flex-col h-screen bg-stone-200 overflow-hidden">
            <div className="relative z-20 bg-stone-800 text-white p-4 flex justify-between items-start shadow-xl">
                <div className="flex items-start gap-4">
                    <div
                        className="relative text-5xl bg-stone-700 w-16 h-16 flex items-center justify-center rounded-full border-2 border-stone-500 mt-1 cursor-pointer hover:border-yellow-400 hover:scale-105 transition-all"
                        onClick={() => setShowSkillModal('ai')}
                    >
                        {ai.avatar}
                        {ai.isStunned && <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-white text-xs px-1 rounded shadow animate-pulse">定身</div>}
                        {ai.wine > 0 && <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] px-1 rounded-full shadow animate-bounce">伤害+</div>}
                    </div>
                    <div>
                        <div className="font-bold text-xl flex items-center gap-2 mb-1">
                            {ai.name}
                            <span className="text-xs text-stone-400 font-normal border border-stone-600 px-2 py-0.5 rounded-full">手牌: {ai.hand.length}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                            {[...Array(Math.max(0, ai.hp))].map((_, i) => <Heart key={i} size={16} fill="#ef4444" color="#ef4444" />)}
                        </div>
                        <div className="flex gap-2">
                            <div className="text-[10px] text-yellow-300 flex items-center gap-1 mb-0.5"><Zap size={10}/> {selectedEnemyDef.activeName}</div>
                            <div className="text-[10px] text-blue-300 flex items-center gap-1"><Shield size={10}/> {selectedEnemyDef.passiveName}</div>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <div className={`text-[11px] font-bold px-2 py-0.5 rounded border ${ai.equips.weapon ? 'bg-rose-900/50 text-rose-300 border-rose-700' : 'bg-stone-700/50 text-stone-400 border-stone-600'}`}>
                                🗡️ {ai.equips.weapon ? ai.equips.weapon.name : '武器栏空'}
                            </div>
                            <div className={`text-[11px] font-bold px-2 py-0.5 rounded border ${ai.equips.armor ? 'bg-amber-900/50 text-amber-300 border-amber-700' : 'bg-stone-700/50 text-stone-400 border-stone-600'}`}>
                                🛡️ {ai.equips.armor ? ai.equips.armor.name : '防具栏空'}
                            </div>
                        </div>
                    </div>
                </div>
                <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 px-3 py-2 bg-stone-700 rounded-xl hover:bg-stone-600 border border-stone-600 transition-colors">
                    <ScrollText size={18} /> <span className="text-sm font-bold">战绩</span>
                </button>
            </div>

            <div ref={logContainerRef} className="absolute inset-0 z-0 overflow-y-auto px-6 pt-36 pb-[42vh] scroll-smooth">
                <div className="flex flex-col items-center space-y-4 min-h-full">
                    <div className="flex-1"></div>
                    {currentTurnLogs.map((log, i) => (
                        <div key={i} className={`text-[15px] font-medium px-5 py-2 rounded-full shadow-sm max-w-lg w-full text-center ${
                            log.includes('===') ? 'bg-stone-300 text-stone-700 text-base font-bold my-2' :
                                log.includes('---') ? 'bg-stone-200 text-stone-500 text-base font-bold my-2' :
                                    'bg-white text-stone-800 animate-in fade-in slide-in-from-bottom-2'
                        }`}>
                            {log}
                        </div>
                    ))}
                </div>
            </div>

            {animatingCard && (
                <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                    <div key={animatingCard.id} className={`
                        animate-in zoom-in-[2] fade-in duration-300 ease-out
                        flex flex-col items-center justify-center
                        w-48 h-64 border-4 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.5)]
                        ${animatingCard.card.bg} ${animatingCard.card.border}
                        ${animatingCard.source === 'player' ? 'translate-y-10 rotate-[-4deg]' : '-translate-y-10 rotate-[4deg]'}
                    `}>
                        <div className={`font-black text-3xl mb-3 ${animatingCard.card.color}`}>{animatingCard.card.name}</div>
                        <animatingCard.card.icon size={80} className={`mx-auto my-3 ${animatingCard.card.color} animate-pulse`} />
                        <div className="text-xs text-stone-700 font-bold bg-white/80 p-2 rounded-xl px-3 text-center w-5/6">{animatingCard.card.desc}</div>
                    </div>
                </div>
            )}

            {animatingText && (
                <div className={`absolute z-50 pointer-events-none font-black text-6xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] italic tracking-widest
                    animate-in zoom-in-50 slide-in-from-bottom-10 fade-in duration-500 ease-out
                    ${animatingText.type === 'damage' ? 'text-red-500' : ''}
                    ${animatingText.type === 'heal' ? 'text-green-400' : ''}
                    ${animatingText.type === 'dodge' ? 'text-blue-300' : ''}
                    ${animatingText.type === 'buff' ? 'text-amber-400' : ''}
                    ${animatingText.source === 'player' ? 'bottom-1/3 left-1/2 -translate-x-1/2' : 'top-1/3 left-1/2 -translate-x-1/2'}
                `} key={animatingText.id}>
                    {animatingText.text}
                </div>
            )}

            {/* 修改点：底部操作区分为左右两块 */}
            <div className={`absolute bottom-0 left-0 right-0 h-[40vh] flex flex-row z-20 p-4 backdrop-blur-md border-t transition-all duration-500 ${
                phase === 'PLAYER_DISCARD' ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-stone-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]'
            }`}>

                {/* 左侧：手牌区域（自动占据全部剩余宽度） */}
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
                                    canConfirmDiscard={canConfirmDiscard}
                                    onClick={() => handlePlayCard(card)}
                                />
                            );
                        })}
                        {player.hand.length === 0 && (
                            <div className="w-full text-center py-10 text-stone-400 italic flex items-end justify-center h-full pb-10">手中空空如也...</div>
                        )}
                    </div>
                </div>

                {/* 右侧：操作按钮(右上) 与 玩家信息(右下) */}
                <div className="w-auto flex flex-col justify-between items-end pl-4 pointer-events-none border-l border-stone-300/30">

                    {/* 右上角：操作按钮区 */}
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
                                    <Zap size={18} /> {hasUsedActiveSkill ? '已发动' : '发动技能'}
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
                                        setPhase('AI_TURN');
                                        setPromptState(null);
                                        if (responseResolver.current) responseResolver.current({ dodged: false });
                                    }}
                                    className="bg-stone-700 text-stone-200 px-8 py-3 rounded-2xl font-black hover:bg-stone-600 active:scale-95 transition-all shadow-lg"
                                >
                                    放弃
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
                                            canConfirmDiscard
                                                ? 'bg-red-600 text-white hover:bg-red-500 hover:scale-105 active:scale-95 cursor-pointer animate-pulse'
                                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        }`}
                                    >
                                        <Check size={20} /> 确定
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 右下角：玩家信息区 */}
                    <div className="flex flex-col items-end relative pointer-events-auto">
                        <button
                            onClick={() => setIsPlayerInfoHidden(!isPlayerInfoHidden)}
                            className="absolute -top-6 right-0 text-[10px] bg-stone-700 text-stone-300 px-3 py-1 rounded-t-lg hover:text-white hover:bg-stone-600 transition-colors shadow-md"
                        >
                            {isPlayerInfoHidden ? '显示信息' : '隐藏信息'}
                        </button>

                        {!isPlayerInfoHidden ? (
                            <div className="flex items-center gap-4 flex-row-reverse text-right bg-white/60 p-2 pr-0 rounded-2xl mt-4">
                                <div
                                    className="relative text-5xl bg-stone-100 w-16 h-16 flex items-center justify-center rounded-2xl border-2 border-stone-300 shadow-inner cursor-pointer hover:border-yellow-500 hover:scale-105 transition-all flex-shrink-0"
                                    onClick={() => setShowSkillModal('player')}
                                >
                                    {player.avatar}
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
                                        {player.name}
                                    </div>
                                    <div className="flex gap-1 mt-1 mb-1 justify-end">
                                        {[...Array(Math.max(0, player.hp))].map((_, i) => <Heart key={i} size={18} fill="#ef4444" color="#ef4444" />)}
                                    </div>
                                    <div className="flex gap-2 text-[10px] justify-end">
                                        <div className="text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Zap size={10}/> {selectedPlayerDef.activeName}</div>
                                        <div className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Shield size={10}/> {selectedPlayerDef.passiveName}</div>
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
                            <div
                                className="relative text-3xl bg-stone-100 w-12 h-12 flex items-center justify-center rounded-xl border-2 border-stone-300 shadow-md cursor-pointer hover:border-yellow-500 hover:scale-105 transition-all mt-2"
                                onClick={() => setShowSkillModal('player')}
                                title="点击查看详情"
                            >
                                {player.avatar}
                                <div className="absolute -bottom-2 -left-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border border-red-300 shadow">
                                    HP {player.hp}
                                </div>
                                {player.wine > 0 && (
                                    <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[8px] font-black px-1.5 py-[2px] rounded-full border border-amber-300">
                                        伤害+{player.wine}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 角色技能详情弹窗 */}
            {showSkillModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowSkillModal(null)}>
                    <div className="bg-stone-800 text-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border-4 border-stone-600 p-6 relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowSkillModal(null)} className="absolute top-4 right-4 p-2 hover:bg-stone-700 rounded-full text-stone-400 hover:text-white transition-colors"><X size={20}/></button>
                        <div className="flex flex-col items-center mt-2">
                            <div className="text-7xl mb-4 drop-shadow-lg">{showSkillModal === 'player' ? selectedPlayerDef.avatar : selectedEnemyDef.avatar}</div>
                            <h3 className="text-2xl font-black mb-1 text-yellow-500">{showSkillModal === 'player' ? selectedPlayerDef.name : selectedEnemyDef.name}</h3>
                            <div className="flex items-center gap-1 text-red-400 mb-6 font-mono text-sm">
                                <Heart size={14} fill="currentColor"/> 体力上限: {showSkillModal === 'player' ? selectedPlayerDef.maxHp : selectedEnemyDef.maxHp}
                            </div>
                            <div className="w-full bg-stone-900/80 p-4 rounded-xl border border-stone-700 text-left">
                                <div className="text-yellow-400 text-sm font-black mb-2 flex items-center gap-1.5"><Zap size={16}/> {showSkillModal === 'player' ? selectedPlayerDef.activeName : selectedEnemyDef.activeName}</div>
                                <div className="text-[13px] text-stone-300 leading-relaxed mb-5">{showSkillModal === 'player' ? selectedPlayerDef.activeDesc : selectedEnemyDef.activeDesc}</div>

                                <div className="text-blue-400 text-sm font-black mb-2 flex items-center gap-1.5"><Shield size={16}/> {showSkillModal === 'player' ? selectedPlayerDef.passiveName : selectedEnemyDef.passiveName}</div>
                                <div className="text-[13px] text-stone-300 leading-relaxed">{showSkillModal === 'player' ? selectedPlayerDef.passiveDesc : selectedEnemyDef.passiveDesc}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showHistory && (
                <HistoryModal logs={allHistoryLogs} onClose={() => setShowHistory(false)} />
            )}
        </div>
    );
}