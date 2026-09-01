<!-- meta: 标题=周刊精粹·2026-08-31 期; 来源=本刊合集; 团队=—; 子方向=—; 评分=本刊自动精析 -->

# 周刊精粹 · 2026-08-31 期

**本期主题**：像素接口与物理落地——VLM/VLA 导航从「会想」到「能走」　|　**日期范围**：2026-08-25 至 2026-08-31　|　**篇数**：3

---

## 目录

| 序号 | 英文标题 | 中文意译 | 子方向 |
| --- | --- | --- | --- |
| 01 | Embodied-Navigator: Point, Think, Memorize, and Align for Efficient Navigation (TAMP-Nav) | 指、想、记、合——高效具身导航统一框架 | 视觉语言导航 |
| 02 | CrossTracer: Cross-Embodiment Navigation via VLA Model Reasoning and Trace Residuals Adapting | 跨具身导航：VLA 推理与轨迹残差自适应 | 鲁棒部署（跨具身导航） |
| 03 | HumanoidVLN: A Physics-Grounded Simulator and Benchmark for Vision-Language Navigation Across Diverse Humanoid Embodiments | 面向多样人形具身的物理接地 VLN 仿真器与基准 | 仿真基准 |

## 编者按

本期三篇凑成了一个耐人寻味的巧合：TAMP-Nav 让 VLM 只在图像上「指一个像素」，CrossTracer 把导航方案表示为归一化像素轨迹，HumanoidVLN 强调行走中相机抖动的自中心观测——三条路线不约而同地把「图像平面」选为基础模型语义与机器人物理之间的中立接口，仿佛在共同承认：让大模型直接输出控制量仍是奢侈品。但接口越靠前，欠下的物理债越多：TAMP-Nav 依赖深度相机与 SLAM 栈兜底、CrossTracer 的 2D 轨迹看不见悬空障碍、HumanoidVLN 则直接用 71% 的跌倒率给整个「SR 至上」的评测文化敲响警钟。三篇合读的启示是，VLM/VLA 导航的下一程不在更大的骨干网，而在「语义—几何—具身」三层的责任划分与各自的容错设计。

---

**随刊 PDF 与各篇精粹**：

- 论文原文：`weekly/20260831/2608.17512.pdf`、`weekly/20260831/2608.06688.pdf`、`weekly/20260831/2608.12860.pdf`
- 各篇精粹：`weekly/20260831/01_TAMP_Nav.md`、`weekly/20260831/02_CrossTracer.md`、`weekly/20260831/03_HumanoidVLN.md`
