import React, { useState, useEffect, useRef } from 'react';
import { Heart, ScrollText, AlertCircle, RotateCcw, Check, Info, Shield } from 'lucide-react';
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
    const [player, setPlayer] = useState({ id: '', name: '', hp: 4, maxHp: 4, hand: [], wine: 0, isStunned: false });
    const [ai, setAi] = useState({ id: '', name: '', hp: 5, maxHp: 5, hand: [], wine: 0, isStunned: false });

    const [phase, setPhase] = useState('IDLE');
    const [hasAttacked, setHasAttacked] = useState(false);

    // 玩家响应与动画状态
    const [promptState, setPromptState] = useState(null);
    const responseResolver = useRef(null);
    const [animatingCard, setAnimatingCard] = useState(null);
    const [animatingText, setAnimatingText] = useState(null);

    const [discardSelection, setDiscardSelection] = useState([]);
    const [currentTurnLogs, setCurrentTurnLogs] = useState([]);
    const [allHistoryLogs, setAllHistoryLogs] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

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
        setPlayer({ ...selectedPlayerDef, hp: selectedPlayerDef.maxHp, hand: pHand, wine: 0, isStunned: false });
        setAi({ ...enemyDef, hp: enemyDef.maxHp, hand: aHand, wine: 0, isStunned: false });

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
        setDiscardSelection([]);
        setPlayer(p => ({ ...p, wine: 0 }));

        addLog("=== 你的回合开始 ===", true);

        if (playerRef.current.isStunned) {
            addLog(`🌀 你被定身咒禁锢，无法行动！`);
            setPlayer(p => ({ ...p, isStunned: false }));
            setTimeout(checkEndTurn, 1500);
            return;
        }

        setPhase('PLAYER_PLAY');
        drawCards('player', 2);
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

        // 出牌规则限制
        if (card.id === CARD_TYPES.ATTACK && hasAttacked) return addLog("⚠️ 本回合已出过【降妖】(可使用【风火轮】解除)");
        if ((card.id === CARD_TYPES.HEAL || card.id === CARD_TYPES.HEAL_BIG) && player.hp >= player.maxHp) return addLog("⚠️ 体力已满");
        if (card.id === CARD_TYPES.DODGE) return addLog("⚠️ 【腾云】需在被攻击时被动使用");
        if (card.id === CARD_TYPES.WINE && player.wine > 0) return addLog("⚠️ 药效还在，不可叠加使用");
        if ((card.id === CARD_TYPES.STEAL || card.id === CARD_TYPES.DESTROY || card.id === CARD_TYPES.MIRROR) && ai.hand.length === 0) return addLog(`⚠️ 妖王手里已经没牌了`);

        // 扣除手牌
        const newHand = player.hand.filter(c => c.uid !== card.uid);
        setPlayer(p => ({ ...p, hand: newHand }));
        triggerCardAnim(card, 'player');

        // --- 卡牌效果结算 ---
        if (card.id === CARD_TYPES.ATTACK) {
            setHasAttacked(true);
            let dmg = 1 + player.wine;
            if (player.id === 'wukong') dmg += 1;
            if (player.wine > 0) setPlayer(p => ({ ...p, wine: 0 }));

            addLog(`⚔️ 对敌发动【降妖】！(总伤害: ${dmg})`);

            setTimeout(() => {
                setAi(a => {
                    const actIdx = a.hand.findIndex(c => c.id === CARD_TYPES.DODGE);
                    if (actIdx > -1) {
                        triggerCardAnim(CARDS_DB[CARD_TYPES.DODGE], 'ai');
                        triggerTextAnim('闪避！', 'dodge', 'ai');
                        addLog(`🛡️ 妖王使用【腾云】躲开了`);
                        return { ...a, hand: a.hand.filter((_, i) => i !== actIdx) };
                    } else {
                        triggerTextAnim(`-${dmg}`, 'damage', 'ai');
                        addLog(`💥 命中！妖王失去 ${dmg} 点体力`);
                        if (a.id === 'bull' && playerRef.current.hand.length > 0) {
                            setTimeout(() => {
                                triggerTextAnim('被动: 震落!', 'buff', 'ai');
                                addLog(`🐂 【蛮牛】护体震荡！你被震落了 1 张手牌！`);
                                setPlayer(p => {
                                    if (p.hand.length > 0) {
                                        const rIdx = Math.floor(Math.random() * p.hand.length);
                                        return { ...p, hand: p.hand.filter((_, i) => i !== rIdx) };
                                    }
                                    return p;
                                });
                            }, 500);
                        }
                        return { ...a, hp: Math.max(0, a.hp - dmg) };
                    }
                });
            }, 800);
        } else if (card.id === CARD_TYPES.HEAL || card.id === CARD_TYPES.HEAL_BIG) {
            const healAmount = card.id === CARD_TYPES.HEAL_BIG ? 2 : 1;
            triggerTextAnim(`+${healAmount}`, 'heal', 'player');
            setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + healAmount) }));
            addLog(`🍎 你使用了${card.name}，恢复了 ${healAmount} 点体力`);

            if (player.id === 'shaseng') {
                setTimeout(() => {
                    triggerTextAnim('被动: 化缘!', 'buff', 'player');
                    addLog("🧔 【化缘】生效！额外化得 1 张手牌！");
                    drawCards('player', 1);
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
            setPlayer(p => ({ ...p, wine: 1 }));
            addLog("💊 你饮下了【九转金丹】，下一张【降妖】伤害将 +1！");
        } else if (card.id === CARD_TYPES.WHEELS) {
            triggerTextAnim('疾风！', 'buff', 'player');
            setHasAttacked(false); // 解除攻击限制
            addLog("🔥 踏上【风火轮】！出招限制解除，并摸 1 张牌！");
            drawCards('player', 1);
        } else if (card.id === CARD_TYPES.PIERCE) {
            triggerTextAnim('-1', 'damage', 'ai');
            addLog(`📿 你念动【紧箍咒】，妖王头痛欲裂，无视防御失去 1 点体力！`);
            setAi(a => ({ ...a, hp: Math.max(0, a.hp - 1) }));
        } else if (card.id === CARD_TYPES.MIRROR) {
            setAi(a => {
                const dodgesRemoved = a.hand.filter(c => c.id === CARD_TYPES.DODGE).length;
                if (dodgesRemoved > 0) {
                    triggerTextAnim('破法！', 'buff', 'ai');
                    addLog(`🔍 【照妖镜】金光一闪！妖王无处遁形，被强行销毁了 ${dodgesRemoved} 张【腾云】！`);
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
                setAi(a => {
                    const actIdx = a.hand.findIndex(c => c.id === CARD_TYPES.DODGE);
                    if (actIdx > -1) {
                        triggerCardAnim(CARDS_DB[CARD_TYPES.DODGE], 'ai');
                        triggerTextAnim('闪避！', 'dodge', 'ai');
                        addLog(`🛡️ 妖王极速飞退，使用【腾云】躲过了一劫`);
                        return { ...a, hand: a.hand.filter((_, i) => i !== actIdx) };
                    } else {
                        triggerTextAnim('-1', 'damage', 'ai');
                        addLog(`💥 妖王无处可躲！失去 1 点体力`);
                        return { ...a, hp: Math.max(0, a.hp - 1) };
                    }
                });
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

    // --- AI 自动出牌系统 ---
    const startAiTurn = async () => {
        if (playerRef.current.hp <= 0 || aiRef.current.hp <= 0) return;
        setPhase('AI_TURN');
        addLog(`--- ${aiRef.current.name} 的回合 ---`, true);

        await delay(800);

        if (aiRef.current.id === 'gold' && !aiRef.current.isStunned && playerRef.current.hand.length > 0) {
            triggerTextAnim('被动: 吸取!', 'buff', 'ai');
            setPlayer(p => {
                const idx = Math.floor(Math.random() * p.hand.length);
                const stolen = p.hand[idx];
                setAi(a => ({...a, hand: [...a.hand, stolen]}));
                return { ...p, hand: p.hand.filter((_, i) => i !== idx) };
            });
            addLog(`✨ 【紫金葫芦】发威！${aiRef.current.name} 吸走了你 1 张手牌！`);
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

            // 1. 优先回血
            if (currentAi.hp < currentAi.maxHp) {
                playIdx = currentAi.hand.findIndex(c => c.id === CARD_TYPES.HEAL_BIG);
                if (playIdx === -1) playIdx = currentAi.hand.findIndex(c => c.id === CARD_TYPES.HEAL);
            }
            // 2. 使用策略锦囊 (包括新道具)
            if (playIdx === -1) {
                playIdx = currentAi.hand.findIndex(c => [
                    CARD_TYPES.SCAN, CARD_TYPES.DESTROY, CARD_TYPES.STEAL,
                    CARD_TYPES.ARROW, CARD_TYPES.MIRROR, CARD_TYPES.PIERCE, CARD_TYPES.WHEELS
                ].includes(c.id));
            }
            // 3. 贴定身
            if (playIdx === -1 && !playerRef.current.isStunned) playIdx = currentAi.hand.findIndex(c => c.id === CARD_TYPES.STUN);
            // 4. 喝酒
            if (playIdx === -1 && currentAi.wine === 0 && !aiHasAttacked) {
                if (currentAi.hand.some(c => c.id === CARD_TYPES.ATTACK)) playIdx = currentAi.hand.findIndex(c => c.id === CARD_TYPES.WINE);
            }
            // 5. 攻击
            if (playIdx === -1 && !aiHasAttacked) playIdx = currentAi.hand.findIndex(c => c.id === CARD_TYPES.ATTACK);

            if (playIdx > -1) {
                const card = currentAi.hand[playIdx];
                const result = await playCardAsAi(card, playIdx);

                if (card.id === CARD_TYPES.ATTACK) aiHasAttacked = true;
                if (result === 'RESET_ATTACK') aiHasAttacked = false; // 处理风火轮重置

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

        await delay(1200);
        startPlayerTurn();
    };

    const playCardAsAi = async (card, idx) => {
        setAi(a => ({ ...a, hand: a.hand.filter((_, i) => i !== idx) }));
        const aiName = aiRef.current.name;

        triggerCardAnim(card, 'ai');

        if (card.id === CARD_TYPES.ATTACK) {
            let dmg = 1 + aiRef.current.wine;
            if (aiRef.current.wine > 0) setAi(a => ({ ...a, wine: 0 }));
            addLog(`🔥 ${aiName} 祭出【降妖】向你袭来！`);
            await delay(800);

            if (aiRef.current.id === 'ironfan') {
                triggerTextAnim('被动: 吹飞!', 'buff', 'ai');
                setPlayer(p => {
                    if (p.hand.length > 0) {
                        const rIdx = Math.floor(Math.random() * p.hand.length);
                        return { ...p, hand: p.hand.filter((_, i) => i !== rIdx) };
                    }
                    return p;
                });
                addLog(`🪭 【阴风阵阵】！狂风卷走了你 1 张手牌！`);
                await delay(500);
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
            setAi(a => ({ ...a, wine: 1 }));
        } else if (card.id === CARD_TYPES.STUN) {
            triggerTextAnim('定身！', 'buff', 'player');
            addLog(`✨ ${aiName} 对你念动了【定身咒】！`);
            setPlayer(p => ({ ...p, isStunned: true }));
        } else if (card.id === CARD_TYPES.WHEELS) {
            triggerTextAnim('疾风！', 'buff', 'ai');
            addLog(`🔥 ${aiName} 踏上【风火轮】，出招限制解除，并摸了 1 张牌！`);
            drawCards('ai', 1);
            return 'RESET_ATTACK'; // 告知主循环重置攻击状态
        } else if (card.id === CARD_TYPES.PIERCE) {
            triggerTextAnim('-1', 'damage', 'player');
            addLog(`📿 ${aiName} 竟懂【紧箍咒】！你头痛欲裂，无视防御失去 1 点体力！`);
            setPlayer(p => ({ ...p, hp: Math.max(0, p.hp - 1) }));
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

    // 路由渲染控制
    if (gameState.startsWith('MENU')) {
        return <GameMenu gameState={gameState} setGameState={setGameState} setSelectedPlayerDef={setSelectedPlayerDef} initGame={initGame} />;
    }

    const excessCards = getExcessCardsCount();
    const canConfirmDiscard = discardSelection.length === excessCards;

    return (
        <div className="relative flex flex-col h-screen bg-stone-200 overflow-hidden">
            {/* 顶部：敌人状态 */}
            <div className="relative z-20 bg-stone-800 text-white p-4 flex justify-between items-center shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="relative text-5xl bg-stone-700 w-16 h-16 flex items-center justify-center rounded-full border-2 border-stone-500">
                        {ai.avatar}
                        {ai.isStunned && <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-white text-xs px-1 rounded shadow animate-pulse">定身</div>}
                    </div>
                    <div>
                        <div className="font-bold text-xl flex items-center gap-2">
                            {ai.name}
                            <span className="text-xs text-stone-400 font-normal border border-stone-600 px-2 py-0.5 rounded-full">手牌: {ai.hand.length}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            {[...Array(Math.max(0, ai.hp))].map((_, i) => <Heart key={i} size={16} fill="#ef4444" color="#ef4444" />)}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
                            <Info size={12}/> {selectedEnemyDef.skillName}
                        </div>
                    </div>
                </div>
                <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 px-3 py-2 bg-stone-700 rounded-xl hover:bg-stone-600 border border-stone-600 transition-colors">
                    <ScrollText size={18} /> <span className="text-sm font-bold">战绩</span>
                </button>
            </div>

            {/* 中间日志区 */}
            <div ref={logContainerRef} className="absolute inset-0 z-0 overflow-y-auto px-6 pt-28 pb-[380px] scroll-smooth">
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

            {/* 炫酷动画层：卡牌展示 */}
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

            {/* 炫酷动画层：战斗文字 */}
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

            {/* 底部玩家区 */}
            <div className={`absolute bottom-0 left-0 right-0 z-20 p-4 pb-8 backdrop-blur-md border-t transition-all duration-500 ${
                phase === 'PLAYER_DISCARD' ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-stone-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]'
            }`}>
                <div className="flex justify-between items-end mb-4 px-2">
                    <div className="flex items-center gap-4">
                        <div className="relative text-5xl bg-stone-100 w-16 h-16 flex items-center justify-center rounded-2xl border-2 border-stone-300 shadow-inner">
                            {player.avatar}
                            {player.wine > 0 && (
                                <div className="absolute -top-3 -right-3 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300 animate-bounce shadow-md">
                                    伤害+1
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="font-bold text-lg flex items-center gap-2 text-stone-800">
                                {player.name}
                                <span className="text-xs text-stone-500 font-normal bg-stone-200 px-2 py-0.5 rounded-full">{selectedPlayerDef.skillName}</span>
                            </div>
                            <div className="flex gap-1 mt-1">
                                {[...Array(Math.max(0, player.hp))].map((_, i) => <Heart key={i} size={18} fill="#ef4444" color="#ef4444" />)}
                            </div>
                            <div className={`text-xs font-bold mt-1 tracking-tighter ${phase === 'PLAYER_DISCARD' ? 'text-slate-400' : 'text-stone-500'}`}>
                                HP {player.hp} / {player.maxHp}
                            </div>
                        </div>
                    </div>

                    {phase === 'PLAYER_PLAY' && (
                        <button onClick={checkEndTurn} className="bg-stone-900 text-white px-8 py-3 rounded-2xl font-black hover:bg-black hover:-translate-y-1 active:scale-95 transition-all shadow-xl">
                            结束出牌
                        </button>
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
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-white bg-slate-800 px-4 py-2 rounded-xl border border-slate-600 font-bold">
                                <AlertCircle size={18} className="text-yellow-400" />
                                弃置 <span className="text-yellow-400 mx-1">{excessCards}</span> 张牌
                                <span className="text-slate-400 text-sm ml-2 font-normal">(已选 {discardSelection.length})</span>
                            </div>
                            {discardSelection.length > 0 && (
                                <button onClick={() => setDiscardSelection([])} className="p-2 text-slate-300 hover:text-white bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors">
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
                    )}
                </div>

                {/* 卡牌容器 */}
                <div ref={scrollRef} className="flex flex-nowrap gap-3 overflow-x-auto py-4 px-2 scrollbar-hide items-end h-[220px]">
                    {player.hand.map((card) => {
                        const isSelected = phase === 'PLAYER_DISCARD' && discardSelection.includes(card.uid);
                        const shouldDim = phase === 'PLAYER_DISCARD' && !isSelected;
                        const isDimmedExtra = shouldDim && canConfirmDiscard;

                        return (
                            <div
                                key={card.uid}
                                onClick={() => handlePlayCard(card)}
                                className={`relative flex-shrink-0 w-36 h-48 border-2 rounded-2xl p-4 cursor-pointer transition-all duration-300 origin-bottom
                                    ${card.bg} ${card.border} group select-none
                                    ${phase === 'PLAYER_RESPONSE'
                                    ? (card.id === CARD_TYPES.DODGE
                                        ? 'ring-4 ring-blue-500 -translate-y-6 shadow-[0_20px_25px_-5px_rgba(59,130,246,0.5)] z-10 scale-105 cursor-pointer animate-pulse'
                                        : 'opacity-40 grayscale-[80%] cursor-not-allowed hover:translate-y-0')
                                    : phase === 'PLAYER_DISCARD'
                                        ? (isSelected
                                            ? 'ring-4 ring-red-500 -translate-y-6 shadow-[0_20px_25px_-5px_rgba(220,38,38,0.4)] z-10 scale-105'
                                            : `hover:-translate-y-2 hover:opacity-100 ${isDimmedExtra ? 'opacity-30 grayscale-[50%]' : 'opacity-70'}`)
                                        : (phase === 'IDLE' || phase === 'AI_TURN' ? 'opacity-90 grayscale-[20%]' : 'shadow-md hover:-translate-y-6 hover:shadow-2xl hover:z-10')}`}
                            >
                                {isSelected && (
                                    <div className="absolute -top-4 -right-4 bg-red-600 text-white rounded-full p-2 shadow-lg z-20 animate-in zoom-in spin-in-12">
                                        <Trash2 size={18} />
                                    </div>
                                )}
                                <div className={`font-black text-lg mb-2 ${card.color}`}>{card.name}</div>
                                <card.icon size={44} className={`mx-auto my-4 ${card.color}`} />
                                <div className="text-[11px] text-stone-600 leading-snug font-medium bg-white/70 p-2 rounded-lg backdrop-blur-sm">{card.desc}</div>
                            </div>
                        );
                    })}
                    {player.hand.length === 0 && (
                        <div className="w-full text-center py-10 text-stone-400 italic">手中空空如也...</div>
                    )}
                </div>
            </div>

            {/* 历史战绩弹窗 */}
            {showHistory && (
                <HistoryModal logs={allHistoryLogs} onClose={() => setShowHistory(false)} />
            )}
        </div>
    );
}