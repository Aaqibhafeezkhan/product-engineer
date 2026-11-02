<p align="center"><img src="assets/wordmark.svg" width="520" alt="product-engineer"></p>

<p align="center"><a href="README.md">English</a> | <a href="README.tr.md">Türkçe</a> | 简体中文</p>

<p align="center"><em>你的智能体在交付代码。product-engineer 让它交付结果。</em></p>

<p align="center">
  <a href="https://www.npmjs.com/package/product-engineer"><img src="https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FBubblegunn%2Fproduct-engineer%2Fmetrics%2Fbadges%2Fnpm-week.json&style=flat-square" alt="npm downloads per week"></a>
  <img src="https://img.shields.io/badge/dependencies-0-111111?style=flat-square" alt="zero dependencies">
  <img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT">
  <a href="https://github.com/marketplace/actions/product-engineer-check"><img src="https://img.shields.io/badge/GitHub_Marketplace-product--engineer--check-111111?style=flat-square&logo=github" alt="GitHub Marketplace"></a>
</p>

一个智能体技能，让 AI 编码智能体像产品工程师一样思考，而不是像打印代码的机器。动手之前，
它先把任务改写成一句客户能看懂的结果。每个 commit 和 pull request 里，它都写一段通俗的
"For the customer" 说明。没有亲眼看到的工作，它不说"完成"；有意没做的事，它点名说出来；
没有数过的数字，它一个也不写。

## 先试这个：差异检查

```
npx product-engineer check msg.txt --diff
```

`msg.txt` 是提交说明，变更是你用 `git add` 暂存的内容。请在 git 仓库内运行。不需要安装、模型或账号。当说明所写与变更所示相矛盾时它会给出警告，例如说明写着"补充了测试"，却没有任何测试文件新增了行。它只警告，退出码为 0；加上 `--strict` 后，变更本身能证明的矛盾会变成错误。声明检查只读英文说明：中文、日文或土耳其文的说明仍会做区块和可读性检查，但不检查其中的声明（这是漏报，不是误报）。真实运行输出、失败和漏报的情况见 [`docs/proof.md`](docs/proof.md)。

这是两个独立的部分。(1) 差异检查：不调用模型，相同输入得到相同输出。(2) 技能：让智能体用通俗语言写 "For the customer" 说明，效果取决于模型。按英文 README 中的表格，该说明在 Opus 上出现 8/8，Sonnet 13/24，Haiku 0/24；它是否提高了说明的准确性并未测量。

## 安装技能（三十秒）

```
npx skills add Bubblegunn/product-engineer
```

这是 [skills.sh](https://skills.sh) 的安装器。它会识别当前项目里的智能体，并为每一个放好
技能；`--all` 面向所有支持的智能体，`-g` 安装到用户级别而不是项目级别。

每个智能体的文件落在哪里、Claude Code 插件命令、git 钩子和 CI 步骤，都在
[`docs/install.md`](docs/install.md)。仓库带四个技能：`product-engineer`（七条规则）、
`customer-block`（只要客户说明块）、`done-means-observed`（只要有据可查的"完成"报告）和
`release-notes`（给写发布说明、不写代码的智能体）。

技能本身是文本文件，不需要安装任何东西。`product-engineer` 命令（`check`、`doctor`、
pre-commit 入口）需要 Node 22 或更新版本；commit-msg 钩子本身是 POSIX sh。

## 之前和之后

之前：

```
fix(notifications): classify IsSystem events as idempotent and skip the badge increment
```

之后：

```
fix(notifications): classify IsSystem events as idempotent and skip the badge increment

For the customer:
What changed: Things the system handles on its own no longer light up the phone or the menu badge; only items that need a person do.
Why it matters: The badge count means "something needs you" again, so people stop ignoring it.
Automation effect: Automatic housekeeping events are now fully handled without anyone looking at them.
```

之前智能体这样汇报：

```
Done. All 42 tests pass.
```

之后：

```
Watched it in staging logs: 3 of 3 webhook retries logged, final failure recorded with the booking id.
Could not check: production, no deploy yet.
Not shipped:
- Dead-letter queue: three retries cover every failure in 90 days of logs.
```

## 七条规则

1. 动手前先改写。一句话说清客户得到什么，否则只问一个问题。
2. 每次都写给客户。改了什么，为什么重要，自动化效果只在真实时才写。
3. 完成意味着看见。日志、数据或真实设备；否则说出没能检查的部分。
4. 做被要求的事，说出没做的事。一份有理由的 `Not shipped:` 清单。
5. 没有数过的数字不写。每个数字背后都有一条命令和一个范围。
6. 说相关方的语言。技能自带术语与通俗说法的对照表。
7. 用能推动指标的最小改动。每个设计之前先写一行账。

全文：[`skills/product-engineer/SKILL.md`](skills/product-engineer/SKILL.md)。模板、五个
问题、完成清单、通俗用语表和 not-shipped 格式在
[`references/`](skills/product-engineer/references/) 下。

## 它不做什么

它不运行流程，也不接管工作流；它和规格、TDD、代码评审技能并行工作。它不写产品战略。
不安装钩子，它不强制任何事。

## 它从哪里来

这些是 Efe Genç 四年里作为一家住宿平台的创始工程师、以及一个主动式助手的唯一作者所遵循
的规则：一种向非技术读者解释每次改动的 commit 习惯，一种以亲眼看到运行为准的"完成"定义，
以及把有意没做的事写下来的习惯
（[The feature I chose not to ship](https://efegenc.me/writing/the-feature-i-chose-not-to-ship/)）。

## 参与

规则改动需要一组之前/之后的对照和一个评测任务；见 [CONTRIBUTING.md](CONTRIBUTING.md)。
[路线图](ROADMAP.md) 有意保持简短。翻译和按技术栈的术语表标为 `good first issue`。

## 引用

每个版本都在 Zenodo 上以 DOI 归档。

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.22395211.svg)](https://doi.org/10.5281/zenodo.22395211)

这是**概念** DOI，始终解析到最新版本。要引用某个具体版本，请在该页面的侧栏中选择版本并使用那里显示的
DOI。仓库中的 `CITATION.cff` 带有同一标识符。

MIT.
