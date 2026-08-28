<!-- meta: 标题=月刊深析 · 2026-08 期; 来源=; 团队=; 子方向=; 评分=本刊自动精析 -->
# 月刊深析 · 2026-08 期

**本期主题**：RRT\* 与采样规划的最优性革命 —— 渐近最优采样规划的奠基之作
**子方向**：全局路径规划（采样规划）
**来源论文**：Karaman & Frazzoli, *Sampling-based Algorithms for Optimal Motion Planning\*, IJRR 2011（arXiv:1105.1186）

---

## 本期论文信息

| 项 | 内容 |
|---|---|
| 标题（英） | Sampling-based Algorithms for Optimal Motion Planning |
| 标题（中） | 基于采样的路径规划算法的最优性分析 |
| 作者 | Sertac Karaman, Emilio Frazzoli（MIT LIDS） |
| 发表 | The International Journal of Robotics Research (IJRR), 2011；76 页，26 图 |
| arXiv | 1105.1186（提交于 2011-05-05） |
| 领域 | 机器人运动规划 / 采样规划 / 随机几何图理论 |
| 被引 | 采样规划领域被引最高的论文之一（其会议版 ICRA 2011「Anytime Motion Planning using the RRT\*」单篇即被引约 621 次，OpenAlex/Rankless） |
| 子方向 | 全局路径规划（path planning，无微分约束） |
| 选题理由 | 经典里程碑池优先；RRT\* 是「采样规划具备渐近最优性」这一子方向的奠基之作，数学深度足以支撑原理级推导，且对 AGV/移动机器人导航全局规划有直接工程价值 |

---

## 编者按

本月聚焦一篇里程碑：**RRT\***。在 2011 年之前，采样规划（PRM、RRT 及其变体）的可靠性保证止步于「概率完备性」——只要存在解，样本数趋于无穷时找到解的概率趋于 1；但「找到的解有多好」长期缺乏理论刻画，实践中只能依赖启发式（多次重跑 RRT、偏向生长、T-RRT 等）。

本文把采样规划构造的路线图与**随机几何图（random geometric graph, RGG）**理论建立严格桥梁，用渗流（percolation）与连通性的相变阈值，精确回答了「连接半径应如何随样本数缩放，才能使解的成本收敛到最优」，并据此证明 PRM\*、RRG、RRT\* 在保持概率完备的同时具备「渐近最优性」（asymptotic optimality），且计算复杂度仅比其非最优前身高出常数倍。其结论催生了「渐近最优采样规划」这一完整子领域，对 AGV / 移动机器人导航的全局规划有直接工程价值。

> 本期完整深析见同目录 `01_RRT_Star.md`（含原理级推导与符号校正）。原文 PDF 随刊存于 `monthly/2026-08/1105.1186.pdf`。
