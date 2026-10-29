const base=import.meta.env.BASE_URL+'references/';
export const REFERENCES = [
 {id:'user-backlight',title:'逆光回眸 · 用户提供',kind:'实拍参考',image:base+'backlight-user.png',credit:'用户提供的参考照片',source:null,description:'人物置于右侧，大面积天空、低机位与逆光形成反差。附件中的获奖叙述未独立核实，不作为赛事记录。',task:0},
 {id:'migrant-mother',title:'Migrant Mother',kind:'经典摄影',image:base+'migrant-mother.jpg',credit:'Dorothea Lange / FSA，1936；Wikimedia Commons：PD-US-FSA',source:'https://commons.wikimedia.org/wiki/File:Lange-MigrantMother02.jpg',description:'通过集中视线与紧凑构图表现人物情绪。游戏只借鉴目光与景别，不模拟人物经历。',task:7},
 {id:'earthrise',title:'Earthrise',kind:'经典摄影',image:base+'earthrise.jpg',credit:'NASA / Bill Anders，1968',source:'https://science.nasa.gov/resource/apollo-8s-iconic-earthrise/',description:'小主体与大留白的尺度对比；对应游戏里的环境叙事镜头。',task:6},
 {id:'big-brother',title:'永远是我大哥',kind:'老男孩圈 · 梗索引',credit:'社区词条：孙一峰 / “孙永大”',source:'https://moegirl.icu/孙一峰',description:'以抬手招呼和低机位塑造“大哥出场”气场。这是玩法演绎，不声称复刻某张原图。',task:1},
 {id:'toxic-milk',title:'指向镜头 · 毒奶名场面',kind:'直播圈 · 实图参考',image:base+'commentator-point.jpg',credit:'直播吧，2023-10-02 配图；照片权利归原作者',source:'https://news.zhibo8.com/game/2023-10-02/651aa9368cfc2native.htm',description:'正面目光、指向镜头的手势与坚定姿态。对应侧身指向的游戏镜头，借鉴气势而非识别人物。',task:2},
 {id:'guardian',title:'守护者的正面镜头',kind:'老男孩圈 · 梗索引',credit:'孙一峰“守护者”广告梗的社区整理',source:'https://moegirl.icu/孙一峰',description:'双手护在胸前，以平视人像表现“守护”的姿态；标题和动作是游戏化演绎。',task:3},
 {id:'no-screenshot',title:'今天不被截图',kind:'直播圈 · 梗索引',credit:'SCBOY / MOMOKO 表情包话题的公开切片',source:'https://www.bilibili.com/video/BV1iT411N7f5/',description:'游戏自拟镜头名，灵感来自切片中的表情包话题，并非引用当事人原话。保留出处入口，未重发切片截图。',task:4},
 {id:'guild-meeting',title:'公会团建，节目效果拉满',kind:'瞧尔萨斯 · 梗索引',credit:'瞧尔萨斯公会相关公开直播切片',source:'https://www.bilibili.com/video/BV1Jm421E7fD/',description:'将团建氛围转成张臂庆祝镜头。仅收录出处及构图灵感，不将切片标题当作当事人事实评价。',task:5},
 {id:'space-commander',title:'舰爷指挥官 · 宣传姿态',kind:'老男孩圈 · 实图参考',image:base+'space-commander.jpg',credit:'《舰无虚发：暗星》宣传图 / 3DM 手游，2018-03-27；图片权利归原作者',source:'https://shouyou.3dmgame.com/news/23513.html',description:'通过交叉双臂、肩线与正面站姿形成指挥官气场。游戏以护胸姿势演绎，不作为真实获奖摄影。',task:3},
];
export function referenceById(id){return REFERENCES.find(r=>r.id===id)||REFERENCES[0];}
