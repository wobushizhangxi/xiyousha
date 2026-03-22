import { Sword, Shield, Heart, Zap, Eye, Magnet, Wind, FlaskConical, Swords, Apple, Search, Target, Flame } from 'lucide-react';

export const CARD_TYPES = {
    ATTACK: 'ATTACK', DODGE: 'DODGE', HEAL: 'HEAL', STUN: 'STUN', SCAN: 'SCAN',
    STEAL: 'STEAL', DESTROY: 'DESTROY', WINE: 'WINE', ARROW: 'ARROW',
    HEAL_BIG: 'HEAL_BIG', MIRROR: 'MIRROR', PIERCE: 'PIERCE', WHEELS: 'WHEELS'
};

export const CARDS_DB = {
    [CARD_TYPES.ATTACK]: { id: CARD_TYPES.ATTACK, name: '【降妖】', desc: '对目标造成1点伤害。每回合限1次。', icon: Sword, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    [CARD_TYPES.DODGE]: { id: CARD_TYPES.DODGE, name: '【腾云】', desc: '抵消一张【降妖】。', icon: Shield, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    [CARD_TYPES.HEAL]: { id: CARD_TYPES.HEAL, name: '【蟠桃】', desc: '恢复1点体力。', icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
    [CARD_TYPES.STUN]: { id: CARD_TYPES.STUN, name: '【定身咒】', desc: '使目标跳过下个出牌阶段。', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    [CARD_TYPES.SCAN]: { id: CARD_TYPES.SCAN, name: '【火眼金睛】', desc: '立即摸取2张牌。', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    [CARD_TYPES.STEAL]: { id: CARD_TYPES.STEAL, name: '【探囊取物】', desc: '随机获得敌人1张手牌。', icon: Magnet, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    [CARD_TYPES.DESTROY]: { id: CARD_TYPES.DESTROY, name: '【芭蕉扇】', desc: '随机弃置敌人1张手牌。', icon: Wind, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    [CARD_TYPES.WINE]: { id: CARD_TYPES.WINE, name: '【九转金丹】', desc: '本回合下一张【降妖】伤害+1。', icon: FlaskConical, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    [CARD_TYPES.ARROW]: { id: CARD_TYPES.ARROW, name: '【漫天花雨】', desc: '敌人需打出【腾云】，否则受到1点伤害。', icon: Swords, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    [CARD_TYPES.HEAL_BIG]: { id: CARD_TYPES.HEAL_BIG, name: '【人参果】', desc: '天地灵根，直接恢复2点体力。', icon: Apple, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    [CARD_TYPES.MIRROR]: { id: CARD_TYPES.MIRROR, name: '【照妖镜】', desc: '金光一闪，弃置敌人所有的【腾云】。', icon: Search, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
    [CARD_TYPES.PIERCE]: { id: CARD_TYPES.PIERCE, name: '【紧箍咒】', desc: '无视防御，直接造成1点流失伤害。', icon: Target, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
    [CARD_TYPES.WHEELS]: { id: CARD_TYPES.WHEELS, name: '【风火轮】', desc: '解除本回合【降妖】次数限制，并摸1张牌。', icon: Flame, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
};

export const DECK_CONFIG = {
    [CARD_TYPES.ATTACK]: 30, [CARD_TYPES.DODGE]: 15, [CARD_TYPES.HEAL]: 8,
    [CARD_TYPES.STUN]: 3, [CARD_TYPES.SCAN]: 4, [CARD_TYPES.STEAL]: 5,
    [CARD_TYPES.DESTROY]: 5, [CARD_TYPES.WINE]: 4, [CARD_TYPES.ARROW]: 3,
    [CARD_TYPES.HEAL_BIG]: 2, [CARD_TYPES.MIRROR]: 4, [CARD_TYPES.PIERCE]: 4, [CARD_TYPES.WHEELS]: 3
};

export const PLAYER_CHARACTERS = [
    {
        id: 'wukong', name: '孙悟空', maxHp: 4, avatar: '🐵',
        passiveName: '【金箍棒】', passiveDesc: '被动：神兵之威！你使用的【降妖】伤害默认 +1。',
        activeName: '【火眼金睛】', activeDesc: '主动：每回合限1次。洞察破绽，随机弃置妖王 1 张手牌。'
    },
    {
        id: 'bajie', name: '猪八戒', maxHp: 5, avatar: '🐷',
        passiveName: '【皮糙肉厚】', passiveDesc: '被动：能吃能扛！你的手牌上限始终 +2。',
        activeName: '【蓄力一击】', activeDesc: '主动：每回合限1次。消耗 1 点体力，使本回合下一击【降妖】伤害剧增(+2)！'
    },
    {
        id: 'shaseng', name: '沙悟净', maxHp: 4, avatar: '🧔',
        passiveName: '【任劳任怨】', passiveDesc: '被动：每次使用恢复类道具后，额外摸 1 张牌。',
        activeName: '【降妖宝杖】', activeDesc: '主动：每回合限1次。消耗 1 点体力，对妖王发动一次无视次数限制的【降妖】！'
    },
    {
        id: 'xiaobailong', name: '小白龙', maxHp: 4, avatar: '🐉',
        passiveName: '【龙族血脉】', passiveDesc: '被动：绝境求生！回合开始时若体力≤2，自动摸 1 张牌。',
        activeName: '【乘风破浪】', activeDesc: '主动：每回合限1次。随机弃置自己 1 张手牌，并摸 2 张牌。'
    }
];

export const ENEMY_CHARACTERS = [
    {
        id: 'bull', name: '牛魔王', maxHp: 6, avatar: '🐂',
        passiveName: '【蛮牛护体】', passiveDesc: '被动：每次受到伤害后，震落(随机弃置)玩家 1 张手牌。',
        activeName: '【狂暴】', activeDesc: '主动：回合开始时若体力≤3，额外摸1张牌且下一次攻击伤害+1。'
    },
    {
        id: 'gold', name: '金角大王', maxHp: 5, avatar: '🧙',
        passiveName: '【紫金葫芦】', passiveDesc: '被动：回合开始时，吸走(随机获得)玩家 1 张手牌。',
        activeName: '【玉净瓶】', activeDesc: '主动：出牌阶段若手牌数小于体力值，恢复 1 点体力（每回合限1次）。'
    },
    {
        id: 'ironfan', name: '铁扇公主', maxHp: 4, avatar: '🪭',
        passiveName: '【护体罡风】', passiveDesc: '被动：极强的风盾，受到的单次伤害最高强制降为 1 点。',
        activeName: '【阴风阵阵】', activeDesc: '主动：发动【降妖】时，附带吹飞(随机弃置)玩家 1 张手牌的效果。'
    },
    {
        id: 'bone', name: '白骨精', maxHp: 4, avatar: '💀',
        passiveName: '【遗恨】', passiveDesc: '被动：睚眦必报！每次受到伤害后，自动摸 1 张牌。',
        activeName: '【吸魂】', activeDesc: '主动：每回合限1次。随机弃置玩家1张牌，若为攻击或闪避牌，恢复1点体力。'
    }
];
