<!-- meta: 标题=周刊精粹·2026-08-31 期; 来源=本刊合集; 团队=—; 子方向=—; 评分=本刊自动精析 -->

# 周刊精粹 · 2026-08-31 期

**本期主题**：自动广度选材（探索感知 / SLAM 鲁棒评测 / 采样规划与安全形式化）
**日期范围**：2026-08-29 – 2026-08-31（arXiv 提交）
**篇数**：3

---

## 目录

| 序号 | 英文标题 | 中文意译 | 子方向 |
| --- | --- | --- | --- |
| 01 | SGE: Semantically-Guided Exploration for Unstructured Environments via Image-Space Waypoint Sampling | 非结构化环境的语义引导探索：图像空间路点采样 | 探索感知 |
| 02 | Failure or Drift? Evaluating Monocular SLAM under Synthetic and Real-World Corruptions | 跟丢还是漂移：合成与真实腐蚀下的单目 SLAM 评测 | SLAM |
| 03 | Sampling-based Certified Planning with Graphs of Convex Sets | 凸集图上的采样式认证规划 | 规划 |

## 编者按

本期三篇恰好构成一条「保证从何而来」的谱系：SGE 用经验权重与真机部署换取实用性但不给任何形式保证；Failure or Drift 揭示即便有完备评测协议，合成代理与真实条件之间仍存在能翻转架构选型的保真度缺口；Certified GCS 则走到底——把保证从输入假设（区域无碰）搬到输出答案（连续间隙证书），并证明输入侧修补（更严验收、SoS 认证、均匀收缩）在连通性面前全部失败。三篇的共同短板是评测或验证边界均依赖特定基准族（单一 KITTI 轨迹、单一 benchmark 环境、14-DOF 库构型），外推需谨慎。趋势判断：答案级/条件级认证（报告失效与漂移分离、只对交付物付保证）正在取代「输入侧假设可靠」的传统叙事，成为感知与规划系统可靠性的新范式。

---

随刊 PDF（同目录）：

- `weekly/20260831/2608.29315.pdf`（SGE）
- `weekly/20260831/2608.30690.pdf`（Failure or Drift）
- `weekly/20260831/2608.29770.pdf`（Certified GCS）
