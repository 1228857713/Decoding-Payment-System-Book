---
title: 全书目录
prev: false
next: false
---

<script setup>
import { withBase } from 'vitepress'
import { data as chapters } from './contents.data.js'
</script>

# 全书目录

《图解支付系统设计与实现》 · 隐墨星辰著 · V_0.1.0

按原书顺序阅读，也可以用顶部搜索直接查找术语与主题。图示可点击放大。

<ul class="book-contents">
  <li v-for="chapter in chapters" :key="chapter.link">
    <a :href="withBase(chapter.link)">{{ chapter.title }}</a>
  </li>
</ul>

- [来源、版权与勘误](/about)
