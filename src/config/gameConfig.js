import { Sword, Shield, Heart, Zap, Eye, Magnet, Wind, FlaskConical, Swords } from 'lucide-react';

export const CARD_TYPES = {
    ATTACK: 'ATTACK', DODGE: 'DODGE', HEAL: 'HEAL', STUN: 'STUN', SCAN: 'SCAN',
    STEAL: 'STEAL', DESTROY: 'DESTROY', WINE: 'WINE', ARROW: 'ARROW'
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
};

export const DECK_CONFIG = {
    [CARD_TYPES.ATTACK]: 30, [CARD_TYPES.DODGE]: 15, [CARD_TYPES.HEAL]: 8,
    [CARD_TYPES.STUN]: 3, [CARD_TYPES.SCAN]: 4, [CARD_TYPES.STEAL]: 5,
    [CARD_TYPES.DESTROY]: 5, [CARD_TYPES.WINE]: 4, [CARD_TYPES.ARROW]: 2
};

export const PLAYER_CHARACTERS = [
    { id: 'wukong', name: '孙悟空', maxHp: 4, avatar: '🐵', skillName: '【金箍棒】', skillDesc: '神兵之威！你使用的【降妖】伤害默认 +1。' },
    { id: 'bajie', name: '猪八戒', maxHp: 5, avatar: '🐷', skillName: '【皮糙肉厚】', skillDesc: '能吃能扛！你的手牌上限始终 +2。' },
    { id: 'shaseng', name: '沙悟净', maxHp: 4, avatar: '🧔', skillName: '【化缘】', skillDesc: '任劳任怨！每次使用【蟠桃】恢复体力后，额外摸 1 张牌。' }
];

export const ENEMY_CHARACTERS = [
    { id: 'bull', name: '牛魔王', maxHp: 6, avatar: '🐂', skillName: '【蛮牛护体】', skillDesc: '每次受到伤害后，震落(随机弃置)玩家 1 张手牌。' },
    { id: 'gold', name: '金角大王', maxHp: 4, avatar: '🧙', skillName: '【紫金葫芦】', skillDesc: '回合开始时，吸走(随机获得)玩家 1 张手牌。' },
    { id: 'ironfan', name: '铁扇公主', maxHp: 4, avatar: '🪭', skillName: '【阴风阵阵】', skillDesc: '发动【降妖】时，附带吹飞(随机弃置)玩家 1 张手牌的效果。' }
];

