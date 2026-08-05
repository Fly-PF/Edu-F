import { vectorDemo } from './demos/GewuVectorDotDemo.vue'
import { matrixDemo } from './demos/GewuMatrixMulDemo.vue'
import { softmaxDemo } from './demos/GewuSoftmaxDemo.vue'
import { gradientDemo } from './demos/GewuGradientDescentDemo.vue'
import { shapeDemo } from './demos/GewuTensorShapeDemo.vue'
import { autogradDemo } from './demos/GewuAutogradDemo.vue'
import { trainDemo } from './demos/GewuTrainLineDemo.vue'
import { bigramDistDemo } from './demos/GewuBigramDistDemo.vue'
import { bigramGenDemo } from './demos/GewuBigramGenDemo.vue'
import { bigramLossDemo } from './demos/GewuBigramLossDemo.vue'
import { charTokDemo } from './demos/GewuCharTokDemo.vue'
import { bpeDemo } from './demos/GewuBpeDemo.vue'
import { tiktokenDemo } from './demos/GewuTiktokenVizDemo.vue'
import { embedTableDemo } from './demos/GewuEmbedTableDemo.vue'
import { cosineDemo } from './demos/GewuCosineSimDemo.vue'
import { trainEmbedDemo } from './demos/GewuTrainEmbedDemo.vue'
import { numIdDemo } from './demos/GewuNumIdProblemDemo.vue'
import { wordPointDemo } from './demos/GewuWordAsPointDemo.vue'
import { attnRawDemo } from './demos/GewuAttnRawDemo.vue'
import { attnQkvDemo } from './demos/GewuAttnQkvDemo.vue'
import { attnMaskDemo } from './demos/GewuAttnMaskDemo.vue'
import { posEncDemo } from './demos/GewuPosEncDemo.vue'
import { layerNormDemo } from './demos/GewuLayerNormDemo.vue'
import { gptDemo } from './demos/GewuGptAssembleDemo.vue'
import { trainGptDemo } from './demos/GewuTrainGptDemo.vue'
import { tempDemo } from './demos/GewuTemperatureDemo.vue'
import { topKpDemo } from './demos/GewuTopKpDemo.vue'
import { loraParamDemo } from './demos/GewuLoraParamDemo.vue'
import { loraRankDemo } from './demos/GewuLoraRankDemo.vue'
import { rewardModelDemo } from './demos/GewuRewardModelDemo.vue'
import { dpoDemo } from './demos/GewuDpoDemo.vue'
import { kvCacheDemo } from './demos/GewuKvCacheDemo.vue'
import { quantizeDemo } from './demos/GewuQuantizeDemo.vue'
import { ragDemo } from './demos/GewuRagDemo.vue'
import { agentDemo } from './demos/GewuAgentDemo.vue'
import { agentHarnessDemo } from './demos/GewuAgentHarnessDemo.vue'
import { toolUseDemo } from './demos/GewuToolUseDemo.vue'
import { memoryStateDemo } from './demos/GewuMemoryStateDemo.vue'
import { reflexionDemo } from './demos/GewuReflexionDemo.vue'
import { subAgentDemo } from './demos/GewuSubAgentDemo.vue'
import { agentTeamDemo } from './demos/GewuAgentTeamDemo.vue'
import { collaborationDemo } from './demos/GewuCollaborationDemo.vue'
import { evalTraceDemo } from './demos/GewuEvalTraceDemo.vue'
import { protocolsDemo } from './demos/GewuProtocolsDemo.vue'
import { frameworksDemo } from './demos/GewuFrameworksDemo.vue'

const LLM_VOLUMES = [
  {
    id: "vol1", name: "卷一 · 数理筑基",
    scrolls: [
      { id: "vec", label: "第一式 · 向量点诀", demo: vectorDemo },
      { id: "mat", label: "第二式 · 矩阵变形", demo: matrixDemo },
      { id: "sm", label: "第三式 · 柔息归元", demo: softmaxDemo },
      { id: "gd", label: "第四式 · 寻谷心法", demo: gradientDemo },
    ],
  },
  {
    id: "vol2", name: "卷二 · 火候初成 (PyTorch)",
    scrolls: [
      { id: "shape", label: "第一式 · 形合之诀", demo: shapeDemo },
      { id: "grad", label: "第二式 · 正反相生", demo: autogradDemo },
      { id: "train", label: "第三式 · 红线归位", demo: trainDemo },
    ],
  },
  {
    id: "vol3", name: "卷三 · 猜字成文 (语言模型)",
    scrolls: [
      { id: "dist", label: "第一式 · 数往知来", demo: bigramDistDemo },
      { id: "gen", label: "第二式 · 无中生有", demo: bigramGenDemo },
      { id: "loss", label: "第三式 · 以损度功", demo: bigramLossDemo },
    ],
  },
  {
    id: "vol4", name: "卷四 · 拆文为号 (分词)",
    scrolls: [
      { id: "char", label: "第一式 · 拆文为号", demo: charTokDemo },
      { id: "bpe", label: "第二式 · 并对成词", demo: bpeDemo },
      { id: "tik", label: "第三式 · 真身现形", demo: tiktokenDemo },
    ],
  },
  {
    id: "vol5", name: "卷五 · 赋字以义 (词嵌入)",
    scrolls: [
      { id: "numid", label: "第一式 · 数字之惑", demo: numIdDemo },
      { id: "point", label: "第二式 · 坐标藏义", demo: wordPointDemo },
      { id: "table", label: "第三式 · 查表取义", demo: embedTableDemo },
      { id: "cos", label: "第四式 · 度义之尺", demo: cosineDemo },
      { id: "train", label: "第五式 · 习而得义", demo: trainEmbedDemo },
    ],
  },
  {
    id: "vol6", name: "卷六 · 顾盼生义 (注意力)",
    scrolls: [
      { id: "raw", label: "第一式 · 顾盼生义", demo: attnRawDemo },
      { id: "qkv", label: "第二式 · 问答相济", demo: attnQkvDemo },
      { id: "mask", label: "第三式 · 隐于未来", demo: attnMaskDemo },
    ],
  },
  {
    id: "vol7", name: "卷七 · 序中藏位 (Transformer Block)",
    scrolls: [
      { id: "pos", label: "第一式 · 序中藏位", demo: posEncDemo },
      { id: "ln", label: "第二式 · 归元固本", demo: layerNormDemo },
    ],
  },
  {
    id: "vol8", name: "卷八 · 万法归一 (完整 GPT)",
    scrolls: [
      { id: "gpt", label: "第一式 · 万法归一", demo: gptDemo },
    ],
  },
  {
    id: "vol9", name: "卷九 · 千锤百炼 (训练 GPT)",
    scrolls: [
      { id: "train", label: "第一式 · 千锤百炼", demo: trainGptDemo },
    ],
  },
  {
    id: "vol10", name: "卷十 · 冷暖自调 (采样)",
    scrolls: [
      { id: "temp", label: "第一式 · 冷暖自调", demo: tempDemo },
      { id: "topkp", label: "第二式 · 去芜存菁", demo: topKpDemo },
    ],
  },
  {
    id: "vol11", name: "卷十一 · 以小驭大 (LoRA)",
    scrolls: [
      { id: "param", label: "第一式 · 以小驭大", demo: loraParamDemo },
      { id: "rank", label: "第二式 · 旁路得道", demo: loraRankDemo },
    ],
  },
  {
    id: "vol12", name: "卷十二 · 合人之意 (对齐)",
    scrolls: [
      { id: "reward", label: "第一式 · 以好恶为尺", demo: rewardModelDemo },
      { id: "dpo", label: "第二式 · 直取人心", demo: dpoDemo },
    ],
  },
  {
    id: "vol13", name: "卷十三 · 又快又省 (推理优化)",
    scrolls: [
      { id: "kv", label: "第一式 · 缓存省算", demo: kvCacheDemo },
      { id: "quant", label: "第二式 · 化整为简", demo: quantizeDemo },
    ],
  },
  {
    id: "vol14", name: "卷十四 · 学以致用 (RAG / Agent)",
    scrolls: [
      { id: "rag", label: "第一式 · 开卷而答", demo: ragDemo },
      { id: "agent", label: "第二式 · 想做相生", demo: agentDemo },
    ],
  },
];

const AGENT_VOLUMES = [
  {
    id: "agent-vol1",
    name: "卷一 · 想做相生 (Harness)",
    scrolls: [
      { id: "harness", label: "想做相生", demo: agentHarnessDemo },
    ],
  },
  {
    id: "agent-vol2",
    name: "卷二 · 立规执器 (工具)",
    scrolls: [
      { id: "tooluse", label: "立规执器", demo: toolUseDemo },
    ],
  },
  {
    id: "agent-vol3",
    name: "卷三 · 分流持态 (记忆)",
    scrolls: [
      { id: "memory", label: "分流持态", demo: memoryStateDemo },
    ],
  },
  {
    id: "agent-vol4",
    name: "卷四 · 败中求正 (反馈)",
    scrolls: [
      { id: "reflexion", label: "败中求正", demo: reflexionDemo },
    ],
  },
  {
    id: "agent-vol5",
    name: "卷五 · 分而委之 (子 Agent)",
    scrolls: [
      { id: "subagent", label: "分而委之", demo: subAgentDemo },
    ],
  },
  {
    id: "agent-vol6",
    name: "卷六 · 群策共表 (agent team)",
    scrolls: [
      { id: "agentteam", label: "群策共表", demo: agentTeamDemo },
    ],
  },
  {
    id: "agent-vol7",
    name: "卷七 · 协作算账 (多体协作)",
    scrolls: [
      { id: "collaboration", label: "协作算账", demo: collaborationDemo },
    ],
  },
  {
    id: "agent-vol8",
    name: "卷八 · 验迹归因 (评估)",
    scrolls: [
      { id: "evaltrace", label: "验迹归因", demo: evalTraceDemo },
    ],
  },
  {
    id: "agent-vol9",
    name: "卷九 · 纵横分层 (协议)",
    scrolls: [
      { id: "protocols", label: "纵横分层", demo: protocolsDemo },
    ],
  },
  {
    id: "agent-vol10",
    name: "卷十 · 择器知本 (框架)",
    scrolls: [
      { id: "frameworks", label: "择器知本", demo: frameworksDemo },
    ],
  },
];

const CONCEPT_MODEL = "概念模型 · 参数实时计算";
const SCRIPTED_DATA = "脚本化离线数据";
const SCRIPTED_TRACE = "脚本化离线轨迹";

function lesson(goal, prompt, options, correct, feedback, runtimeLabel = CONCEPT_MODEL) {
  return {
    learningGoal: goal,
    runtimeLabel,
    challenge: {
      prompt,
      options,
      correct,
      feedback,
      retry: "回到图中，先找输入经过哪一步变成当前结果。",
      transfer: "再改变一个参数，用“输入 → 变换 → 输出”解释先变化的部分。",
    },
  };
}

// 每一式都要有可观察目标和可核对的预测，避免只把动态图当作演示视频。
const LESSONS = {
  "llm:vol1:vec": lesson("理解点积如何把两支向量的对应坐标合成为一个数。", "a=[2,1]、b=[1,2] 时，点积是多少？", ["2", "4", "5"], 1, "正确。2×1 + 1×2 = 4。"),
  "llm:vol1:mat": lesson("观察矩阵如何把每个位置的坐标同时映射到新空间。", "右乘变换矩阵后，改变的是什么？", ["每个位置的坐标", "词的数量", "词的顺序"], 0, "正确。矩阵为每个位置施加同一组线性变换。"),
  "llm:vol1:sm": lesson("理解 softmax 如何把相对分数变成和为 1 的概率。", "softmax 输出最必须满足什么？", ["总和为 1", "每项都是整数", "最大项一定为 1"], 0, "正确。softmax 保留相对高低，同时把总和归一为 1。"),
  "llm:vol1:gd": lesson("观察梯度下降如何沿着损失降低的方向更新参数。", "梯度下降的一步更新应朝哪个方向？", ["负梯度方向", "正梯度方向", "随机方向"], 0, "正确。负梯度是局部下降最快的方向。"),
  "llm:vol2:shape": lesson("读懂张量形状如何在批次、序列和特征维度间传递。", "改变 batch 大小最直接影响哪一维？", ["第 0 维", "词表维", "特征维"], 0, "正确。batch 维记录一次并行送入多少个样本。"),
  "llm:vol2:grad": lesson("理解自动求导把局部导数沿计算图反向累积成梯度。", "反向传播首先回答什么问题？", ["参数改一点会怎样影响损失", "输入有几个词", "模型共有几层"], 0, "正确。梯度衡量参数微小变化对损失的影响。"),
  "llm:vol2:train": lesson("把一次线性回归训练看成预测、损失、反传、更新的闭环。", "参数更新依赖哪一项？", ["损失对参数的梯度", "当前预测值本身", "样本编号"], 0, "正确。优化器依据梯度决定参数移动方向和幅度。"),
  "llm:vol3:dist": lesson("理解语言模型把当前符号映射成下一个符号的分布。", "二元语言模型的下一词分布主要由什么决定？", ["当前一个词", "整篇文章", "随机种子"], 0, "正确。bigram 只统计当前词后面接什么。"),
  "llm:vol3:gen": lesson("观察从概率分布采样如何一步步生成文本。", "生成下一词时模型直接输出的是什么？", ["候选词概率分布", "唯一确定的词", "训练集原句"], 0, "正确。采样策略再从分布中选出一个词。"),
  "llm:vol3:loss": lesson("理解交叉熵如何惩罚模型给正确下一个词的低概率。", "正确词概率变大时，交叉熵通常如何变化？", ["下降", "上升", "不变"], 0, "正确。模型越确信正确答案，损失越低。"),
  "llm:vol4:char": lesson("理解分词首先是把文本切分并映射为可处理的编号。", "字符 tokenizer 的最小切分单位是什么？", ["单个字符", "完整句子", "词向量"], 0, "正确。字符级 tokenizer 为每个字符分配编号。"),
  "llm:vol4:bpe": lesson("观察 BPE 如何反复合并高频相邻片段来压缩文本。", "BPE 每一步优先合并什么？", ["最高频相邻对", "最长单词", "随机字符"], 0, "正确。高频对合并后能以更少 token 表达常见片段。"),
  "llm:vol4:tik": lesson("把手写 BPE 与真实 GPT tokenizer 的切分结果建立联系。", "同一段文本换 tokenizer 后最可能变化什么？", ["token 切分与数量", "原文本字符", "模型参数量"], 0, "正确。tokenizer 的词表和规则决定切分边界。", SCRIPTED_DATA),
  "llm:vol5:numid": lesson("理解 token 编号只是索引，编号大小不包含语义远近。", "编号 3 和 4 相邻，能说明词义相近吗？", ["不能", "一定能", "只要词更短就能"], 0, "正确。编号是地址，不是语义坐标。"),
  "llm:vol5:point": lesson("观察词向量如何让语义相近的词在空间中靠近。", "图上两点更接近通常表示什么？", ["语义更相似", "编号更连续", "词更常见"], 0, "正确。训练会把相近上下文中的词拉到相近位置。"),
  "llm:vol5:table": lesson("理解嵌入表是按 token 编号查出一行可训练向量。", "嵌入查表的输出是什么？", ["该 token 的向量行", "一个新 token", "完整句子"], 0, "正确。编号只是索引，表中那一行才是可学习表示。"),
  "llm:vol5:cos": lesson("理解余弦相似度主要比较两个向量的方向是否一致。", "把两个向量同时放大，余弦相似度通常怎样？", ["基本不变", "一定变成 1", "一定变成 0"], 0, "正确。余弦相似度归一化了向量长度。"),
  "llm:vol5:train": lesson("观察嵌入训练如何只更新本次参与预测的少量向量行。", "一次查表后的梯度主要回写到哪里？", ["被查到的向量行", "整张表每一行", "token 编号"], 0, "正确。稀疏更新让相关词的向量逐步改变。"),
  "llm:vol6:raw": lesson("理解注意力先为每个词对打分，再按权重汇总信息。", "注意力分数最高表示什么？", ["当前词最关注该位置", "该词编号最大", "该词一定被删除"], 0, "正确。高分位置在汇总时贡献更大。"),
  "llm:vol6:qkv": lesson("区分 Q/K 用来决定看谁，V 用来决定取什么信息。", "Q·K 决定的是哪件事？", ["关注权重", "被汇总内容", "token 编号"], 0, "正确。Q 与 K 匹配产生权重，V 才被加权汇总。"),
  "llm:vol6:mask": lesson("理解因果掩码如何阻止当前位置偷看未来 token。", "自回归生成时当前位置能看未来词吗？", ["不能", "能，且必须", "只在训练时能"], 0, "正确。掩码把未来位置的分数屏蔽掉。"),
  "llm:vol7:pos": lesson("理解位置编码为注意力补上原本缺失的顺序信息。", "为什么只靠注意力还需要位置编码？", ["注意力本身不识别顺序", "向量不能相加", "词表没有编号"], 0, "正确。位置向量让相同词在不同位置拥有不同表示。"),
  "llm:vol7:ln": lesson("观察 LayerNorm 如何把每个 token 的特征尺度拉回稳定范围。", "LayerNorm 主要在哪个范围内归一化？", ["单个 token 的特征维", "整批 token 的词表", "所有层的参数"], 0, "正确。它在每个样本的特征维度上稳定数值。"),
  "llm:vol8:gpt": lesson("把 GPT 看成 token、嵌入、位置、Transformer、预测头的串联。", "GPT 的最终预测头输出什么？", ["下一个 token 的分数", "已生成的完整答案", "训练梯度"], 0, "正确。logits 经 softmax 后成为下一个 token 分布。"),
  "llm:vol9:train": lesson("理解 GPT 训练把输入右移后的真实下一个 token 作为监督信号。", "训练标签相对输入通常怎样排列？", ["右移一位", "完全相同", "随机打乱"], 0, "正确。模型在每个位置学习预测紧随其后的 token。"),
  "llm:vol10:temp": lesson("观察温度如何改变分布尖锐程度与生成随机性。", "温度升高后，分布通常怎样？", ["更平、更随机", "更尖、更确定", "完全不变"], 0, "正确。较高温度压低分数差距，使更多候选有机会被采样。"),
  "llm:vol10:topkp": lesson("理解 top-k 与 top-p 都是在采样前裁剪候选集合。", "top-p 裁剪依据是什么？", ["累计概率阈值", "固定词表编号", "句子长度"], 0, "正确。top-p 保留累计概率达到阈值的最小候选集。"),
  "llm:vol11:param": lesson("理解 LoRA 通过低秩增量适配模型，而不直接重训全部权重。", "LoRA 训练时主要新增什么？", ["低秩增量矩阵", "完整基础权重副本", "新词表"], 0, "正确。基础权重冻结，训练低秩分解得到的增量。"),
  "llm:vol11:rank": lesson("观察 rank 如何在 LoRA 的表达能力与参数量之间取舍。", "提高 rank 最直接带来什么？", ["更强表达力和更多参数", "更少参数和更少能力", "不改变任何结果"], 0, "正确。rank 是低秩更新可用通道数。"),
  "llm:vol12:reward": lesson("理解奖励模型从人类偏好对中学习“哪个回答更好”。", "奖励模型最自然的监督信号是什么？", ["两个回答的偏好比较", "唯一标准答案", "token 长度"], 0, "正确。偏好对提供相对好坏，而非绝对分数。", SCRIPTED_DATA),
  "llm:vol12:dpo": lesson("理解 DPO 直接拉高偏好回答、压低拒绝回答的相对概率。", "DPO 的一组数据至少包含什么？", ["偏好回答和拒绝回答", "两份词表", "两个模型"], 0, "正确。DPO 直接利用同一提示下的偏好对进行优化。", SCRIPTED_DATA),
  "llm:vol13:kv": lesson("理解 KV Cache 保存历史键和值，避免生成时反复计算过去 token。", "KV Cache 节省的主要是哪部分计算？", ["历史 token 的 K/V 投影", "当前 token 的采样", "词表大小"], 0, "正确。历史 K/V 可复用，新增 token 只计算自己的部分。"),
  "llm:vol13:quant": lesson("观察量化如何用更少比特表示权重，并引入可见误差。", "int8 量化相对 float32 的核心取舍是什么？", ["更省内存但有精度误差", "更高精度且更占内存", "完全无变化"], 0, "正确。量化把连续数值映射到有限台阶，换取存储和推理效率。"),
  "llm:vol14:rag": lesson("理解 RAG 必须先筛掉低相关资料，再把可靠证据交给模型回答。", "相似度很低的资料应怎样处理？", ["低于阈值则不引用", "总是放进 top-k", "当作最终答案"], 0, "正确。top-k 只是候选排序，阈值或重排才能避免低相关证据混入。", SCRIPTED_DATA),
  "llm:vol14:agent": lesson("理解 Agent 用循环把模型决策、工具执行与观察结果连起来。", "Agent 一轮工具调用后最需要回到模型的是什么？", ["结构化 observation", "原始提示词副本", "随机 token"], 0, "正确。模型要根据真实观察结果决定下一步。"),
  "agent:agent-vol1:harness": lesson("理解 harness 负责把模型意图解析、执行、观察并控制停止条件。", "模型输出 action 后，harness 还必须做什么？", ["执行并回传 observation", "直接宣布完成", "忽略参数"], 0, "正确。action 不是 final，harness 需要驱动完整闭环。", SCRIPTED_TRACE),
  "agent:agent-vol2:tooluse": lesson("理解工具调用要先校验名称、参数与权限，再执行真实动作。", "未知工具名应在何时被拦截？", ["执行前校验阶段", "执行完成后", "永远不拦截"], 0, "正确。校验失败不能触碰真实工具。", SCRIPTED_TRACE),
  "agent:agent-vol3:memory": lesson("区分短期上下文、持久记忆与当前任务状态各自的用途。", "跨轮次仍要保留的用户偏好应放在哪里？", ["持久记忆", "一次性 observation", "临时 token"], 0, "正确。持久记忆服务于后续回合，而临时状态只服务当前任务。", SCRIPTED_TRACE),
  "agent:agent-vol4:reflexion": lesson("理解失败需要被结构化回注，并配合预算限制形成可控恢复。", "只把错误打印出来而不回注，会缺少什么？", ["下一轮修正依据", "更多 token", "工具定义"], 0, "正确。模型必须看到结构化失败信息才能改变策略。", SCRIPTED_TRACE),
  "agent:agent-vol5:subagent": lesson("理解子 Agent 用隔离上下文完成子任务，再把证据汇总回主 Agent。", "把所有子任务塞进主上下文的主要代价是什么？", ["上下文混杂和成本上升", "工具会消失", "模型不能输出文本"], 0, "正确。隔离派工让每个 worker 聚焦自己的证据。", SCRIPTED_TRACE),
  "agent:agent-vol6:agentteam": lesson("观察团队内角色分工、交接与汇总如何共同完成任务。", "多 Agent 协作首先需要明确什么？", ["角色边界与交接物", "更多相同角色", "更长提示词"], 0, "正确。没有边界和交接，团队只会重复或冲突。", SCRIPTED_TRACE),
  "agent:agent-vol7:collaboration": lesson("理解协作不是免费并行，需要比较分工收益与通信成本。", "增加一个协作者一定更快吗？", ["不一定，通信也有成本", "一定更快", "一定更慢"], 0, "正确。任务可并行度和协作开销共同决定收益。", SCRIPTED_TRACE),
  "agent:agent-vol8:evaltrace": lesson("理解评估要把最终分数追溯到具体步骤、工具和失败原因。", "trace 的主要价值是什么？", ["定位结果由哪一步造成", "替代所有测试", "让模型不需观察"], 0, "正确。可追踪证据让错误能被归因和修复。", SCRIPTED_TRACE),
  "agent:agent-vol9:protocols": lesson("区分 MCP、A2A 等协议所处层次，避免把它们当成互斥产品。", "比较协议时首先应问什么？", ["它解决哪一层连接", "名字是否更短", "谁的版本号更大"], 0, "正确。协议在工具、Agent 与跨平台协作层承担不同职责。", SCRIPTED_TRACE),
  "agent:agent-vol10:frameworks": lesson("根据任务编排、工具、记忆和观测需求选择框架，而非只比较热度。", "选择 Agent 框架最先匹配什么？", ["实际编排与运维需求", "logo 颜色", "示例数量"], 0, "正确。框架是实现手段，需求边界决定是否需要它。", SCRIPTED_TRACE),
};

function enrichBooks(books) {
  return books.map((book) => ({
    ...book,
    volumes: book.volumes.map((volume) => ({
      ...volume,
      scrolls: volume.scrolls.map((scroll) => {
        const teaching = LESSONS[`${book.id}:${volume.id}:${scroll.id}`];
        return { ...scroll, demo: { ...scroll.demo, ...teaching, challenge: scroll.demo.challenge || teaching?.challenge } };
      }),
    })),
  }));
}

export const GEWU_BOOKS = enrichBooks([
  { id: "llm", title: "大模型卷", volumes: LLM_VOLUMES },
  { id: "agent", title: "Agent 卷", volumes: AGENT_VOLUMES },
]);

