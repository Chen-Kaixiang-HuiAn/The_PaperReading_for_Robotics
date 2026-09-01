<!-- meta: 标题=月刊深析 · 2026-09 期; 来源=; 团队=; 子方向=; 评分=本刊自动精析 -->

# 月刊深析 · 2026-09 期

**本期主题**：激光惯性里程计的因子图范式 —— LIO-SAM 深析　|　**子方向**：激光 SLAM / LIO　|　**来源论文**：Shan et al., *LIO-SAM: Tightly-coupled Lidar Inertial Odometry via Smoothing and Mapping* (IROS 2020, arXiv:2007.00258)

---

## 本期论文信息

| 项目 | 内容 |
| --- | --- |
| 英文标题 | LIO-SAM: Tightly-coupled Lidar Inertial Odometry via Smoothing and Mapping |
| 中文意译 | 基于平滑与建图的紧耦合激光惯性里程计 |
| 作者 | Tixiao Shan, Brendan Englot, Drew Meyers, Wei Wang, Carlo Ratti, Daniela Rus |
| 团队 | MIT Senseable City Lab + CSAIL；Stevens Institute of Technology |
| 发表 | IEEE/RSJ IROS 2020（arXiv:2007.00258，2020-07-01 提交，v3 2020-07-14） |
| 领域 | 激光 SLAM / 激光惯性里程计（LIO）/ 多传感器融合 |
| 被引 | SLAM 领域高被引经典（GitHub 开源实现 star 数与复现工作数量级领先；本刊以影响力定性标注，具体数字原文未提供） |
| 子方向 | 激光惯性里程计（因子图 SLAM） |
| 选题理由 | ①经典里程碑池优先：与上月 RRT\*（采样规划）对称，本期补齐 SLAM 主线经典；②LIO-SAM 是「因子图 + IMU 预积分 + 局部滑窗扫描匹配」范式的定型之作，是 LOAM 系到 FAST-LIO/LIVO 系的承上启下节点；③与用户 Navigation_transform 基线（FAST-LIVO2）与 Cartographer 建图工作直接相关，工程借鉴价值高；④未被往期月刊/周刊覆盖（已比对 meta 来源去重） |

---

## 编者按

LIO-SAM 用一张因子图把 IMU 预积分、激光里程计、GPS 与回环四类约束收进同一个最大后验问题，同时用「局部滑窗 sub-keyframe 匹配」换掉 LOAM 系的全局 voxel map 匹配，一举兼得紧耦合的精度与实时的速度。它上承 LOAM（2017）与 LIOM（2019），下启 LVI-SAM（2021），并与滤波路线的 FAST-LIO 系分庭抗礼，至今仍是工程落地最广的 LIO 框架之一。本期按月刊九段深析范式，从全文逐节复述、第一性原理推导、算法工程细节、横向对比、实验复现到局限边界，完整拆解这篇「把实时性做成一等公民」的经典。随刊 PDF 与各篇深析 `.md` 见 `monthly/2026-09/` 目录。
